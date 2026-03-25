# Scalability and Future Work

This document connects **current hooks** in the codebase to **credible roadmap** topics you can discuss in interviews: **RAG**, **agentic workflows**, and **horizontal scale**.

---

## 1. RAG (retrieval-augmented generation)

### Current hook

`ChatService` already defines **`retrieve_context(query: str) -> str`**, which today returns an **empty string** — a deliberate **seam** for retrieval without entangling it with streaming yet.

### How it can evolve

1. **Ingestion pipeline** (offline or async jobs): chunk documents, embed with your chosen embedding model, store vectors + metadata.
2. **Vector store options:**
   - **pgvector** inside **PostgreSQL** (single operational stack, transactional with sessions).
   - **FAISS** (in-process or sidecar) for pure vector search at very high QPS.
   - Managed vector DBs (Pinecone, Weaviate, etc.) for fully hosted paths.
3. **Query path:** On each user message, embed the query (or last turn), **top-k** retrieve chunks, inject into `history_payload` as a **system** or **tool** message with citations.
4. **UI:** show **sources** under assistant messages (requires structured stream events — see SSE/NDJSON note in architecture doc).

### Talking point

_“We didn’t bolt RAG into v1; we reserved `retrieve_context` so the orchestration layer stays the single place that decides what context the model sees.”_

---

## 2. Agentic AI (tools, ReAct-style loops)

### Current hook

`run_tool(query: str)` exists as a **stub** returning `None` — parallel to `retrieve_context`, it is a **placeholder** for **tool execution**.

### How it can evolve

1. **Define tools** as schemas (JSON Schema / OpenAI tool format / MCP).
2. **ReAct loop** (simplified): model emits **tool calls** → backend executes **run_tool** (HTTP, SQL, code sandbox) → append **tool results** to history → model continues until final answer.
3. **Streaming:** either **interleaved SSE events** (`tool_call`, `tool_result`, `token`) or a **single stream** with inline markers (harder to parse).
4. **Safety:** allowlists, timeouts, authenticated tool credentials, audit logs per session.

### Talking point

_“The chat service already centralizes history assembly. Agentic behavior is mostly **new messages in the same loop** plus **structured outputs** — not a rewrite of sessions or providers.”_

---

## 3. Scalability (production posture)

### Stateless application tier

- **FastAPI workers** can be **horizontally scaled** behind a load balancer **as long as** sticky sessions are **not** required for chat: each request carries `session_id`; the **database** is the source of truth.
- **Streaming** ties up a worker for the duration of the response; scale **worker count** and **upstream timeouts** accordingly.

### Database scaling

- Start: single **PostgreSQL** with connection pooling (e.g. PgBouncer) in front of SQLAlchemy.
- Grow: **read replicas** for session list / history reads; primary for writes.
- Archival: cold-store old sessions if retention policies require it.

### BFF / Next.js

- Next **API routes** can scale independently; ensure **internal** backend URL and **timeouts** match long streams.

### Provider rate limits

- Add **retry with backoff**, **queueing**, or **per-tenant quotas** at the **ProviderRouter** or a dedicated **gateway** layer.

---

## 4. Differentiation summary

| Topic         | Today                   | Next step                             |
| ------------- | ----------------------- | ------------------------------------- |
| Context       | Static system + history | `retrieve_context` + vector DB        |
| Actions       | None                    | `run_tool` + structured tool loop     |
| Scale         | Single Compose stack    | Pooling, replicas, worker autoscaling |
| Observability | Client metrics + header | OpenTelemetry traces, structured logs |

---

## Related documents

- [Architecture](./02_architecture.md)
- [Backend design](./03_backend_design.md)
- [Presentation script](./08_presentation_script.md)
