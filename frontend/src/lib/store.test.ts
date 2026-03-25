import { beforeEach, describe, expect, it } from "vitest";

import { useChatStore } from "./store";

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState({
      sessionId: null,
      sessions: [],
      messages: [],
      selectedProvider: "ollama",
      selectedModel: "qwen3:latest",
      thinkingEnabled: true,
      isStreaming: false,
      error: null,
      lastStreamMetrics: null
    });
  });

  it("appends streaming chunks to the last assistant message", () => {
    useChatStore.getState().pushMessage({
      id: "u1",
      role: "user",
      content: "Hi",
      provider: "ollama",
      model: "qwen3:latest"
    });
    useChatStore.getState().pushMessage({
      id: "a1",
      role: "assistant",
      content: "",
      provider: "ollama",
      model: "qwen3:latest"
    });
    useChatStore.getState().updateAssistantDraft("Hel");
    useChatStore.getState().updateAssistantDraft("lo");
    const last = useChatStore.getState().messages.at(-1);
    expect(last?.role).toBe("assistant");
    expect(last?.content).toBe("Hello");
  });

  it("stores last stream metrics and clears them on resetChat", () => {
    useChatStore.getState().setLastStreamMetrics({
      firstChunkMs: 42,
      tokensPerSec: 12.5,
      serverStreamOpenMs: 1_700_000_000_000,
      totalChars: 100
    });
    expect(useChatStore.getState().lastStreamMetrics?.firstChunkMs).toBe(42);
    useChatStore.getState().resetChat();
    expect(useChatStore.getState().lastStreamMetrics).toBeNull();
  });
});
