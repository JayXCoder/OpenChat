"use client";

import { useMemo } from "react";

import { useChatStore } from "@/lib/store";
import { ProviderModelCatalog } from "@/lib/types";

interface ModelSelectorProps {
  catalog: ProviderModelCatalog[];
}

const PROVIDER_LABELS: Record<ProviderModelCatalog["provider"], string> = {
  ollama: "Ollama",
  openai_compatible: "OpenAI",
  gemini: "Gemini"
};

export function ModelSelector({ catalog }: ModelSelectorProps) {
  const provider = useChatStore((s) => s.selectedProvider);
  const model = useChatStore((s) => s.selectedModel);
  const setProviderModel = useChatStore((s) => s.setProviderModel);

  const providerModels = useMemo(
    () => catalog.find((item) => item.provider === provider)?.models ?? [],
    [catalog, provider]
  );

  return (
    <div className="space-y-2">
      <select
        className="min-h-11 w-full cursor-pointer border-2 border-ink bg-paper px-2 py-2 text-xs font-bold uppercase tracking-wide text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:text-sm"
        value={provider}
        onChange={(event) => {
          const nextProvider = event.target.value as ProviderModelCatalog["provider"];
          const firstModel = catalog.find((entry) => entry.provider === nextProvider)?.models[0] ?? "";
          setProviderModel(nextProvider, firstModel);
        }}
      >
        {catalog.map((entry) => (
          <option key={entry.provider} value={entry.provider}>
            {PROVIDER_LABELS[entry.provider]}
          </option>
        ))}
      </select>

      <select
        className="min-h-11 w-full cursor-pointer border-2 border-ink bg-paper px-2 py-2 text-xs font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:text-sm"
        value={model}
        onChange={(event) => setProviderModel(provider, event.target.value)}
      >
        {providerModels.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
    </div>
  );
}
