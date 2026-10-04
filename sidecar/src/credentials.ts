import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { readJsonFile, writeJsonFile } from "./jsonfile.js";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Encrypted credential storage.
 *
 * Values are AES-256-GCM encrypted under a random key generated on first run and kept
 * beside the data at mode 0600. The alternative — deriving the key from the platform,
 * home directory and username — means anyone who can read the file and knows the local
 * username can decrypt it, which is not worth the code.
 */
export class CredentialStore {
  private readonly filePath: string;
  private readonly keyPath: string;
  /**
   * The in-flight (or settled) read. Memoizing the *promise*, not the resolved object,
   * is what makes this safe: two callers racing on a cold store must share one disk read.
   * Caching only the resolved value lets a concurrent `get` capture a stale empty object
   * while a `set` is mid-flight, and it then reports a credential the user just saved as
   * missing.
   */
  private loaded: Promise<Record<string, string>> | null = null;

  constructor(credentialsPath: string, secretKeyPath: string) {
    this.filePath = credentialsPath;
    this.keyPath = secretKeyPath;
  }

  async get(ref: string): Promise<string | null> {
    const store = await this.load();
    const stored = store[ref];
    if (stored === undefined) return null;
    return decryptValue(stored, await this.key());
  }

  /** Passing `null` removes the entry. */
  async set(ref: string, value: string | null): Promise<void> {
    const store = await this.load();
    if (value === null) {
      delete store[ref];
    } else {
      store[ref] = encryptValue(value, await this.key());
    }
    await writeJsonFile(this.filePath, store);
  }

  async has(ref: string): Promise<boolean> {
    return (await this.load())[ref] !== undefined;
  }

  private load(): Promise<Record<string, string>> {
    this.loaded ??= readJsonFile<Record<string, string>>(this.filePath, {});
    return this.loaded;
  }

  private async key(): Promise<Buffer> {
    return loadOrCreateSecretKey(this.keyPath);
  }
}

/** `enc:v1:<b64url(iv)>.<b64url(authTag)>.<b64url(ciphertext)>` */
export function encryptValue(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${b64url(iv)}.${b64url(authTag)}.${b64url(ciphertext)}`;
}

/**
 * Values without the `enc:v1:` prefix are returned unchanged. That keeps any plaintext
 * written by an older build readable, and lets a user drop a key into the file by hand.
 */
export function decryptValue(stored: string, key: Buffer): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const parts = stored.slice(PREFIX.length).split(".");
  if (parts.length !== 3) throw new Error("Malformed encrypted credential");
  const [iv, authTag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

async function loadOrCreateSecretKey(keyPath: string): Promise<Buffer> {
  try {
    const raw = (await readFile(keyPath, "utf8")).trim();
    const key = Buffer.from(raw, "base64url");
    if (key.length === KEY_BYTES) return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
  const key = randomBytes(KEY_BYTES);
  await mkdir(dirname(keyPath), { recursive: true });
  await writeFile(keyPath, `${key.toString("base64url")}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(keyPath, 0o600).catch(() => undefined);
  return key;
}

function b64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}
