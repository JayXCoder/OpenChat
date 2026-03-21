#!/usr/bin/env sh
set -e

alembic upgrade head
uvicorn app.main:app --host ${APP_HOST:-0.0.0.0} --port ${APP_PORT:-8000}
