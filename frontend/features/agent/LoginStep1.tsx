import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAgent } from "../../api/auth";
import { setAgentToken } from "../../lib/agentStorage";

export function LoginStep1() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await loginAgent(username, password);
      setAgentToken(token);
      navigate("/agent/operator-login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.svg" alt="DialogIA" className="h-7 w-auto" />
          <div>
            <p className="text-sm font-semibold text-text">Console agent</p>
            <p className="text-xs text-text-muted">Accès interne</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              1
            </span>
            <span className="h-px flex-1 bg-border" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs text-text-faint">
              2
            </span>
          </div>

          <p className="text-base font-semibold text-text">Compte partagé « agent »</p>
          <p className="mt-1 text-sm text-text-muted">Identifiants communs de l'équipe support</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-text-muted">
                Identifiant
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
                className="h-11 rounded-lg border border-border-strong bg-surface px-3.5 text-sm text-text outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-text-muted">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="h-11 rounded-lg border border-border-strong bg-surface px-3.5 text-sm text-text outline-none transition-colors focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Connexion…" : "Continuer"}
            </button>

            {error && <p className="text-center text-xs text-danger">{error}</p>}
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-text-faint">
          Étape 1 sur 2 — identification personnelle à l'étape suivante
        </p>
      </div>
    </div>
  );
}