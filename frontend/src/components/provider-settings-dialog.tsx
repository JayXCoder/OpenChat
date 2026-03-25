"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Eye, EyeOff, X } from "lucide-react";

import {
  clearProviderOverrides,
  loadProviderOverrides,
  saveProviderOverrides,
  type ProviderOverridesV1
} from "@/lib/provider-settings";

export interface ProviderSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function normalizeOptional(s: string): string | undefined {
  const t = s.trim();
  return t ? t : undefined;
}

export function ProviderSettingsDialog({ open, onClose, onSaved }: ProviderSettingsDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [ollamaUrl, setOllamaUrl] = useState("");
  const [openaiUrl, setOpenaiUrl] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [ollamaModels, setOllamaModels] = useState("");
  const [openaiModels, setOpenaiModels] = useState("");
  const [geminiUrl, setGeminiUrl] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiModels, setGeminiModels] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [storedHadOpenaiKey, setStoredHadOpenaiKey] = useState(false);
  const [storedHadGeminiKey, setStoredHadGeminiKey] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const s = loadProviderOverrides();
    setOllamaUrl(s.ollamaBaseUrl ?? "");
    setOpenaiUrl(s.openaiBaseUrl ?? "");
    setOpenaiKeyInput("");
    setOllamaModels(s.ollamaModelsCsv ?? "");
    setOpenaiModels(s.openaiModelsCsv ?? "");
    setGeminiUrl(s.geminiBaseUrl ?? "");
    setGeminiKeyInput("");
    setGeminiModels(s.geminiModelsCsv ?? "");
    setShowOpenaiKey(false);
    setShowGeminiKey(false);
    setStoredHadOpenaiKey(Boolean(s.openaiApiKey?.trim()));
    setStoredHadGeminiKey(Boolean(s.geminiApiKey?.trim()));
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleSave = () => {
    const prev = loadProviderOverrides();
    const next: ProviderOverridesV1 = {
      ollamaBaseUrl: normalizeOptional(ollamaUrl),
      openaiBaseUrl: normalizeOptional(openaiUrl),
      ollamaModelsCsv: normalizeOptional(ollamaModels),
      openaiModelsCsv: normalizeOptional(openaiModels),
      geminiBaseUrl: normalizeOptional(geminiUrl),
      geminiModelsCsv: normalizeOptional(geminiModels)
    };
    const openaiKeyTrim = openaiKeyInput.trim();
    if (openaiKeyTrim) {
      next.openaiApiKey = openaiKeyTrim;
    } else if (storedHadOpenaiKey) {
      next.openaiApiKey = prev.openaiApiKey;
    }
    const geminiKeyTrim = geminiKeyInput.trim();
    if (geminiKeyTrim) {
      next.geminiApiKey = geminiKeyTrim;
    } else if (storedHadGeminiKey) {
      next.geminiApiKey = prev.geminiApiKey;
    }
    saveProviderOverrides(next);
    onSaved();
    onClose();
  };

  const handleClearAll = () => {
    clearProviderOverrides();
    setOllamaUrl("");
    setOpenaiUrl("");
    setOpenaiKeyInput("");
    setOllamaModels("");
    setOpenaiModels("");
    setGeminiUrl("");
    setGeminiKeyInput("");
    setGeminiModels("");
    setStoredHadOpenaiKey(false);
    setStoredHadGeminiKey(false);
    onSaved();
    onClose();
  };

  const fieldClass =
    "mt-1 w-full border-2 border-ink bg-paper px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-lime";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/80 p-3 motion-safe:transition-opacity motion-safe:duration-200 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(92dvh,880px)] w-full max-w-lg overflow-y-auto border-2 border-lime bg-paper shadow-none motion-safe:duration-200 sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b-2 border-ink bg-lime px-3 py-2 md:px-4">
          <div>
            <h2 id={titleId} className="text-xs font-bold uppercase tracking-wider text-ink">
              Provider endpoints
            </h2>
            <p className="mt-0.5 text-[10px] font-bold uppercase leading-snug text-ink/80">
              Overrides server env for this browser only
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-ink bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-5 px-3 py-4 md:px-4 md:py-5">
          <p className="text-xs leading-relaxed text-ink/85">
            Leave a field empty to keep the backend default from environment variables. API keys are stored in{" "}
            <span className="font-mono text-[11px]">localStorage</span> (visible to this origin; avoid shared machines).
          </p>

          <fieldset className="border-2 border-ink bg-panelAlt p-3">
            <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-ink">Ollama</legend>
            <label className="mt-2 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-ollama-url">
              Base URL
            </label>
            <input
              id="ps-ollama-url"
              className={fieldClass}
              autoComplete="url"
              placeholder="e.g. http://127.0.0.1:11434"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
            />
            <label className="mt-3 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-ollama-models">
              Fallback model list (optional)
            </label>
            <textarea
              id="ps-ollama-models"
              className={`${fieldClass} min-h-[4.5rem] resize-y font-mono text-xs`}
              placeholder="Comma-separated when /api/tags is unreachable"
              value={ollamaModels}
              onChange={(e) => setOllamaModels(e.target.value)}
            />
          </fieldset>

          <fieldset className="border-2 border-ink bg-panelAlt p-3">
            <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-ink">
              OpenAI-compatible
            </legend>
            <label className="mt-2 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-openai-url">
              Base URL
            </label>
            <input
              id="ps-openai-url"
              className={fieldClass}
              autoComplete="url"
              placeholder="e.g. https://api.openai.com/v1"
              value={openaiUrl}
              onChange={(e) => setOpenaiUrl(e.target.value)}
            />
            <label className="mt-3 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-openai-key">
              API key
            </label>
            <div className="relative mt-1">
              <input
                id="ps-openai-key"
                className={`${fieldClass} pr-12`}
                autoComplete="off"
                type={showOpenaiKey ? "text" : "password"}
                placeholder={storedHadOpenaiKey ? "Leave blank to keep saved key" : "Optional"}
                value={openaiKeyInput}
                onChange={(e) => setOpenaiKeyInput(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 flex h-9 min-w-9 -translate-y-1/2 cursor-pointer items-center justify-center border-2 border-ink bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                aria-label={showOpenaiKey ? "Hide OpenAI API key" : "Show OpenAI API key"}
                onClick={() => setShowOpenaiKey((v) => !v)}
              >
                {showOpenaiKey ? <EyeOff className="h-4 w-4" strokeWidth={2.5} /> : <Eye className="h-4 w-4" strokeWidth={2.5} />}
              </button>
            </div>
            <label className="mt-3 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-openai-models">
              Model allowlist (optional)
            </label>
            <textarea
              id="ps-openai-models"
              className={`${fieldClass} min-h-[4.5rem] resize-y font-mono text-xs`}
              placeholder="Comma-separated model ids for this provider"
              value={openaiModels}
              onChange={(e) => setOpenaiModels(e.target.value)}
            />
          </fieldset>

          <fieldset className="border-2 border-ink bg-panelAlt p-3">
            <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-ink">Google Gemini</legend>
            <label className="mt-2 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-gemini-url">
              API base URL (optional)
            </label>
            <input
              id="ps-gemini-url"
              className={fieldClass}
              autoComplete="url"
              placeholder="Only API root, e.g. https://…/v1beta (not a :generateContent URL)"
              value={geminiUrl}
              onChange={(e) => setGeminiUrl(e.target.value)}
            />
            <label className="mt-3 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-gemini-key">
              API key
            </label>
            <div className="relative mt-1">
              <input
                id="ps-gemini-key"
                className={`${fieldClass} pr-12`}
                autoComplete="off"
                type={showGeminiKey ? "text" : "password"}
                placeholder={storedHadGeminiKey ? "Leave blank to keep saved key" : "Required to chat with Gemini"}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 flex h-9 min-w-9 -translate-y-1/2 cursor-pointer items-center justify-center border-2 border-ink bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                aria-label={showGeminiKey ? "Hide Gemini API key" : "Show Gemini API key"}
                onClick={() => setShowGeminiKey((v) => !v)}
              >
                {showGeminiKey ? <EyeOff className="h-4 w-4" strokeWidth={2.5} /> : <Eye className="h-4 w-4" strokeWidth={2.5} />}
              </button>
            </div>
            <label className="mt-3 block text-[10px] font-bold uppercase text-ink" htmlFor="ps-gemini-models">
              Model allowlist (optional)
            </label>
            <textarea
              id="ps-gemini-models"
              className={`${fieldClass} min-h-[4.5rem] resize-y font-mono text-xs`}
              placeholder="e.g. gemini-2.0-flash, gemini-1.5-flash"
              value={geminiModels}
              onChange={(e) => setGeminiModels(e.target.value)}
            />
          </fieldset>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="min-h-11 cursor-pointer border-2 border-ink bg-paper px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              onClick={handleClearAll}
            >
              Clear overrides
            </button>
            <button
              type="button"
              className="min-h-11 cursor-pointer border-2 border-ink bg-paper px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="min-h-11 cursor-pointer border-2 border-ink bg-ink px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-lime transition-colors duration-200 hover:bg-lime hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
