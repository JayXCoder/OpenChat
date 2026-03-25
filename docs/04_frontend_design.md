# Frontend Design (Next.js)

## Purpose

The frontend delivers a **responsive chat workspace**: session sidebar, model selection, streaming transcript, markdown rendering for assistant text, attachment uploads, and **lightweight observability** (first-token latency and approximate throughput after each reply).

---

## Application structure

### App Router

- **`app/page.tsx`**: main shell — loads catalog and sessions, wires **Sidebar**, **ChatWindow**, **ChatInput**, handles submit → `streamChat` + Zustand updates + post-stream message sync.
- **`app/layout.tsx`**: fonts, global layout.
- **`app/api/*/route.ts`**: **BFF** proxies to FastAPI (`BACKEND_INTERNAL_URL` or default).

### Components (high level)

| Component             | Role                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **`Sidebar`**         | Sessions list, New Chat, rename/delete menus, embeds **ModelSelector**.                                            |
| **`ModelSelector`**   | Provider + model `<select>`s bound to Zustand.                                                                     |
| **`ChatWindow`**      | Scrollable message list, token summary bar, stream status, **auto-scroll** policy, **last stream metrics** line.   |
| **`MessageBubble`**   | User vs assistant styling, **markdown** for assistant visible text, **thinking** `<details>`, **streaming caret**. |
| **`MessageMarkdown`** | Safe rendering pipeline for assistant content.                                                                     |
| **`ChatInput`**       | Textarea, thinking toggle, file picker, base64 attachment build, submit.                                           |
| **`SysMemoHeader`**   | Top memo / actions (project-specific chrome).                                                                      |

---

## State management: Zustand (`useChatStore`)

### Why Zustand

- **Minimal boilerplate** for a medium-sized client state tree (sessions, messages, selection, streaming).
- **No Context re-render fan-out** for high-frequency streaming updates (append to last assistant message).
- **Easy to test:** `useChatStore.setState` / `getState` in Vitest without mounting a provider tree.

### Important state fields

- **`sessionId`**, **`sessions`**, **`messages`**
- **`selectedProvider`**, **`selectedModel`**, **`thinkingEnabled`**
- **`isStreaming`**, **`error`**
- **`lastStreamMetrics`**: populated when a stream completes (`firstChunkMs`, `tokensPerSec`, `serverStreamOpenMs`, `totalChars`)

### Critical action: `updateAssistantDraft`

Appends the latest decoded chunk to the **last** message if it is an **assistant** row; otherwise creates one. This is the **heart of streaming UI** and is covered by component and store tests.

---

## Streaming UI handling

### `streamChat` (`lib/api.ts`)

1. Records **request start** time (`performance.now()` when available).
2. **POST** `/api/chat` with JSON body aligned to backend schema (`thinking_enabled`, `attachments` with snake_case fields).
3. Reads **`X-Start-Time`** when the BFF forwards it.
4. Loop: `reader.read()` → decode → **`onChunk`** → optional **`onComplete`** with metrics.

### Metrics

- **First chunk ms:** time from request start to first **non-empty** decoded substring (perceived TTFB to visible tokens).
- **Tokens/sec:** after stream end, `estimateTokenCount(accumulated) / active_seconds` using the same **~4 characters per token** heuristic as the session token bar (approximation, not tokenizer-accurate).

### Why not block the UI thread

Work per chunk is **small** (decode + one Zustand update). The expensive work is **network and model**; the client **awaits** `read()` without synchronous polling loops.

---

## Markdown rendering

Assistant **visible** text (after splitting “thinking” segments) goes through **`MessageMarkdown`**, keeping presentation readable for code and lists while avoiding raw `dangerouslySetInnerHTML` on uncontrolled strings where the component pipeline sanitizes or constrains output (follow implementation in `message-markdown.tsx`).

**Thinking** content is shown in a **`<details>`** block for progressive disclosure.

---

## UX decisions

### Auto-scroll

- Track whether the user is **near the bottom** (`isNearBottom` in `chat-metrics.ts`: distance from bottom &lt; threshold).
- On **scroll**, update a **ref** (stick-to-bottom vs user scrolled up).
- On **new messages / streaming updates**, scroll to bottom **only if** stick-to-bottom is true.

**Why:** power users can read history while new tokens arrive; casual users stay pinned to the latest output.

### Streaming caret

While **`assistantReplyComplete`** is false for the active assistant bubble, a **blinking `▍`** is shown after the markdown (CSS animation, respects reduced-motion via global styles).

### Token/session bar

Shows **approximate** prompt and response token counts across the session for a quick sense of **context growth** (interview talking point: “we surface cost/context awareness, not exact billing”).

### Error handling

Failed fetch or HTTP errors set **`error`** in the store; stream errors may appear as assistant text if the backend yields `[error]`. After stream end, the app **re-fetches** messages when possible to align with the DB.

---

## Related documents

- [Architecture](./02_architecture.md)
- [Features](./05_features.md)
- [Testing](./06_testing.md)
