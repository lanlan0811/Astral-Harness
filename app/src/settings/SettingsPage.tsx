import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";
import { SidebarFooter } from "../sidebar/SidebarFooter";
import { SettingsIcon } from "./SettingsIcon";
import { SettingsContent } from "./SettingsSections";
import {
  DEFAULT_SETTINGS_SECTION_ID,
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  sectionsInGroup,
} from "./settingsPageConfig";

/**
 * Settings is an overlay, not a route swap.
 *
 * The workspace stays mounted underneath and is only made inert, because the
 * command palette lives inside that subtree — unmounting or `display:none`-ing it
 * would hide an open dialog.
 */
export function SettingsPage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const activeSectionId = state.settingsSectionId ?? DEFAULT_SETTINGS_SECTION_ID;
  const activeSection = SETTINGS_SECTIONS.find((section) => section.id === activeSectionId);

  return (
    <div className="relative grid h-full min-h-0 w-full grid-cols-[68px_minmax(0,1fr)] lg:grid-cols-[268px_minmax(0,1fr)]">
      <div className="flex h-full flex-col">
        <div className="h-12 shrink-0" data-drag-region="drag" />
        <div className="px-2 pt-3 pb-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => dispatch({ type: "dialog/openSettings", sectionId: null })}
            className="m-1 w-[calc(100%-0.5rem)] justify-start gap-2 rounded-xl px-1.5 max-lg:size-10 max-lg:justify-center max-lg:px-0"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="max-lg:sr-only">{intl.formatMessage({ id: "settings.backToWorkspace" })}</span>
          </Button>
        </div>

        <nav aria-label={intl.formatMessage({ id: "settings.navLabel" })} className="flex-1 overflow-y-auto px-2 pb-3">
          <div className="space-y-4">
            {SETTINGS_GROUPS.map((group, groupIndex) => (
              <div key={group.id} role="group" className={cn("space-y-1", groupIndex > 0 && "max-lg:border-t max-lg:border-border max-lg:pt-3")}>
                <div className="px-2.5 pb-1 text-ui-sm font-medium text-foreground-subtlest max-lg:sr-only">
                  {intl.formatMessage({ id: group.labelKey })}
                </div>
                {sectionsInGroup(group.id).map((section) => (
                  <NavItem key={section.id} sectionId={section.id} icon={section.icon} label={intl.formatMessage({ id: section.labelKey })} active={section.id === activeSectionId} />
                ))}
              </div>
            ))}
          </div>

          <ControlHintTooltip title={intl.formatMessage({ id: "settings.onboarding" })} side="right">
            <Button
              variant="ghost"
              size="lg"
              className="mt-4 w-full justify-start gap-2 rounded-xl border border-dashed border-border px-2.5 max-lg:size-10 max-lg:justify-center max-lg:px-0"
              onClick={() => dispatch({ type: "dialog/setOnboarding", open: true })}
            >
              <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.9-.9.9-2.3 0-3.2a2.2 2.2 0 0 0-3 .2ZM14.5 4.5 19 9M12 7l5 5M9 10l-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="max-lg:sr-only">{intl.formatMessage({ id: "settings.onboarding" })}</span>
            </Button>
          </ControlHintTooltip>
        </nav>

        <div className="max-lg:hidden">
          <SidebarFooter />
        </div>
      </div>

      <section className="flex min-h-0 flex-col p-1 pl-0 pt-0">
        <div className="h-1 shrink-0" data-drag-region="drag" />
        <div className="relative flex h-full min-h-0 flex-col rounded-xl border border-border bg-background">
          <div className="flex h-12 shrink-0 items-center gap-2 px-2.5">
            <span className="min-w-0 flex-1 truncate text-ui-base text-foreground-subtle" aria-current="page">
              {activeSection ? intl.formatMessage({ id: activeSection.labelKey }) : ""}
            </span>
            <Button
              variant="ghost"
              size="icon-md"
              className="text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
              onClick={() => dispatch({ type: "dialog/openSettings", sectionId: null })}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </Button>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-10 lg:px-8">
              <SettingsContent sectionId={activeSectionId} />
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}

function NavItem({ sectionId, icon, label, active }: { sectionId: string; icon: string; label: string; active: boolean }) {
  const dispatch = useAppDispatch();
  return (
    <ControlHintTooltip title={label} side="right" align="center">
      <Button
        variant="ghost"
        size="lg"
        aria-current={active ? "page" : undefined}
        onClick={() => dispatch({ type: "dialog/openSettings", sectionId })}
        className={cn(
          "h-8 w-full justify-start gap-2 rounded-xl px-2.5 text-left max-lg:mx-auto max-lg:size-10 max-lg:justify-center max-lg:px-0",
          active ? "bg-surface-hover text-foreground" : "text-foreground-subtle hover:bg-surface-hover hover:text-foreground",
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          <SettingsIcon name={icon} />
        </span>
        <span className="truncate max-lg:sr-only">{label}</span>
      </Button>
    </ControlHintTooltip>
  );
}