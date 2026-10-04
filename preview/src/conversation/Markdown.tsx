import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/cn";

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Assistant prose.
 *
 * Streaming markdown tolerates unclosed fences — the parse never throws, it just
 * renders the partial block as text until the closing fence arrives.
 */
export const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("markdown text-wrap-phrase", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {linkChildren}
            </a>
          ),
          code: ({ className: codeClassName, children: codeChildren, ...props }) => {
            const text = String(codeChildren ?? "");
            const isBlock = text.includes("\n") || /language-/.test(codeClassName ?? "");
            if (!isBlock) return <code {...props}>{codeChildren}</code>;
            return <CodeBlock language={extractLanguage(codeClassName)}>{text.replace(/\n$/, "")}</CodeBlock>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});

function extractLanguage(className?: string): string {
  const match = /language-(\w+)/.exec(className ?? "");
  return match ? match[1] : "";
}

export function CodeBlock({ language, children }: { language: string; children: string }) {
  const lineCount = children.split("\n").length;
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3">
        <span className="font-mono text-ui-sm text-foreground-subtlest">{language || "text"}</span>
        <span className="text-ui-xs text-foreground-subtlest tabular-nums">{lineCount} lines</span>
      </div>
      <pre className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-ui-sm leading-6">
        <code>{children}</code>
      </pre>
    </div>
  );
}