import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearAgentSession } from "../../../lib/agentStorage";

interface AgentLayoutProps {
  children: ReactNode;
  operatorName?: string;
  /** Full-bleed bottom bar (e.g. the reply composer), styled to match the header. */
  footer?: ReactNode;
}

export function AgentLayout({ children, operatorName, footer }: AgentLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAgentSession();
    navigate("/agent/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-surface">
      <header className="sticky top-0 z-10 w-full border-b border-border bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-4 sm:px-8">
          <img src="/logo.svg" alt="DialogIA" className="h-6 w-auto sm:h-7" />
          <p className="text-xs text-text-muted sm:text-sm">Console agent</p>

          <div className="flex-1" />

          {operatorName && (
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-bg text-[10px] font-semibold text-accent-text">
                {operatorName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="text-xs font-medium text-text sm:text-sm">{operatorName}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-text-muted transition-colors hover:text-danger sm:text-sm"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden">{children}</main>

      {footer && (
        <footer className="sticky bottom-0 z-10 w-full border-t border-border bg-white">
          <div className="mx-auto w-full max-w-5xl">{footer}</div>
        </footer>
      )}
    </div>
  );
}