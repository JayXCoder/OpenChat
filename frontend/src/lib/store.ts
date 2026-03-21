import { create } from "zustand";

import { ChatMessage, ProviderName, SessionModel } from "@/lib/types";

interface ChatState {
  sessionId: string | null;
  sessions: SessionModel[];
  messages: ChatMessage[];
  selectedProvider: ProviderName;
  selectedModel: string;
  thinkingEnabled: boolean;
  isStreaming: boolean;
  error: string | null;
  setSessionId: (id: string | null) => void;
  setSessions: (sessions: SessionModel[]) => void;
  addSession: (session: SessionModel) => void;
  setMessages: (messages: ChatMessage[]) => void;
  pushMessage: (message: ChatMessage) => void;
  updateAssistantDraft: (chunk: string) => void;
  setProviderModel: (provider: ProviderName, model: string) => void;
  setThinkingEnabled: (value: boolean) => void;
  setStreaming: (value: boolean) => void;
  setError: (value: string | null) => void;
  resetChat: () => void;
  patchSessionTitle: (id: string, title: string) => void;
  removeSession: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  sessions: [],
  messages: [],
  selectedProvider: (process.env.NEXT_PUBLIC_DEFAULT_PROVIDER as ProviderName) ?? "ollama",
  selectedModel: process.env.NEXT_PUBLIC_DEFAULT_MODEL ?? "qwen3:latest",
  thinkingEnabled: true,
  isStreaming: false,
  error: null,
  setSessionId: (id) => set({ sessionId: id }),
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),
  setMessages: (messages) => set({ messages }),
  pushMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateAssistantDraft: (chunk) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (!last || last.role !== "assistant") {
        messages.push({ id: crypto.randomUUID(), role: "assistant", content: chunk });
      } else {
        last.content += chunk;
      }
      return { messages };
    }),
  setProviderModel: (provider, model) => set({ selectedProvider: provider, selectedModel: model }),
  setThinkingEnabled: (value) => set({ thinkingEnabled: value }),
  setStreaming: (value) => set({ isStreaming: value }),
  setError: (value) => set({ error: value }),
  resetChat: () => set({ messages: [], error: null, isStreaming: false }),
  patchSessionTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s))
    })),
  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id)
    }))
}));
