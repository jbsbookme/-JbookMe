#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3001}"
LOG_FILE="${LOG_FILE:-/tmp/jbookme-nextdev-${PORT}.log}"
PID_FILE="${PID_FILE:-/tmp/jbookme-nextdev-${PORT}.pid}"

cd "$PROJECT_DIR"

# Kill anything already listening on the port (common when terminals restart).
if command -v lsof >/dev/null 2>&1; then
  existing_pids=$(lsof -ti tcp:"$PORT" || true)
  if [[ -n "${existing_pids}" ]]; then
    echo "[dev:detached] Killing processes on port $PORT: ${existing_pids}"
    # shellcheck disable=SC2086
    kill -9 ${existing_pids} || true
  fi
fi

# Start detached.
nohup ./node_modules/.bin/next dev -p "$PORT" >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

echo "[dev:detached] Started next dev on http://localhost:$PORT"
echo "[dev:detached] PID: $(cat "$PID_FILE")"
echo "[dev:detached] Log: $LOG_FILE"