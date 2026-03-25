"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MessageBubble } from "@/components/message-bubble";
import {
  estimateTokenCount,
  hasUnclosedThinkBlock,
  isNearBottom,
  splitThinking
} from "@/lib/chat-metrics";
import { useChatStore } from "@/lib/store";

const FUN_STREAM_STATUSES = [
  "Cooking tokens in the oven",
  "Polishing words to sparkle",
  "Brewing a tiny fun fact",
  "Assembling answer bricks",
  "Warming up witty circuits",
  "Untangling thought noodles"
];

interface ChatWindowProps {
  onStartTyping?: () => void;
}

export function ChatWindow({ onStartTyping }: ChatWindowProps) {
  const messages = useChatStore((s) => s.messages);
  const error = useChatStore((s) => s.error);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const lastStreamMetrics = useChatStore((s) => s.lastStreamMetrics);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const [funStatus, setFunStatus] = useState(FUN_STREAM_STATUSES[0]);
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const lastAssistantContent = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const { thinkingContent: currentThinkingContent, visibleContent: currentVisibleContent } =
    splitThinking(lastAssistantContent);
  const isActuallyThinking =
    isStreaming &&
    (hasUnclosedThinkBlock(lastAssistantContent) ||
      (Boolean(currentThinkingContent.trim()) && !Boolean(currentVisibleContent.trim())));
  const totalPromptTokens = messages
    .filter((message) => message.role === "user")
    .reduce((sum, message) => sum + estimateTokenCount(message.content), 0);
  const totalResponseTokens = messages
    .filter((message) => message.role === "assistant")
    .reduce((sum, message) => sum + estimateTokenCount(message.content), 0);

  const updateAutoScrollFromScrollPosition = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    autoScrollRef.current = isNearBottom(scrollTop, scrollHeight, clientHeight);
  }, []);

  const scrollToBottomIfPinned = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !autoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottomIfPinned();
  }, [messages, isStreaming, scrollToBottomIfPinned]);

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

  const metricsLine =
    lastStreamMetrics && !isStreaming
      ? [
          lastStreamMetrics.firstChunkMs !== null ? `⚡ ${Math.round(lastStreamMetrics.firstChunkMs)}ms first token` : null,
          lastStreamMetrics.tokensPerSec !== null ? `⚡ ${lastStreamMetrics.tokensPerSec} tok/s` : null
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div
      ref={scrollerRef}
      onScroll={updateAutoScrollFromScrollPosition}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 md:space-y-4 md:px-4 md:py-6"
    >
      <div className="space-y-1 border-2 border-ink bg-panelAlt px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink md:text-xs">
        <div>
          Session tokens: send ~{totalPromptTokens} tok | respond ~{totalResponseTokens} tok
        </div>
        {metricsLine ? <div className="text-ink/80 normal-case tracking-normal">{metricsLine}</div> : null}
      </div>
      {messages.length === 0 ? (
        <div className="border-2 border-ink bg-panelAlt p-4 md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink md:text-xs">// STATUS</p>
          <h1 className="mt-2 text-[clamp(1.75rem,6vw,3rem)] font-extrabold uppercase leading-tight tracking-tight text-ink">
            OPEN CHAT
          </h1>
          <div className="mt-2 inline-block bg-ink px-2 py-1">
            <span className="text-sm font-extrabold uppercase tracking-wide text-lime md:text-base">READY</span>
          </div>
          <p className="mt-4 max-w-md text-xs font-bold uppercase leading-relaxed text-ink/80 md:text-sm">
            Choose a provider and model in the sidebar, then send a message below.
          </p>
          <button
            type="button"
            className="mt-6 min-h-11 w-full max-w-md cursor-pointer border-2 border-ink bg-ink px-4 py-3 text-left text-xs font-bold uppercase text-lime transition-colors duration-200 hover:bg-lime hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:text-sm"
            onClick={onStartTyping}
          >
            FOCUS INPUT →
          </button>
        </div>
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
        <div className="flex w-full justify-start">
          <div className="border-2 border-ink bg-panelAlt px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink md:text-sm">
            {isActuallyThinking ? "Thinking" : funStatus}
            <span className="ml-1 inline-flex items-center gap-1 align-middle">
              <span className="h-1.5 w-1.5 bg-ink animate-thinking-dot-1" />
              <span className="h-1.5 w-1.5 bg-ink animate-thinking-dot-2" />
              <span className="h-1.5 w-1.5 bg-ink animate-thinking-dot-3" />
            </span>
          </div>
        </div>
      ) : null}
      {error ? <div className="border-2 border-ink bg-paper px-3 py-2 text-xs font-bold uppercase text-red-700">{error}</div> : null}
    </div>
  );
}
