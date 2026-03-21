export type ProviderName = "ollama" | "openai_compatible";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  provider?: ProviderName;
  model?: string;
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

export interface ProviderModelCatalog {
  provider: ProviderName;
  models: string[];
}
