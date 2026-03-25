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
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void | Promise<void>;
  onDeleteSession: (id: string) => void | Promise<void>;
}

export function Sidebar({
  sessions,
  catalog,
  mobileOpen,
  onCloseMobile,
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

  const handleSelect = (id: string) => {
    onSelectSession(id);
    onCloseMobile();
  };

  return (
    <aside
      className={`${
        mobileOpen ? "flex" : "hidden"
      } fixed inset-y-0 left-0 z-40 w-[85vw] max-w-80 flex-col gap-3 border-r-2 border-ink bg-paper p-3 transition-transform duration-200 md:static md:flex md:w-80 md:max-w-none md:translate-x-0 md:p-4 md:gap-4 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-hidden={!mobileOpen}
    >
      <AppLogo />
      <button
        className="flex w-full min-h-11 cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-paper px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        onClick={() => {
          onNewChat();
          onCloseMobile();
        }}
      >
        <PlusCircle size={16} strokeWidth={2.5} />
        New Chat
      </button>

      <ModelSelector catalog={catalog} />

      <div data-sessions-panel className="text-[10px] font-bold uppercase tracking-wider text-ink md:text-xs">
        Sessions
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`relative flex items-stretch border-2 border-ink ${
              session.id === sessionId ? "bg-lime text-ink" : "bg-paper text-ink"
            }`}
          >
            {editingId === session.id ? (
              <div className="flex flex-1 flex-col gap-2 p-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border-2 border-ink bg-paper px-2 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="cursor-pointer border-2 border-transparent px-2 py-1 text-[10px] font-bold uppercase text-ink/70 hover:border-ink hover:bg-panelAlt"
                    onClick={cancelRename}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer border-2 border-ink bg-ink px-2 py-1 text-[10px] font-bold uppercase text-lime hover:bg-lime hover:text-ink"
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
                  onClick={() => handleSelect(session.id)}
                  className={`min-w-0 flex-1 px-3 py-2 text-left text-xs md:text-sm ${
                    session.id === sessionId ? "font-bold" : "hover:bg-panelAlt"
                  }`}
                >
                  <span className="line-clamp-2">{session.title?.trim() || "Untitled chat"}</span>
                </button>
                <div className="relative shrink-0" ref={menuOpenId === session.id ? menuRef : undefined}>
                  <button
                    type="button"
                    data-session-menu
                    className="flex h-full min-w-11 cursor-pointer items-center border-l-2 border-ink px-2 text-ink hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                    aria-label="Session menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === session.id ? null : session.id));
                    }}
                  >
                    <Menu className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  {menuOpenId === session.id && (
                    <div
                      data-session-menu
                      className="absolute right-0 top-full z-20 mt-1 min-w-[9rem] border-2 border-ink bg-paper py-1"
                    >
                      <button
                        type="button"
                        className="w-full cursor-pointer px-3 py-2 text-left text-xs font-bold uppercase text-ink hover:bg-panelAlt"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session);
                        }}
                      >
                        Rename…
                      </button>
                      <button
                        type="button"
                        className="w-full cursor-pointer px-3 py-2 text-left text-xs font-bold uppercase text-red-700 hover:bg-panelAlt"
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

      <div className="text-[10px] font-bold uppercase leading-snug text-ink/60 md:text-xs">
        Settings and provider config are env-driven.
      </div>
    </aside>
  );
}
