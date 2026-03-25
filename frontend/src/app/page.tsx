"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

import { ChatInput } from "@/components/chat-input";
import { ChatWindow } from "@/components/chat-window";
import { Sidebar } from "@/components/sidebar";
import { ProviderSettingsDialog } from "@/components/provider-settings-dialog";
import { SysMemoHeader } from "@/components/sys-memo-header";
import {
  createSession,
  deleteSession,
  getModelCatalog,
  getSessionMessages,
  listSessions,
  streamChat,
  updateSessionTitle
} from "@/lib/api";
import { useChatStore } from "@/lib/store";
import { mergePendingImageAttachments } from "@/lib/user-message-display";
import type { ChatAttachment, ChatImageAttachment, ProviderModelCatalog } from "@/lib/types";

export default function Page() {
  const [catalog, setCatalog] = useState<ProviderModelCatalog[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pendingImageAttachmentsRef = useRef<ChatImageAttachment[] | null>(null);

  const sessionId = useChatStore((s) => s.sessionId);
  const sessions = useChatStore((s) => s.sessions);
  const selectedProvider = useChatStore((s) => s.selectedProvider);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const thinkingEnabled = useChatStore((s) => s.thinkingEnabled);
  const setThinkingEnabled = useChatStore((s) => s.setThinkingEnabled);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const addSession = useChatStore((s) => s.addSession);
  const setMessages = useChatStore((s) => s.setMessages);
  const pushMessage = useChatStore((s) => s.pushMessage);
  const updateAssistantDraft = useChatStore((s) => s.updateAssistantDraft);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setError = useChatStore((s) => s.setError);
  const setLastStreamMetrics = useChatStore((s) => s.setLastStreamMetrics);
  const resetChat = useChatStore((s) => s.resetChat);
  const setSessions = useChatStore((s) => s.setSessions);
  const patchSessionTitle = useChatStore((s) => s.patchSessionTitle);
  const removeSession = useChatStore((s) => s.removeSession);

  const refreshCatalog = () =>
    getModelCatalog()
      .then(setCatalog)
      .catch(() =>
        setCatalog([
          { provider: "ollama", models: ["llama3"] },
          { provider: "openai_compatible", models: ["gpt-4o-mini"] },
          { provider: "gemini", models: ["gemini-flash-latest"] }
        ])
      );

  useEffect(() => {
    void refreshCatalog();
    listSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  const handleNewChat = async () => {
    try {
      const next = await createSession();
      setSessionId(next.id);
      addSession(next);
      resetChat();
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleSelectSession = async (id: string) => {
    setSessionId(id);
    try {
      const messages = await getSessionMessages(id);
      setMessages(messages);
      setError(null);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleRenameSession = async (id: string, title: string) => {
    const updated = await updateSessionTitle(id, title);
    patchSessionTitle(id, updated.title ?? title);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    removeSession(id);
    if (useChatStore.getState().sessionId === id) {
      setSessionId(null);
      resetChat();
    }
  };

  const handleSubmit = async ({ text, attachments }: { text: string; attachments: ChatAttachment[] }) => {
    if (!sessionId) {
      await handleNewChat();
      if (!useChatStore.getState().sessionId) {
        return;
      }
    }

    const activeSessionId = useChatStore.getState().sessionId as string;

    const userDisplay =
      text.trim() +
      (attachments.length
        ? `${text.trim() ? "\n\n" : ""}--- Attachments ---\n${attachments.map((a) => `- ${a.name}`).join("\n")}`
        : "");

    const imageAttachments: ChatImageAttachment[] = attachments
      .filter((a) => a.mimeType.startsWith("image/"))
      .map((a) => ({ name: a.name, mimeType: a.mimeType, dataBase64: a.dataBase64 }));
    pendingImageAttachmentsRef.current = imageAttachments.length ? imageAttachments : null;

    pushMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: userDisplay || "(attachment only)",
      provider: selectedProvider,
      model: selectedModel,
      ...(imageAttachments.length ? { imageAttachments } : {})
    });
    pushMessage({ id: crypto.randomUUID(), role: "assistant", content: "", provider: selectedProvider, model: selectedModel });
    setStreaming(true);
    setError(null);
    setLastStreamMetrics(null);

    try {
      await streamChat(
        {
          session_id: activeSessionId,
          message: text.trim(),
          provider: selectedProvider,
          model: selectedModel,
          attachments: attachments.length ? attachments : undefined,
          thinkingEnabled
        },
        (chunk) => updateAssistantDraft(chunk),
        {
          onComplete: (metrics) => setLastStreamMetrics(metrics)
        }
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setStreaming(false);
      try {
        const synced = await getSessionMessages(activeSessionId);
        setMessages(mergePendingImageAttachments(synced, pendingImageAttachmentsRef.current));
      } catch {
        // Keep optimistic messages when sync fails.
      } finally {
        pendingImageAttachmentsRef.current = null;
      }
      listSessions().then(setSessions).catch(() => {});
    }
  };

  const focusChatInput = () => {
    document.getElementById("chat-input-field")?.focus();
  };

  const handleStructuredOut = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileSidebarOpen(true);
    }
    document.querySelector<HTMLElement>("[data-sessions-panel]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="flex h-dvh min-h-dvh w-full overflow-hidden bg-paper text-ink">
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <Sidebar
        sessions={sessions}
        catalog={catalog}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
      />
      <section className="flex min-w-0 flex-1 flex-col border-l-0 md:border-l-2 md:border-ink">
        <SysMemoHeader
          onNewSession={() => {
            void handleNewChat();
            focusChatInput();
          }}
          onFocusInput={focusChatInput}
          onOpenSessions={handleStructuredOut}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ProviderSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => void refreshCatalog()}
        />
        <div className="md:hidden flex shrink-0 border-b-2 border-ink px-3 py-2">
          <button
            type="button"
            aria-label="Open sidebar"
            className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center border-2 border-ink bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <ChatWindow onStartTyping={focusChatInput} />
        <ChatInput
          isStreaming={isStreaming}
          thinkingEnabled={thinkingEnabled}
          onThinkingEnabledChange={setThinkingEnabled}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}
