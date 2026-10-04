import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { appReducer, createInitialState, SIDEBAR_DEFAULT_WIDTH_PX, SIDEBAR_STORAGE_KEY, type AppAction, type AppState } from "./reducer";
import { MOCK_ACTIVE_TASK_ID, MOCK_PROJECTS, MOCK_TASKS, MOCK_TERMINAL_TABS } from "../mock/data";
import {
  applyThemeToDocument,
  applyUiFontSize,
  clampUiFontSize,
  DEFAULT_UI_FONT_SIZE_PX,
  resolveTheme,
  THEME_STORAGE_KEY,
  UI_FONT_SIZE_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
  type ThemeState,
} from "../theme/theme";

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);
const ThemeContext = createContext<ThemeState | null>(null);

export interface ThemeActions {
  setThemePreference: (preference: ThemePreference) => void;
  setUiFontSizePx: (px: number) => void;
}

const ThemeActionsContext = createContext<ThemeActions | null>(null);

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable — the in-memory preference still applies.
  }
}

function readStoredWidth(): number {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : SIDEBAR_DEFAULT_WIDTH_PX;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH_PX;
  }
}

function readStoredTheme(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "system" || raw === "astral-dark" || raw === "astral-light") return raw;
  } catch {
    // Best effort — fall through to the default below.
  }
  return "astral-dark";
}

function readStoredFontSize(): number {
  try {
    const raw = window.localStorage.getItem(UI_FONT_SIZE_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? clampUiFontSize(parsed) : DEFAULT_UI_FONT_SIZE_PX;
  } catch {
    return DEFAULT_UI_FONT_SIZE_PX;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    appReducer,
    undefined,
    (): AppState =>
      createInitialState({
        projects: MOCK_PROJECTS,
        tasks: MOCK_TASKS,
        activeTaskId: MOCK_ACTIVE_TASK_ID,
        terminalTabs: MOCK_TERMINAL_TABS,
        sidebarWidthPx: readStoredWidth(),
      }),
  );

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(readStoredTheme);
  const [uiFontSizePx, setUiFontSizeState] = useState<number>(readStoredFontSize);
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  // Only follow the OS while the preference is actually "system".
  useEffect(() => {
    if (themePreference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [themePreference]);

  const resolved: ResolvedTheme = useMemo(
    () => resolveTheme(themePreference, prefersDark),
    [themePreference, prefersDark],
  );

  useEffect(() => {
    applyThemeToDocument(resolved);
  }, [resolved]);

  useEffect(() => {
    applyUiFontSize(uiFontSizePx);
  }, [uiFontSizePx]);

  useEffect(() => {
    persist(SIDEBAR_STORAGE_KEY, String(state.sidebarWidthPx));
  }, [state.sidebarWidthPx]);

  useEffect(() => {
    persist(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    persist(UI_FONT_SIZE_STORAGE_KEY, String(uiFontSizePx));
  }, [uiFontSizePx]);

  const themeState = useMemo<ThemeState>(
    () => ({
      preference: themePreference,
      resolved,
      uiFontSizePx,
      lightCodeTheme: "github-light",
      darkCodeTheme: "github-dark",
      showLineNumbers: true,
      wrapLongLines: false,
      codeFontSizePx: 12,
    }),
    [themePreference, resolved, uiFontSizePx],
  );

  const themeActions = useMemo<ThemeActions>(
    () => ({
      setThemePreference: (preference) => {
        persist(THEME_STORAGE_KEY, preference);
        setThemePreferenceState(preference);
      },
      setUiFontSizePx: (px) => {
        const clamped = clampUiFontSize(px);
        persist(UI_FONT_SIZE_STORAGE_KEY, String(clamped));
        setUiFontSizeState(clamped);
      },
    }),
    [],
  );

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <ThemeContext.Provider value={themeState}>
          <ThemeActionsContext.Provider value={themeActions}>{children}</ThemeActionsContext.Provider>
        </ThemeContext.Provider>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error("useAppState must be used inside <AppStoreProvider>");
  return state;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) throw new Error("useAppDispatch must be used inside <AppStoreProvider>");
  return dispatch;
}

export function useThemeState(): ThemeState {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemeState must be used inside <AppStoreProvider>");
  return value;
}

export function useThemeActions(): ThemeActions {
  const actions = useContext(ThemeActionsContext);
  if (!actions) throw new Error("useThemeActions must be used inside <AppStoreProvider>");
  return actions;
}