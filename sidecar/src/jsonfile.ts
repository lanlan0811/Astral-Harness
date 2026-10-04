import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

let tmpCounter = 0;

/**
 * Read a JSON file, tolerating the two things that actually go wrong on disk: the file
 * does not exist yet, or it is corrupt. A corrupt file is renamed out of the way rather
 * than silently overwritten — losing the user's data quietly is worse than losing it
 * loudly, and the renamed copy can still be recovered by hand.
 */
export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) return fallback;
    throw error;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    const quarantine = `${filePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await rename(filePath, quarantine).catch(() => undefined);
    return fallback;
  }
}

/**
 * Write JSON atomically: a temp file in the same directory, then a rename. A crash mid
 * write therefore leaves the previous file intact instead of a half-written one.
 */
export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${tmpCounter++}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(tmp, filePath);
  await chmod(filePath, 0o600).catch(() => undefined);
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}
