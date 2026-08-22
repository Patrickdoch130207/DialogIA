import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginOperator } from "../../api/auth";
import { getAgentToken, setOperatorName, setOperatorToken } from "../../lib/agentStorage";

const PIN_LENGTH = 4;

export function LoginStep2() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [pinDigits, setPinDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pinInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Step 2 only makes sense with a valid agent session already in hand.
  useEffect(() => {
    if (!getAgentToken()) {
      navigate("/agent/login", { replace: true });
    }
  }, [navigate]);

  const handlePinChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setPinDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < PIN_LENGTH - 1) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const agentToken = getAgentToken();
    const pin = pinDigits.join("");

    if (!agentToken) {
      navigate("/agent/login", { replace: true });
      return;
    }
    if (pin.length !== PIN_LENGTH) {
      setError("Entrez les 4 chiffres du PIN");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const token = await loginOperator(agentToken, displayName, pin);
      setOperatorToken(token);
      setOperatorName(displayName);
      navigate("/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion");
      setPinDigits(Array(PIN_LENGTH).fill(""));
      pinInputRefs.current[0]?.focus();
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
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-semibold text-white">
              ✓
            </span>
            <span className="h-px flex-1 bg-primary" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              2
            </span>
          </div>

          <p className="text-base font-semibold text-text">Qui êtes-vous ?</p>
          <p className="mt-1 text-sm text-text-muted">Tapez votre nom et votre PIN personnel</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="displayName" className="text-xs font-semibold text-text-muted">
                Votre nom d'opérateur
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                autoComplete="off"
                className="h-11 rounded-lg border-2 border-primary bg-surface px-3.5 text-sm text-text outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted">PIN personnel</span>
              <div className="flex gap-2.5">
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      pinInputRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handlePinChange(index, event.target.value)}
                    onKeyDown={(event) => handlePinKeyDown(index, event)}
                    className="h-12 w-12 rounded-lg border border-border-strong bg-surface text-center text-lg text-text outline-none transition-colors focus:border-primary"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Connexion…" : "Ouvrir la session"}
            </button>

            {error && <p className="text-center text-xs text-danger">{error}</p>}
          </form>
        </div>

        {displayName && (
          <p className="mt-4 text-center text-xs text-text-faint">
            Vos réponses seront signées « {displayName} » dans l'historique interne
          </p>
        )}
      </div>
    </div>
  );
}