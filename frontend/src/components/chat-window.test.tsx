import React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChatWindow } from "./chat-window";
import { useChatStore } from "@/lib/store";

describe("ChatWindow streaming behavior", () => {
  it("updates assistant content progressively during streaming", async () => {
    useChatStore.setState({
      sessionId: "s1",
      sessions: [],
      messages: [{ id: "a1", role: "assistant", content: "" }],
      selectedProvider: "ollama",
      selectedModel: "qwen3:latest",
      thinkingEnabled: true,
      isStreaming: true,
      error: null
    });

    render(<ChatWindow />);

    await act(async () => {
      useChatStore.getState().updateAssistantDraft("Hel");
      useChatStore.getState().updateAssistantDraft("lo");
    });

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
