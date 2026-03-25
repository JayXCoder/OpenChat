# Key Talking Points (Interview Q&A)

Short, spoken-ready bullets. Expand with **one concrete example** from this repo when asked.

---

## “Why this architecture?”

- **Separation of concerns:** UI (Next) vs orchestration (FastAPI) vs data (Postgres) vs vendors (providers).
- **BFF pattern:** same-origin `/api/*` routes simplify **cookies**, **CORS**, and **stream proxying** for the browser.
- **Provider router:** one place to enforce **model allowlists** and swap **implementations** without touching `ChatService` persistence logic.
- **Testability:** service + repository + route tests can mock **at the right boundary** (stream generator, `aget_provider`, or HTTP).

---

## “How does streaming work?”

- **Server:** `ChatService` async-iterates provider chunks; FastAPI **`StreamingResponse`** writes **UTF-8 text** incrementally.
- **Client:** `fetch` → **`ReadableStreamDefaultReader`** → **`TextDecoder`** → append to **Zustand** last assistant message.
- **Ordering:** single HTTP body, sequential reads → **FIFO** chunk order preserved.
- **Observability:** first non-empty chunk timestamps **TTFB**; optional **`X-Start-Time`** header for server-side correlation.

---

## “How do you ensure quality?”

- **Pytest integration** against real **Postgres** for persistence and stream routes (with **monkeypatched** providers).
- **Vitest** for **stream parsing**, **store updates**, **scroll gating math**, **markdown/thinking** utilities.
- **Playwright** for **user journeys** (stream visible, new chat, model echo, attachments).
- **Principle:** never depend on a **live LLM** in CI — mock **HTTP** or **service methods** for determinism.

---

## “How is this different from basic chat apps?”

- **Real streaming** through the stack, not “wait for JSON then show text.”
- **Multi-provider** with **validation**, not a hard-coded `OPENAI_API_KEY` demo.
- **Durable sessions** in SQL with **history replay** on switch.
- **Attachments** with **vision + text** paths and **size limits**.
- **Thinking mode** + UI splitting for **reasoning vs answer** where supported.
- **Automated tests** targeting **streaming**, **router**, and **DB** — uncommon in portfolio projects.

---

## “How can this scale?”

- **Stateless API** behind a load balancer; **session_id** in each request.
- **DB pooling** (PgBouncer) + later **read replicas** for history reads.
- **Worker count** tuned for **long-lived streams**; consider **queues** for bursty traffic.
- **Rate limits** and **per-tenant keys** at gateway or router.

---

## “Why Zustand?”

- **Low ceremony** for high-frequency **append** updates during streams.
- **No provider wrapper** needed for tests — call **`getState()`** directly.
- Keeps React components **mostly presentational** with a single store module.

---

## “Why plain text stream instead of SSE?”

- **Fastest path** to a working, debuggable stream.
- **Trade-off:** less structure for **tool events** and **citations** — future version could add **SSE** or **NDJSON** without changing persistence.

---

## “Where would RAG plug in?”

- **`retrieve_context`** in `ChatService` — inject retrieved text into **`history_payload`** before provider call.
- Vectors in **pgvector** (same DB) or **FAISS** / managed store depending on scale.

---

## “Where would agents plug in?”

- **`run_tool`** — implement **tool execution** and a **multi-step** message loop until the model stops calling tools.
- Keep **audit trail** in existing **messages** table or a sibling **events** table.

---

## “What was hardest / most interesting?”

- **Streaming + UX:** auto-scroll, caret, reconciling **optimistic** UI with **server** messages after stream end.
- **Ollama vs OpenAI** parsing differences behind one **iterator** interface.
- **Testing streams** without flaking on chunk boundaries (assert **concatenated body** + **≥1** chunk where relevant).

---

## Document map

| File                                                     | Use when                     |
| -------------------------------------------------------- | ---------------------------- |
| [01_overview.md](./01_overview.md)                       | Elevator pitch + stack       |
| [02_architecture.md](./02_architecture.md)               | Whiteboard session           |
| [06_testing.md](./06_testing.md)                         | “How do you test?” deep dive |
| [08_presentation_script.md](./08_presentation_script.md) | Timed demo                   |
