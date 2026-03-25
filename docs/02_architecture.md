# System Architecture

This document describes **layers**, **request/response data flow**, **streaming flow**, and **provider abstraction** as implemented in this repository.

---

## 1. Layered architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React / Next.js client components)                      │
│  • UI: ChatWindow, ChatInput, Sidebar, ModelSelector, etc.        │
│  • State: Zustand (messages, session, streaming, metrics)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ fetch() same-origin
┌────────────────────────────▼────────────────────────────────────┐
│  Next.js — BFF / API routes (App Router)                          │
│  • /api/chat        → POST body → backend /api/v1/chat/stream    │
│  • /api/sessions*   → CRUD + messages                            │
│  • /api/models      → catalog                                    │
│  • Forwards stream body + headers (e.g. X-Start-Time)            │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (internal Docker network / dev)
┌────────────────────────────▼────────────────────────────────────┐
│  FastAPI application (app.main)                                   │
│  • Routers: chat, sessions, models                               │
│  • CORS, security headers, /health                               │
│  • Depends: AsyncSession (PostgreSQL)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ ChatService    │  │ Session/Message │  │ ProviderRouter       │
│ • stream_chat  │  │ repositories    │  │ • aget_provider      │
│ • CRUD sessions│  │ • SQLAlchemy    │  │ • catalog / allowlist│
└────────┬───────┘  └────────┬────────┘  └──────────┬───────────┘
         │                   │                       │
         │                   ▼                       ▼
         │            ┌──────────────┐     ┌─────────────────────┐
         │            │ PostgreSQL   │     │ OllamaProvider      │
         │            │ sessions,    │     │ OpenAICompatible    │
         │            │ messages     │     │ Provider (httpx)    │
         │            └──────────────┘     └──────────┬──────────┘
         │                                            │
         └────────────────────────────────────────────┘
                          async iter[str] (chunks)
```

### Role of each layer

| Layer              | Responsibility                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Frontend**       | UX, optimistic streaming display, session list, model selection, attachment encoding.                        |
| **Next API (BFF)** | Hide backend URL from the browser, forward streaming bodies, avoid CORS friction for the stream.             |
| **FastAPI**        | Auth-less internal API (deploy behind your own gateway in production), validation (Pydantic), orchestration. |
| **ChatService**    | Session validation, message persistence, history assembly, provider invocation.                              |
| **Repositories**   | Encapsulate SQL; keep routes thin.                                                                           |
| **ProviderRouter** | Map names to implementations + validate model availability.                                                  |
| **Providers**      | Speak vendor HTTP/SSE shapes; expose uniform `stream_chat(**kwargs) -> AsyncIterator[str]`.                  |
| **Database**       | Durable sessions and messages; cascade delete messages with session.                                         |

---

## 2. Data flow (non-streaming CRUD)

**User → Frontend → Next → Backend → DB**

1. User opens app: **GET** `/api/sessions` → backend lists recent sessions.
2. User selects session: **GET** `/api/sessions?id=...` (Next) or **GET** `/api/v1/sessions/{id}/messages` (backend) loads messages.
3. User renames/deletes: **PATCH/DELETE** via Next proxies.

**User → Frontend → Next → Backend → Provider** (without streaming detail)

4. User sends a message: client **POST** `/api/chat` with JSON (session_id, message, provider, model, attachments, thinking flag).
5. Next forwards to **POST** `/api/v1/chat/stream`.
6. **ChatService** validates session, saves **user** turn, builds **message list** for the model, resolves provider, then streams assistant tokens (see next section).
7. After stream completes, service saves **assistant** turn to DB.
8. Client **GET** messages again to reconcile IDs/content with server truth.

---

## 3. Streaming flow (end-to-end)

### Backend

1. Route handler constructs **StreamingResponse** with `media_type="text/plain; charset=utf-8"`.
2. Inner async generator **iterates** `ChatService.stream_chat(payload)` and **yields** each string chunk as UTF-8 bytes in the response body.
3. Errors that should not kill the connection with a 5xx may be **yielded** as lines like `[error] ...` (see chat route).
4. **X-Start-Time** (Unix ms) can be attached as a response header when the stream is opened (observability).

**Why plain text?** Simplicity: the browser decoder treats the body as a continuous string; no SSE parsing on the client. A production system might use **SSE** or **NDJSON** for structured events (tool calls, citations).

### Frontend

1. `fetch("/api/chat", { method: "POST", body: JSON })`.
2. On success, `response.body.getReader()` + `TextDecoder` in a **while** loop.
3. Each decoded substring invokes **`onChunk`**, which updates Zustand **`updateAssistantDraft`** (append to last assistant message).
4. On completion, optional **`onComplete`** receives **StreamMetrics** (first-chunk ms, approximate tok/s, optional server header).

### Ordering and correctness

- **Order** of chunks is preserved by a single HTTP response body and sequential reads.
- **No “fake streaming”** in the app layer: the stream is whatever the provider yields; tests mock at HTTP or service boundaries.

---

## 4. Provider abstraction

### Why `ProviderRouter` exists

- **Single place** to enforce “this model is allowed for this provider.”
- **Swappable implementations**: Ollama vs OpenAI-compatible chat completions share a **conceptual** contract (`stream_chat`) but differ in URL, payload, and line parsing.
- **Extensibility**: add `anthropic`, `bedrock`, etc. by implementing the same async streaming interface and registering it in the router.

### How extensibility works today

1. **Catalog** endpoints expose which `(provider, models)` pairs the UI may show.
2. **`aget_provider(provider, model)`** returns an instance (e.g. `OllamaProvider`) after validation.
3. **ChatService** never imports Ollama URLs directly; it only calls **`provider.stream_chat(...)`**.

### Design trade-off

The router currently **instantiates** known provider types internally rather than using a plugin registry file. For a larger product, you would add **named registration** (e.g. dict of factory callables) and **per-tenant config** without changing `ChatService`.

---

## Consistency with other docs

- Backend detail: [03_backend_design.md](./03_backend_design.md)
- Frontend detail: [04_frontend_design.md](./04_frontend_design.md)
- Speaking flow: [08_presentation_script.md](./08_presentation_script.md)
