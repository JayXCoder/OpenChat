/**
 * Parse persisted user message text (and optimistic variants) for attachment sections.
 * Server format: `- name (image/png, image)`
 * Optimistic: `- name`
 */

import type { ChatImageAttachment } from "@/lib/types";

export const USER_IMAGE_ATTACHMENT_LINE = /^- (.+) \((image\/[^)]+), image\)\s*$/;

export function partitionUserMessageContent(content: string): {
  bodyText: string;
  imageDescriptors: { name: string; mime?: string }[];
  otherAttachmentLines: string[];
} {
  const marker = "--- Attachments ---";
  const idx = content.indexOf(marker);
  if (idx < 0) {
    return { bodyText: content, imageDescriptors: [], otherAttachmentLines: [] };
  }
  const bodyText = content.slice(0, idx).trimEnd();
  const rest = content.slice(idx + marker.length).trim();
  const lines = rest.split("\n").map((l) => l.trim()).filter(Boolean);
  const imageDescriptors: { name: string; mime?: string }[] = [];
  const otherAttachmentLines: string[] = [];

  for (const line of lines) {
    const m = line.match(USER_IMAGE_ATTACHMENT_LINE);
    if (m) {
      imageDescriptors.push({ name: m[1], mime: m[2] });
      continue;
    }
    const simple = line.match(/^- (.+)$/);
    if (simple) {
      const name = simple[1];
      if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
        imageDescriptors.push({ name });
        continue;
      }
    }
    otherAttachmentLines.push(line);
  }

  return { bodyText, imageDescriptors, otherAttachmentLines };
}

export function mergePendingImageAttachments<T extends { role: string; imageAttachments?: ChatImageAttachment[] }>(
  messages: T[],
  pending: ChatImageAttachment[] | null
): T[] {
  if (!pending?.length) return messages;
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUser = i;
      break;
    }
  }
  if (lastUser < 0) return messages;
  const msg = messages[lastUser];
  if (msg.imageAttachments?.length) return messages;
  const next = [...messages];
  next[lastUser] = { ...msg, imageAttachments: pending };
  return next;
}
