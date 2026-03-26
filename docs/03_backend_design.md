# Backend Design (FastAPI)

## Purpose

The backend is the **system of record** for conversations and the **orchestration layer** for model calls. It keeps **routes thin**, **services cohesive**, and **data access** behind repositories.

---

## Folder structure (mental map)

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, router includes
│   ├── api/routes/          # HTTP adapters (chat, sessions, models)
│   ├── core/                # config, database session factory, logging
│   ├── db/                  # engine helpers if present
│   ├── models/              # SQLAlchemy ORM (ChatSession, ChatMessage)
│   ├── schemas/             # Pydantic request/response models
│   ├── repositories/        # SessionRepository, MessageRepository
│   ├── services/            # ChatService, ProviderRouter
│   └── providers/           # OllamaProvider, OpenAICompatibleProvider, GeminiProvider
├── alembic/                 # migrations
├── tests/                   # pytest
└── requirements.txt
```

**Rule of thumb:** `routes` parse/validate HTTP → `services` run use-cases → `repositories` persist → `providers` talk outbound.

---

## Service layer: `ChatService`

`ChatService` owns:

- **Session lifecycle helpers** used by routes (list, create, rename, delete).
- `**stream_chat`**: the core chat pipeline:
  - Load session; **404** path becomes a `ValueError` mapped to HTTP errors where appropriate.
  - Persist **user** message (including derived DB-facing attachment summary).
  - Optionally **update session title** from the first user turn.
  - Build `**history_payload`**: system instructions (thinking mode aware), prior messages, optional `retrieve_context` / `run_tool` hooks, then current user content.
  - Resolve provider via `**ProviderRouter.aget_provider**`.
  - Stream chunks from `**provider.stream_chat**` and **yield** each chunk to the caller.
  - After completion, persist **assistant** message with full concatenated text.

This keeps the **chat route** as a thin wrapper around streaming and error translation.

---

## Repository pattern

### `SessionRepository`

- Create, list, get, update title, delete sessions.

### `MessageRepository`

- List messages for a session (ordered for history).
- Create user and assistant rows.

### Why repositories matter

- **Testability:** fake repos can be injected on `ChatService` in unit tests.
- **Evolution:** swap PostgreSQL for another store by changing repos, not every route.
- **Clarity:** SQL details do not leak into streaming logic.

---

## Database schema

### `chat_sessions`

- `**id`**: UUID primary key.
- `**title**`: optional; derived from first message or attachment-only default.
- `**created_at` / `updated_at**`: timezone-aware timestamps.
- **Relationship:** one-to-many `**messages`** with cascade delete.

### `chat_messages`

- `**id**`: integer surrogate key.
- `**session_id**`: FK to `chat_sessions.id` (CASCADE on delete).
- `**role**`: `"user"` | `"assistant"` | (system content is not stored as rows today; it is assembled per request).
- `**content**`: full text (including user-visible attachment summaries in DB).
- `**provider` / `model**`: strings for auditing and UI display.
- `**created_at**`: timestamp.

**Alembic** (`0001_initial.py`) creates these tables; tests use `Base.metadata.create_all` against a dedicated test database URL.

---

## Provider implementations

### `OllamaProvider`

- **POST** `/api/generate` with **streaming** enabled.
- Parses **JSON lines**; maps Ollama `**thinking`** / `**response**` fields into a single text stream, optionally wrapping thinking segments in XML-style tags for UI splitting.

### `OpenAICompatibleProvider`

- **POST** `/chat/completions` with `**stream: true`**.
- Parses **SSE-style** `data:` lines, extracts `delta.content`.

Both expose `**async def stream_chat(...) -> AsyncIterator[str]`**, which is what `ChatService` depends on.

---

## Async stack: why it is used

- **Non-blocking I/O** for PostgreSQL (`asyncpg` via SQLAlchemy async) and **httpx** streaming to Ollama/OpenAI-compatible hosts.
- A single worker process can **interleave** waiting on DB and upstream bytes instead of blocking threads per request.
- **StreamingResponse** + async generator **fits** naturally: yield as soon as a chunk arrives from the provider.

---

## `StreamingResponse`: why not JSON?

- **Lowest latency path:** emit text as it is produced.
- **Simple client:** `ReadableStream` + `TextDecoder` without parsing framed events.
- **Trade-off:** errors are sometimes **in-band** (`[error]`) rather than structured JSON; a stricter API might use **dual channel** (200 + problem+json only for pre-stream failures).

---

## Separation of concerns (summary)


| Concern                        | Where it lives        |
| ------------------------------ | --------------------- |
| HTTP status codes              | Routes                |
| Validation                     | Pydantic schemas      |
| Business rules / orchestration | `ChatService`         |
| SQL                            | Repositories + models |
| Vendor wire format             | Providers             |
| Model allowlists               | `ProviderRouter`      |


---

## Related documents

- [Architecture](./02_architecture.md)
- [Features](./05_features.md)
- [Testing](./06_testing.md)

