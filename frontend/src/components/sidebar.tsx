"use client";

import { useEffect, useRef, useState } from "react";

import { Menu, PlusCircle } from "lucide-react";

import { AppLogo } from "@/components/app-logo";
import { ModelSelector } from "@/components/model-selector";
import { useChatStore } from "@/lib/store";
import { ProviderModelCatalog, SessionModel } from "@/lib/types";

interface SidebarProps {
  sessions: SessionModel[];
  catalog: ProviderModelCatalog[];
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void | Promise<void>;
  onDeleteSession: (id: string) => void | Promise<void>;
}

export function Sidebar({
  sessions,
  catalog,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession
}: SidebarProps) {
  const sessionId = useChatStore((s) => s.sessionId);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpenId]);

  const startRename = (session: SessionModel) => {
    setMenuOpenId(null);
    setEditingId(session.id);
    setEditValue(session.title?.trim() || "");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveRename = async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelRename();
      return;
    }
    await onRenameSession(editingId, trimmed);
    cancelRename();
  };

  return (
    <aside className="w-80 bg-panel/90 border-r border-zinc-800 p-4 flex flex-col gap-4">
      <AppLogo />
      <button
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition px-3 py-2 text-sm flex items-center justify-center gap-2"
        onClick={onNewChat}
      >
        <PlusCircle size={16} />
        New Chat
      </button>

      <ModelSelector catalog={catalog} />

      <div className="text-xs uppercase text-zinc-400 tracking-wide">Sessions</div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`relative flex items-stretch gap-0.5 rounded-lg border ${
              session.id === sessionId
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            {editingId === session.id ? (
              <div className="flex flex-1 flex-col gap-1 p-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800"
                    onClick={cancelRename}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-500"
                    onClick={() => void saveRename()}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800/50 rounded-l-lg"
                >
                  <span className="line-clamp-2">{session.title?.trim() || "Untitled chat"}</span>
                </button>
                <div className="relative shrink-0" ref={menuOpenId === session.id ? menuRef : undefined}>
                  <button
                    type="button"
                    data-session-menu
                    className="flex h-full items-center rounded-r-lg border border-transparent px-2 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200"
                    aria-label="Session menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === session.id ? null : session.id));
                    }}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  {menuOpenId === session.id && (
                    <div
                      data-session-menu
                      className="absolute right-0 top-full z-20 mt-1 min-w-[9rem] rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
                    >
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session);
                        }}
                      >
                        Rename…
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-zinc-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(null);
                          void onDeleteSession(session.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-zinc-500">Settings and provider config are env-driven.</div>
    </aside>
  );
}
