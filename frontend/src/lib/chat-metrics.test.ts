import { describe, expect, it } from "vitest";

import { estimateTokenCount, splitThinking } from "./chat-metrics";

describe("chat metrics", () => {
  it("estimates token count from text length", () => {
    expect(estimateTokenCount("")).toBe(0);
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcdefgh")).toBe(2);
  });

  it("splits <think> blocks from visible content", () => {
    const input = "<think>reasoning</think>\n\nFinal answer";
    const out = splitThinking(input);
    expect(out.thinkingContent).toBe("reasoning");
    expect(out.visibleContent).toBe("Final answer");
  });

  it("splits fenced thinking blocks from visible content", () => {
    const input = "```thinking\nstep 1\nstep 2\n```\nDone";
    const out = splitThinking(input);
    expect(out.thinkingContent).toContain("step 1");
    expect(out.visibleContent).toBe("Done");
  });
});
