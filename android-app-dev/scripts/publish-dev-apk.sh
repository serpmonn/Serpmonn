#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/../frontend/downloads/Serpmonn-Dev.apk"
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

cd "$ROOT"
npm run build:debug
cp "$APK" "$OUT"
echo "Published: $OUT"
aapt dump badging "$OUT" 2>/dev/null | head -3 || true
