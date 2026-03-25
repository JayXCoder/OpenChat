"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { Brain, Plus, X } from "lucide-react";

import { ImageLightbox } from "@/components/image-lightbox";
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
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
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
      className="sticky bottom-0 z-20 shrink-0 border-t-2 border-ink bg-paper p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-4"
    >
      <div className="flex flex-col gap-2 border-2 border-ink bg-panelAlt p-2.5 md:p-3">
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
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-ink bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-lime disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Add files or images"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => onThinkingEnabledChange(!thinkingEnabled)}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-2 border-ink px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              thinkingEnabled ? "bg-lime text-ink hover:bg-ink hover:text-lime" : "bg-paper text-ink hover:bg-ink hover:text-lime"
            }`}
          >
            <Brain className="h-3.5 w-3.5" strokeWidth={2.5} />
            Thinking {thinkingEnabled ? "on" : "off"}
          </button>
        </div>

        {pending.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex max-w-full items-center gap-2 border-2 border-ink bg-paper py-1 pl-1 pr-1 text-xs text-ink"
              >
                {p.previewUrl ? (
                  <button
                    type="button"
                    className="relative h-11 w-11 min-h-11 min-w-11 shrink-0 cursor-pointer overflow-hidden border-2 border-ink bg-panelAlt transition-colors duration-200 hover:border-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                    aria-label={`View full size: ${p.file.name}`}
                    onClick={() => setLightbox({ src: p.previewUrl!, alt: p.file.name })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from user file */}
                    <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    <span className="sr-only">{p.file.name}</span>
                  </button>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-panelAlt text-[10px] font-bold uppercase text-ink/60">
                    FILE
                  </div>
                )}
                <span className="max-w-[10rem] truncate font-bold uppercase" title={p.file.name}>
                  {p.file.name}
                </span>
                <button
                  type="button"
                  className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  aria-label="Remove attachment"
                  onClick={() => removePending(p.id)}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2 md:gap-3">
          <textarea
            id="chat-input-field"
            className="min-h-16 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/45 md:min-h-20 md:text-base"
            placeholder="Ask anything… (optional if you attach files)"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="submit"
            disabled={isStreaming || (!value.trim() && pending.length === 0)}
            className="min-h-11 shrink-0 cursor-pointer border-2 border-ink bg-ink px-3 py-2 text-xs font-bold uppercase text-lime transition-colors duration-200 hover:bg-lime hover:text-ink disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-panelAlt disabled:text-ink/40 md:px-4 md:text-sm"
          >
            Send
          </button>
        </div>
      </div>
      {lightbox ? (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      ) : null}
    </form>
  );
}
