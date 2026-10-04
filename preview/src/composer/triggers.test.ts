import { describe, expect, it } from "vitest";
import { matchMentionTrigger, matchSlashTrigger, matchTrigger, removeTrigger, replaceTrigger } from "./triggers";

describe("matchSlashTrigger", () => {
  it("opens on a leading slash", () => {
    expect(matchSlashTrigger("/")).toMatchObject({ kind: "slash", query: "", start: 0 });
  });

  it("captures the query after the trigger", () => {
    expect(matchSlashTrigger("/rev")).toMatchObject({ query: "rev", start: 0 });
  });

  it("opens after whitespace", () => {
    const match = matchSlashTrigger("please run /mod");
    expect(match).toMatchObject({ query: "mod" });
    expect(match?.start).toBe(11);
  });

  it("does not open mid-word", () => {
    expect(matchSlashTrigger("a/b")).toBeNull();
  });

  it("closes once the token is followed by a space", () => {
    expect(matchSlashTrigger("/model gpt")).toBeNull();
  });

  it("matches a trailing full-width space before the slash", () => {
    expect(matchSlashTrigger("你好 /help")).toMatchObject({ query: "help" });
  });
});

describe("matchMentionTrigger", () => {
  it("opens on a leading @", () => {
    expect(matchMentionTrigger("@")).toMatchObject({ kind: "mention", query: "", start: 0 });
  });

  it("captures a file path fragment", () => {
    expect(matchMentionTrigger("@src/au")).toMatchObject({ query: "src/au" });
  });

  it("opens directly after a Chinese character", () => {
    expect(matchMentionTrigger("看看@src")).toMatchObject({ query: "src" });
  });

  it("does not fire on an email address", () => {
    expect(matchMentionTrigger("联系邮箱@example.com")).toBeNull();
  });

  it("does not fire inside a bare word", () => {
    expect(matchMentionTrigger("a@b")).toBeNull();
  });
});

describe("matchTrigger", () => {
  it("prefers whichever trigger is active", () => {
    expect(matchTrigger("/rev")).toMatchObject({ kind: "slash" });
    expect(matchTrigger("@src")).toMatchObject({ kind: "mention" });
  });

  it("returns null for plain text", () => {
    expect(matchTrigger("just a question")).toBeNull();
  });
});

describe("replaceTrigger / removeTrigger", () => {
  it("swaps the token for the replacement", () => {
    const match = matchSlashTrigger("/rev")!;
    expect(replaceTrigger("/rev", match, "/review ")).toBe("/review ");
  });

  it("keeps text before the trigger", () => {
    const match = matchMentionTrigger("look at @src/au")!;
    expect(replaceTrigger("look at @src/au", match, "@src/auth ")).toBe("look at @src/auth ");
  });

  it("removes the token and trims the gap left behind", () => {
    const match = matchSlashTrigger("run /model")!;
    expect(removeTrigger("run /model", match)).toBe("run");
  });

  it("does not fire once the token is closed by a space", () => {
    expect(matchSlashTrigger("run /model gpt")).toBeNull();
  });

  it("is a no-op when the trigger offset is stale", () => {
    const match = matchSlashTrigger("/rev")!;
    const stale = { ...match, start: 99 };
    expect(replaceTrigger("/rev", stale, "/review")).toBe("/rev");
  });
});