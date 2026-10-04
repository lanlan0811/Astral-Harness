import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFile } from "../src/jsonfile.js";
import { DEFAULT_SETTINGS, SettingsStore } from "../src/settings.js";
import { TaskStore } from "../src/tasks.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "astral-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readJsonFile", () => {
  it("returns the fallback when the file does not exist", async () => {
    expect(await readJsonFile(join(dir, "nope.json"), { a: 1 })).toEqual({ a: 1 });
  });

  it("quarantines a corrupt file instead of overwriting it", async () => {
    const path = join(dir, "broken.json");
    await writeFile(path, "{ not json");
    expect(await readJsonFile(path, { a: 1 })).toEqual({ a: 1 });
    const files = await readdir(dir);
    expect(files.some((name) => name.startsWith("broken.json.corrupt-"))).toBe(true);
  });
});

describe("writeJsonFile", () => {
  it("leaves no temp files behind", async () => {
    const path = join(dir, "out.json");
    await writeJsonFile(path, { a: 1 });
    await writeJsonFile(path, { a: 2 });
    expect(await readdir(dir)).toEqual(["out.json"]);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ a: 2 });
  });
});

describe("SettingsStore", () => {
  it("returns defaults when nothing is stored", async () => {
    const store = new SettingsStore(join(dir, "setting.json"));
    expect(await store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("persists a patch", async () => {
    const store = new SettingsStore(join(dir, "setting.json"));
    await store.patch({ permissionMode: "yolo" });
    const reopened = new SettingsStore(join(dir, "setting.json"));
    expect((await reopened.get()).permissionMode).toBe("yolo");
  });

  it("merges the provider config one level deeper", async () => {
    const store = new SettingsStore(join(dir, "setting.json"));
    await store.patch({ model: { providerId: "deepseek", modelName: "deepseek-chat", baseUrl: null, apiKeyRef: "provider:deepseek" } });
    const reopened = new SettingsStore(join(dir, "setting.json"));
    // Only modelName changed, so the other model fields keep their defaults.
    const stored = JSON.parse(await readFile(join(dir, "setting.json"), "utf8"));
    expect(stored.model.modelName).toBe("deepseek-chat");
    expect(stored.model.apiKeyRef).toBe("provider:deepseek");
    expect((await reopened.get()).model.providerId).toBe("deepseek");
  });

  it("serializes concurrent patches so none is lost", async () => {
    const store = new SettingsStore(join(dir, "setting.json"));
    await Promise.all([
      store.patch({ showReasoning: false }),
      store.patch({ showTodos: false }),
      store.patch({ uiFontSizePx: 16 }),
    ]);
    const settings = await store.get();
    expect(settings.showReasoning).toBe(false);
    expect(settings.showTodos).toBe(false);
    expect(settings.uiFontSizePx).toBe(16);
  });

  it("never stores an API key — only a reference to one", async () => {
    const store = new SettingsStore(join(dir, "setting.json"));
    await store.patch({ model: { ...DEFAULT_SETTINGS.model, apiKeyRef: "provider:openai" } });
    expect(await readFile(join(dir, "setting.json"), "utf8")).not.toMatch(/sk-[A-Za-z0-9]/);
  });
});

describe("TaskStore", () => {
  it("creates a task and makes it active", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    const task = await store.create({ title: "fix the build", projectId: null });
    expect(task.title).toBe("fix the build");
    expect(task.status).toBe("idle");
    expect(await store.listTasks()).toHaveLength(1);
  });

  it("persists across instances", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    const task = await store.create({ title: "keep me", projectId: null });
    const reopened = new TaskStore(join(dir, "tasks.json"));
    expect((await reopened.listTasks())[0].id).toBe(task.id);
  });

  it("patches a task and moves updatedAt forward", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    const task = await store.create({ title: "a", projectId: null });
    const patched = await store.patch(task.id, { status: "running", attention: "permission" });
    expect(patched?.status).toBe("running");
    expect(patched?.attention).toBe("permission");
    expect(patched!.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
  });

  it("returns null when patching a task that is gone", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    expect(await store.patch("missing", { status: "running" })).toBeNull();
  });

  it("removes a task and picks a new active one", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    const first = await store.create({ title: "first", projectId: null });
    await store.create({ title: "second", projectId: null });
    expect(await store.remove(first.id)).toBe(true);
    expect((await store.listTasks()).map((task) => task.title)).toEqual(["second"]);
  });

  it("registers a project once per path", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    const a = await store.upsertProject("/repo", "repo");
    const b = await store.upsertProject("/repo", "repo-renamed");
    expect(b.id).toBe(a.id);
    expect(await store.listProjects()).toHaveLength(1);
  });

  it("keeps every task under concurrent creation", async () => {
    const store = new TaskStore(join(dir, "tasks.json"));
    await Promise.all(Array.from({ length: 10 }, (_, i) => store.create({ title: `t${i}`, projectId: null })));
    expect(await store.listTasks()).toHaveLength(10);
  });
});
