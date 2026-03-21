"use client";

import { useEffect, useState } from "react";

import { ChatInput } from "@/components/chat-input";
import { ChatWindow } from "@/components/chat-window";
import { Sidebar } from "@/components/sidebar";
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
import { ChatAttachment, ProviderModelCatalog } from "@/lib/types";

export default function Page() {
  const [catalog, setCatalog] = useState<ProviderModelCatalog[]>([]);

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
  const resetChat = useChatStore((s) => s.resetChat);
  const setSessions = useChatStore((s) => s.setSessions);
  const patchSessionTitle = useChatStore((s) => s.patchSessionTitle);
  const removeSession = useChatStore((s) => s.removeSession);

  useEffect(() => {
    getModelCatalog().then(setCatalog).catch(() => setCatalog([{ provider: "ollama", models: ["llama3"] }]));
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

    pushMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: userDisplay || "(attachment only)",
      provider: selectedProvider,
      model: selectedModel
    });
    pushMessage({ id: crypto.randomUUID(), role: "assistant", content: "", provider: selectedProvider, model: selectedModel });
    setStreaming(true);
    setError(null);

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
        (chunk) => updateAssistantDraft(chunk)
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setStreaming(false);
      listSessions().then(setSessions).catch(() => {});
    }
  };

  return (
    <main className="h-screen w-screen flex">
      <Sidebar
        sessions={sessions}
        catalog={catalog}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
      />
      <section className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm">
        <ChatWindow />
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
