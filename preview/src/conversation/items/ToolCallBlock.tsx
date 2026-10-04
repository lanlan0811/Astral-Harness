import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/controls";
import { useIntl } from "../../i18n";
import { cn } from "../../lib/cn";
import { fileName, parentPath } from "../../lib/format";
import type { ToolCall, ToolName, ToolStatus } from "../../store/types";
import { DiffPreview, DiffStats } from "../DiffPreview";

/** Tool name → status label. Deliberately the only running affordance is the shimmer
 *  on the kind label — a spinner per in-flight call would starve the animation budget. */
export function toolStatusLabelId(tool: ToolCall): string {
  switch (tool.status) {
    case "pending":
      return "chat.toolCall.status.pending";
    case "running":
      return "chat.toolCall.status.running";
    case "error":
    case "denied":
      return "chat.toolCall.status.error";
    case "stopped":
      return "chat.toolCall.status.stopped";
    default:
      return "chat.toolCall.status.completed";
  }
}

function kindLabelId(tool: ToolCall): string {
  const running = tool.status === "running";
  switch (tool.name) {
    case "read":
      return running ? "chat.toolCall.read.reading" : "chat.toolCall.kind.read";
    case "edit": {
      const createsFile = tool.diff?.lines.every((line) => line.type !== "removed");
      if (createsFile) return running ? "chat.toolCall.write.writing" : "chat.toolCall.kind.write";
      return running ? "chat.toolCall.edit.editing" : "chat.toolCall.kind.edit";
    }
    case "execute":
      return running ? "chat.toolCall.execute.running" : "chat.toolCall.terminal";
    case "search":
      return running ? "chat.toolCall.search.searching" : "chat.toolCall.kind.search";
    case "explore":
      return "chat.toolCall.explore.label";
    case "todo":
      return "chat.toolCall.todo.label";
    case "agent":
      return "chat.toolCall.agent.label";
    case "ask":
      return running ? "chat.toolCall.askQuestion.asking" : "chat.toolCall.askQuestion.asked";
    case "goal":
      return "chat.toolCall.goal.label";
    case "changes":
      return "chat.toolCall.changesGroup.label";
    default:
      return "chat.toolCall.fallback";
  }
}

const ICONS: Record<ToolName, React.ReactNode> = {
  read: <SearchIcon />,
  edit: <PencilIcon />,
  execute: <TerminalIcon />,
  search: <SearchIcon />,
  explore: <SearchIcon />,
  todo: <ListIcon />,
  agent: <BotIcon />,
  ask: <HelpIcon />,
  goal: <TargetIcon />,
  changes: <PencilIcon />,
  fallback: <WrenchIcon />,
};

function icon(name: ToolName) {
  return ICONS[name] ?? ICONS.fallback;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m6 9 3 3-3 3M13 15h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M11 6h10M11 12h10M11 18h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4M9 14h.01M15 14h.01" strokeLinecap="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.32c-.6.26-.9.8-.9 1.43v.25M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface ToolCallBlockProps {
  tool: ToolCall;
  depth?: number;
  /** Cards inside a group drop their icon — the indentation already says "grouped". */
  showIcon?: boolean;
  defaultOpen?: boolean;
  onOpenCodeViewer?: (filePath: string) => void;
  onOpenPlan?: () => void;
}

const NESTED_CONTAINER_CLASS = "ml-2 space-y-2 border-l border-border pl-3.5";

/**
 * A tool call card.
 *
 * The card itself is a flat, borderless text row — only the *expanded body* (diff,
 * terminal output) gets a bordered surface. Adding a container around the whole row
 * is the fastest way to make a busy timeline look like a spreadsheet.
 */
export function ToolCallBlock({
  tool,
  depth = 0,
  showIcon = true,
  defaultOpen = false,
  onOpenCodeViewer,
}: ToolCallBlockProps) {
  const intl = useIntl();
  const running = tool.status === "running";
  const failed = tool.status === "error" || tool.status === "denied";
  const kindLabel = tool.label ?? intl.formatMessage({ id: kindLabelId(tool) });

  const canToggle = tool.name === "edit" || tool.name === "execute" || tool.name === "explore" || tool.name === "todo";

  const additions = tool.diff?.additions ?? tool.files?.reduce((sum, file) => sum + file.additions, 0) ?? 0;
  const deletions = tool.diff?.deletions ?? tool.files?.reduce((sum, file) => sum + file.deletions, 0) ?? 0;

  const statusText = intl.formatMessage({ id: toolStatusLabelId(tool) });

  return (
    <Collapsible
      className="flex w-full flex-col"
      defaultOpen={defaultOpen || (tool.name === "edit" && tool.status === "running")}
    >
      <CollapsibleTrigger
        className={cn(
          "group/tool-summary inline-flex max-w-full cursor-pointer items-center gap-2 self-start text-left text-ui-base transition-colors",
          canToggle ? "" : "cursor-default",
        )}
      >
        {showIcon ? icon(tool.name) : null}

        <span
          className={cn(
            "shrink-0 font-medium whitespace-nowrap",
            running ? "animated-gradient-text" : "text-foreground-subtlest",
          )}
        >
          {kindLabel}
        </span>

        {tool.name === "agent" && tool.label ? (
          <span className="inline-flex min-w-0 max-w-36 items-center truncate font-mono text-ui-base font-medium text-brand">
            {tool.label}
          </span>
        ) : null}

        <div className="flex min-w-0 max-w-full items-center gap-2 text-foreground-subtlest">
          {tool.primaryText ? (
            tool.name === "read" && onOpenCodeViewer ? (
              <button
                className="min-w-0 truncate hover:underline"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenCodeViewer(tool.primaryText ?? "");
                }}
              >
                {tool.primaryText}
              </button>
            ) : (
              <span className="min-w-0 truncate">{tool.primaryText}</span>
            )
          ) : null}

          {tool.secondaryText ? (
            <span className="hidden min-w-0 truncate @max-[360px]:hidden">{tool.secondaryText}</span>
          ) : null}
        </div>

        {failed && tool.error ? (
          <span
            className="cursor-help whitespace-nowrap text-foreground-subtlest underline decoration-dotted underline-offset-2"
            title={tool.error}
          >
            {statusText}
          </span>
        ) : (
          <span className="whitespace-nowrap">{statusText}</span>
        )}

        <DiffStats additions={additions} deletions={deletions} />

        {canToggle ? (
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-foreground-subtlest opacity-0 transition-transform transition-opacity duration-200 group-hover/tool-summary:opacity-100 group-data-[state=open]/tool-summary:rotate-90 group-data-[state=open]/tool-summary:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </CollapsibleTrigger>

      {canToggle ? (
        <CollapsibleContent>
          <div className="pt-2">
            <ToolBody tool={tool} onOpenCodeViewer={onOpenCodeViewer} />
          </div>
        </CollapsibleContent>
      ) : null}

      {tool.children && tool.children.length > 0 ? (
        <div className={cn(NESTED_CONTAINER_CLASS, canToggle && "mt-2")}>
          {tool.children.map((child) => (
            <ToolCallBlock key={child.id} tool={child} depth={depth + 1} showIcon={false} />
          ))}
        </div>
      ) : null}
    </Collapsible>
  );
}

function ToolBody({ tool, onOpenCodeViewer }: { tool: ToolCall; onOpenCodeViewer?: (filePath: string) => void }) {
  const intl = useIntl();

  if (tool.name === "todo" && tool.todo) return <TodoBody todo={tool.todo} />;

  if (tool.name === "execute") {
    return (
      <div className="mb-2 space-y-3 rounded-xl border border-border bg-panel px-4 py-3">
        {tool.command ? (
          <div className="flex items-start gap-2 text-ui-base text-foreground">
            <span className="shrink-0 text-foreground-subtle">$</span>
            <pre className="min-w-0 flex-1 overflow-hidden truncate whitespace-pre-wrap break-words font-mono">
              {tool.command}
            </pre>
          </div>
        ) : null}
        {tool.output ? (
          <pre className="max-h-[15lh] overflow-auto font-mono text-ui-base leading-5 whitespace-pre-wrap break-words text-foreground-subtle">
            {tool.output}
          </pre>
        ) : tool.status !== "running" ? (
          <p className="font-mono text-ui-base text-foreground-subtle">
            {intl.formatMessage({ id: "chat.toolCall.noOutput" })}
          </p>
        ) : null}
        {tool.error ? <p className="font-mono text-ui-sm text-destructive">{tool.error}</p> : null}
      </div>
    );
  }

  if (tool.diff) {
    return (
      <div className="space-y-3">
        <div className="mb-2 rounded-xl border border-border bg-card">
          <DiffPreview diff={tool.diff} />
        </div>
        {tool.files && tool.files.length > 1 ? (
          <ul className="space-y-1">
            {tool.files.map((file) => (
              <li key={file.path}>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-ui-base text-foreground-subtle hover:bg-surface-hover"
                  onClick={() => onOpenCodeViewer?.(file.path)}
                >
                  <span className="min-w-0 flex-1 truncate">{fileName(file.path)}</span>
                  <span className="min-w-0 truncate text-foreground-subtlest">{parentPath(file.path)}</span>
                  <DiffStats additions={file.additions} deletions={file.deletions} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (tool.result !== undefined) {
    return <ToolJson labelId="chat.toolCall.result" value={tool.result} />;
  }

  if (tool.args !== undefined) {
    return <ToolJson labelId="chat.toolCall.parameters" value={tool.args} />;
  }

  return null;
}

function ToolJson({ labelId, value }: { labelId: string; value: unknown }) {
  const intl = useIntl();
  return (
    <div className="space-y-2">
      <h4 className="text-ui-base font-medium tracking-wide text-foreground-subtlest uppercase">
        {intl.formatMessage({ id: labelId })}
      </h4>
      <pre className="max-h-60 overflow-auto rounded-lg bg-surface px-3 py-3 font-mono text-ui-base text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Todo rendering is an icon list, not checkboxes — a checkbox per step turns a
 * three-item plan into a form.
 */
function TodoBody({ todo }: { todo: NonNullable<ToolCall["todo"]> }) {
  return (
    <div className="space-y-1 rounded-xl bg-surface px-3 py-2">
      {todo.map((step) => (
        <div key={step.id} className="flex min-w-0 items-center gap-2 py-1">
          {step.status === "completed" ? (
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          {step.status === "in_progress" ? (
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-foreground" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          {step.status === "pending" ? (
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="12" cy="12" r="9" />
            </svg>
          ) : null}
          <span
            className={cn(
              "min-w-0 text-ui-base break-words",
              step.status === "pending" && "text-foreground-subtle",
              step.status === "in_progress" && "text-foreground",
              step.status === "completed" && "text-foreground-subtlest line-through",
            )}
          >
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
}