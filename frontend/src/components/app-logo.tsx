"use client";

export function AppLogo() {
  return (
    <div className="border-2 border-ink bg-panelAlt px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-ink bg-lime text-xs font-bold text-ink">
          &gt;_
        </span>
        <div className="text-xs font-bold uppercase tracking-wide text-ink md:text-sm">
          OpenChat
          <span className="ml-1 inline-block h-3.5 w-2 translate-y-0.5 animate-cursor-blink bg-ink md:h-4" />
        </div>
      </div>
    </div>
  );
}
