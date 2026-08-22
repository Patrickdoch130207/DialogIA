import { ReactNode } from "react";

interface ClientLayoutProps {
  children: ReactNode;
  /** Full-bleed bottom bar (e.g. the record button), styled to match the header. */
  footer?: ReactNode;
  /** Show the profile icon button top-right. Omit to hide it (e.g. on the profile screen itself). */
  onOpenProfile?: () => void;
}

export function ClientLayout({ children, footer, onOpenProfile }: ClientLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-surface">
      <header className="sticky top-0 z-10 w-full border-b border-border bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-4 sm:px-8 sm:py-5">
          <img src="/logo.svg" alt="DialogIA" className="h-6 w-auto sm:h-7" />
          <div className="flex-1">
            <p className="text-[11px] text-text-muted sm:text-xs">
              Alɔdó xɔ́ntɔn lɛ́ · Service client
            </p>
          </div>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              aria-label="Votre profil"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-colors hover:bg-border/40 sm:h-10 sm:w-10"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M3 13c.7-2.5 2.7-4 5-4s4.3 1.5 5 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        {children}
      </main>

      {footer && (
        <footer className="sticky bottom-0 z-10 w-full border-t border-border bg-white">
          <div className="mx-auto w-full max-w-3xl">{footer}</div>
        </footer>
      )}
    </div>
  );
}