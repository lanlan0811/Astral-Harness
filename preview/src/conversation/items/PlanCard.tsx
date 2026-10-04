import { useIntl } from "../../i18n";
import { Markdown } from "../Markdown";
import { Button } from "../../components/ui/button";
import { useAppDispatch } from "../../store/AppStore";

/**
 * The plan card is a standalone surface, not a tool row: a plan is a document the
 * user is meant to read, so it gets a container and its own "view full" affordance.
 */
export function PlanCard({ markdown, fileLabel }: { markdown: string; fileLabel: string }) {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={() => dispatch({ type: "sidePane/openTab", tabType: "plan", title: fileLabel, target: fileLabel })}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        dispatch({ type: "sidePane/openTab", tabType: "plan", title: fileLabel, target: fileLabel });
      }}
      className="group w-full min-w-0 cursor-pointer overflow-hidden rounded-xl border border-card-border bg-card text-foreground transition-colors hover:border-border-hover"
    >
      <header className="flex h-10 min-w-0 items-center gap-2 pt-4 px-4">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-foreground-subtle" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
        </svg>
        <h3 className="text-ui-base font-medium text-foreground-subtle">
          {intl.formatMessage({ id: "chat.planCard.title" })}
        </h3>
        <code className="min-w-0 truncate text-ui-sm text-foreground-subtlest">{fileLabel}</code>
      </header>

      <div className="relative overflow-hidden">
        <div
          className="max-h-64 overflow-hidden px-4 pt-2 pb-12"
          style={{ maskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 100%)" }}
        >
          <Markdown className="[&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:text-foreground-subtle [&_p]:text-foreground-subtle">
            {markdown}
          </Markdown>
        </div>
        <Button
          variant="default"
          size="lg"
          className="absolute bottom-6 left-1/2 h-10 -translate-x-1/2 rounded-full pr-4 pl-6"
          onClick={(event) => {
            event.stopPropagation();
            dispatch({ type: "sidePane/openTab", tabType: "plan", title: fileLabel, target: fileLabel });
          }}
        >
          {intl.formatMessage({ id: "chat.planCard.viewFull" })}
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </div>
    </section>
  );
}