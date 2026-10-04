import { readJsonFile, writeJsonFile } from "./jsonfile.js";

export type PermissionMode = "build" | "edit" | "plan" | "yolo";
export type ThoughtLevel = "off" | "low" | "medium" | "high" | "ultra";
export type ProviderId = "openai" | "deepseek" | "dashscope" | "ollama" | "custom";

/**
 * Which model to talk to. `apiKeyRef` is a key into the encrypted credential store —
 * the key itself is never written to `setting.json`.
 */
export interface ProviderConfig {
  providerId: ProviderId;
  modelName: string;
  /** OpenAI-compatible endpoint. Null uses the SDK's built-in default for the provider. */
  baseUrl: string | null;
  apiKeyRef: string;
}

export interface Settings {
  locale: "system" | "zh-CN" | "en-US";
  theme: "dark" | "light" | "system";
  uiFontSizePx: number;
  sidebarWidthPx: number;
  interfaceMode: string;
  model: ProviderConfig;
  thoughtLevel: ThoughtLevel;
  permissionMode: PermissionMode;
  showReasoning: boolean;
  showTodos: boolean;
  codeFontSizePx: number;
  showLineNumbers: boolean;
  wrapLongLines: boolean;
  autoArchive: boolean;
  autoArchiveDays: number;
  terminalFontFamily: string;
}

export const DEFAULT_SETTINGS: Settings = {
  locale: "system",
  theme: "system",
  uiFontSizePx: 14,
  sidebarWidthPx: 264,
  interfaceMode: "coding",
  model: {
    providerId: "openai",
    modelName: "gpt-4o-mini",
    baseUrl: null,
    apiKeyRef: "provider:openai",
  },
  thoughtLevel: "medium",
  permissionMode: "build",
  showReasoning: true,
  showTodos: true,
  codeFontSizePx: 13,
  showLineNumbers: true,
  wrapLongLines: false,
  autoArchive: false,
  autoArchiveDays: 7,
  terminalFontFamily: "",
};

/**
 * Settings on disk, with writes serialized.
 *
 * `Agent` instances are not concurrency-safe and neither is this file: two overlapping
 * patches would each read, merge and write, and the loser's change would vanish. Every
 * write goes through one promise chain.
 */
export class SettingsStore {
  private readonly filePath: string;
  private queue: Promise<unknown> = Promise.resolve();
  /** Memoized promise, not a resolved value — see the note on `CredentialStore.load`. */
  private loaded: Promise<Settings> | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  get(): Promise<Settings> {
    this.loaded ??= readJsonFile<Partial<Settings>>(this.filePath, {}).then((stored) => ({
      ...DEFAULT_SETTINGS,
      ...stored,
      model: { ...DEFAULT_SETTINGS.model, ...stored.model },
    }));
    return this.loaded;
  }

  /** Shallow merge at the top level; `model` merges one level deeper. */
  async patch(patch: Partial<Settings>): Promise<Settings> {
    return this.enqueue(async () => {
      const current = await this.get();
      const next: Settings = {
        ...current,
        ...patch,
        model: { ...current.model, ...(patch.model ?? {}) },
      };
      this.loaded = Promise.resolve(next);
      await writeJsonFile(this.filePath, next);
      return next;
    });
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    // Keep the chain alive even when a job rejects, or every later write is skipped.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
