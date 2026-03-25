# Presentation Script (15–20 minutes)

Use this as a **spoken outline** while demoing the running app. Adjust pacing: **~150–180 words per minute** → target **2,250–3,600 words** total; this script is chunked by section with **time boxes**.

---

## Before you start (30 seconds, optional)

“Today I’ll walk through **OllamaChat** — a full-stack streaming chat app with **sessions**, **multi-provider models**, and **automated tests** around the hard parts: streaming, routing, and persistence. I’ll show the product, then the architecture, then why I’d extend it toward **RAG** and **agents**.”

---

## Section 1 — Introduction (1–2 minutes)

**Say:**  
“This is a **production-shaped** chat client, not a tutorial snippet. Users pick **Ollama** or an **OpenAI-compatible** endpoint, choose a **model**, and chat in **sessions** that are stored in **PostgreSQL**. The differentiator is **end-to-end streaming**: tokens arrive over HTTP and render incrementally, and the backend uses **async** streaming all the way from the model API to the client.”

**Show (if live):** landing layout — sidebar, transcript area, input.

**Bridge:**  
“Under the hood it’s **Next.js** in front and **FastAPI** behind, with a small **BFF** so the browser only talks to same-origin APIs.”

---

## Section 2 — Architecture (3–5 minutes)

**Say — layers:**  
“Four main layers: **React client** for UX and stream consumption; **Next API routes** as a **BFF**; **FastAPI** for validation and orchestration; **providers** that speak Ollama vs OpenAI-compatible wire formats; and **Postgres** for sessions and messages.”

**Say — data flow (one breath):**  
“On send, the client POSTs JSON to `/api/chat`. Next forwards to FastAPI’s **`/api/v1/chat/stream`**. The **ChatService** validates the session, **writes the user message**, builds **history** from prior rows plus system prompts, resolves a provider through a **ProviderRouter**, streams assistant chunks, and **persists the assistant** when done. The client then refreshes messages so IDs match the database.”

**Say — streaming:**  
“The response is a **StreamingResponse** with **plain text**. The client uses a **ReadableStream** reader and appends decoded text into the **last assistant message** in **Zustand**. That’s intentionally simple: no SSE parser on the client, at the cost of less structure for things like citations.”

**Say — provider abstraction:**  
“The router is the **single gate** for ‘is this model allowed for this provider?’ Ollama can use **live tags** from the daemon when it’s up. Adding a vendor means a new provider class with the same **`stream_chat` async iterator** — the service doesn’t care about URLs or JSON line formats.”

**Optional diagram:** point to `docs/02_architecture.md` layered box diagram if sharing screen as slides.

---

## Section 3 — Demo walkthrough (5–7 minutes)

**Step 1 — Start chat**  
“ I’ll start a **new session** — that creates a row in **chat_sessions** and clears the transcript client-side.”

**Step 2 — Streaming response**  
“I’ll send a prompt. Watch the assistant message **grow** token by token. There’s a **caret** while streaming and a **stick-to-bottom** scroll rule: if I scroll up, new tokens won’t yank me down until I return near the bottom.”

**Step 3 — Follow-up (memory)**  
“Second message: the backend **reloads history** from the database and includes the prior turn in the model context — that’s **session memory**, not client-only state.”

**Step 4 — Switch model**  
“In the sidebar I’ll change **model** — same API contract, different allowlist entry. If I had two providers configured, I’d switch **provider** too. This is where the **router** earns its keep.”

**Step 5 — Thinking mode**  
“I’ll toggle **thinking** and mention that system instructions change, and for Ollama we can surface **reasoning** separately from the final answer when the model streams both fields — the UI can fold that into a **details** block.”

**Step 6 — Attachments**  
“I’ll attach a small **text file** or **image**. The client sends **base64**; the service builds **LLM-facing** content and a **DB-facing** summary, and passes images into the **vision** path for multimodal APIs. That shows the app isn’t limited to plain text prompts.”

**Step 7 — Observability (quick)**  
“After the stream ends, the UI shows **approximate first-token latency** and **tokens per second** — it’s client-measured and uses the same rough token heuristic as the session bar, good for **comparing models**, not for billing.”

---

## Section 4 — Technical highlights (3–5 minutes)

**Streaming architecture**  
“We stream with **async generators** on the server and **async reads** on the client — no ‘buffer everything then display’. Errors can be **in-band** in the stream for resilience.”

**Provider abstraction**  
“Providers implement one **async iterator** contract. The **ChatService** stays vendor-agnostic. That’s how I’d add **Anthropic** or **Bedrock** without rewriting persistence.”

**Testing approach**  
“I use **pytest** with the real **ASGI app** and **Postgres** for integration: stream endpoint, **X-Start-Time** header, persistence of user+assistant rows, and router failures. On the frontend, **Vitest** mocks `fetch` stream bodies; **Playwright** runs **end-to-end** with routed APIs so CI doesn’t need a live GPU cluster.”

**Security / ops footnote**  
“FastAPI sets **security headers**; the BFF hides internal URLs. For production I’d add **auth**, **rate limits**, and **OpenTelemetry**.”

---

## Section 5 — Future work (2–3 minutes)

**RAG**  
“There’s already a **`retrieve_context`** hook in the service — today it returns empty. I’d add **embeddings**, store vectors in **pgvector** or **FAISS**, and inject retrieved chunks into the message list before calling the provider, with **citations** once we move to structured streaming.”

**Agentic AI**  
“Similarly, **`run_tool`** is a stub. I’d turn that into **executed tools** with a **ReAct-style** loop: model proposes tool calls, backend runs them, results go back as messages until we get a final answer — all still **session-scoped** and auditable.”

**Scale**  
“App servers are **stateless** aside from connections; scale workers horizontally. Watch **long-lived streams** for capacity. Database grows with **pgBouncer** and eventually **read replicas**.”

**Close:**  
“That’s OllamaChat: **real streaming**, **clear layering**, **tested** where it matters, and **obvious seams** for RAG and agents. Happy to dive into any file.”

---

## Timing cheat sheet

| Section              | Minutes   |
| -------------------- | --------- |
| Introduction         | 1–2       |
| Architecture         | 3–5       |
| Demo                 | 5–7       |
| Technical highlights | 3–5       |
| Future work          | 2–3       |
| **Total**            | **14–22** |

---

## Related documents

- [Overview](./01_overview.md)
- [Key talking points](./09_key_talking_points.md)
