import { describe, expect, it } from "vitest";
import { eventToBinding, matchShortcutCommand, matchesAnyBinding, matchesBinding } from "./registry";
import { SHORTCUT_COMMANDS, findShortcutCommand } from "./registry";

function key(init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...init,
  } as KeyboardEvent;
}

describe("eventToBinding", () => {
  it("uppercases single characters", () => {
    expect(eventToBinding(key({ key: "k", metaKey: true }), true)).toBe("Cmd+K");
  });

  it("orders modifiers consistently", () => {
    expect(eventToBinding(key({ key: "p", ctrlKey: true, shiftKey: true }), false)).toBe("Ctrl+Shift+P");
  });

  it("names the space bar", () => {
    expect(eventToBinding(key({ key: " " }), false)).toBe("Space");
  });

  it("maps metaKey to Meta off Apple platforms", () => {
    expect(eventToBinding(key({ key: "k", metaKey: true }), false)).toBe("Meta+K");
  });
});

describe("matchesBinding", () => {
  it("resolves CmdOrCtrl per platform", () => {
    expect(matchesBinding(key({ key: "k", metaKey: true }), "CmdOrCtrl+k", true)).toBe(true);
    expect(matchesBinding(key({ key: "k", ctrlKey: true }), "CmdOrCtrl+k", false)).toBe(true);
  });

  it("rejects the wrong platform's modifier", () => {
    expect(matchesBinding(key({ key: "k", ctrlKey: true }), "CmdOrCtrl+k", true)).toBe(false);
  });

  it("requires every named modifier", () => {
    expect(matchesBinding(key({ key: "p", ctrlKey: true, shiftKey: true }), "CmdOrCtrl+Shift+p", false)).toBe(true);
    expect(matchesBinding(key({ key: "p", ctrlKey: true }), "CmdOrCtrl+Shift+p", false)).toBe(false);
  });

  it("rejects extra modifiers — Ctrl+m must not fire on Ctrl+Shift+m", () => {
    expect(matchesBinding(key({ key: "m", ctrlKey: true, shiftKey: true }), "Ctrl+m", false)).toBe(false);
  });

  it("is case-insensitive about the key", () => {
    expect(matchesBinding(key({ key: "K", ctrlKey: true }), "CmdOrCtrl+k", false)).toBe(true);
  });

  it("handles named keys", () => {
    expect(matchesBinding(key({ key: "Escape" }), "escape", false)).toBe(true);
  });
});

describe("matchesAnyBinding", () => {
  it("accepts when one of the bindings matches", () => {
    expect(matchesAnyBinding(key({ key: "p", ctrlKey: true, shiftKey: true }), ["CmdOrCtrl+k", "CmdOrCtrl+Shift+p"], false)).toBe(true);
  });

  it("rejects when none match", () => {
    expect(matchesAnyBinding(key({ key: "z", ctrlKey: true }), ["CmdOrCtrl+k"], false)).toBe(false);
  });
});

describe("matchShortcutCommand", () => {
  it("resolves the command palette shortcut", () => {
    expect(matchShortcutCommand(key({ key: "k", ctrlKey: true }), {}, false)).toBe("openCommandCenter");
  });

  it("returns null for an unbound key", () => {
    expect(matchShortcutCommand(key({ key: "q", ctrlKey: true, altKey: true }), {}, false)).toBeNull();
  });

  it("honours overrides over the default binding", () => {
    const overrides = { openCommandCenter: ["CmdOrCtrl+j"] };
    expect(matchShortcutCommand(key({ key: "j", ctrlKey: true }), overrides, false)).toBe("openCommandCenter");
    expect(matchShortcutCommand(key({ key: "k", ctrlKey: true }), overrides, false)).toBeNull();
  });
});

describe("SHORTCUT_COMMANDS", () => {
  it("has unique ids", () => {
    const ids = SHORTCUT_COMMANDS.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares at least one binding for every visible command", () => {
    const visible = SHORTCUT_COMMANDS.filter((command) => !command.hidden);
    expect(visible.every((command) => command.defaultBindings.length > 0)).toBe(true);
  });

  it("never declares the same binding twice", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const command of SHORTCUT_COMMANDS) {
      for (const binding of command.defaultBindings) {
        const owner = seen.get(binding);
        if (owner) clashes.push(`${binding}: ${owner} vs ${command.id}`);
        seen.set(binding, command.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("finds a command by id", () => {
    expect(findShortcutCommand("toggleSidebar")?.defaultBindings).toEqual(["CmdOrCtrl+b"]);
    expect(findShortcutCommand("nope")).toBeUndefined();
  });
});