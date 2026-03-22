"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { Brain, Plus, X } from "lucide-react";

import { ChatAttachment } from "@/lib/types";

const MAX_FILES = 8;
const ACCEPT =
  "image/*,.txt,.md,.csv,.json,.yaml,.yml,.toml,.xml,.pdf,.doc,.docx,.zip";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

interface ChatInputProps {
  isStreaming: boolean;
  thinkingEnabled: boolean;
  onThinkingEnabledChange: (value: boolean) => void;
  onSubmit: (payload: { text: string; attachments: ChatAttachment[] }) => Promise<void>;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Invalid read result"));
        return;
      }
      const i = result.indexOf(",");
      resolve(i >= 0 ? result.slice(i + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function ChatInput({
  isStreaming,
  thinkingEnabled,
  onThinkingEnabledChange,
  onSubmit
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    return () => {
      for (const p of pendingRef.current) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next: PendingFile[] = [];
    const remaining = MAX_FILES - pending.length;
    const list = Array.from(files).slice(0, Math.max(0, remaining));
    for (const file of list) {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      next.push({ id: crypto.randomUUID(), file, previewUrl });
    }
    setPending((prev) => [...prev, ...next]);
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const buildAttachments = async (items: PendingFile[]): Promise<ChatAttachment[]> => {
    const out: ChatAttachment[] = [];
    for (const p of items) {
      const dataBase64 = await readFileAsBase64(p.file);
      out.push({
        name: p.file.name,
        mimeType: p.file.type || "application/octet-stream",
        dataBase64
      });
    }
    return out;
  };

  const clearPending = () => {
    setPending((prev) => {
      for (const p of prev) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
      return [];
    });
  };

  const runSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && pending.length === 0) || isStreaming) {
      return;
    }
    const snapshot = [...pending];
    const attachments = await buildAttachments(snapshot);
    setValue("");
    clearPending();
    await onSubmit({ text: trimmed, attachments });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runSend();
  };

  const onKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await runSend();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="sticky bottom-0 z-20 border-t border-zinc-800 p-2 md:p-4 bg-panelAlt/90 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-2.5 md:p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={ACCEPT}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={isStreaming}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
            aria-label="Add files or images"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => onThinkingEnabledChange(!thinkingEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
              thinkingEnabled
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                : "border-zinc-600 bg-zinc-800 text-zinc-400"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            Thinking {thinkingEnabled ? "on" : "off"}
          </button>
        </div>

        {pending.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950/80 pl-1 pr-1 py-1 text-xs text-zinc-300 max-w-full"
              >
                {p.previewUrl ? (
                  <img
                    src={p.previewUrl}
                    alt=""
                    className="h-9 w-9 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-500">
                    FILE
                  </div>
                )}
                <span className="truncate max-w-[10rem]" title={p.file.name}>
                  {p.file.name}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                  aria-label="Remove attachment"
                  onClick={() => removePending(p.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 md:gap-3 items-end">
          <textarea
            className="flex-1 resize-none bg-transparent outline-none text-sm text-zinc-100 min-h-16 md:min-h-20"
            placeholder="Ask anything… (optional if you attach files)"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="submit"
            disabled={isStreaming || (!value.trim() && pending.length === 0)}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 px-3 md:px-4 py-2 text-sm shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
