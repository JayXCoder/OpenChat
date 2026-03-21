import { ChatRequestPayload, ChatMessage, ProviderModelCatalog, SessionModel } from "@/lib/types";

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

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch session messages");
  }

  return response.json();
}

export async function getModelCatalog(): Promise<ProviderModelCatalog[]> {
  const response = await fetch("/api/models");
  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }
  return response.json();
}

export async function streamChat(
  payload: ChatRequestPayload,
  onChunk: (chunk: string) => void
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

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok || !response.body) {
    throw new Error("Stream request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      onChunk(chunk);
    }
  }
}
