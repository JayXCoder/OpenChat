# Changelog

All notable changes to OpenChat are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

Nothing yet.

---

## [1.5.0] — 2026-03-25

**Google Gemini** as a third chat provider (Generative Language API, streaming SSE), with env and browser Settings harness matching Ollama / OpenAI-compatible.

### Added

- **Backend**
  - `app/providers/gemini_provider.py` — `streamGenerateContent` with `alt=sse`, `key` query auth, system/user/assistant → Gemini `contents` + `systemInstruction`, vision via `inlineData` on the last user turn.
  - Config: `GEMINI_BASE_URL` (default `https://generativelanguage.googleapis.com/v1beta`), `GEMINI_API_KEY`, `GEMINI_MODELS` (comma-separated allowlist); `default_provider` may be `gemini`.
  - `ProviderRuntimeConfig` + headers `x-openchat-gemini-base-url`, `x-openchat-gemini-api-key`, `x-openchat-gemini-models`.
  - Catalog and router register provider id **`gemini`**; streaming requires a non-empty API key (clear error if missing).
- **Frontend**
  - `ProviderName` and model catalog include **`gemini`**; selector label “Gemini”.
  - Settings dialog: Google Gemini section (optional base URL, API key with show/hide, optional model CSV); values persist in `openchat_provider_overrides_v1` and flow through existing header forwarding.
- **Tests**
  - `tests/test_gemini_provider.py`; router/runtime tests extended for Gemini.

### Notes

- Model ids must match Google’s API (e.g. `gemini-2.0-flash`). Adjust `GEMINI_MODELS` or the Settings allowlist if Google renames or deprecates models in your project.

### Fixed (Gemini follow-up)

- **Base URL**: If `GEMINI_BASE_URL` (or Settings) contained a full AI Studio method URL (`…/v1beta/models/…:generateContent`), it is normalized back to `…/v1beta` so `streamGenerateContent` paths are not doubled (404).
- **Model id**: Strips mistaken suffixes such as `:generateContent` and stray path segments from the selected model name.
- **Auth**: Uses `X-goog-api-key` header instead of `key=` query param so keys are less likely to appear in URL access logs.
- **Defaults**: `GEMINI_MODELS` defaults now lead with `gemini-flash-latest` (AI Studio–style id); `gemini-1.5-flash` removed from defaults after 404s on newer keys.

---

## [1.4.0] — 2026-03-25

Browser **SETTINGS** dialog for provider endpoints: overrides merge with server env per request (no change to default env-only deployments).

### Added

- **Frontend**
  - `ProviderSettingsDialog` (SYS.MEMO brutalist styling, `z-[90]` under image lightbox): Ollama base URL, OpenAI-compatible base URL + API key (show/hide), optional comma-separated model allowlists for both providers; Save / Cancel / Clear overrides.
  - `lib/provider-settings.ts` — `localStorage` key `openchat_provider_overrides_v1`, helpers to attach `x-openchat-*` headers on `getModelCatalog` and `streamChat`.
  - **SETTINGS** control in `SysMemoHeader`; saving or clearing overrides refetches the model catalog.
- **Backend**
  - `app/core/provider_runtime.py` — `ProviderRuntimeConfig`, `merge_provider_runtime()`, `provider_runtime_from_request()`; optional headers `x-openchat-ollama-base-url`, `x-openchat-openai-base-url`, `x-openchat-openai-api-key`, `x-openchat-ollama-models`, `x-openchat-openai-models` (length limits).
  - Chat stream and models list resolve providers using merged runtime config per request.
- **Next.js BFF**
  - `api/chat` and `api/models` forward the same override headers to FastAPI (`GET /api/models` accepts the incoming request for header forwarding).
- **Tests**
  - `tests/test_provider_runtime.py`; OpenAI provider test for omitting `Authorization` when the API key is empty.

### Changed

- `ProviderRouter` accepts optional `ProviderRuntimeConfig` (defaults to env via `get_settings()`).
- `ChatService.stream_chat` takes an explicit `ProviderRuntimeConfig` and constructs a router per call.
- `OpenAICompatibleProvider` sends `Authorization` only when the API key is non-empty after trim.

### Notes

- Overrides are stored in the browser (`localStorage`); they apply only to this origin and are weaker than server-side secrets—prefer env for shared or production hosts.

---

## [1.3.0] — 2026-03-25

Composer pending attachments: same full-size image preview as in the transcript.

### Added

- Pending **image** chips in `ChatInput` open the shared `ImageLightbox` (blob URL) when the thumbnail is activated.
- Accessible controls: `aria-label` / `sr-only` filename, visible focus rings, 44×44px minimum targets on the preview control and remove button.

### Changed

- Image chip thumbnail uses an 11×11 (44px) bordered button; non-image chips use a matching placeholder block for row alignment.

---

## [1.2.0] — 2026-03-25

Chat history: image attachments render as thumbnails with an expandable lightbox instead of only text lines.

### Added

- `ImageLightbox` dialog (backdrop click / Escape / focus on close, `aria-modal`, brutalist borders).
- `ChatImageAttachment` on `ChatMessage` for in-memory previews (base64 + MIME + name).
- `partitionUserMessageContent()` and `mergePendingImageAttachments()` in `frontend/src/lib/user-message-display.ts` to parse `--- Attachments ---` lines (server format and optimistic `- filename` lines) and re-attach previews after session sync.
- Vitest coverage in `user-message-display.test.ts`.

### Changed

- `MessageBubble` (user role): body text plus an **Attachments** section with a thumbnail grid; thumbnails open the lightbox. Non-image attachment lines stay as preformatted text.
- `Page` submit flow: optimistic user messages include `imageAttachments` for `image/*` files; after streaming completes, `getSessionMessages` results are merged with the pending image payloads so thumbnails survive sync (API still stores text-only summaries for images).
- `getSessionMessages` normalization coerces message `id` to string for consistent React keys.

### Fixed

- Removed a no-op conditional on the user message body wrapper class name in `MessageBubble`.

### Notes

- Full page reload still cannot restore image bytes from the API until attachments are persisted or exposed as URLs; the UI shows a short “preview unavailable after reload” note when filenames are present without client-side data.

---

## [1.1.0] — 2026-03-22

Documentation, post-send consistency, mobile layout, tests, and CI scope adjustment (prior unreleased batch).

### Added

- `ARCHITECTURE.md` — system overview, layers, streaming contract, security posture, quality gates.
- Post-send message sync: after each chat request completes, messages for the active session are re-fetched from the backend so the UI stays consistent on flaky mobile streams.

### Changed

- **Mobile / responsive UI**
  - Collapsible sidebar on small screens (drawer + overlay + hamburger); desktop keeps a fixed sidebar.
  - Viewport layout uses `dvh` and `min-w-0` flex children to avoid clipped or untappable composer on phones.
  - Sidebar hidden with `hidden` when closed on mobile so it cannot intercept touches.
  - Composer is `sticky` at the bottom with safe-area padding for notched devices.
- Playwright E2E selectors hardened for mobile drawer and session menu (text / `data-session-menu`).

### Removed

- Visible composer hint text that described private reasoning / `think` tags (behavior unchanged; UI copy removed).
- **CI**: Docker Compose smoke E2E job and `scripts/docker-smoke-e2e.sh` — GitHub Actions has no checked-in `backend/.env` / `frontend/.env`, and a full stack + Ollama is not assumed in CI. Image builds remain gated on unit tests and Playwright E2E.

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
- **Tests**: backend unit + Postgres integration + API route tests; frontend unit/component tests; Playwright browser E2E.
- **CI/CD**: `test.yml` (push/PR: backend, frontend, Playwright); `deploy.yml` (main: same tests + E2E, then Docker image builds) with strict `needs` gating.

### Changed

- Removed default generation caps that clipped long model replies (`max_tokens` / `num_predict` only when explicitly set).

### Security

- Markdown: `skipHtml`, URL transform, safe external links (`rel`, `target`).
- Backend: message/attachment size limits, optional route-level body guard, security response headers middleware.

---

## Earlier history

Commits and tags before this changelog file may exist only in git history; this document starts from the **1.0.0** baseline above and dated releases for ongoing work.
