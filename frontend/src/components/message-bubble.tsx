"use client";

import { useEffect, useRef, useState } from "react";

import { ChatMessage } from "@/lib/types";

import { MessageMarkdown } from "@/components/message-markdown";
import { estimateTokenCount, splitThinking } from "@/lib/chat-metrics";

interface MessageBubbleProps {
  message: ChatMessage;
  /** False only for the in-flight assistant reply while streaming. */
  assistantReplyComplete: boolean;
}

export function MessageBubble({ message, assistantReplyComplete }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { visibleContent, thinkingContent } = splitThinking(message.content);
  const promptTokens = isUser ? estimateTokenCount(message.content) : 0;
  const responseTokens = isUser ? 0 : estimateTokenCount(message.content);
  const thinkingTokens = thinkingContent ? estimateTokenCount(thinkingContent) : 0;

  const [thinkingOpen, setThinkingOpen] = useState(false);
  const wasCompleteRef = useRef(false);

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

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "whitespace-pre-wrap bg-blue-600/80 text-white" : "bg-zinc-900 text-zinc-100 border border-zinc-800"
        }`}
      >
        {isUser ? message.content : <MessageMarkdown content={visibleContent || message.content} />}
        <div className={`mt-2 text-[11px] ${isUser ? "text-blue-100/80" : "text-zinc-400"}`}>
          {isUser ? `send ~${promptTokens} tok` : `resp ~${responseTokens} tok`}
        </div>
        {!isUser && thinkingContent ? (
          <details
            className="mt-2 rounded-md border border-zinc-700 bg-zinc-950/50"
            open={thinkingOpen}
            onToggle={(e) => setThinkingOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer select-none px-2 py-1 text-xs text-zinc-300">
              Thinking (~{thinkingTokens} tok) — {assistantReplyComplete ? "tap to hide" : "streaming…"}
            </summary>
            <div className="max-h-80 overflow-y-auto border-t border-zinc-800 px-2 py-2 text-xs text-zinc-300 whitespace-pre-wrap">
              {thinkingContent}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
