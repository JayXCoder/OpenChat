# Feature Breakdown

Each feature below follows: **what it does** → **how it works** → **why it matters**.

---

## 1. Streaming responses

**What it does**  
The assistant answer appears **incrementally** as the model generates text, instead of waiting for the full completion.

**How it works**

- **Backend:** `ChatService.stream_chat` async-generates string chunks from the provider; FastAPI `StreamingResponse` writes them to the HTTP body as UTF-8.
- **Frontend:** `fetch` obtains a `ReadableStream`; `TextDecoder` + `reader.read()` loop calls `onChunk` for each slice; Zustand **`updateAssistantDraft`** appends to the last assistant message.

**Why it matters**  
Lower **perceived latency**, better **interruptibility** (user sees progress), and alignment with how modern chat products behave — interviewers notice immediately.

---

## 2. Session memory

**What it does**  
Conversations are grouped into **sessions** with **persistent** message history in PostgreSQL.

**How it works**

- Creating or selecting a session sets **`session_id`** client-side.
- Each send **stores** the user message, then streams the assistant reply and **stores** the full assistant message.
- **GET** `/api/v1/sessions/{id}/messages` returns ordered history for reload and sidebar switches.

**Why it matters**  
Demonstrates **stateful** product design, not a stateless demo — required for real chat UX and for **multi-turn** reasoning.

---

## 3. Model switching

**What it does**  
User picks **provider** (Ollama vs OpenAI-compatible) and **model** from catalog-backed dropdowns.

**How it works**

- **ModelSelector** updates Zustand **`selectedProvider`** / **`selectedModel`**.
- Chat requests include those fields; **`ProviderRouter`** validates and returns the correct provider implementation.
- Ollama models can be refreshed from **live tags** when the daemon is reachable.

**Why it matters**  
Shows **abstraction** and **operational flexibility** — swap models without redeploying the UI contract.

---

## 4. Thinking mode

**What it does**  
A toggle changes **system instructions** and how streamed **reasoning** vs **answer** content is handled (notably for Ollama’s separate `thinking` / `response` fields).

**How it works**

- Flag **`thinking_enabled`** is sent on each stream request.
- **`_thinking_system_content`** in `ChatService` chooses different system text per provider when thinking is on vs off.
- **Frontend** splits streamed `think` / `redacted_reasoning` blocks (and fenced variants) in **`splitThinking`** so “reasoning” can live in a collapsible block.

**Why it matters**  
Demonstrates **product-level control** over model behavior and **transparent reasoning** UX when models support it.

---

## 5. Attachments

**What it does**  
Users can attach **images** and **text-like files**; optional **text-only** send when files are present.

**How it works**

- **ChatInput** reads files as **base64**, builds **`ChatAttachment[]`**.
- **`build_user_turn`** in `ChatService` produces: content for the **LLM** (image base64 for vision APIs, text excerpts for text MIME types), content for the **DB** (human-readable summary), and a **vision** list for multimodal providers.
- Size limits enforced in schema (attachments total / per-request guards).

**Why it matters**  
Moves the project from “chat only” toward **real workflows** (screenshots, logs, notes) and shows careful **security/limit** thinking.

---

## 6. Latency indicator (first token)

**What it does**  
After a stream completes, the UI can show **approximate time to first visible chunk** (e.g. “320ms first token”).

**How it works**

- Client measures **elapsed time** from immediately before `fetch` until the first **non-empty** decoded chunk.
- Backend may emit **`X-Start-Time`** (Unix ms) when opening the stream; the Next route **forwards** it for optional correlation.

**Why it matters**  
Shows **observability-minded** engineering — you can discuss **TTFB**, network vs model stall, and regression detection in CI (with mocks).

---

## 7. Token speed indicator (throughput)

**What it does**  
Shows **approximate output tokens per second** after the stream ends.

**How it works**

- Track time from **first chunk** to **stream end**.
- Apply **`estimateTokenCount`** on the full accumulated assistant text (same heuristic as the session token bar: ~4 chars per token).

**Why it matters**  
Differentiates a **measured system** from a black box — useful in interviews when discussing **SLAs**, **provider comparison**, and **UX performance**.

---

## 8. Auto-scroll behavior

**What it does**  
New tokens scroll the view **only if** the user is already **near the bottom**; scrolling up **disables** follow mode until the user returns near the bottom.

**How it works**

- **`isNearBottom(scrollTop, scrollHeight, clientHeight)`** centralizes the threshold check.
- Scroll events update a **ref**; message updates call **conditional** `scrollTop = scrollHeight`.

**Why it matters**  
Classic chat UX detail that separates **polished** from **naive** streaming UIs.

---

## 9. Streaming caret

**What it does**  
A **blinking caret** appears at the end of the **in-flight** assistant message.

**How it works**  
`MessageBubble` renders **`▍`** with **`animate-cursor-blink`** when `assistantReplyComplete` is false for the active assistant message.

**Why it matters**  
Small **affordance** that the model is still writing — improves clarity during slow streams.

---

## 10. Security headers and BFF (supporting “product ready”)

**What it does**  
Backend adds **security headers**; Next **BFF** hides internal backend URLs.

**Why it matters**  
Shows awareness of **deployment** concerns beyond the happy path.

---

## Related documents

- [Overview](./01_overview.md)
- [Architecture](./02_architecture.md)
- [Presentation script](./08_presentation_script.md)
