export interface ThinkingSplitResult {
  visibleContent: string;
  thinkingContent: string;
}

const THINK_OPEN = "\u003cthink\u003e";
const THINK_CLOSE = "\u003c/think\u003e";
const REDACTED_OPEN = "\u003credacted_reasoning\u003e";
const REDACTED_CLOSE = "\u003c/redacted_reasoning\u003e";

const OPEN_TAGS = [THINK_OPEN, REDACTED_OPEN] as const;
const CLOSE_TAGS = [THINK_CLOSE, REDACTED_CLOSE] as const;

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

/** True when the user is within `thresholdPx` of the bottom of a scroll container. */
export function isNearBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  thresholdPx = 120
): boolean {
  return scrollHeight - scrollTop - clientHeight < thresholdPx;
}

/** Fix missing `>` after `think` or `redacted_reasoning` open tags (common model glitch). */
function normalizeMalformedThinkOpens(content: string): string {
  return content
    .replace(/\u003cthink(?!\u003e)/gi, THINK_OPEN)
    .replace(/\u003credacted_reasoning(?!\u003e)/gi, REDACTED_OPEN);
}

function findFirstOpen(s: string): { idx: number; len: number } | null {
  let best: { idx: number; len: number } | null = null;
  for (const o of OPEN_TAGS) {
    const i = s.indexOf(o);
    if (i >= 0 && (best === null || i < best.idx)) {
      best = { idx: i, len: o.length };
    }
  }
  return best;
}

function findFirstClose(s: string, from: number): { idx: number; len: number } | null {
  let best: { idx: number; len: number } | null = null;
  for (const c of CLOSE_TAGS) {
    const i = s.indexOf(c, from);
    if (i >= 0 && (best === null || i < best.idx)) {
      best = { idx: i, len: c.length };
    }
  }
  return best;
}

/** Start index of the last closing tag (think or redacted_reasoning). */
function lastCloseStart(s: string): number {
  let best = -1;
  for (const c of CLOSE_TAGS) {
    const i = s.lastIndexOf(c);
    if (i > best) best = i;
  }
  return best;
}

function suffixAfterLastClose(s: string): string {
  let best = -1;
  let len = 0;
  for (const c of CLOSE_TAGS) {
    const i = s.lastIndexOf(c);
    if (i > best) {
      best = i;
      len = c.length;
    }
  }
  if (best < 0) return "";
  return s.slice(best + len);
}

function stripOrphanThinkMarkers(visible: string): string {
  let out = visible;
  for (const o of OPEN_TAGS) {
    out = out.split(o).join("");
  }
  for (const c of CLOSE_TAGS) {
    out = out.split(c).join("");
  }
  return out;
}

export function splitThinking(content: string): ThinkingSplitResult {
  const normalized = normalizeMalformedThinkOpens(content);
  const thinkingChunks: string[] = [];
  let work = normalized;

  let guard = 0;
  while (guard++ < 1000) {
    const open = findFirstOpen(work);
    if (!open) break;
    const afterOpen = open.idx + open.len;
    const close = findFirstClose(work, afterOpen);
    if (!close) {
      const rest = work.slice(afterOpen);
      if (rest.trim()) thinkingChunks.push(rest.trim());
      work = work.slice(0, open.idx);
      break;
    }
    const inner = work.slice(afterOpen, close.idx).trim();
    if (inner) thinkingChunks.push(inner);
    work = work.slice(0, open.idx) + work.slice(close.idx + close.len);
  }

  work = work.replace(/```(?:thinking|reasoning)\n([\s\S]*?)```/gi, (_full, think) => {
    const clean = String(think || "").trim();
    if (clean) thinkingChunks.push(clean);
    return "";
  });

  let visibleContent = stripOrphanThinkMarkers(work).trim();

  // Models often append the real answer after the final closing tag; leaked preamble
  // may remain outside paired blocks — prefer this suffix when present.
  const tail = suffixAfterLastClose(normalized).trim();
  if (tail.length > 0) {
    visibleContent = tail;
    if (thinkingChunks.length === 0) {
      const end = lastCloseStart(normalized);
      if (end > 0) {
        const prefix = normalized.slice(0, end).trim();
        if (prefix) thinkingChunks.push(prefix);
      }
    }
  }

  return {
    visibleContent: visibleContent.trim(),
    thinkingContent: thinkingChunks.join("\n\n").trim()
  };
}

/** True while streamed assistant content has an unclosed think block. */
export function hasUnclosedThinkBlock(content: string): boolean {
  const normalized = normalizeMalformedThinkOpens(content);
  const opens = OPEN_TAGS.reduce((acc, t) => acc + (normalized.split(t).length - 1), 0);
  const closes = CLOSE_TAGS.reduce((acc, t) => acc + (normalized.split(t).length - 1), 0);
  return opens > closes;
}
