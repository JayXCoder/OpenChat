#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

cleanup() {
  docker compose down -v || true
}
trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"
  local delay_s="${3:-2}"
  local i
  for i in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep "$delay_s"
  done
  echo "[smoke] timeout waiting for ${url}" >&2
  return 1
}

echo "[smoke] starting services..."
docker compose up -d --build postgres backend frontend

echo "[smoke] waiting for backend health..."
wait_for_url "http://127.0.0.1:${BACKEND_PORT}/health" 90 2
echo "[smoke] waiting for frontend API proxy..."
wait_for_url "http://127.0.0.1:${FRONTEND_PORT}/api/models" 90 2

echo "[smoke] creating chat session..."
SESSION_JSON="$(curl -fsS -X POST "http://127.0.0.1:${FRONTEND_PORT}/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke E2E Session"}')"

SESSION_ID="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SESSION_JSON")"
if [[ -z "$SESSION_ID" ]]; then
  echo "[smoke] failed to parse session id" >&2
  exit 1
fi

echo "[smoke] checking session message endpoint..."
curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/api/sessions?id=${SESSION_ID}" >/dev/null

echo "[smoke] running streaming endpoint smoke..."
STREAM_OUT="$(mktemp)"
curl -fsS -X POST "http://127.0.0.1:${FRONTEND_PORT}/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"${SESSION_ID}\",\"message\":\"smoke test\",\"provider\":\"ollama\",\"model\":\"qwen3:latest\"}" \
  > "$STREAM_OUT"

if [[ ! -s "$STREAM_OUT" ]]; then
  echo "[smoke] stream output empty" >&2
  exit 1
fi

echo "[smoke] success"
