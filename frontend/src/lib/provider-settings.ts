/**
 * Browser-only overrides for provider endpoints. Sent as headers to /api/chat and /api/models
 * and merged on the FastAPI side with process env defaults.
 */

export const PROVIDER_OVERRIDES_STORAGE_KEY = "openchat_provider_overrides_v1";

/** Lowercase names; must match backend `app.core.provider_runtime` headers. */
export const PROVIDER_OVERRIDE_HEADER_NAMES = [
  "x-openchat-ollama-base-url",
  "x-openchat-openai-base-url",
  "x-openchat-openai-api-key",
  "x-openchat-ollama-models",
  "x-openchat-openai-models",
  "x-openchat-gemini-base-url",
  "x-openchat-gemini-api-key",
  "x-openchat-gemini-models"
] as const;

export type ProviderOverridesV1 = {
  ollamaBaseUrl?: string;
  openaiBaseUrl?: string;
  openaiApiKey?: string;
  ollamaModelsCsv?: string;
  openaiModelsCsv?: string;
  geminiBaseUrl?: string;
  geminiApiKey?: string;
  geminiModelsCsv?: string;
};

export function loadProviderOverrides(): ProviderOverridesV1 {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(PROVIDER_OVERRIDES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as ProviderOverridesV1;
  } catch {
    return {};
  }
}

export function saveProviderOverrides(data: ProviderOverridesV1): void {
  localStorage.setItem(PROVIDER_OVERRIDES_STORAGE_KEY, JSON.stringify(data));
}

export function clearProviderOverrides(): void {
  localStorage.removeItem(PROVIDER_OVERRIDES_STORAGE_KEY);
}

/** Attach non-empty override values to an outgoing Headers object. */
export function applyProviderOverrideHeaders(target: Headers): void {
  const s = loadProviderOverrides();
  const put = (name: string, value: string | undefined) => {
    const t = value?.trim();
    if (t) {
      target.set(name, t);
    }
  };
  put("x-openchat-ollama-base-url", s.ollamaBaseUrl);
  put("x-openchat-openai-base-url", s.openaiBaseUrl);
  put("x-openchat-openai-api-key", s.openaiApiKey);
  put("x-openchat-ollama-models", s.ollamaModelsCsv);
  put("x-openchat-openai-models", s.openaiModelsCsv);
  put("x-openchat-gemini-base-url", s.geminiBaseUrl);
  put("x-openchat-gemini-api-key", s.geminiApiKey);
  put("x-openchat-gemini-models", s.geminiModelsCsv);
}

export function forwardProviderOverrideHeaders(from: Headers, to: Headers): void {
  for (const name of PROVIDER_OVERRIDE_HEADER_NAMES) {
    const v = from.get(name);
    if (v) {
      to.set(name, v);
    }
  }
}
