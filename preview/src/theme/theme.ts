/** Theme, UI scale and code-preview preferences. */

export type ThemePreference = "system" | "astral-dark" | "astral-light";
export type ResolvedTheme = "astral-dark" | "astral-light";

export const THEME_STORAGE_KEY = "astral:theme";
export const UI_FONT_SIZE_STORAGE_KEY = "astral:ui-font-size";

export const MIN_UI_FONT_SIZE_PX = 12;
export const MAX_UI_FONT_SIZE_PX = 20;
export const DEFAULT_UI_FONT_SIZE_PX = 14;

export interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  uiFontSizePx: number;
  lightCodeTheme: string;
  darkCodeTheme: string;
  showLineNumbers: boolean;
  wrapLongLines: boolean;
  codeFontSizePx: number;
}

export function clampUiFontSize(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_UI_FONT_SIZE_PX;
  return Math.min(MAX_UI_FONT_SIZE_PX, Math.max(MIN_UI_FONT_SIZE_PX, Math.round(px)));
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === "astral-dark") return "astral-dark";
  if (preference === "astral-light") return "astral-light";
  return prefersDark ? "astral-dark" : "astral-light";
}

/**
 * Write the resolved theme onto <html>.
 *
 * `dark` drives the `dark:` variants; the named class drives the branded palette.
 * `color-scheme` only understands `light`/`dark` — writing the branded name there is
 * silently ignored, which leaves native scrollbars and form controls on the OS theme.
 */
export function applyThemeToDocument(theme: ResolvedTheme) {
  const root = document.documentElement;
  const isDark = theme === "astral-dark";
  root.classList.toggle("dark", isDark);
  root.classList.toggle("theme-astral-dark", isDark);
  root.classList.toggle("theme-astral-light", !isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function applyUiFontSize(px: number) {
  document.documentElement.style.setProperty("--ui-font-size", `${clampUiFontSize(px)}px`);
}