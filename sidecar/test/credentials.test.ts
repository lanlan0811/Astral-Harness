import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CredentialStore, decryptValue, encryptValue } from "../src/credentials.js";

let dir: string;
let store: CredentialStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "astral-cred-"));
  store = new CredentialStore(join(dir, "credentials.json"), join(dir, "secret.key"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("encryptValue / decryptValue", () => {
  const key = Buffer.alloc(32, 7);

  it("round-trips a value", () => {
    expect(decryptValue(encryptValue("sk-secret", key), key)).toBe("sk-secret");
  });

  it("round-trips an empty string", () => {
    expect(decryptValue(encryptValue("", key), key)).toBe("");
  });

  it("round-trips non-ASCII", () => {
    const value = "密钥-Ω-🔑";
    expect(decryptValue(encryptValue(value, key), key)).toBe(value);
  });

  it("prefixes ciphertext so plaintext is distinguishable", () => {
    expect(encryptValue("x", key).startsWith("enc:v1:")).toBe(true);
  });

  it("uses a fresh IV, so the same plaintext encrypts differently each time", () => {
    expect(encryptValue("same", key)).not.toBe(encryptValue("same", key));
  });

  it("fails on a tampered ciphertext", () => {
    const stored = encryptValue("sk-secret", key);
    const tampered = stored.slice(0, -4) + "AAAA";
    expect(() => decryptValue(tampered, key)).toThrow();
  });

  it("fails on a malformed body", () => {
    expect(() => decryptValue("enc:v1:only.two", key)).toThrow(/Malformed/);
  });

  it("passes unprefixed values through unchanged", () => {
    expect(decryptValue("legacy-plaintext", key)).toBe("legacy-plaintext");
  });
});

describe("CredentialStore", () => {
  it("returns null for a ref that was never set", async () => {
    expect(await store.get("provider:openai")).toBeNull();
  });

  it("persists an encrypted value across store instances", async () => {
    await store.set("provider:openai", "sk-abc123");
    const reopened = new CredentialStore(join(dir, "credentials.json"), join(dir, "secret.key"));
    expect(await reopened.get("provider:openai")).toBe("sk-abc123");
  });

  it("never writes the plaintext into credentials.json", async () => {
    await store.set("provider:openai", "sk-abc123");
    const raw = await readFile(join(dir, "credentials.json"), "utf8");
    expect(raw).not.toContain("sk-abc123");
    expect(raw).toContain("enc:v1:");
  });

  it("generates the secret key once and reuses it", async () => {
    await store.set("a", "1");
    const firstKey = await readFile(join(dir, "secret.key"), "utf8");
    const reopened = new CredentialStore(join(dir, "credentials.json"), join(dir, "secret.key"));
    await reopened.set("b", "2");
    expect(await readFile(join(dir, "secret.key"), "utf8")).toBe(firstKey);
    // Both values must still decrypt under the same key.
    expect(await reopened.get("a")).toBe("1");
    expect(await reopened.get("b")).toBe("2");
  });

  it("removes a ref when set to null", async () => {
    await store.set("provider:openai", "sk-abc123");
    await store.set("provider:openai", null);
    expect(await store.has("provider:openai")).toBe(false);
    expect(await store.get("provider:openai")).toBeNull();
  });

  it("keeps refs independent", async () => {
    await store.set("provider:openai", "sk-openai");
    await store.set("provider:deepseek", "sk-deepseek");
    expect(await store.get("provider:openai")).toBe("sk-openai");
    expect(await store.get("provider:deepseek")).toBe("sk-deepseek");
  });

  // Regression: `load` used to memoize the resolved object rather than the read itself,
  // so a get racing a set on a cold store saw its own empty copy and reported the
  // credential as missing even though it had just been written.
  it("does not lose a value to a racing read", async () => {
    const [readBack] = await Promise.all([store.get("provider:openai"), store.set("provider:openai", "sk-race")]);
    expect(await store.get("provider:openai")).toBe("sk-race");
    expect(readBack).not.toBe(undefined);
  });

  it("shares one disk read between callers on a cold store", async () => {
    await store.set("a", "1");
    const reopened = new CredentialStore(join(dir, "credentials.json"), join(dir, "secret.key"));
    const values = await Promise.all([reopened.get("a"), reopened.get("a"), reopened.get("a")]);
    expect(values).toEqual(["1", "1", "1"]);
  });
});
