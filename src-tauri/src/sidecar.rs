use std::collections::HashMap;
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::Mutex;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// How long a request may take before the caller is told it timed out.
///
/// Agent turns are not in this budget: `agent.send` and `agent.respondPermission` return
/// as soon as the turn is accepted, and the turn streams back over events. Only work that
/// genuinely finishes inline (reading a file, walking the tree) waits here.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

const EVENT_CHANNEL: &str = "sidecar://event";

/// The sidecar process plus the requests waiting on it.
///
/// The sidecar speaks newline-delimited JSON over stdio. One task owns its stdout for the
/// process's whole life and sorts each line: a line carrying an `id` is a reply and goes
/// to the waiting caller, anything else is an event and goes to the webview.
pub struct Sidecar {
    child: Mutex<Option<CommandChild>>,
    pending: Mutex<HashMap<String, Sender<String>>>,
}

impl Sidecar {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            pending: Mutex::new(HashMap::new()),
        }
    }

    fn write(&self, line: &str) -> Result<(), String> {
        let mut guard = self.child.lock().map_err(|_| "agent runtime lock poisoned")?;
        let child = guard
            .as_mut()
            .ok_or_else(|| "the agent runtime is not running".to_string())?;
        child.write(line).map_err(|error| format!("could not reach the agent runtime: {error}"))
    }

    fn take_waiter(&self, id: &str) -> Option<Sender<String>> {
        self.pending.lock().ok()?.remove(id)
    }

    fn register(&self, id: &str, sender: Sender<String>) {
        if let Ok(mut pending) = self.pending.lock() {
            pending.insert(id.to_string(), sender);
        }
    }

    /// Fails every outstanding request so no caller hangs after the sidecar dies.
    fn fail_all(&self, reason: &str) {
        if let Ok(mut pending) = self.pending.lock() {
            for (_, sender) in pending.drain() {
                let _ = sender.send(
                    json!({ "id": "", "ok": false, "error": { "message": reason } }).to_string(),
                );
            }
        }
    }
}

impl Default for Sidecar {
    fn default() -> Self {
        Self::new()
    }
}

/// Spawns the bundled Node with the compiled sidecar as its entry point.
///
/// `externalBin` renames the Node download to `node-<target-triple>`, so the shell plugin
/// resolves whichever architecture is being built or run.
fn spawn_sidecar(app: &AppHandle) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("no resource directory: {error}"))?;

    let entry = resource_dir.join("sidecar").join("dist").join("main.js");
    let prompts = resource_dir.join("prompts");

    if !entry.exists() {
        return Err(format!(
            "sidecar entry point missing at {} — the bundle did not include it",
            entry.display()
        ));
    }

    // The shell plugin's error type has no `Into<String>`, so both of these need an
    // explicit conversion rather than a bare `?`.
    let (mut events, child) = app
        .shell()
        .sidecar("node")
        .map_err(|error| format!("could not resolve the Node sidecar: {error}"))?
        .args([entry.to_string_lossy().to_string()])
        .env("ASTRAL_PROMPTS_DIR", &prompts)
        .spawn()
        .map_err(|error| format!("could not start the Node sidecar: {error}"))?;

    app.state::<Sidecar>()
        .child
        .lock()
        .map_err(|_| "agent runtime lock poisoned")?
        .replace(child);

    let pump_app = app.clone();
    tauri::async_runtime::spawn(async move {
        pump(pump_app, &mut events).await;
    });

    Ok(())
}

async fn pump(app: AppHandle, events: &mut Receiver<CommandEvent>) {
    let mut stdout_tail = String::new();
    let mut stderr_tail = String::new();

    while let Some(event) = events.recv() {
        match event {
            CommandEvent::Stdout(bytes) => {
                stdout_tail.push_str(&String::from_utf8_lossy(&bytes));
                for line in drain_lines(&mut stdout_tail) {
                    route(&app, &line);
                }
            }
            CommandEvent::Stderr(bytes) => {
                stderr_tail.push_str(&String::from_utf8_lossy(&bytes));
                for line in drain_lines(&mut stderr_tail) {
                    eprintln!("[sidecar] {line}");
                }
            }
            CommandEvent::Terminated(payload) => {
                eprintln!("[sidecar] exited: {payload:?}");
                app.state::<Sidecar>().fail_all("the agent runtime stopped unexpectedly");
            }
            _ => {}
        }
    }
    app.state::<Sidecar>().fail_all("the agent runtime closed its output");
}

/// Takes every complete line out of `buffer`, leaving any trailing partial line in place.
fn drain_lines(buffer: &mut String) -> Vec<String> {
    let mut lines = Vec::new();
    while let Some(index) = buffer.find('\n') {
        let line: String = buffer.drain(..=index).collect();
        let line = line.trim().to_string();
        if !line.is_empty() {
            lines.push(line);
        }
    }
    lines
}

fn route(app: &AppHandle, line: &str) {
    let Ok(value) = serde_json::from_str::<Value>(line) else {
        eprintln!("[sidecar] unparseable line: {line}");
        return;
    };

    let id = value.get("id").and_then(Value::as_str).filter(|id| !id.is_empty());
    match id {
        Some(id) => {
            let sidecar = app.state::<Sidecar>();
            if let Some(waiter) = sidecar.take_waiter(id) {
                let _ = waiter.send(line.to_string());
            }
        }
        None => {
            // Anything without an id is a push. Forwarded verbatim; the webview's store is
            // what understands the shape.
            if let Err(error) = app.emit(EVENT_CHANNEL, value) {
                eprintln!("[sidecar] could not forward event: {error}");
            }
        }
    }
}

/// Sends one request to the sidecar and waits for its matching reply.
#[tauri::command]
pub fn sidecar_request(
    app: AppHandle,
    request_type: String,
    payload: Option<Value>,
) -> Result<Value, String> {
    let id = new_request_id();
    let line = format!(
        "{}\n",
        json!({
            "id": id,
            "type": request_type,
            "payload": payload.unwrap_or(Value::Null),
        })
    );

    let (sender, receiver): (Sender<String>, Receiver<String>) = mpsc::channel();
    {
        let sidecar = app.state::<Sidecar>();
        sidecar.register(&id, sender);
        if let Err(error) = sidecar.write(&line) {
            sidecar.take_waiter(&id);
            return Err(error);
        }
    }

    let raw = match receiver.recv_timeout(REQUEST_TIMEOUT) {
        Ok(raw) => raw,
        Err(_) => {
            app.state::<Sidecar>().take_waiter(&id);
            return Err(format!("{request_type} timed out"));
        }
    };

    let value: Value = serde_json::from_str(&raw).map_err(|error| error.to_string())?;
    if value.get("ok").and_then(Value::as_bool) == Some(true) {
        Ok(value.get("result").cloned().unwrap_or(Value::Null))
    } else {
        let message = value
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("the agent runtime reported an unknown failure");
        Err(message.to_string())
    }
}

static REQUEST_COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

fn new_request_id() -> String {
    let n = REQUEST_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    format!("rust-{n}")
}