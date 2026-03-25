import { describe, expect, it } from "vitest";

import {
  estimateTokenCount,
  hasUnclosedThinkBlock,
  isNearBottom,
  splitThinking
} from "./chat-metrics";

describe("chat metrics", () => {
  it("estimates token count from text length", () => {
    expect(estimateTokenCount("")).toBe(0);
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcdefgh")).toBe(2);
  });

  it("detects near-bottom scroll position for auto-scroll gating", () => {
    expect(isNearBottom(0, 1000, 500, 120)).toBe(false);
    expect(isNearBottom(400, 1000, 500, 120)).toBe(true);
    expect(isNearBottom(381, 1000, 500, 120)).toBe(true);
  });

  it("splits think blocks from visible content", () => {
    const input = "\u003cthink\u003ereasoning\u003c/think\u003e\n\nFinal answer";
    const out = splitThinking(input);
    expect(out.thinkingContent).toBe("reasoning");
    expect(out.visibleContent).toBe("Final answer");
  });

  it("normalizes think without gt and still splits", () => {
    const input = "\u003cthinkWe need\u003c/think\u003e\n\nFinal";
    const out = splitThinking(input);
    expect(out.thinkingContent).toContain("We need");
    expect(out.visibleContent).toBe("Final");
  });

  it("splits redacted_reasoning blocks", () => {
    const input = "\u003credacted_reasoning\u003einner\u003c/redacted_reasoning\u003e\n\nOut";
    const out = splitThinking(input);
    expect(out.thinkingContent).toBe("inner");
    expect(out.visibleContent).toBe("Out");
  });

  it("detects unclosed think block", () => {
    expect(hasUnclosedThinkBlock("\u003cthink\u003eonly open")).toBe(true);
    expect(hasUnclosedThinkBlock("\u003cthink\u003ex\u003c/think\u003e")).toBe(false);
  });

  it("splits fenced thinking blocks from visible content", () => {
    const input = "```thinking\nstep 1\nstep 2\n```\nDone";
    const out = splitThinking(input);
    expect(out.thinkingContent).toContain("step 1");
    expect(out.visibleContent).toBe("Done");
  });

  it("prefers the suffix after the final close tag as the visible answer", () => {
    const input =
      "\u003cthinkWe need to plan.\u003c/think\u003e\n\n" +
      "\u003cthink\u003eThe user asks for the day.\u003c/think\u003e\n" +
      "I'm doing well, thank you! Today is Wednesday.";
    const out = splitThinking(input);
    expect(out.visibleContent).toBe("I'm doing well, thank you! Today is Wednesday.");
    expect(out.thinkingContent).toContain("We need to plan");
    expect(out.thinkingContent).toContain("The user asks");
  });
});
