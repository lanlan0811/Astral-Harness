import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { FileEntry } from "./types.js";

/** Directories that are never useful to browse and are expensive to walk. */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  ".turbo",
  ".cache",
  "__pycache__",
  ".venv",
]);

const MAX_DEPTH = 8;
const MAX_ENTRIES = 5000;
const MAX_TEXT_BYTES = 512 * 1024;
const NUL = String.fromCharCode(0);

/**
 * The workspace file tree for the sidebar.
 *
 * Bounded on purpose: a tree walk with no ceiling hangs the sidecar on a monorepo, and a
 * hung sidecar takes the whole app with it. The limits are reported back through
 * `truncated` so the UI can say so rather than silently showing a partial tree.
 */
export async function readTree(root: string): Promise<{ tree: FileEntry; truncated: boolean }> {
  let remaining = MAX_ENTRIES;
  let truncated = false;

  async function walk(dir: string, depth: number): Promise<FileEntry[]> {
    if (depth >= MAX_DEPTH || remaining <= 0) {
      truncated = true;
      return [];
    }
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    const children: FileEntry[] = [];
    for (const entry of entries) {
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      if (entry.isDirectory() && (entry.name.startsWith(".") || SKIP_DIRECTORIES.has(entry.name))) continue;

      const absolute = join(dir, entry.name);
      remaining -= 1;

      if (entry.isDirectory()) {
        children.push({
          path: relative(root, absolute).split(sep).join("/"),
          name: entry.name,
          isDirectory: true,
          children: await walk(absolute, depth + 1),
        });
      } else {
        children.push({ path: relative(root, absolute).split(sep).join("/"), name: entry.name, isDirectory: false });
      }
    }
    return children;
  }

  const tree: FileEntry = { path: "", name: root, isDirectory: true, children: await walk(root, 0) };
  return { tree, truncated };
}

/** File contents for the code viewer. Binary files come back as `null` rather than mojibake. */
export async function readTextFile(path: string): Promise<{ text: string | null; truncated: boolean }> {
  const info = await stat(path);
  if (!info.isFile()) return { text: null, truncated: false };

  if (info.size > MAX_TEXT_BYTES) {
    const handle = await readFile(path);
    return { text: handle.subarray(0, MAX_TEXT_BYTES).toString("utf8"), truncated: true };
  }

  const text = await readFile(path, "utf8");
  return { text: text.includes(NUL) ? null : text, truncated: false };
}
