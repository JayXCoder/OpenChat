# Testing Strategy

Strong testing is a **deliberate differentiator** in this project: streaming, routing, and persistence are where chat apps usually break; tests target those areas.

---

## 1. Testing strategy (pyramid)

| Layer           | Goal                           | Tools                                   | Scope in this repo                                                                                              |
| --------------- | ------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Unit**        | Pure logic, small modules      | pytest, Vitest                          | Schemas, metrics (`splitThinking`, `isNearBottom`, token estimate), store actions, provider parsing with mocks. |
| **Integration** | Real app + DB + HTTP semantics | pytest, httpx `ASGITransport`, Postgres | API routes with overridden `get_db_session`, streaming endpoint, persistence after stream, error paths.         |
| **E2E**         | User journey                   | Playwright                              | Mocked APIs with **real** browser streaming consumption; session switch, model echo, new chat, attachments.     |

**Principle:** mock **external LLM HTTP** (or service methods) — never assert on a live Ollama instance in unit/integration tests — so CI stays **deterministic**.

---

## 2. Backend tests

### Location

`backend/tests/` — `conftest.py` provides `api_client` and `db_session` when `TEST_DATABASE_URL` is set (PostgreSQL).

### Streaming test

- **`test_chat_stream_endpoint_streams_chunks`**: Monkeypatch `ChatService.stream_chat` to yield multiple parts; assert concatenated body.
- **`test_chat_stream_aiter_text_receives_chunks`**: Use `client.stream` + `aiter_text()` to consume the body; assert full text; **chunk count ≥ 1** (ASGI may coalesce; document that boundary is not a correctness guarantee).
- **`test_chat_stream_includes_x_start_time_header`**: Assert observability header on stream response.

### Provider routing tests

- **`test_provider_router.py`**: `aget_provider` for valid Ollama model, **invalid provider**, **missing model**, async catalog vs env fallback.
- **`test_chat_stream_invalid_provider_yields_error_body`**: Integration-style test with patched router method yielding streamed `[error]` content.

### DB persistence tests

- **`test_chat_stream_persists_user_and_assistant_messages`**: Patch `ProviderRouter.aget_provider` to return a tiny fake provider; POST stream; **GET messages** and assert at least one **user** and one **assistant** row.
- **`test_stream_chat_persists_messages_and_passes_flags`** (service-level): Fake repos + fake provider; assert created messages and `thinking_enabled` passed through.
- **`test_db_integration.py`**: Broader DB behavior as applicable.

### Schema / validation

- **`test_schemas_chat.py`**, **`test_chat_stream_rejects_empty_message_without_attachments`**: Empty message without attachments → **422**.
- Oversized payload tests for **413** / **422** boundaries.

### Why this coverage matters

Interview narrative: _“We don’t only manual-test streaming; we **automate** the stream consumer, router errors, and message persistence.”_

---

## 3. Frontend tests

### Vitest + Testing Library

| File                            | Intent                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **`api.test.ts`**               | Mock `fetch` + fake `ReadableStream`; assert chunk aggregation, payload mapping, **`onComplete` metrics**, header parsing. |
| **`store.test.ts`**             | Zustand: `updateAssistantDraft` appends; `setLastStreamMetrics` / `resetChat` clear metrics.                               |
| **`chat-window.test.tsx`**      | Progressive assistant text while `isStreaming`.                                                                            |
| **`message-bubble.test.tsx`**   | Caret present only while streaming assistant message incomplete.                                                           |
| **`chat-metrics.test.ts`**      | Token estimate, thinking split, **`isNearBottom`**.                                                                        |
| **`page.test.tsx`**             | Page-level flows with mocked API module.                                                                                   |
| **`message-markdown.test.tsx`** | Renderer behavior.                                                                                                         |

### Auto-scroll logic

- **Unit:** `isNearBottom` tested with numeric scroll geometry in **`chat-metrics.test.ts`**.
- **Integration:** `ChatWindow` relies on that predicate via scroll handler + ref; full DOM geometry tests are optional to avoid flaky jsdom layout.

---

## 4. End-to-end tests (Playwright)

`frontend/e2e/chat.spec.ts` includes:

1. **Streaming + session switching** (mocked backend via `page.route`).
2. **Model selection** reflected in POST body / echoed stream.
3. **New Chat** clears transcript surface.
4. **Attachment-only** send includes attachments in JSON and shows expected stream body.

**Note:** Desktop layout uses `aside` selectors; `aria-hidden` on sidebar may affect `getByRole` — prefer **`locator('aside').getByText(...)`** where needed.

---

## 5. Mocking strategy

### Why mock providers

- **Determinism:** same bytes every run.
- **Speed:** no GPU / no network.
- **CI:** no secrets or local Ollama requirement for core suites.

### How mocks are applied

| Level        | Technique                                                                       |
| ------------ | ------------------------------------------------------------------------------- |
| **Service**  | `monkeypatch.setattr(ChatService, "stream_chat", fake_gen)`                     |
| **Router**   | `monkeypatch.setattr(ProviderRouter, "aget_provider", fake)`                    |
| **HTTP**     | httpx `MockTransport` in provider unit tests; Playwright `route.fulfill` in E2E |
| **Frontend** | `vi.stubGlobal("fetch", ...)` with fake stream body                             |

### What we do **not** mock

- **FastAPI routing**, **Pydantic validation**, **SQLAlchemy session** behavior in integration tests (real DB).
- **Browser** stream reading in E2E (real `fetch` in the app against fulfilled routes).

---

## 6. Quality assurance approach

- **Run locally:**
  - Backend: `pytest` with `TEST_DATABASE_URL` pointing at a disposable Postgres.
  - Frontend: `npx vitest run`, `npx playwright test`.
- **Docker:** Rebuild images after backend/header changes so runtime matches tests.
- **Regression discipline:** any new stream field or header → extend **api.test.ts** + **integration** test.

---

## Related documents

- [Architecture](./02_architecture.md)
- [Key talking points](./09_key_talking_points.md)
- [Presentation script](./08_presentation_script.md)
