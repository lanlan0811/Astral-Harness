/**
 * The single source of truth for keyboard bindings.
 *
 * Bindings are accelerator strings (`CmdOrCtrl+Shift+p`). Matching is *exact*: a
 * binding requires precisely the modifiers it names. That is deliberate — accepting
 * extra modifiers makes `Ctrl+m` fire on `Ctrl+Shift+m`, which is a real command.
 */

export type ShortcutScope = "composer" | "global";

export interface ShortcutCommand {
  id: string;
  labelKey: string;
  defaultBindings: string[];
  scope: ShortcutScope;
  /** Hidden commands still work; they just don't clutter the settings table. */
  hidden?: boolean;
}

export const SHORTCUT_COMMANDS: ShortcutCommand[] = [
  // window / global
  { id: "openCommandCenter", labelKey: "quickPick.command.title.commandCenter", defaultBindings: ["CmdOrCtrl+k", "CmdOrCtrl+Shift+p"], scope: "global" },
  { id: "openSettings", labelKey: "quickPick.command.settings", defaultBindings: ["CmdOrCtrl+,"], scope: "global" },
  { id: "findInTask", labelKey: "settings.shortcuts.title", defaultBindings: ["CmdOrCtrl+f"], scope: "global" },
  { id: "toggleSidebar", labelKey: "shell.toggleSidebar", defaultBindings: ["CmdOrCtrl+b"], scope: "global" },
  { id: "switchTheme", labelKey: "quickPick.command.switchTheme", defaultBindings: ["CmdOrCtrl+Shift+l"], scope: "global" },
  { id: "toggleTerminal", labelKey: "shell.toggleTerminal", defaultBindings: ["CmdOrCtrl+j"], scope: "global" },
  { id: "toggleSidePane", labelKey: "shell.toggleSidePane", defaultBindings: ["CmdOrCtrl+Alt+b"], scope: "global" },
  { id: "previousTask", labelKey: "quickPick.scope.tasks", defaultBindings: ["CmdOrCtrl+Shift+["], scope: "global" },
  { id: "nextTask", labelKey: "quickPick.scope.tasks", defaultBindings: ["CmdOrCtrl+Shift+]"], scope: "global" },
  { id: "navigateBack", labelKey: "shell.back", defaultBindings: ["CmdOrCtrl+["], scope: "global" },
  { id: "navigateForward", labelKey: "shell.forward", defaultBindings: ["CmdOrCtrl+]"], scope: "global" },
  // Ctrl-only, never CmdOrCtrl: on macOS Cmd+M is physically identical to Ctrl+M,
  // so a CmdOrCtrl binding here would make the model menu unbindable.
  { id: "openModelMenu", labelKey: "quickPick.command.title.model", defaultBindings: ["Ctrl+m"], scope: "global" },
  { id: "cycleSessionMode", labelKey: "chat.composer.mode.build", defaultBindings: ["Ctrl+Shift+m"], scope: "global" },
  { id: "cycleThoughtLevel", labelKey: "chat.composer.thoughtLevel", defaultBindings: ["Ctrl+t"], scope: "global" },
  { id: "newTask", labelKey: "shell.newTask", defaultBindings: ["CmdOrCtrl+n"], scope: "global" },
  { id: "openWorkspace", labelKey: "quickPick.command.openWorkspace", defaultBindings: ["CmdOrCtrl+o"], scope: "global" },
  { id: "zoomIn", labelKey: "sidebar.zoomIn", defaultBindings: ["CmdOrCtrl+="], scope: "global" },
  { id: "zoomOut", labelKey: "sidebar.zoomOut", defaultBindings: ["CmdOrCtrl+-"], scope: "global" },
  { id: "resetZoom", labelKey: "sidebar.actualSize", defaultBindings: ["CmdOrCtrl+0"], scope: "global" },
  // composer
  { id: "composerSend", labelKey: "chat.send", defaultBindings: ["Enter"], scope: "composer" },
  { id: "composerInsertNewline", labelKey: "chat.composer.title.newline", defaultBindings: ["Shift+Enter"], scope: "composer" },
  // hidden
  { id: "toggleInterfaceMode", labelKey: "settings.interfaceMode", defaultBindings: ["CmdOrCtrl+Shift+u"], scope: "global", hidden: true },
  { id: "openOnboarding", labelKey: "onboarding.open", defaultBindings: ["CmdOrCtrl+Shift+o"], scope: "global", hidden: true },
];

export function findShortcutCommand(id: string): ShortcutCommand | undefined {
  return SHORTCUT_COMMANDS.find((command) => command.id === id);
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent || navigator.platform || "");
}

/** Normalise a KeyboardEvent into accelerator-string form. */
export function eventToBinding(event: KeyboardEvent, apple = isApplePlatform()): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  // On macOS the Cmd key reports as `metaKey`; elsewhere a stray metaKey means AltGr.
  if (event.metaKey) parts.push(apple ? "Cmd" : "Meta");
  if (event.shiftKey) parts.push("Shift");

  let key = event.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join("+");
}

export function matchesBinding(event: KeyboardEvent, binding: string, apple = isApplePlatform()): boolean {
  const expected = binding.split("+").map((part) => part.trim());
  const actual = eventToBinding(event, apple).split("+");

  const expectedKey = expected[expected.length - 1];
  const actualKey = actual[actual.length - 1];
  if (expectedKey.toLowerCase() !== actualKey.toLowerCase()) return false;

  const resolve = (token: string): string | null => {
    if (token === "CmdOrCtrl") return apple ? "Cmd" : "Ctrl";
    if (token === "Meta") return apple ? "Cmd" : "Meta";
    return token;
  };

  const expectedModifiers = expected.slice(0, -1).map(resolve).sort();
  const actualModifiers = actual.slice(0, -1).sort();
  if (expectedModifiers.length !== actualModifiers.length) return false;
  return expectedModifiers.every((modifier, index) => modifier === actualModifiers[index]);
}

export function matchesAnyBinding(event: KeyboardEvent, bindings: string[], apple = isApplePlatform()): boolean {
  return bindings.some((binding) => matchesBinding(event, binding, apple));
}

/** Which command a key event fires, if any. */
export function matchShortcutCommand(
  event: KeyboardEvent,
  overrides: Record<string, string[]> = {},
  apple = isApplePlatform(),
): string | null {
  for (const command of SHORTCUT_COMMANDS) {
    const bindings = overrides[command.id] ?? command.defaultBindings;
    if (matchesAnyBinding(event, bindings, apple)) return command.id;
  }
  return null;
}