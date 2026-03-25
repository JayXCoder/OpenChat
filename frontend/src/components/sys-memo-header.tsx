"use client";

interface SysMemoHeaderProps {
  onNewSession: () => void;
  onFocusInput: () => void;
  onOpenSessions: () => void;
  onOpenSettings: () => void;
}

export function SysMemoHeader({
  onNewSession,
  onFocusInput,
  onOpenSessions,
  onOpenSettings
}: SysMemoHeaderProps) {
  const navBtn =
    "min-h-11 cursor-pointer px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 md:px-4 md:text-xs border-l-2 border-ink first:border-l-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink";

  return (
    <header className="shrink-0 border-b-2 border-ink bg-paper">
      <div className="flex flex-col gap-3 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-4 md:py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink md:text-xs">SYS.MEMO // BUILD 0X7A</p>
        <nav className="flex w-full border-2 border-ink sm:w-auto" aria-label="Primary">
          <button type="button" className={`${navBtn} bg-lime text-ink hover:bg-ink hover:text-lime`} onClick={onNewSession}>
            NEW SESSION
          </button>
          <button
            type="button"
            className={`${navBtn} bg-paper text-ink hover:bg-ink hover:text-lime`}
            onClick={onFocusInput}
          >
            INPUT
          </button>
          <button
            type="button"
            className={`${navBtn} bg-paper text-ink hover:bg-ink hover:text-lime`}
            onClick={onOpenSessions}
          >
            SESSIONS
          </button>
          <button
            type="button"
            className={`${navBtn} bg-paper text-ink hover:bg-ink hover:text-lime`}
            onClick={onOpenSettings}
          >
            SETTINGS
          </button>
        </nav>
      </div>
    </header>
  );
}
