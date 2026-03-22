import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Page from "./page";
import { useChatStore } from "@/lib/store";

const apiMock = vi.hoisted(() => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getModelCatalog: vi.fn(),
  getSessionMessages: vi.fn(),
  listSessions: vi.fn(),
  streamChat: vi.fn(),
  updateSessionTitle: vi.fn()
}));

vi.mock("@/lib/api", () => apiMock);

describe("Page integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      sessionId: null,
      sessions: [],
      messages: [],
      selectedProvider: "ollama",
      selectedModel: "qwen3:latest",
      thinkingEnabled: true,
      isStreaming: false,
      error: null
    });

    apiMock.getModelCatalog.mockResolvedValue([
      { provider: "ollama", models: ["qwen3:latest"] }
    ]);
    apiMock.listSessions.mockResolvedValue([
      { id: "s1", title: "First" },
      { id: "s2", title: "Second" }
    ]);
    apiMock.getSessionMessages.mockImplementation(async (id: string) =>
      id === "s3"
        ? [
            { id: "u3", role: "user", content: "Hello" },
            { id: "a3", role: "assistant", content: "Hello world" }
          ]
        : id === "s2"
          ? [{ id: "m2", role: "assistant", content: "from s2" }]
          : [{ id: "m1", role: "assistant", content: "from s1" }]
    );
    apiMock.createSession.mockResolvedValue({ id: "s3", title: null });
    apiMock.updateSessionTitle.mockResolvedValue({ id: "s1", title: "Renamed" });
    apiMock.deleteSession.mockResolvedValue(undefined);
    apiMock.streamChat.mockImplementation(async (_payload: unknown, onChunk: (x: string) => void) => {
      onChunk("Hello");
      onChunk(" world");
    });
  });

  it("switches sessions and loads messages", async () => {
    render(<Page />);

    await userEvent.click(await screen.findByRole("button", { name: "Open sidebar" }));
    const sessionBtn = await screen.findByRole("button", { name: "Second" });
    await userEvent.click(sessionBtn);

    await waitFor(() => {
      expect(apiMock.getSessionMessages).toHaveBeenCalledWith("s2");
    });
    expect(await screen.findByText("from s2")).toBeInTheDocument();
  });

  it("streams response into last assistant message", async () => {
    render(<Page />);

    const inputs = await screen.findAllByPlaceholderText("Ask anything… (optional if you attach files)");
    const input = inputs[0];
    await userEvent.type(input, "Hello");
    const sendButtons = screen.getAllByRole("button", { name: "Send" });
    await userEvent.click(sendButtons[0]);

    await waitFor(() => {
      expect(apiMock.streamChat).toHaveBeenCalled();
    });
    const streamed = await screen.findAllByText("Hello world");
    expect(streamed.length).toBeGreaterThan(0);
  });
});
