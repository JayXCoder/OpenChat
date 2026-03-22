# Changelog

All notable changes to OpenChat are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

Latest changes after the production baseline below.

### Added

- `ARCHITECTURE.md` — system overview, layers, streaming contract, security posture, quality gates.
- Post-send message sync: after each chat request completes, messages for the active session are re-fetched from the backend so UI stays consistent on flaky mobile streams.
- Docker smoke script reads `FRONTEND_PORT` / `BACKEND_PORT` from root `.env` and retries readiness for health and API proxy checks (`scripts/docker-smoke-e2e.sh`).

### Changed

- **Mobile / responsive UI**
  - Collapsible sidebar on small screens (drawer + overlay + hamburger); desktop keeps a fixed sidebar.
  - Viewport layout uses `dvh` and `min-w-0` flex children to avoid clipped or untappable composer on phones.
  - Sidebar hidden with `hidden` when closed on mobile so it cannot intercept touches.
  - Composer is `sticky` at the bottom with safe-area padding for notched devices.
- Playwright E2E selectors hardened for mobile drawer and session menu (text / `data-session-menu`).

### Removed

- Visible composer hint text that described private reasoning / `think` tags (behavior unchanged; UI copy removed).

---

## [1.0.0] — Baseline aligned with original `main` (production-grade OpenChat)

First consolidated release: fullstack chat with persistence, streaming, multi-provider support, tests, and CI. This reflects what landed on the refactored main before the unreleased items above.

### Added

- **Monorepo**: `frontend/`, `backend/`, root `docker-compose.yml`, `.env.example`, documentation.
- **Backend (FastAPI)**
  - Layered layout: `api/routes`, `services`, `providers`, `repositories`, `models`, `schemas`, `core` (config, database, logging).
  - `POST /api/v1/chat/stream` — async streaming via `StreamingResponse`.
  - Sessions: create, list, update title, delete; message history per session.
  - **PostgreSQL** with SQLAlchemy (async) and **Alembic** migrations (`chat_sessions`, `chat_messages`).
  - **Provider router** + **Ollama** and **OpenAI-compatible** streaming adapters with normalized chunk output.
  - Extension hooks for future **RAG** (`retrieve_context`) and **agent** (`run_tool`) pipelines.
- **Frontend (Next.js)**
  - App Router with **Zustand** store (session, messages, provider/model, streaming, errors, thinking toggle).
  - Manual stream consumption and progressive assistant draft updates.
  - **API proxy** routes: `/api/chat`, `/api/models`, `/api/sessions` (no direct browser calls to FastAPI).
  - UI: sidebar sessions, new chat, model selector, chat window, markdown bubbles, fixed composer.
- **Branding**: OpenChat name, terminal-style logo, provider labels (e.g. OpenAI for `openai_compatible`).
- **Thinking**: optional reasoning stream from Ollama wrapped for UI; collapsible “Thinking” block per assistant message; streaming status shows “Thinking” only during reasoning phase, otherwise rotating status lines.
- **Attachments**: images and files in composer; backend validation and multimodal / text-in-prompt handling.
- **Tests**: backend unit + Postgres integration + API route tests; frontend unit/component tests; Playwright browser E2E; docker-compose smoke script.
- **CI/CD**: `test.yml` (push/PR: backend, frontend, Playwright); `deploy.yml` (main: tests, E2E, smoke, then Docker image builds) with strict `needs` gating.

### Changed

- Removed default generation caps that clipped long model replies (`max_tokens` / `num_predict` only when explicitly set).

### Security

- Markdown: `skipHtml`, URL transform, safe external links (`rel`, `target`).
- Backend: message/attachment size limits, optional route-level body guard, security response headers middleware.

---

## Earlier history

Commits and tags before this changelog file may exist only in git history; this document starts from the **1.0.0** baseline above and **Unreleased** for ongoing work.
