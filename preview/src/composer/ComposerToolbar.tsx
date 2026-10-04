import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import type { PermissionMode } from "../store/reducer";
import { MOCK_MODELS, MOCK_THOUGHT_LEVELS } from "../mock/data";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { ControlHintTooltip } from "../components/ui/tooltip";
import { MeterBar } from "../components/ui/controls";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/overlays";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { formatCompactNumber } from "../lib/format";
import { Brain, ChevronDown, Hand, Lightbulb, MonitorCog, NotepadText, Package, ShieldAlert, ShieldCheck, X } from "lucide-react";

const CONTEXT_USED = 18_400;
const CONTEXT_TOTAL = 200_000;

/** Leading toolbar: attachment menu, permission mode, plan chip. */
export function ComposerLeadingActions() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const modeIcon = () => {
    if (state.permissionMode === "yolo") return <ShieldAlert className="size-4" />;
    if (state.permissionMode === "plan") return <NotepadText className="size-4" />;
    if (state.permissionMode === "edit") return <ShieldCheck className="size-4" />;
    return <Hand className="size-4" />;
  };

  const modeLabel = () => {
    if (state.permissionMode === "yolo") return "chat.composer.mode.yolo";
    if (state.permissionMode === "plan") return "chat.composer.mode.plan";
    if (state.permissionMode === "edit") return "chat.composer.mode.edit";
    return "chat.composer.mode.build";
  };

  const modes: Array<{ value: PermissionMode; labelId: string; descriptionId: string; icon: React.ReactNode }> = [
    { value: "build", labelId: "chat.composer.mode.build", descriptionId: "chat.composer.mode.buildDescription", icon: <Hand className="size-4.5" /> },
    { value: "edit", labelId: "chat.composer.mode.edit", descriptionId: "chat.composer.mode.editDescription", icon: <ShieldCheck className="size-4.5" /> },
    { value: "plan", labelId: "chat.composer.mode.plan", descriptionId: "chat.composer.mode.planDescription", icon: <NotepadText className="size-4.5" /> },
    { value: "yolo", labelId: "chat.composer.mode.yolo", descriptionId: "chat.composer.mode.yoloDescription", icon: <ShieldAlert className="size-4.5" /> },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-2 text-ui-base">
            {modeIcon()}
            <span className="max-w-40 truncate">{intl.formatMessage({ id: modeLabel() })}</span>
            <ChevronDown className="size-3.5 text-foreground-subtle" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" sideOffset={4} className="w-64">
          <DropdownMenuCheckboxItem
            checked={state.planEnabled}
            onCheckedChange={(checked) => dispatch({ type: "composer/setPlanEnabled", enabled: Boolean(checked) })}
          >
            <Lightbulb className="mt-0.5 size-4.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">{intl.formatMessage({ id: "chat.composer.planChip" })}</span>
              <span className="mt-0.5 block text-ui-sm text-foreground-subtle">
                {intl.formatMessage({ id: "chat.composer.mode.planDescription" })}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={state.permissionMode}
            onValueChange={(value) => dispatch({ type: "composer/setPermissionMode", mode: value as PermissionMode })}
          >
            {modes.map((mode) => (
              <DropdownMenuRadioItem key={mode.value} value={mode.value} className="min-h-13 items-start gap-3 py-2">
                <span className="mt-0.5 shrink-0 text-foreground-subtle">{mode.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{intl.formatMessage({ id: mode.labelId })}</span>
                  <span className="mt-0.5 block text-ui-sm text-foreground-subtle">
                    {intl.formatMessage({ id: mode.descriptionId })}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {state.planEnabled ? (
        <span className="flex items-center gap-1">
          <span role="separator" className="h-3 w-px bg-border" />
          <ControlHintTooltip title={intl.formatMessage({ id: "chat.composer.planChipTitle" })} side="top">
            <Button
              variant="ghost"
              size="sm"
              className="group/plan h-7 gap-1 rounded-lg px-2 text-ui-base text-foreground-subtle"
              onClick={() => dispatch({ type: "composer/setPlanEnabled", enabled: false })}
            >
              <Lightbulb className="size-4 group-hover/plan:hidden" />
              <X className="hidden size-4 group-hover/plan:block" />
              {intl.formatMessage({ id: "chat.composer.planChip" })}
            </Button>
          </ControlHintTooltip>
        </span>
      ) : null}

      <ControlHintTooltip title={intl.formatMessage({ id: "chat.composer.computerUse" })} side="top">
        <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-1.5 text-ui-base text-foreground-subtle">
          <MonitorCog className="size-4" />
          {intl.formatMessage({ id: "chat.composer.computerUse" })}
        </Button>
      </ControlHintTooltip>
    </>
  );
}

/**
 * Trailing cluster, left to right: context meter → model → thought level.
 *
 * The meter is leftmost on purpose — it reads as a gauge on the input, while the
 * model and level are settings you act on.
 */
export function ComposerTrailingActions() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const currentModel = MOCK_MODELS.find((model) => model.id === state.model) ?? MOCK_MODELS[0];
  const usedFraction = CONTEXT_USED / CONTEXT_TOTAL;

  return (
    <>
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button
            variant="ghost"
            size="icon-md"
            className="shrink-0 text-foreground-subtle hover:bg-hover hover:text-foreground"
            aria-label={intl.formatMessage(
              { id: "chat.composer.context.usage" },
              { used: formatCompactNumber(CONTEXT_USED), total: formatCompactNumber(CONTEXT_TOTAL) },
            )}
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.7"
                strokeDasharray={`${usedFraction * 62.8} 62.8`}
                transform="rotate(-90 12 12)"
              />
            </svg>
          </Button>
        </HoverCardTrigger>
        <HoverCardContent side="top" sideOffset={2} className="w-64 p-0">
          <div className="w-full space-y-3 bg-menu p-3 text-foreground">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-ui-base font-medium">{intl.formatMessage({ id: "chat.composer.context.windows" })}</span>
              <span className="ml-auto font-mono text-ui-sm text-foreground-subtle tabular-nums">
                {formatCompactNumber(CONTEXT_USED)} / {formatCompactNumber(CONTEXT_TOTAL)}
              </span>
            </div>
            <MeterBar value={usedFraction} />
            <div className="grid gap-1.5">
              {[
                { label: "src/auth", value: 0.52 },
                { label: "src/routes", value: 0.26 },
                { label: "conversation", value: 0.22 },
              ].map((entry) => (
                <div key={entry.label} className="flex gap-2 text-ui-sm">
                  <span className="size-2 shrink-0 rounded-sm border border-border" style={{ background: `color-mix(in oklab, var(--color-brand) ${Math.round(entry.value * 100)}%, transparent)` }} />
                  <span className="min-w-0 flex-1 truncate text-foreground-subtle">{entry.label}</span>
                  <span className="ml-auto min-w-10 text-right font-mono tabular-nums">
                    {formatCompactNumber(CONTEXT_USED * entry.value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-2">
              <div className="text-ui-sm text-foreground-subtle">{intl.formatMessage({ id: "chat.composer.context.cacheHitRate" })}</div>
              <MeterBar value={0.84} tone="success" />
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg pr-1.5 pl-2 text-ui-base whitespace-nowrap">
            <Package className="size-4 shrink-0 text-foreground-subtle" />
            <span className="max-w-48 truncate">{currentModel.name}</span>
            <ChevronDown className="size-3.5 shrink-0 text-foreground-subtle" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" sideOffset={2} className="w-72">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="min-h-8">
              {currentModel.provider}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72">
              {MOCK_MODELS.filter((model) => model.provider === currentModel.provider).map((model) => (
                <DropdownMenuRadioItem key={model.id} value={model.id} onSelect={() => dispatch({ type: "composer/setModel", model: model.id })}>
                  <span className="min-w-0 flex-1 truncate text-left">{model.name}</span>
                  {model.badge ? (
                    <span className="shrink-0 rounded-full bg-surface px-1 py-px text-ui-xs font-medium text-foreground-subtle">
                      {model.badge}
                    </span>
                  ) : null}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="min-h-8">Anthropic</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72">
              {MOCK_MODELS.filter((model) => model.provider === "Anthropic").map((model) => (
                <DropdownMenuRadioItem key={model.id} value={model.id} onSelect={() => dispatch({ type: "composer/setModel", model: model.id })}>
                  <span className="min-w-0 flex-1 truncate text-left">{model.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => dispatch({ type: "dialog/openSettings", sectionId: "modelProvider" })}>
            {intl.formatMessage({ id: "chat.composer.model.manage" })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-1.5 text-ui-base">
            <Brain className="size-4 shrink-0" />
            <span className="relative w-1 self-stretch overflow-hidden rounded-full bg-current/10">
              <span
                className="absolute bottom-0 left-0 w-full rounded-full bg-success transition-[height] duration-300"
                style={{
                  height: `${((MOCK_THOUGHT_LEVELS.indexOf(state.thoughtLevel as (typeof MOCK_THOUGHT_LEVELS)[number]) + 1) / MOCK_THOUGHT_LEVELS.length) * 100}%`,
                }}
              />
            </span>
            <span className="max-w-24 truncate">
              {intl.formatMessage({ id: `chat.composer.thoughtLevel.${state.thoughtLevel}` })}
            </span>
            <ChevronDown className="size-3.5 text-foreground-subtle" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" sideOffset={4} className="w-44">
          <DropdownMenuLabel className="sr-only">{intl.formatMessage({ id: "chat.composer.thoughtLevel" })}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={state.thoughtLevel}
            onValueChange={(value) => dispatch({ type: "composer/setThoughtLevel", level: value })}
          >
            {MOCK_THOUGHT_LEVELS.map((level) => (
              <DropdownMenuRadioItem key={level} value={level}>
                {intl.formatMessage({ id: `chat.composer.thoughtLevel.${level}` })}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function ComposerButtonCluster({ canSend, running }: { canSend: boolean; running: boolean }) {
  const intl = useIntl();

  if (running) {
    return (
      <ControlHintTooltip title={intl.formatMessage({ id: "chat.stop" })} shortcut="Esc" side="top">
        <Button variant="secondary" size="icon-md" className="text-foreground">
          <span className="size-2.5 rounded-[2px] bg-current" />
        </Button>
      </ControlHintTooltip>
    );
  }

  return (
    <ControlHintTooltip title={intl.formatMessage({ id: "chat.send" })} shortcut="Enter" side="top">
      <Button
        type="submit"
        variant="brand"
        size="icon-md"
        disabled={!canSend}
        className={cn(!canSend && "bg-brand/40")}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>
    </ControlHintTooltip>
  );
}