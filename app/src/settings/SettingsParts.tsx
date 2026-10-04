import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export function SettingsGroupCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden rounded-xl border border-border bg-card py-0 shadow-none", className)}>
      <div className="space-y-0 px-0">{children}</div>
    </Card>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  /** Right-hand control column. Fixed 192px, or 280px in wide mode. */
  children: ReactNode;
  /** Rendered below the grid instead of inside the control cell. */
  detail?: ReactNode;
  wide?: boolean;
}

/**
 * One settings row: a fluid label column and a fixed control column.
 *
 * Switches commit immediately; text fields use a draft plus a dirty-gated Save,
 * because clearing a field has to send an empty string rather than "no change".
 */
export function SettingsRow({ label, description, children, detail, wide }: SettingsRowProps) {
  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <div className={cn("grid items-center gap-4", wide ? "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_280px]" : "grid-cols-[minmax(0,1fr)_192px]")}>
        <div className="min-w-0">
          <p className="text-ui-base font-medium text-foreground">{label}</p>
          {description ? <p className="mt-1 text-ui-base leading-6 text-foreground-subtle">{description}</p> : null}
          {detail && !wide ? <div className="mt-3">{detail}</div> : null}
        </div>
        <div className="flex w-full flex-nowrap items-center justify-end gap-2">
          {wide && detail ? <div className="min-w-0 flex-1">{detail}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function SettingsSectionHeading({ title, description, badge }: { title: string; description?: string; badge?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {badge ? (
          <span className="inline-flex h-6 items-center rounded-full border border-brand px-2 text-ui-xs font-semibold text-brand">
            {badge}
          </span>
        ) : null}
      </div>
      {description ? <p className="mt-2 max-w-2xl text-ui-base leading-6 text-foreground-subtle">{description}</p> : null}
    </div>
  );
}

export function SettingsSubheading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-ui-lg font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-ui-base leading-6 text-foreground-subtle">{description}</p> : null}
    </div>
  );
}

/** Text field with a Save button that only enables once the draft diverges. */
export function SettingsTextFieldRow({
  label,
  description,
  placeholder,
  initialValue = "",
  saveLabel,
}: {
  label: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  saveLabel: string;
}) {
  const [draft, setDraft] = useState(initialValue);
  const dirty = draft !== initialValue;

  return (
    <SettingsRow
      label={label}
      description={description}
      detail={
        <Input
          value={draft}
          placeholder={placeholder}
          className="h-8 max-w-[520px] font-mono"
          onChange={(event) => setDraft(event.target.value)}
        />
      }
    >
      <Button disabled={!dirty} onClick={() => setDraft(initialValue)}>
        {saveLabel}
      </Button>
    </SettingsRow>
  );
}