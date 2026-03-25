import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageBubble } from "./message-bubble";

describe("MessageBubble", () => {
  it("shows a blinking caret while the assistant reply is streaming", () => {
    const { container } = render(
      <MessageBubble
        message={{ id: "a1", role: "assistant", content: "Hi" }}
        assistantReplyComplete={false}
      />
    );
    expect(container.querySelector(".animate-cursor-blink")).toBeTruthy();
  });

  it("hides the caret when the assistant reply is complete", () => {
    const { container } = render(
      <MessageBubble
        message={{ id: "a1", role: "assistant", content: "Hi" }}
        assistantReplyComplete
      />
    );
    expect(container.querySelector(".animate-cursor-blink")).toBeNull();
  });
});
