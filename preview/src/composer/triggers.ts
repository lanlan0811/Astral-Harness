/**
 * Slash-command and @-mention trigger detection.
 *
 * Kept as pure text functions so the rules are testable without a DOM: the regexes
 * are the part most likely to regress, because a small change silently breaks
 * Chinese input or email addresses.
 */

export type TriggerKind = "slash" | "mention";

export interface TriggerMatch {
  kind: TriggerKind;
  /** The trigger character that opened it. */
  trigger: "/" | "@";
  /** Everything typed after the trigger. */
  query: string;
  /** Character offset where the trigger begins. */
  start: number;
}

const SLASH_RE = /(^|\s)(\/)([^\s]*)$/;
const MENTION_RE = /(^|[\s\p{Script=Han}　-〿＀-￯])(@)([^\s@]*)$/u;
// The separator class includes Han ideographs so `看看@src` works, which means the
// "an @ inside a word" guard has to be a veto rather than a separator restriction:
// otherwise every email address would open the panel.
const DOMAIN_LIKE_RE = /\S\.\S/;

/** The last slash-command token in `text`, or null. */
export function matchSlashTrigger(text: string): TriggerMatch | null {
  const match = SLASH_RE.exec(text);
  if (!match) return null;
  const start = text.length - match[2].length - match[3].length;
  return { kind: "slash", trigger: "/", query: match[3], start };
}

/** The last @-mention token in `text`, or null. */
export function matchMentionTrigger(text: string): TriggerMatch | null {
  const match = MENTION_RE.exec(text);
  if (!match) return null;
  const query = match[3];
  if (DOMAIN_LIKE_RE.test(query)) return null;
  const start = text.length - match[2].length - query.length;
  return { kind: "mention", trigger: "@", query, start };
}

export function matchTrigger(text: string): TriggerMatch | null {
  return matchSlashTrigger(text) ?? matchMentionTrigger(text);
}

/**
 * Replace the active trigger token with `replacement`.
 *
 * Returns the original text unchanged when the trigger has gone stale, so a slow
 * keystroke can't corrupt the draft.
 */
export function replaceTrigger(text: string, match: TriggerMatch, replacement: string): string {
  if (match.start < 0 || match.start > text.length) return text;
  return `${text.slice(0, match.start)}${replacement}`;
}

/**
 * Strip the trigger token entirely, for commands that run instead of inserting text.
 * Trims both sides so removing `/model` from "run /model" leaves "run", not "run ".
 */
export function removeTrigger(text: string, match: TriggerMatch): string {
  return replaceTrigger(text, match, "").trim();
}