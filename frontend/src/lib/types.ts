export type ProviderName = "ollama" | "openai_compatible" | "gemini";

export type ChatRole = "user" | "assistant" | "system";

/** In-memory image payloads for user message previews (not persisted by the API). */
export interface ChatImageAttachment {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  provider?: ProviderName;
  model?: string;
  /** Populated client-side for thumbnails; merged onto the last user message after sync when possible. */
  imageAttachments?: ChatImageAttachment[];
}

export interface SessionModel {
  id: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatAttachment {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface ChatRequestPayload {
  session_id: string;
  message: string;
  provider: ProviderName;
  model: string;
  attachments?: ChatAttachment[];
  thinkingEnabled?: boolean;
}

/** Client-side observability for the last completed stream (TTFB + throughput). */
export interface StreamMetrics {
  /** ms from fetch start until first non-empty decoded chunk */
  firstChunkMs: number | null;
  /** Approximate output tok/s from first chunk to stream end (same heuristic as session token bar). */
  tokensPerSec: number | null;
  /** Backend `X-Start-Time` (Unix ms) when the stream response was opened, if exposed by the proxy. */
  serverStreamOpenMs: number | null;
  totalChars: number;
}

export interface ProviderModelCatalog {
  provider: ProviderName;
  models: string[];
}
