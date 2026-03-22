import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageMarkdown } from "./message-markdown";

describe("MessageMarkdown security", () => {
  it("sanitizes javascript links", () => {
    render(<MessageMarkdown content={"[click](javascript:alert(1))"} />);
    const link = screen.getByRole("link", { name: "click" });
    expect(link).toHaveAttribute("href", "#");
  });

  it("adds safe attributes to external links", () => {
    render(<MessageMarkdown content={"[docs](https://example.com)"} />);
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });
});
