import { useIntl } from "../../i18n";
import { Button } from "../../components/ui/button";

/**
 * Browser chrome.
 *
 * The preview has no embedded webview, so the viewport renders a skeleton rather
 * than pretending to load a page.
 */
export function BrowserTab({ url }: { url: string }) {
  const intl = useIntl();

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <form
        className="flex h-12 shrink-0 items-center gap-2 px-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <Button variant="ghost" size="icon-md" className="text-foreground-subtle" disabled>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon-md" className="text-foreground-subtle" disabled>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon-md" className="text-foreground-subtle" disabled>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <input
          readOnly
          value={url}
          placeholder={intl.formatMessage({ id: "sidePane.browser.addressPlaceholder" })}
          className="h-7 min-w-0 flex-1 rounded-lg border border-input-border bg-input px-2 text-ui-base text-foreground"
        />
        <Button variant="ghost" size="icon-md" className="text-foreground-subtle">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon-md" className="text-foreground-subtle">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="12" r="1.2" />
            <circle cx="12" cy="5" r="1.2" />
            <circle cx="12" cy="19" r="1.2" />
          </svg>
        </Button>
      </form>

      <div className="min-h-0 flex-1 p-4">
        <div className="flex h-full flex-col gap-1.5 overflow-hidden rounded-xl border border-border p-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="flex h-4 shrink-0 items-center gap-2">
              <span className="h-3 w-8 shrink-0 rounded-sm bg-surface" />
              <span
                className="h-3 shrink-0 rounded-sm bg-surface-hover"
                style={{ width: `${30 + ((index * 37) % 60)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}