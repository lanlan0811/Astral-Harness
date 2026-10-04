import { describe, expect, it } from "vitest";
import { fuzzyMatchIn, fuzzyScoreFields, highlightRanges, rankByFuzzy } from "./fuzzy";

describe("fuzzyMatchIn", () => {
  it("ranks a prefix match above a substring match", () => {
    const prefix = fuzzyMatchIn("set", "settings-panel");
    const substring = fuzzyMatchIn("ings", "settings-panel");
    expect(prefix).not.toBeNull();
    expect(substring).not.toBeNull();
    expect(prefix!.score).toBeLessThan(substring!.score);
  });

  it("returns null when the query is not a subsequence", () => {
    expect(fuzzyMatchIn("zzz", "settings")).toBeNull();
  });

  it("matches a subsequence across gaps", () => {
    expect(fuzzyMatchIn("stp", "settings-panel")).not.toBeNull();
  });

  it("reports the matched range for highlighting", () => {
    expect(fuzzyMatchIn("pan", "settings-panel")).toMatchObject({ start: 9, end: 12 });
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatchIn("SET", "settings")).not.toBeNull();
  });

  it("treats an empty query as a match", () => {
    expect(fuzzyMatchIn("", "anything")).toMatchObject({ score: 0 });
  });
});

describe("fuzzyScoreFields", () => {
  const fields = [
    { weight: 0, value: "open workspace" },
    { weight: 250, value: "打开文件夹" },
  ];

  it("requires every token to match some field (AND, not OR)", () => {
    expect(fuzzyScoreFields("open workspace", fields)).not.toBeNull();
    expect(fuzzyScoreFields("open missing", fields)).toBeNull();
  });

  it("lets a heavy-weight field outrank a light one", () => {
    const descriptionHit = fuzzyScoreFields("文件夹", fields);
    const labelHit = fuzzyScoreFields("open", fields);
    expect(descriptionHit).not.toBeNull();
    expect(labelHit).not.toBeNull();
  });

  it("returns 0 for an empty query so everything ranks", () => {
    expect(fuzzyScoreFields("   ", fields)).toBe(0);
  });
});

describe("rankByFuzzy", () => {
  const items = [
    { name: "toggle sidebar" },
    { name: "sidebar footer" },
    { name: "open settings" },
  ];

  it("drops non-matching items", () => {
    const ranked = rankByFuzzy("sidebar", items, (item) => [{ weight: 0, value: item.name }]);
    expect(ranked.map((entry) => entry.item.name)).toEqual(["sidebar footer", "toggle sidebar"]);
  });

  it("breaks ties by original order so the list does not jump between renders", () => {
    const tied = [{ name: "aa x" }, { name: "bb x" }];
    const ranked = rankByFuzzy("x", tied, (item) => [{ weight: 0, value: item.name }]);
    expect(ranked.map((entry) => entry.index)).toEqual([0, 1]);
  });

  it("honours the limit", () => {
    const ranked = rankByFuzzy("", items, (item) => [{ weight: 0, value: item.name }], 2);
    expect(ranked).toHaveLength(2);
  });
});

describe("highlightRanges", () => {
  it("finds every occurrence of every token", () => {
    expect(highlightRanges("open open settings", "open")).toEqual([
      [0, 4],
      [5, 9],
    ]);
  });

  it("merges overlapping ranges so <mark>s never nest", () => {
    expect(highlightRanges("settings", "sett")).toEqual([[0, 4]]);
  });

  it("merges adjacent-in-order overlapping tokens", () => {
    const ranges = highlightRanges("abcd", "ab cd");
    expect(ranges).toEqual([[0, 4]]);
  });

  it("returns nothing for an empty query", () => {
    expect(highlightRanges("anything", "  ")).toEqual([]);
  });
});