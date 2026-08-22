interface WelcomeScreenProps {
  onStart: () => void;
  isStarting: boolean;
  error: string | null;
}

export function WelcomeScreen({ onStart, isStarting, error }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 bg-white px-6 py-12 sm:px-10 md:gap-10">
      <img src="/logo.svg" alt="DialogIA" className="h-10 w-auto sm:h-12 md:h-14" />

      <img
        src="/home.svg"
        alt=""
        aria-hidden="true"
        className="h-40 w-40 animate-float sm:h-56 sm:w-56 md:h-64 md:w-64"
      />

      <div className="text-center">
        <p className="text-base font-semibold text-text sm:text-lg md:text-xl">
          Bienvenue sur DialogIA
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-text-muted sm:text-sm md:text-base">
          Alɔdó xɔ́ntɔn lɛ́ · Notre service client comprend vos audios en fon. Démarrez une
          conversation quand vous êtes prêt.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={isStarting}
        className="flex h-[52px] w-full max-w-sm items-center justify-center rounded-2xl bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 md:h-14 md:text-lg"
      >
        {isStarting ? "Démarrage…" : "Démarrer une conversation"}
      </button>

      {error && <p className="text-center text-xs text-danger sm:text-sm">{error}</p>}
    </div>
  );
}