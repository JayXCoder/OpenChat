# OllamaChat — Project Overview

## What this project is

**OllamaChat** is a full-stack AI chat application: a **Next.js** web client talks to a **FastAPI** backend, which streams model output from **Ollama** and **OpenAI-compatible** APIs, persists **sessions and messages** in **PostgreSQL**, and exposes a clean **provider abstraction** so new backends can be added without rewriting the chat pipeline.

It is suitable as a **portfolio / interview** piece because it demonstrates real **streaming**, **multi-provider routing**, **persistence**, **structured testing**, and **observable UX** (latency and throughput hints), not a single `fetch` to a hosted chat API.

---

## Problem statement

Most “tutorial” chat demos do one or more of the following:

- Buffer the full model response before showing anything to the user
- Hard-code a single vendor or model
- Skip durable conversation history
- Omit tests for streaming, routing, or the database

This project addresses those gaps: **token- or chunk-level streaming** end-to-end, **pluggable providers**, **session-scoped memory**, and **pytest + Vitest + Playwright** coverage around the risky paths (stream, router, persistence).

---

## Key features (functional view)

| Area                    | Capability                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Streaming chat**      | Assistant text arrives incrementally over HTTP as `text/plain` chunks; the UI updates as chunks are read from the `ReadableStream`.                                                         |
| **Multi-model support** | Sidebar catalog for **Ollama** (live tag list when reachable) and **OpenAI-compatible** endpoints; user picks provider + model per session context.                                         |
| **Session memory**      | Each chat is a **session** (UUID); **messages** are stored with role, content, provider, and model. History is loaded when switching sessions and fed back into the model on the next turn. |
| **Thinking mode**       | Toggle influences system instructions and Ollama’s handling of streamed `thinking` vs `response` fields where applicable.                                                                   |
| **Attachments**         | Images (vision path) and text-like files are encoded for the API; large binary files are referenced in DB without inlining for the model.                                                   |
| **Observability (UX)**  | Approximate **first-chunk latency** and **tokens/sec** after each completed stream; optional **`X-Start-Time`** header from the backend for correlation.                                    |

---

## Tech stack

### Frontend

- **Next.js** (App Router), **React**, **TypeScript**
- **Tailwind CSS** for layout and a deliberate “memo / terminal-adjacent” visual language
- **Zustand** for client state (sessions, messages, streaming flag, metrics)
- **Vitest** + **Testing Library** for unit/integration-style UI tests
- **Playwright** for E2E flows

### Backend

- **FastAPI**, **Python 3.11+**
- **SQLAlchemy 2.x** (async) + **Alembic** migrations
- **PostgreSQL**
- **httpx** async streaming to Ollama and OpenAI-compatible servers
- **pytest** + **httpx ASGITransport** for API tests against the real app

### Infrastructure

- **Docker Compose**: `postgres`, `backend`, `frontend`; optional **Ollama** profile
- Next **BFF routes** (`/api/chat`, `/api/sessions`, `/api/models`) proxy to the backend using an internal base URL

---

## High-level architecture (one paragraph)

The **browser** calls **same-origin Next API routes**, which forward JSON to **FastAPI** (`/api/v1/...`). **Chat** uses a **StreamingResponse** that yields plain text as the **ChatService** consumes an async iterator from the selected **provider**. **Sessions** and **messages** are written through **repositories** on top of **async SQLAlchemy**. The **frontend** reads the stream with `fetch` + `ReadableStreamDefaultReader`, appends text into the last assistant message in **Zustand**, and reconciles with the server after the stream ends.

---

## Core concepts explained

### Streaming chat

Streaming means the **HTTP response body is not fully known** when headers are sent. The backend **yields** strings as the upstream model produces them; the frontend **decodes** binary chunks and **appends** them to the visible assistant message. That yields low **time-to-first-token** and a responsive feel.

### Multi-model support

**ProviderRouter** resolves `(provider, model)` to a concrete provider instance and enforces **allowlists** (Ollama tags from the daemon when possible, otherwise env fallback; static list for OpenAI-compatible). The UI **model selector** drives the same identifiers the backend expects.

### Session memory

A **session** is a row in `chat_sessions`; **messages** are rows in `chat_messages` with a foreign key. On each user turn, the service **appends** the user message, builds **history** from prior rows (plus system prompts), streams the assistant reply, then **persists** the full assistant content. Switching sessions **reloads** messages from `GET /api/v1/sessions/{id}/messages`.

---

## Related documents

- [Architecture](./02_architecture.md)
- [Backend design](./03_backend_design.md)
- [Frontend design](./04_frontend_design.md)
- [Features](./05_features.md)
- [Testing](./06_testing.md)
- [Presentation script](./08_presentation_script.md)
