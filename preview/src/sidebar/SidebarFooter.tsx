import { useIntl } from "../i18n";
import { useAppDispatch, useThemeActions, useThemeState } from "../store/AppStore";
import { Settings } from "lucide-react";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { BarChart3, Globe, LogOut, Palette, PencilRuler, Rocket, ZoomIn } from "lucide-react";

/**
 * Sidebar footer — reused verbatim at the bottom of the settings page.
 *
 * Order is fixed: language → theme → interface mode → zoom → usage → account.
 */
export function SidebarFooter() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const theme = useThemeState();
  const { setThemePreference } = useThemeActions();
  const { localePreference, setLocalePreference } = intl;

  return (
    <footer className="flex shrink-0 flex-col gap-2.5 px-4 pt-2 pb-4">
      <div className="flex min-w-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="lg"
              className="min-w-0 flex-1 justify-start gap-2 overflow-hidden rounded-tl-2xl rounded-bl-2xl border-0 pl-0"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-ui-base font-medium text-brand ring-1 ring-border">
                A
              </span>
              <span className="min-w-0 truncate text-ui-base font-semibold text-foreground">Astral Dev</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-max min-w-50" forceMount>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Globe className="size-4" />
                {intl.formatMessage({ id: "sidebar.language" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuRadioGroup
                  value={localePreference}
                  onValueChange={(value) => setLocalePreference(value as typeof localePreference)}
                >
                  <DropdownMenuRadioItem value="system">{intl.formatMessage({ id: "locale.system" })}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zh-CN">{intl.formatMessage({ id: "locale.zh-CN" })}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="en-US">{intl.formatMessage({ id: "locale.en-US" })}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="size-4" />
                {intl.formatMessage({ id: "sidebar.theme" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuRadioGroup
                  value={theme.preference}
                  onValueChange={(value) => setThemePreference(value as typeof theme.preference)}
                >
                  <DropdownMenuRadioItem value="system">{intl.formatMessage({ id: "theme.system" })}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="astral-dark">{intl.formatMessage({ id: "theme.dark" })}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="astral-light">{intl.formatMessage({ id: "theme.light" })}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PencilRuler className="size-4" />
                {intl.formatMessage({ id: "sidebar.interfaceMode" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                <DropdownMenuLabel className="sr-only">
                  {intl.formatMessage({ id: "sidebar.interfaceMode" })}
                </DropdownMenuLabel>
                <button
                  className="flex min-h-8 w-full items-center rounded-lg px-2 text-left text-ui-base hover:bg-menu-hover"
                  onSelect={() => dispatch({ type: "dialog/openSettings", sectionId: "general" })}
                >
                  {intl.formatMessage({ id: "settings.interfaceMode.coding" })}
                </button>
                <button
                  className="flex min-h-8 w-full items-center rounded-lg px-2 text-left text-ui-base hover:bg-menu-hover"
                  onSelect={() => dispatch({ type: "dialog/openSettings", sectionId: "general" })}
                >
                  {intl.formatMessage({ id: "settings.interfaceMode.office" })}
                </button>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="data-[disabled]:opacity-50">
                <ZoomIn className="size-4" />
                {intl.formatMessage({ id: "sidebar.zoom" })}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {/* Window zoom is owned by the host window, not the renderer — the
                    preview has no host, so the whole group is inert. */}
                {(["sidebar.zoomIn", "sidebar.zoomOut", "sidebar.actualSize"] as const).map((id) => (
                  <span key={id} className="flex min-h-8 items-center rounded-lg px-2 text-ui-base text-foreground-subtlest">
                    {intl.formatMessage({ id })}
                  </span>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <button
              className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-ui-base hover:bg-menu-hover"
              onSelect={() => dispatch({ type: "dialog/openSettings", sectionId: "usage" })}
            >
              <BarChart3 className="size-4" />
              {intl.formatMessage({ id: "sidebar.usage" })}
            </button>
            <button
              className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-ui-base hover:bg-menu-hover"
              onSelect={() => dispatch({ type: "dialog/openSettings", sectionId: "modelProvider" })}
            >
              <Rocket className="size-4" />
              {intl.formatMessage({ id: "sidebar.upgrade" })}
            </button>

            <DropdownMenuSeparator />

            <button
              className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-ui-base hover:bg-menu-hover"
              onSelect={() => dispatch({ type: "dialog/setOnboarding", open: true })}
            >
              <LogOut className="size-4" />
              {intl.formatMessage({ id: "sidebar.login" })}
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        <ControlHintTooltip title={intl.formatMessage({ id: "sidebar.openSettings" })} shortcut="Ctrl+," side="bottom">
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
            onClick={() => dispatch({ type: "dialog/openSettings", sectionId: "general" })}
          >
            <Settings className="size-4" />
          </Button>
        </ControlHintTooltip>
      </div>
    </footer>
  );
}