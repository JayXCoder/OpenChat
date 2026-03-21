import { describe, expect, it } from "vitest";

import { useChatStore } from "./store";

describe("chat store", () => {
  it("updates assistant draft progressively", () => {
    useChatStore.setState({
      sessionId: null,
      sessions: [],
      messages: [{ id: "1", role: "assistant", content: "Hello" }],
      selectedProvider: "ollama",
      selectedModel: "llama3",
      isStreaming: false,
      error: null
    });

    useChatStore.getState().updateAssistantDraft(" world");
    expect(useChatStore.getState().messages[0].content).toBe("Hello world");
  });

  it("resets chat messages on resetChat", () => {
    useChatStore.setState({
      sessionId: "abc",
      sessions: [{ id: "abc" }],
      messages: [{ id: "1", role: "user", content: "x" }],
      selectedProvider: "ollama",
      selectedModel: "llama3",
      isStreaming: true,
      error: "failed"
    });

    useChatStore.getState().resetChat();

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().isStreaming).toBe(false);
    expect(useChatStore.getState().error).toBeNull();
  });

  it("toggles thinking flag", () => {
    useChatStore.getState().setThinkingEnabled(false);
    expect(useChatStore.getState().thinkingEnabled).toBe(false);
    useChatStore.getState().setThinkingEnabled(true);
    expect(useChatStore.getState().thinkingEnabled).toBe(true);
  });

  it("removes session by id", () => {
    useChatStore.setState({
      sessions: [{ id: "a" }, { id: "b" }]
    });
    useChatStore.getState().removeSession("a");
    expect(useChatStore.getState().sessions).toEqual([{ id: "b" }]);
  });
});
