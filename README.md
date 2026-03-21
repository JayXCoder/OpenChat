# OllamaChat Monorepo

Production-oriented fullstack AI chat system with streaming responses, provider abstraction, and PostgreSQL session persistence.

## Structure

- `frontend/` Next.js app (UI + API proxy routes)
- `backend/` FastAPI app (chat orchestration + providers + persistence)
- `docker-compose.yml` full local stack

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker + Docker Compose

## Environment setup

1. Copy root env:
   - `cp .env.example .env`
2. Copy backend env:
   - `cp backend/.env.example backend/.env`
3. Copy frontend env:
   - `cp frontend/.env.example frontend/.env`
4. Update secrets and URLs as needed.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 37891
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker

Default (from `.env`: `COMPOSE_FILE=docker-compose.yml:docker-compose.host-ollama.yml`): Ollama on the host at `127.0.0.1:11434`, backend uses host networking; set `BACKEND_DATABASE_URL` in `.env`.

```bash
docker compose --env-file .env up --build -d
```

Bridge stack only (backend published on `BACKEND_PORT`, no host-network backend): set `COMPOSE_FILE=docker-compose.yml:docker-compose.bridge.yml` in `.env`, then the same command.

With Ollama in Docker (`--profile ollama`), use the **bridge** `COMPOSE_FILE` and:

```bash
docker compose --env-file .env --profile ollama up --build -d
```

## APIs

- `POST /api/v1/chat/stream`
- `GET /api/v1/sessions`
- `POST /api/v1/sessions`
- `PATCH /api/v1/sessions/{id}`
- `GET /api/v1/sessions/{id}/messages`
- `GET /api/v1/models`

## Architecture hooks

- `retrieve_context(query: str) -> str` for RAG integration
- `run_tool(query: str)` for agent/tool execution

## Testing

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```
