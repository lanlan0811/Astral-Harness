import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SYSTEM_PROMPT_FILE = "system.md";
const PERMISSION_PROMPT_FILE = "permission.md";

/**
 * System prompts live in `prompts/` as plain files, never inline in code.
 *
 * `ASTRAL_PROMPTS_DIR` wins when set — the packaged app points it at Tauri's resource
 * directory. Otherwise we walk up from this module looking for the repo's `prompts/`,
 * which is what makes it work from `sidecar/dist` during development without a build
 * step that copies files around.
 */
export async function loadSystemPrompt(): Promise<string> {
  return loadPrompt(SYSTEM_PROMPT_FILE);
}

export async function loadPermissionPrompt(): Promise<string> {
  return loadPrompt(PERMISSION_PROMPT_FILE);
}

async function loadPrompt(fileName: string): Promise<string> {
  const dir = await resolvePromptsDir();
  const text = await readFile(join(dir, fileName), "utf8");
  return text.trim();
}

async function resolvePromptsDir(): Promise<string> {
  const override = process.env.ASTRAL_PROMPTS_DIR?.trim();
  if (override) return resolve(override);

  let current = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(current, "prompts");
    try {
      await readFile(join(candidate, SYSTEM_PROMPT_FILE), "utf8");
      return candidate;
    } catch {
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new Error(
    `Could not find a prompts/ directory containing ${SYSTEM_PROMPT_FILE}. ` +
      "Set ASTRAL_PROMPTS_DIR to point at it.",
  );
}
