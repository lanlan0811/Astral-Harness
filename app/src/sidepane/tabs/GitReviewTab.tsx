import { useIntl } from "../../i18n";

/**
 * Working-tree review: one card per changed file, each with its own inline diff.
 *
 * Empty in the MVP. The app has no git backend yet, and AgentScope's `Edit` returns a
 * result string rather than a structured diff, so there is nothing real to show here.
 * It used to render a hardcoded pair of diffs that lived in this component rather than in
 * the mock data layer, which made the pane look wired when it was not.
 */
export function GitReviewTab() {
  const intl = useIntl();

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <svg viewBox="0 0 24 24" className="size-8 text-foreground-subtlest" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" strokeLinejoin="round" />
      </svg>
      <h3 className="mt-3 text-ui-base font-medium text-foreground">{intl.formatMessage({ id: "sidePane.git.emptyTitle" })}</h3>
      <p className="mt-1 text-ui-base text-foreground-subtle">{intl.formatMessage({ id: "sidePane.git.emptyDescription" })}</p>
    </div>
  );
}