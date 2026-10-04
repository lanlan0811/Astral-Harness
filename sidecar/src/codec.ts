import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

/**
 * Newline-delimited JSON framing.
 *
 * stdio is the transport between Rust and the sidecar. JSON lines rather than raw JSON
 * because the stream has no framing of its own, and a malformed line then takes out one
 * message instead of desynchronizing everything after it.
 */
export function readLines(input: Readable, onLine: (line: string) => void): () => void {
  const reader = createInterface({ input, crlfDelay: Infinity });
  reader.on("line", onLine);
  return () => reader.close();
}

export function writeLines(output: Writable): (value: unknown) => void {
  return (value) => {
    output.write(`${JSON.stringify(value)}\n`);
  };
}

export function parseLine<T>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    return null;
  }
}
