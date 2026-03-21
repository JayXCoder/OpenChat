"use client";

import { useEffect, useRef, useState } from "react";

import { MessageBubble } from "@/components/message-bubble";
import { estimateTokenCount, splitThinking } from "@/lib/chat-metrics";
import { useChatStore } from "@/lib/store";

const FUN_STREAM_STATUSES = [
  "Cooking tokens in the oven",
  "Polishing words to sparkle",
  "Brewing a tiny fun fact",
  "Assembling answer bricks",
  "Warming up witty circuits",
  "Untangling thought noodles"
];

export function ChatWindow() {
  const messages = useChatStore((s) => s.messages);
  const error = useChatStore((s) => s.error);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [funStatus, setFunStatus] = useState(FUN_STREAM_STATUSES[0]);
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const lastAssistantContent = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const { thinkingContent: currentThinkingContent, visibleContent: currentVisibleContent } =
    splitThinking(lastAssistantContent);
  const hasOpenThinkTag =
    lastAssistantContent.includes("<think>") && !lastAssistantContent.includes("</think>");
  const isActuallyThinking =
    isStreaming &&
    (hasOpenThinkTag ||
      (Boolean(currentThinkingContent.trim()) && !Boolean(currentVisibleContent.trim())));
  const totalPromptTokens = messages
    .filter((message) => message.role === "user")
    .reduce((sum, message) => sum + estimateTokenCount(message.content), 0);
  const totalResponseTokens = messages
    .filter((message) => message.role === "assistant")
    .reduce((sum, message) => sum + estimateTokenCount(message.content), 0);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) return;
    const first = FUN_STREAM_STATUSES[Math.floor(Math.random() * FUN_STREAM_STATUSES.length)];
    setFunStatus(first);
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming || isActuallyThinking) return;
    const id = setInterval(() => {
      setFunStatus((prev) => {
        const options = FUN_STREAM_STATUSES.filter((item) => item !== prev);
        return options[Math.floor(Math.random() * options.length)] ?? prev;
      });
    }, 2800);
    return () => clearInterval(id);
  }, [isStreaming, isActuallyThinking]);

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300">
        Session tokens: send ~{totalPromptTokens} tok | respond ~{totalResponseTokens} tok
      </div>
      {messages.length === 0 ? (
        <div className="text-zinc-500 text-sm">Start a conversation.</div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            assistantReplyComplete={
              message.role !== "assistant" || message.id !== lastAssistantId || !isStreaming
            }
          />
        ))
      )}
      {isStreaming ? (
        <div className="w-full flex justify-start">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            {isActuallyThinking ? "Thinking" : funStatus}
            <span className="inline-flex ml-1 gap-1 align-middle">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-thinking-dot-1" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-thinking-dot-2" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-thinking-dot-3" />
            </span>
          </div>
        </div>
      ) : null}
      {error ? <div className="text-red-400 text-sm">{error}</div> : null}
    </div>
  );
}
