import { useEffect, useRef, useState } from "react";
import { useIntl } from "../i18n";
import { cn } from "../lib/cn";
import { useAppDispatch, useAppState } from "../store/AppStore";
import type { Conversation, ConversationItem } from "../store/types";
import { MOCK_CONVERSATIONS } from "../mock/data";
import { buildTurns, isTurnRunning, type Turn } from "./turnModel";
import { ReasoningBlock } from "./items/ReasoningBlock";
import { ToolCallBlock } from "./items/ToolCallBlock";
import { UserInputRow } from "./items/UserInputRow";
import { AssistantActions, AssistantTextRow } from "./items/AssistantTextRow";
import { PlanCard } from "./items/PlanCard";
import { PermissionCard, QuestionCard } from "./items/InteractionCards";
import { FileSummaryPanel } from "./items/FileSummaryPanel";
import { ConversationStatusPanel } from "./StatusPanel";
import { Composer } from "../composer/Composer";

const CONTENT_WIDTH_CLASS =
  "w-full @min-[864px]:w-[calc(100%_-_6rem)] @min-[864px]:max-w-4xl @min-[1280px]:w-[calc(100%_-_24rem)] @min-[1280px]:max-w-6xl";

export function ConversationPane() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const activeTask = state.tasks.find((task) => task.id === state.activeTaskId);
  const conversation: Conversation | undefined = activeTask ? MOCK_CONVERSATIONS[activeTask.id] : undefined;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const [backToBottomVisible, setBackToBottomVisible] = useState(false);

  // Pin to the bottom while streaming. `following` lives in a ref because it changes
  // every scroll frame; only the button's visibility is React state.
  useEffect(() => {
    if (!following) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [conversation, following]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distance < 24;
    setFollowing(atBottom);
    setBackToBottomVisible(!atBottom);
  };

  const scrollToBottom = () => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    setFollowing(true);
    setBackToBottomVisible(false);
  };

  const isEmpty = !conversation || conversation.items.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 overflow-hidden p-2">
        <span className="min-w-0 flex-1 truncate text-ui-base text-foreground-subtle">
          {activeTask?.title ?? intl.formatMessage({ id: "chat.greeting" })}
        </span>
        <span className="shrink-0 rounded-md bg-tag px-2 py-0.5 text-ui-xs text-foreground-subtle">
          {intl.formatMessage({ id: "statusBar.previewOnly" })}
        </span>
      </header>

      {conversation ? <ConversationStatusPanel status={conversation.status} /> : null}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-y-auto"
        style={{ scrollbarGutter: "stable" }}
      >
        {isEmpty ? (
          <ConversationEmptyState />
        ) : (
          <div className="flex min-h-full flex-col" style={{ overflowAnchor: "none" }}>
            <div className={cn("mx-auto flex flex-col", CONTENT_WIDTH_CLASS)}>
              {buildTurns(conversation.items).map((turn) => (
                <TurnSection key={turn.id} turn={turn} />
              ))}
            </div>
          </div>
        )}

        {backToBottomVisible ? (
          <button
            onClick={scrollToBottom}
            aria-label="Scroll to latest"
            className="sticky bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-card shadow-sm hover:bg-card-selected"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 shrink-0 px-4 pb-4">
        <div className={cn("mx-auto", CONTENT_WIDTH_CLASS)}>
          <Composer />
        </div>
      </div>
    </section>
  );
}

function TurnSection({ turn }: { turn: Turn }) {
  const running = isTurnRunning(turn);

  return (
    <section
      data-turn-id={turn.id}
      className={cn(
        "relative mx-auto flex w-full flex-col gap-5 px-4 pt-14 pb-5 @md:px-6",
        turn.userInputs.length === 0 && turn.items[0]?.kind === "marker" && "pt-0",
      )}
    >
      <div className="group/assistant-turn flex w-full flex-col gap-5">
        {turn.items.map((item) => (
          <ConversationItemView key={item.id} item={item} />
        ))}
        {turn.latestAssistantText ? <AssistantActions turn={turn} /> : null}
        {running ? <RunningIndicator /> : null}
      </div>
    </section>
  );
}

function ConversationItemView({ item }: { item: ConversationItem }) {
  const state = useAppState();
  const dispatch = useAppDispatch();

  switch (item.kind) {
    case "userInput":
      return <UserInputRow text={item.text} attachments={item.attachments} />;
    case "assistantText":
      return <AssistantTextRow item={item} />;
    case "reasoning":
      if (!state.showReasoning) return null;
      return <ReasoningBlock text={item.text} durationMs={item.durationMs} streaming={item.state === "streaming"} />;
    case "tool":
      if (item.tool.name === "todo" && !state.showTodos) return null;
      return (
        <ToolCallBlock
          tool={item.tool}
          onOpenCodeViewer={(path) =>
            dispatch({ type: "sidePane/openTab", type: "code", title: path.split("/").pop() ?? path, target: path })
          }
        />
      );
    case "plan":
      return <PlanCard markdown={item.markdown} fileLabel={item.fileLabel} />;
    case "permission":
      return <PermissionCard item={item} />;
    case "question":
      return <QuestionCard item={item} />;
    case "fileSummary":
      return <FileSummaryPanel branch={item.branch} files={item.files} />;
    case "marker":
      return <MarkerRow item={item} />;
    default:
      return null;
  }
}

/** Hairline separators: the only dividers in the timeline, and they are semantic. */
function MarkerRow({ item }: { item: Extract<ConversationItem, { kind: "marker" }> }) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-2 text-ui-base text-foreground-subtle">
      <div aria-hidden className="h-px min-w-8 flex-1 bg-border/50" />
      <span className="inline-flex min-w-0 shrink items-center justify-center gap-1.5 text-center leading-5">
        {item.label}
      </span>
      <div aria-hidden className="h-px min-w-8 flex-1 bg-border/50" />
    </div>
  );
}

function RunningIndicator() {
  const intl = useIntl();
  return (
    <span className="flex items-center gap-2 text-ui-base text-foreground-subtle">
      <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
      </svg>
      <span className="animated-gradient-text font-medium">{intl.formatMessage({ id: "chat.working" })}</span>
    </span>
  );
}

function ConversationEmptyState() {
  const intl = useIntl();
  return (
    <div className="flex min-h-full flex-col items-center px-4">
      <div className="before:min-h-[52px] before:basis-[29dvh]" />
      <div className="flex max-w-2xl flex-col items-center text-center">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-ui-xl font-bold text-white shadow-lg/20">
          A
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">{intl.formatMessage({ id: "chat.greeting" })}</h2>
        <p className="mt-3 text-ui-base text-foreground-subtle">{intl.formatMessage({ id: "chat.emptyHint" })}</p>
      </div>
      <div className="min-h-4 flex-1" />
    </div>
  );
}

/** Injected so the pane stays a pure component; see `src/mock/data.ts`. */
import { MOCK_CONVERSATIONS as CONVERSATION_LOOKUP } from "../mock/data";