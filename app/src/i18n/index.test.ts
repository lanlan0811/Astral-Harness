import { describe, expect, it } from "vitest";
import enUS from "./locales/en-US";
import zhCN from "./locales/zh-CN";

/**
 * Locale drift guard.
 *
 * A key that exists in one file but not the other renders as the raw key in one
 * language — a failure a human reviewer rarely catches in a 600-line table.
 */
describe("locale files", () => {
  const enKeys = Object.keys(enUS).sort();
  const zhKeys = Object.keys(zhCN).sort();

  it("zh-CN defines every key en-US defines", () => {
    const missing = enKeys.filter((key) => !(key in zhCN));
    expect(missing).toEqual([]);
  });

  it("en-US defines every key zh-CN defines", () => {
    const extra = zhKeys.filter((key) => !(key in enUS));
    expect(extra).toEqual([]);
  });

  it("has no empty values", () => {
    const empty = [...enKeys, ...zhKeys].filter((key) => {
      const value = key in enUS ? enUS[key] : zhCN[key];
      return value.trim().length === 0;
    });
    expect(empty).toEqual([]);
  });

  it("keeps placeholder tokens identical across locales", () => {
    const tokens = (value: string) => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    const mismatched = enKeys.filter((key) => tokens(enUS[key]).join(",") !== tokens(zhCN[key]).join(","));
    expect(mismatched).toEqual([]);
  });
});

describe("createIntl", () => {
  it("falls back to the key when a message is missing, so gaps are visible", async () => {
    const { createIntl } = await import("./index");
    expect(createIntl("en-US").formatMessage({ id: "nope.not.here" })).toBe("nope.not.here");
  });

  it("substitutes {placeholder} tokens", async () => {
    const { createIntl } = await import("./index");
    const intl = createIntl("en-US");
    expect(intl.formatMessage({ id: "chat.elicitation.counter" }, { current: 2, total: 5 })).toBe("2 / 5");
  });

  it("resolves an unknown preference to the default locale", async () => {
    const { resolveLocale } = await import("./index");
    expect(resolveLocale("fr-FR" as never)).toBe("en-US");
    expect(resolveLocale("zh-CN")).toBe("zh-CN");
  });
});