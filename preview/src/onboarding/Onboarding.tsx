import { useState } from "react";
import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/controls";

type Step = "occupation" | "mode" | "preferences";

const STEPS: Step[] = ["occupation", "mode", "preferences"];

const OCCUPATIONS = [
  { id: "frontend", label: "Frontend", detail: "Web apps, design systems, interaction" },
  { id: "backend", label: "Backend", detail: "Services, APIs, data modelling" },
  { id: "fullstack", label: "Full stack", detail: "Everything end to end" },
  { id: "infra", label: "Infrastructure", detail: "Build, deploy, observability" },
  { id: "data", label: "Data & ML", detail: "Pipelines, models, analysis" },
  { id: "other", label: "Something else", detail: "None of the above" },
];

/**
 * First-run takeover.
 *
 * It wraps the app rather than overlaying it — a half-visible workspace behind a
 * modal reads as "you can skip this", and the whole point is that this is the first
 * thing you should decide.
 */
export function Onboarding() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const [stepIndex, setStepIndex] = useState(0);
  const [occupation, setOccupation] = useState<string | null>(null);
  const [mode, setMode] = useState<"coding" | "office" | null>(null);
  const [suggestions, setSuggestions] = useState(true);
  const [memory, setMemory] = useState(true);

  if (!state.onboardingOpen) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canAdvance = step === "occupation" ? occupation !== null : step === "mode" ? mode !== null : true;

  return (
    <main className="fixed inset-0 z-90 flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12" data-drag-region="drag" />

      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-6 sm:px-10">
        <span />
        <ol className="flex w-28 items-center gap-2">
          {STEPS.map((entry, index) => (
            <li
              key={entry}
              className={cn("h-1 flex-1 rounded-full", index <= stepIndex ? "bg-primary" : "bg-border")}
              aria-label={intl.formatMessage({ id: "onboarding.step" }, { current: index + 1, total: STEPS.length })}
            />
          ))}
        </ol>
        <button
          className="ml-auto inline-flex size-9 items-center justify-center rounded-xl text-foreground-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
          onClick={() => dispatch({ type: "dialog/setOnboarding", open: false })}
          aria-label={intl.formatMessage({ id: "common.close" })}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2 lg:gap-1 lg:p-1">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4 sm:px-10">
          <div className="mx-auto my-auto w-full max-w-lg shrink-0">
            <h1 className="text-center text-ui-xl font-semibold tracking-tight text-foreground">
              {intl.formatMessage({ id: `onboarding.step.${step}.title` })}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-center text-ui-base leading-relaxed text-foreground-subtle">
              {intl.formatMessage({ id: `onboarding.step.${step}.description` })}
            </p>

            <div className="mt-8 space-y-3">
              {step === "occupation" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {OCCUPATIONS.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setOccupation(entry.id)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors",
                        occupation === entry.id
                          ? "border-foreground/60 bg-card-selected"
                          : "border-card-border bg-card hover:border-border-hover hover:bg-surface-hover",
                      )}
                    >
                      <span className="text-ui-base font-medium text-foreground">{entry.label}</span>
                      <span className="text-ui-sm leading-relaxed text-foreground-subtle">{entry.detail}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === "mode" ? (
                <div role="group" className="space-y-3">
                  {(["coding", "office"] as const).map((entry) => (
                    <button
                      key={entry}
                      onClick={() => setMode(entry)}
                      className={cn(
                        "flex w-full items-start gap-4 rounded-xl border p-5 text-left transition-colors",
                        mode === entry ? "border-foreground/60 bg-card-selected" : "border-card-border bg-card hover:border-border-hover",
                      )}
                    >
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border">
                        {mode === entry ? (
                          <span className="size-2 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-ui-base font-medium text-foreground">
                          {intl.formatMessage({ id: `onboarding.mode.${entry}.title` })}
                        </span>
                        <span className="mt-2 block text-ui-sm leading-relaxed text-foreground-subtle">
                          {intl.formatMessage({ id: `onboarding.mode.${entry}.description` })}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === "preferences" ? (
                <div className="grid gap-3">
                  <PreferenceRow
                    label={intl.formatMessage({ id: "onboarding.preference.suggestions" })}
                    description={intl.formatMessage({ id: "onboarding.preference.suggestionsDescription" })}
                    checked={suggestions}
                    onCheckedChange={setSuggestions}
                  />
                  <PreferenceRow
                    label={intl.formatMessage({ id: "onboarding.preference.memory" })}
                    description={intl.formatMessage({ id: "onboarding.preference.memoryDescription" })}
                    checked={memory}
                    onCheckedChange={setMemory}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                className="order-2 h-9 self-center rounded-xl px-3 text-ui-base text-foreground-subtle underline-offset-4 hover:underline"
                onClick={() => dispatch({ type: "dialog/setOnboarding", open: false })}
              >
                {intl.formatMessage({ id: "onboarding.skip" })}
              </button>
              <Button
                variant="default"
                size="lg"
                disabled={!canAdvance}
                className="h-11 w-full rounded-xl px-5"
                onClick={() => {
                  if (isLast) dispatch({ type: "dialog/setOnboarding", open: false });
                  else setStepIndex((index) => index + 1);
                }}
              >
                {intl.formatMessage({ id: isLast ? "onboarding.finish" : "common.next" })}
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-surface-hover px-[clamp(64px,4vw,72px)] py-[clamp(32px,4vw,72px)] lg:flex">
          <div className="max-w-[560px]">
            <h2 className="text-[clamp(24px,5cqw,44px)] leading-[1.15] font-semibold tracking-[-0.035em] whitespace-pre-line text-foreground">
              {intl.formatMessage({ id: "onboarding.welcome.description" })}
            </h2>
            <div className="mt-8 rounded-2xl border border-border bg-background/60 p-5">
              <div className="mb-3 inline-flex items-center rounded-full border border-border bg-background-alt px-3 py-1 text-ui-base text-foreground-subtle">
                {intl.formatMessage({ id: "onboarding.welcome.eyebrow" })}
              </div>
              <p className="text-ui-base leading-6 text-foreground-subtle">
                {intl.formatMessage({ id: "app.tagline" })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 rounded-xl border border-card-border bg-card p-5 text-left text-ui-base transition-colors hover:bg-surface-hover"
    >
      <Checkbox checked={checked} className="pointer-events-none" />
      <span className="font-medium text-foreground">{label}</span>
      <span className="col-start-2 text-ui-sm font-normal leading-relaxed text-foreground-subtle">{description}</span>
    </button>
  );
}