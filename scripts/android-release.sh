#!/usr/bin/env bash
set -euo pipefail

# Android Play Store release (AAB)
# Requires env vars (do NOT hardcode secrets in the repo):
# - ANDROID_KEYSTORE_PATH
# - ANDROID_KEYSTORE_PASSWORD
# - ANDROID_KEY_ALIAS
# - ANDROID_KEY_PASSWORD
# Optional:
# - ANDROID_VERSION_CODE
# - ANDROID_VERSION_NAME

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Convenience defaults (NOT secrets):
# - If the keystore is in the repo root with the expected name, auto-use it.
# - Default alias to the known one.
DEFAULT_KEYSTORE_PATH="$ROOT_DIR/jbookme-release.keystore"
if [[ -z "${ANDROID_KEYSTORE_PATH:-}" && -f "$DEFAULT_KEYSTORE_PATH" ]]; then
  export ANDROID_KEYSTORE_PATH="$DEFAULT_KEYSTORE_PATH"
fi

if [[ -z "${ANDROID_KEY_ALIAS:-}" ]]; then
  export ANDROID_KEY_ALIAS="jbookme"
fi

required_vars=(
  ANDROID_KEYSTORE_PATH
  ANDROID_KEYSTORE_PASSWORD
  ANDROID_KEY_ALIAS
  ANDROID_KEY_PASSWORD
)

missing=0
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing required env var: $v" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  echo -e "\nTip: set passwords via read -s to avoid shell history:" >&2
  echo "  read -s -p 'Keystore password: ' ANDROID_KEYSTORE_PASSWORD; echo" >&2
  echo "  export ANDROID_KEY_PASSWORD=\"$ANDROID_KEYSTORE_PASSWORD\"" >&2
  echo "  export ANDROID_KEY_ALIAS=\"jbookme\"" >&2
  echo "  export ANDROID_KEYSTORE_PATH=\"$DEFAULT_KEYSTORE_PATH\"" >&2
  exit 1
fi

if [[ ! -f "$ANDROID_KEYSTORE_PATH" ]]; then
  echo "Keystore not found at: $ANDROID_KEYSTORE_PATH" >&2
  exit 1
fi
ANDROID_DIR="$ROOT_DIR/android"

cd "$ANDROID_DIR"

# Safety: Play releases must use hosted mode (server.url) because the app depends on Next.js API routes.
CAP_CONFIG_JSON="$ANDROID_DIR/app/src/main/assets/capacitor.config.json"
if [[ -f "$CAP_CONFIG_JSON" ]]; then
  if ! grep -q '"server"' "$CAP_CONFIG_JSON" || ! grep -q '"url"' "$CAP_CONFIG_JSON"; then
    echo -e "\nERROR: Capacitor is in bundled mode (no server.url)." >&2
    echo "This will make /api/* calls hit capacitor://localhost and return 404." >&2
    echo "Fix:" >&2
    echo "  export CAPACITOR_SERVER_URL=\"https://www.jbsbookme.com\"" >&2
    echo "  unset CAPACITOR_WEB_SOURCE   # or set to hosted" >&2
    echo "  npm run cap:sync:android" >&2
    exit 1
  fi
fi

./gradlew clean bundleRelease

AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

if [[ -f "$AAB_PATH" ]]; then
  if command -v jarsigner >/dev/null 2>&1; then
    set +e
    VERIFY_OUT="$(jarsigner -verify -verbose -certs "$AAB_PATH" 2>&1)"
    VERIFY_STATUS=$?
    set -e

    if echo "$VERIFY_OUT" | grep -qi "jar is unsigned"; then
      echo -e "\nERROR: AAB was generated but is NOT signed." >&2
      echo "Fix: ensure ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_PASSWORD are set correctly." >&2
      exit 1
    fi

    if [[ $VERIFY_STATUS -ne 0 ]]; then
      echo -e "\nERROR: Could not verify AAB signature (jarsigner exit $VERIFY_STATUS)." >&2
      echo "$VERIFY_OUT" >&2
      exit 1
    fi
  fi

  echo -e "\nOK: Release AAB generated:" 
  echo "  $AAB_PATH"
else
  echo "\nERROR: Expected AAB not found at:" >&2
  echo "  $AAB_PATH" >&2
  exit 1
fi
