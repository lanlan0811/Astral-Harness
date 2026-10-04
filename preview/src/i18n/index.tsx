import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import enUS from "./locales/en-US";
import zhCN from "./locales/zh-CN";

export type Locale = "en-US" | "zh-CN";
export type LocalePreference = "system" | Locale;

export const SUPPORTED_LOCALES: Locale[] = ["en-US", "zh-CN"];
export const DEFAULT_LOCALE: Locale = "en-US";

const MESSAGES: Record<Locale, Record<string, string>> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

const LOCALE_STORAGE_KEY = "astral:locale-preference";

export interface MessageDescriptor {
  id: string;
}

export interface IntlInstance {
  /**
   * Look up `id` and substitute `{placeholder}` tokens.
   *
   * A missing key renders as the key itself — that turns a forgotten translation into
   * a visible marker in the UI instead of a silent blank.
   */
  formatMessage(descriptor: MessageDescriptor, values?: Record<string, string | number>): string;
}

interface IntlContextValue {
  intl: IntlInstance;
  /** The locale actually in use. */
  locale: Locale;
  localePreference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => void;
}

const IntlContext = createContext<IntlContextValue | null>(null);

export function resolveSystemLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export function resolveLocale(preference: LocalePreference): Locale {
  if (preference === "system") return resolveSystemLocale();
  return MESSAGES[preference] ? preference : DEFAULT_LOCALE;
}

function readStoredPreference(): LocalePreference {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "system" || stored === "en-US" || stored === "zh-CN") return stored;
  } catch {
    // localStorage can be unavailable (private mode, disabled cookies) — fall through.
  }
  return "system";
}

function writeStoredPreference(preference: LocalePreference) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, preference);
  } catch {
    // Persistence is best-effort; the in-memory preference still applies this session.
  }
}

export function createIntl(locale: Locale): IntlInstance {
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  return {
    formatMessage(descriptor, values) {
      const template = messages[descriptor.id] ?? descriptor.id;
      if (!values) return template;
      return Object.entries(values).reduce(
        (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
        template,
      );
    },
  };
}

export function IntlProvider({ children }: { children: ReactNode }) {
  const [localePreference, setPreference] = useState<LocalePreference>(readStoredPreference);

  const setLocalePreference = useCallback((preference: LocalePreference) => {
    setPreference(preference);
    writeStoredPreference(preference);
  }, []);

  const value = useMemo<IntlContextValue>(() => {
    const locale = resolveLocale(localePreference);
    return { intl: createIntl(locale), locale, localePreference, setLocalePreference };
  }, [localePreference, setLocalePreference]);

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useIntl(): IntlContextValue {
  const value = useContext(IntlContext);
  if (!value) throw new Error("useIntl must be used inside <IntlProvider>");
  return value;
}

/** Shorthand for components that only need to format strings. */
export function useFormatMessage() {
  return useIntl().intl.formatMessage;
}