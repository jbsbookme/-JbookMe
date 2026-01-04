#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@barberia.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin2024!}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }
}

need_cmd curl
need_cmd python3

cookie_jar="$(mktemp)"
cleanup() {
  rm -f "$cookie_jar" || true
}
trap cleanup EXIT

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$1" 2>/dev/null || true
}

echo "[smoke] Base URL: $BASE_URL"

code=$(http_code "$BASE_URL/api/auth/providers")
if [[ "$code" != "200" ]]; then
  echo "[smoke] FAIL: server not responding at $BASE_URL (providers=$code)"
  echo "[smoke] Hint: start dev server with: ./node_modules/.bin/next dev -p 3001"
  exit 1
fi

echo "[smoke] OK: /api/auth/providers (200)"

csrf=$(curl -sS -c "$cookie_jar" "$BASE_URL/api/auth/csrf" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("csrfToken",""), end="")')
if [[ -z "$csrf" ]]; then
  echo "[smoke] FAIL: could not obtain CSRF token"
  exit 1
fi

echo "[smoke] OK: csrf token (${#csrf} chars)"

# Login with credentials. Note: ADMIN_PASSWORD may contain '!' which breaks zsh history expansion,
# but this script runs under bash and uses --data-urlencode, so it's safe.
login_code=$(curl -sS -o /dev/null -w "%{http_code}" \
  -b "$cookie_jar" -c "$cookie_jar" \
  -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$csrf" \
  --data-urlencode "email=$ADMIN_EMAIL" \
  --data-urlencode "password=$ADMIN_PASSWORD" \
  --data-urlencode "callbackUrl=$BASE_URL/dashboard")

# NextAuth credentials callback typically returns 302 on success.
if [[ "$login_code" != "200" && "$login_code" != "302" ]]; then
  echo "[smoke] FAIL: login status=$login_code"
  exit 1
fi

echo "[smoke] OK: credentials login (status=$login_code)"

session_json=""
for _ in 1 2 3 4 5; do
  session_json=$(curl -sS -b "$cookie_jar" "$BASE_URL/api/auth/session" || true)
  if [[ -n "$session_json" ]]; then
    break
  fi
  sleep 0.3
done

if [[ -z "$session_json" ]]; then
  echo "[smoke] FAIL: /api/auth/session returned empty body"
  exit 1
fi

python3 -c 'import json,sys; j=json.loads(sys.stdin.read()); user=j.get("user");
assert user, "[smoke] FAIL: session has no user";
print("[smoke] OK: session user:", {"email": user.get("email"), "role": user.get("role")});
assert user.get("role")=="ADMIN", "[smoke] FAIL: expected ADMIN role"' <<<"$session_json"

stats_code=$(curl -sS -o /dev/null -w "%{http_code}" -b "$cookie_jar" "$BASE_URL/api/admin/stats")
if [[ "$stats_code" != "200" ]]; then
  echo "[smoke] FAIL: /api/admin/stats status=$stats_code"
  exit 1
fi

echo "[smoke] OK: /api/admin/stats (200)"

# Chat endpoint: confirm it responds and can stream.
chat_code=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hola"}]}' \
  "$BASE_URL/api/chat")

if [[ "$chat_code" != "200" ]]; then
  echo "[smoke] FAIL: /api/chat status=$chat_code"
  exit 1
fi

echo "[smoke] OK: /api/chat (200)"

echo "[smoke] OK: /api/chat SSE (first lines)"
# Best-effort streaming check; do not fail the whole script on timeout.
set +e
curl -sS -N --max-time 6 \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hola"}]}' \
  "$BASE_URL/api/chat" | head -n 6
set -e

echo "[smoke] DONE"
