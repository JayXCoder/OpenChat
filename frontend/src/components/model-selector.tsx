"use client";

import { useMemo } from "react";

import { useChatStore } from "@/lib/store";
import { ProviderModelCatalog } from "@/lib/types";

interface ModelSelectorProps {
  catalog: ProviderModelCatalog[];
}

const PROVIDER_LABELS: Record<"ollama" | "openai_compatible", string> = {
  ollama: "Ollama",
  openai_compatible: "OpenAI"
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
        className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm"
        value={provider}
        onChange={(event) => {
          const nextProvider = event.target.value as "ollama" | "openai_compatible";
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
        className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm"
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
