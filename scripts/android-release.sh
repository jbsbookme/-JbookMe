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
  echo "\nTip: set passwords via read -s to avoid shell history:" >&2
  echo "  read -s -p 'Keystore password: ' ANDROID_KEYSTORE_PASSWORD; echo" >&2
  echo "  export ANDROID_KEY_PASSWORD=\"$ANDROID_KEYSTORE_PASSWORD\"" >&2
  exit 1
fi

if [[ ! -f "$ANDROID_KEYSTORE_PATH" ]]; then
  echo "Keystore not found at: $ANDROID_KEYSTORE_PATH" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"

cd "$ANDROID_DIR"

./gradlew clean bundleRelease

AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

if [[ -f "$AAB_PATH" ]]; then
  echo "\nOK: Release AAB generated:" 
  echo "  $AAB_PATH"
else
  echo "\nERROR: Expected AAB not found at:" >&2
  echo "  $AAB_PATH" >&2
  exit 1
fi
