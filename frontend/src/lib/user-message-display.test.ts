import { describe, expect, it } from "vitest";

import { mergePendingImageAttachments, partitionUserMessageContent } from "@/lib/user-message-display";

describe("partitionUserMessageContent", () => {
  it("returns full content as body when no attachment marker", () => {
    expect(partitionUserMessageContent("hello")).toEqual({
      bodyText: "hello",
      imageDescriptors: [],
      otherAttachmentLines: []
    });
  });

  it("parses server-style image lines", () => {
    const content = "hi\n\n--- Attachments ---\n- shot.png (image/png, image)";
    expect(partitionUserMessageContent(content)).toEqual({
      bodyText: "hi",
      imageDescriptors: [{ name: "shot.png", mime: "image/png" }],
      otherAttachmentLines: []
    });
  });

  it("parses optimistic - filename lines for known image extensions", () => {
    const content = "--- Attachments ---\n- a.JPEG\n- doc.pdf";
    const r = partitionUserMessageContent(content);
    expect(r.bodyText).toBe("");
    expect(r.imageDescriptors).toEqual([{ name: "a.JPEG" }]);
    expect(r.otherAttachmentLines).toEqual(["- doc.pdf"]);
  });
});

describe("mergePendingImageAttachments", () => {
  it("returns unchanged when pending is null or empty", () => {
    const msgs = [{ role: "user", content: "x" }];
    expect(mergePendingImageAttachments(msgs, null)).toBe(msgs);
    expect(mergePendingImageAttachments(msgs, [])).toBe(msgs);
  });

  it("merges onto last user message when it has no imageAttachments", () => {
    const pending = [{ name: "a.png", mimeType: "image/png", dataBase64: "QQ==" }];
    const msgs = [
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "u2" }
    ];
    const out = mergePendingImageAttachments(msgs, pending);
    expect(out).not.toBe(msgs);
    expect(out[2]).toEqual({ role: "user", content: "u2", imageAttachments: pending });
    expect(out[0]).toEqual(msgs[0]);
  });

  it("does not overwrite existing imageAttachments", () => {
    const existing = [{ name: "x", mimeType: "image/png", dataBase64: "YQ==" }];
    const pending = [{ name: "y", mimeType: "image/png", dataBase64: "Qg==" }];
    const msgs = [{ role: "user", content: "u", imageAttachments: existing }];
    expect(mergePendingImageAttachments(msgs, pending)).toBe(msgs);
  });
});
