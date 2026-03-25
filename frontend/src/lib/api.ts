import { estimateTokenCount } from "@/lib/chat-metrics";
import { applyProviderOverrideHeaders } from "@/lib/provider-settings";
import {
  ChatRequestPayload,
  ChatMessage,
  ProviderModelCatalog,
  SessionModel,
  StreamMetrics
} from "@/lib/types";

export type StreamChatOptions = {
  onComplete?: (metrics: StreamMetrics) => void;
};

export async function updateSessionTitle(sessionId: string, title: string): Promise<SessionModel> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error("Failed to rename session");
  }
  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error("Failed to delete session");
  }
}

export async function listSessions(): Promise<SessionModel[]> {
  const response = await fetch("/api/sessions", { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to list sessions");
  }
  return response.json();
}

export async function createSession(title?: string): Promise<SessionModel> {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title ?? null })
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return response.json();
}

function normalizeChatMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    id: String(raw.id),
    role: raw.role as ChatMessage["role"],
    content: String(raw.content ?? ""),
    provider: raw.provider as ChatMessage["provider"],
    model: raw.model != null ? String(raw.model) : undefined
  };
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch session messages");
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((item) => normalizeChatMessage(item as Record<string, unknown>));
}

export async function getModelCatalog(): Promise<ProviderModelCatalog[]> {
  const headers = new Headers();
  applyProviderOverrideHeaders(headers);
  const response = await fetch("/api/models", { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }
  return response.json();
}

export async function streamChat(
  payload: ChatRequestPayload,
  onChunk: (chunk: string) => void,
  options?: StreamChatOptions
): Promise<void> {
  const body = {
    session_id: payload.session_id,
    message: payload.message,
    provider: payload.provider,
    model: payload.model,
    thinking_enabled: payload.thinkingEnabled ?? true,
    ...(payload.attachments?.length
      ? {
          attachments: payload.attachments.map((a) => ({
            name: a.name,
            mime_type: a.mimeType,
            data_base64: a.dataBase64
          }))
        }
      : {})
  };

  const tRequestStart =
    typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

  const headers = new Headers({ "Content-Type": "application/json" });
  applyProviderOverrideHeaders(headers);
  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok || !response.body) {
    throw new Error("Stream request failed");
  }

  const rawStart = response.headers.get("X-Start-Time");
  const serverStreamOpenMs =
    rawStart !== null && rawStart !== "" && !Number.isNaN(Number(rawStart)) ? Number(rawStart) : null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let accumulated = "";
  let firstChunkMs: number | null = null;
  let tFirstChunkAbs: number | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      if (firstChunkMs === null) {
        const now =
          typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        firstChunkMs = now - tRequestStart;
        tFirstChunkAbs = now;
      }
      accumulated += chunk;
      onChunk(chunk);
    }
  }

  const tEnd =
    typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const streamActiveMs = tFirstChunkAbs !== null ? Math.max(0, tEnd - tFirstChunkAbs) : 0;
  const approxTok = accumulated.trim() ? estimateTokenCount(accumulated) : 0;
  const tokensPerSec =
    streamActiveMs > 0 && approxTok > 0 ? Math.round((approxTok / streamActiveMs) * 1000 * 10) / 10 : null;

  options?.onComplete?.({
    firstChunkMs,
    tokensPerSec,
    serverStreamOpenMs,
    totalChars: accumulated.length
  });
}
