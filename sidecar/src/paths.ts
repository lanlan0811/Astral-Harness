import { homedir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Where Astral keeps everything on disk.
 *
 * `ASTRAL_DATA_DIR` overrides the root. The CI smoke test needs an isolated directory,
 * and tests need one per case, so the override is not optional decoration.
 */
export interface AstralPaths {
  /** `~/.astral`, or `$ASTRAL_DATA_DIR`. */
  root: string;
  settings: string;
  credentials: string;
  /** The random AES key that protects `credentials`. */
  secretKey: string;
  tasks: string;
  sessions: string;
}

export function resolvePaths(root?: string): AstralPaths {
  const base = root ? resolve(root) : defaultDataRoot();
  return {
    root: base,
    settings: join(base, "setting.json"),
    credentials: join(base, "credentials.json"),
    secretKey: join(base, "secret.key"),
    tasks: join(base, "tasks.json"),
    sessions: join(base, "sessions"),
  };
}

export function defaultDataRoot(): string {
  const override = process.env.ASTRAL_DATA_DIR?.trim();
  if (override) return resolve(override);
  return join(homedir(), ".astral");
}
