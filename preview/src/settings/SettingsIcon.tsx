import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  settings: <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M14 4v4M6 10v4M12 16v4" strokeLinecap="round" />,
  palette: <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h2a7 7 0 0 0-2-10ZM7.5 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM10 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM15 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />,
  package: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5" />,
  keyboard: <path d="M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10" strokeLinecap="round" />,
  globe: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />,
  monitor: <path d="M3 4h18v12H3zM9 20h6M12 16v4" strokeLinecap="round" />,
  fileSearch: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M14 3v5h5M16.5 17.5 20 21" strokeLinecap="round" />,
  brain: <path d="M12 4.5a3.5 3.5 0 0 0-3.5 3.5c0 1.2-.6 2-1.5 2.7.9.7 1.5 1.5 1.5 2.7A3.5 3.5 0 0 0 12 16.5a3.5 3.5 0 0 0 3.5-3.1c0-1.2.6-2 1.5-2.7-.9-.7-1.5-1.5-1.5-2.7A3.5 3.5 0 0 0 12 4.5ZM9 20h6" />,
  bot: <path d="M4 8h16v12H4zM12 8V4M9 14h.01M15 14h.01" strokeLinecap="round" />,
  blocks: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  cable: <path d="M9 3v6a3 3 0 0 0 6 0V3M12 12v9M9 21h6" strokeLinecap="round" />,
  wand: <path d="m4 20 10-10M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 14l.7 1.3L21 16l-1.3.7L19 18l-.7-1.3L17 16l1.3-.7Z" strokeLinecap="round" strokeLinejoin="round" />,
  terminal: <path d="M4 5h16v14H4zM8 10l2 2-2 2M13 14h4" strokeLinecap="round" strokeLinejoin="round" />,
  alarm: <path d="M12 4a6 6 0 0 1 6 6v3l2 2H4l2-2v-3a6 6 0 0 1 6-6ZM10 19a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />,
  anchor: <path d="M12 7v14M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 13a7 7 0 0 0 14 0M3 13h4M17 13h4" strokeLinecap="round" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />,
};

export function SettingsIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-foreground" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      {PATHS[name] ?? PATHS.settings}
    </svg>
  );
}