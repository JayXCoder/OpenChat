import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteSession, streamChat } from "./api";
import type { StreamMetrics } from "./types";

function makeStreamBody(chunks: string[]) {
  let i = 0;
  return {
    getReader() {
      return {
        read: async () => {
          if (i >= chunks.length) {
            return { done: true, value: undefined };
          }
          const value = new TextEncoder().encode(chunks[i++]);
          return { done: false, value };
        }
      };
    }
  };
}

describe("api helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps stream payload to backend shape and emits chunks", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name.toLowerCase() === "x-start-time" ? "1700000000000" : null)
      },
      body: makeStreamBody(["hello", " world"])
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const received: string[] = [];
    let completed: StreamMetrics | null = null;
    await streamChat(
      {
        session_id: "s1",
        message: "Hi",
        provider: "ollama",
        model: "qwen3:latest",
        thinkingEnabled: false,
        attachments: [{ name: "a.txt", mimeType: "text/plain", dataBase64: "YQ==" }]
      },
      (c) => received.push(c),
      {
        onComplete: (m) => {
          completed = m;
        }
      }
    );

    expect(received.join("")).toBe("hello world");
    expect(completed).not.toBeNull();
    expect(completed!.totalChars).toBe(11);
    expect(completed!.serverStreamOpenMs).toBe(1_700_000_000_000);
    expect(completed!.firstChunkMs).not.toBeNull();
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.thinking_enabled).toBe(false);
    expect(body.attachments[0]).toEqual({
      name: "a.txt",
      mime_type: "text/plain",
      data_base64: "YQ=="
    });
  });

  it("throws when stream request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        body: null
      }) as unknown as typeof fetch
    );
    await expect(
      streamChat(
        {
          session_id: "s1",
          message: "Hi",
          provider: "ollama",
          model: "qwen3:latest"
        },
        () => {}
      )
    ).rejects.toThrow("Stream request failed");
  });

  it("throws when deleting session fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false
      }) as unknown as typeof fetch
    );
    await expect(deleteSession("s1")).rejects.toThrow("Failed to delete session");
  });
});
