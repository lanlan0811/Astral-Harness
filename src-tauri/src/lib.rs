mod sidecar;

use sidecar::Sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Sidecar::new())
        .invoke_handler(tauri::generate_handler![sidecar::sidecar_request])
        .setup(|app| {
            // The window is already open by the time `setup` runs, so a sidecar that
            // refuses to start would leave a shell that silently does nothing. Fail loudly
            // instead — the webview's first settings read will surface this.
            if let Err(error) = sidecar::spawn_sidecar(app.handle()) {
                eprintln!("[astral] could not start the agent runtime: {error}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Astral");
}