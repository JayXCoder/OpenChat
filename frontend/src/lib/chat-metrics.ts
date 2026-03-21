export interface ThinkingSplitResult {
  visibleContent: string;
  thinkingContent: string;
}

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function splitThinking(content: string): ThinkingSplitResult {
  const thinkingChunks: string[] = [];
  let visible = content;

  visible = visible.replace(/<think>([\s\S]*?)<\/think>/gi, (_full, think) => {
    const clean = String(think || "").trim();
    if (clean) thinkingChunks.push(clean);
    return "";
  });

  visible = visible.replace(/```(?:thinking|reasoning)\n([\s\S]*?)```/gi, (_full, think) => {
    const clean = String(think || "").trim();
    if (clean) thinkingChunks.push(clean);
    return "";
  });

  return {
    visibleContent: visible.trim(),
    thinkingContent: thinkingChunks.join("\n\n").trim()
  };
}
