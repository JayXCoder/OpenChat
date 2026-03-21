"use client";

export function AppLogo() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-900/20 text-emerald-300">
          &gt;_
        </span>
        <div className="text-sm font-semibold tracking-wide text-zinc-100">
          OpenChat
          <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-cursor-blink bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}
