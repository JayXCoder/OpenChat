"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ImageLightbox } from "@/components/image-lightbox";
import { MessageMarkdown } from "@/components/message-markdown";
import { estimateTokenCount, splitThinking } from "@/lib/chat-metrics";
import type { ChatImageAttachment, ChatMessage } from "@/lib/types";
import { partitionUserMessageContent } from "@/lib/user-message-display";

interface MessageBubbleProps {
  message: ChatMessage;
  /** False only for the in-flight assistant reply while streaming. */
  assistantReplyComplete: boolean;
}

function dataUrlFromAttachment(att: ChatImageAttachment): string {
  return `data:${att.mimeType || "image/png"};base64,${att.dataBase64}`;
}

function buildImagePreviews(
  content: string,
  attachments: ChatImageAttachment[] | undefined
): { src: string; alt: string }[] {
  if (!attachments?.length) return [];
  const { imageDescriptors } = partitionUserMessageContent(content);
  if (imageDescriptors.length === 0) {
    return attachments.map((a) => ({ src: dataUrlFromAttachment(a), alt: a.name }));
  }
  const out: { src: string; alt: string }[] = [];
  for (let i = 0; i < imageDescriptors.length; i++) {
    const d = imageDescriptors[i];
    const att = attachments.find((a) => a.name === d.name) ?? attachments[i];
    if (att) {
      out.push({ src: dataUrlFromAttachment(att), alt: att.name });
    }
  }
  return out;
}

export function MessageBubble({ message, assistantReplyComplete }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { visibleContent, thinkingContent } = splitThinking(message.content);
  const promptTokens = isUser ? estimateTokenCount(message.content) : 0;
  const responseTokens = isUser ? 0 : estimateTokenCount(message.content);
  const thinkingTokens = thinkingContent ? estimateTokenCount(thinkingContent) : 0;

  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const wasCompleteRef = useRef(false);

  const userParts = useMemo(() => {
    if (!isUser) return null;
    return partitionUserMessageContent(message.content);
  }, [isUser, message.content]);

  const imagePreviews = useMemo(
    () => (isUser ? buildImagePreviews(message.content, message.imageAttachments) : []),
    [isUser, message.content, message.imageAttachments]
  );

  useEffect(() => {
    if (!thinkingContent) {
      return;
    }
    const becameComplete = assistantReplyComplete && !wasCompleteRef.current;
    wasCompleteRef.current = assistantReplyComplete;
    if (becameComplete) {
      setThinkingOpen(true);
    }
  }, [assistantReplyComplete, thinkingContent]);

  const userBodyDisplay =
    isUser && userParts
      ? userParts.bodyText || (userParts.imageDescriptors.length || userParts.otherAttachmentLines.length ? "" : message.content)
      : "";

  const showAttachmentHeader =
    isUser &&
    userParts &&
    (userParts.imageDescriptors.length > 0 ||
      userParts.otherAttachmentLines.length > 0 ||
      imagePreviews.length > 0);

  const orphanImageNames =
    isUser && userParts && message.imageAttachments === undefined
      ? userParts.imageDescriptors.map((d) => d.name)
      : [];

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] border-2 border-ink px-4 py-3 text-sm leading-relaxed ${
          isUser ? "bg-ink text-lime" : "bg-paper text-ink"
        }`}
      >
        {isUser ? (
          <div className="space-y-3">
            {userBodyDisplay ? <div className="whitespace-pre-wrap">{userBodyDisplay}</div> : null}
            {showAttachmentHeader ? (
              <div className="border-t-2 border-lime/40 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-lime/90">Attachments</p>
                {imagePreviews.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {imagePreviews.map((item) => (
                      <button
                        key={`${item.alt}-${item.src.slice(0, 24)}`}
                        type="button"
                        className="group relative h-28 w-28 min-h-11 min-w-11 shrink-0 cursor-pointer overflow-hidden border-2 border-lime bg-paper transition-colors duration-200 hover:border-paper hover:ring-2 hover:ring-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                        aria-label={`View full size: ${item.alt}`}
                        onClick={() => setLightbox(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <span className="sr-only">{item.alt}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {orphanImageNames.length > 0 ? (
                  <ul className="mt-2 list-none space-y-1 text-[11px] font-bold uppercase leading-snug text-lime/70">
                    {orphanImageNames.map((name) => (
                      <li key={name}>— {name} (preview unavailable after reload)</li>
                    ))}
                  </ul>
                ) : null}
                {userParts && userParts.otherAttachmentLines.length > 0 ? (
                  <pre className="mt-2 whitespace-pre-wrap font-memo text-[11px] leading-relaxed text-lime/85">
                    {userParts.otherAttachmentLines.join("\n")}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="inline">
            <MessageMarkdown content={visibleContent || message.content} />
            {!assistantReplyComplete ? (
              <span
                className="animate-cursor-blink ml-px inline-block align-baseline text-ink"
                aria-hidden
              >
                ▍
              </span>
            ) : null}
          </span>
        )}
        <div
          className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${isUser ? "text-lime/80" : "text-ink/55"}`}
        >
          {isUser ? `send ~${promptTokens} tok` : `resp ~${responseTokens} tok`}
        </div>
        {!isUser && thinkingContent ? (
          <details
            className="mt-2 border-2 border-ink bg-panelAlt"
            open={thinkingOpen}
            onToggle={(e) => setThinkingOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer select-none px-2 py-2 text-[10px] font-bold uppercase text-ink">
              Thinking (~{thinkingTokens} tok) — {assistantReplyComplete ? "tap to hide" : "streaming…"}
            </summary>
            <div className="max-h-80 overflow-y-auto border-t-2 border-ink px-2 py-2 text-xs whitespace-pre-wrap text-ink">
              {thinkingContent}
            </div>
          </details>
        ) : null}
      </div>
      {lightbox ? <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}
