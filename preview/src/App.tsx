import { useEffect } from "react";
import { useAppDispatch, useAppState, useThemeActions, useThemeState } from "./store/AppStore";
import { useIntl } from "./i18n";
import { isApplePlatform, matchShortcutCommand } from "./shortcuts/registry";
import { AppShell } from "./shell/AppShell";
import { SettingsPage } from "./settings/SettingsPage";
import { CommandCenterDialog } from "./commandcenter/CommandCenterDialog";
import { Onboarding } from "./onboarding/Onboarding";
import { TaskRenameDialog } from "./dialogs/TaskRenameDialog";
import { cn } from "./lib/cn";

/**
 * One capture-phase keydown listener for every global shortcut.
 *
 * Capture, not bubble: the composer and the command palette both handle keys, and a
 * bubble-phase listener would fire after they had already acted on it.
 */
function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const theme = useThemeState();
  const { setThemePreference } = useThemeActions();
  const apple = isApplePlatform();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      const command = matchShortcutCommand(event, {}, apple);
      if (!command) return;

      switch (command) {
        case "openCommandCenter":
          event.preventDefault();
          dispatch({ type: "dialog/setCommandCenter", open: !state.commandCenterOpen });
          break;
        case "openSettings":
          event.preventDefault();
          dispatch({ type: "dialog/openSettings", sectionId: state.settingsSectionId ? null : "general" });
          break;
        case "toggleSidebar":
          event.preventDefault();
          dispatch({ type: "sidebar/setVisible", visible: !state.sidebarVisible });
          break;
        case "toggleTerminal":
          event.preventDefault();
          dispatch({ type: "terminal/toggle" });
          break;
        case "toggleSidePane":
          event.preventDefault();
          dispatch({ type: "sidePane/toggle" });
          break;
        case "switchTheme":
          event.preventDefault();
          setThemePreference(theme.resolved === "astral-dark" ? "astral-light" : "astral-dark");
          break;
        case "openOnboarding":
          event.preventDefault();
          dispatch({ type: "dialog/setOnboarding", open: !state.onboardingOpen });
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [apple, dispatch, setThemePreference, state.commandCenterOpen, state.onboardingOpen, state.settingsSectionId, state.sidebarVisible, theme.resolved]);
}

export function App() {
  const state = useAppState();
  const intl = useIntl();
  useGlobalShortcuts();

  const settingsOpen = state.settingsSectionId !== null;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* The workspace stays mounted under the settings overlay — only made inert —
          so an open command palette is not destroyed by navigating to settings. */}
      <div
        className={cn("h-full", settingsOpen && "opacity-0 pointer-events-none")}
        aria-hidden={settingsOpen || undefined}
        {...(settingsOpen ? { inert: true } : {})}
      >
        <AppShell />
      </div>

      {settingsOpen ? (
        <div className="absolute inset-0 z-40">
          <SettingsPage />
        </div>
      ) : null}

      <CommandCenterDialog />
      <TaskRenameDialog />
      <Onboarding />

      <span className="sr-only" aria-live="polite">
        {intl.formatMessage({ id: "app.name" })}
      </span>
    </div>
  );
}