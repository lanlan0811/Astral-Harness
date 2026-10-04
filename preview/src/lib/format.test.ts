import { describe, expect, it } from "vitest";
import { fileName, formatCompactNumber, formatDurationMs, parentPath } from "./format";

describe("fileName / parentPath", () => {
  it("splits a posix path", () => {
    expect(fileName("src/auth/auth-client.ts")).toBe("auth-client.ts");
    expect(parentPath("src/auth/auth-client.ts")).toBe("src/auth");
  });

  it("normalises a windows path to posix separators for display", () => {
    expect(fileName("C:\\repo\\src\\App.tsx")).toBe("App.tsx");
    expect(parentPath("C:\\repo\\src\\App.tsx")).toBe("C:/repo/src");
  });

  it("handles a root-level file", () => {
    expect(fileName("AGENTS.md")).toBe("AGENTS.md");
    expect(parentPath("AGENTS.md")).toBe("");
  });

  it("ignores a trailing slash", () => {
    expect(fileName("src/auth/")).toBe("auth");
  });
});

describe("formatDurationMs", () => {
  it("rounds up to at least one second", () => {
    expect(formatDurationMs(0)).toBe("1s");
    expect(formatDurationMs(1)).toBe("1s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDurationMs(45_000)).toBe("45s");
    expect(formatDurationMs(90_000)).toBe("1m 30s");
  });

  it("drops the seconds when they are zero", () => {
    expect(formatDurationMs(120_000)).toBe("2m");
    expect(formatDurationMs(7_200_000)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatDurationMs(5_400_000)).toBe("1h 30m");
  });
});

describe("formatCompactNumber", () => {
  it("leaves small numbers alone", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("uses one decimal below 10 units", () => {
    expect(formatCompactNumber(12_800)).toBe("13K");
    expect(formatCompactNumber(2_400_000)).toBe("2.4M");
  });

  it("rounds above 10 units", () => {
    expect(formatCompactNumber(128_000)).toBe("128K");
  });
});