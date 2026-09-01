#!/usr/bin/env bash
# Smoke: app content on dev must be reachable WITHOUT Basic Auth (WebView fetch).
# Exit 1 if anything that the shell opens via fetch/iframe returns auth/forbidden.
set -euo pipefail
HOST="${SMOKE_HOST:-https://dev.serpmonn.ru}"
FAIL=0

check() {
  local url="$1"
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo '000')
  if [[ "$code" != "200" ]]; then
    echo "FAIL $code $url"
    FAIL=1
  else
    echo "OK   $code $url"
  fi
}

echo "Smoke against $HOST (no auth)"
check "$HOST/frontend/app/index.html?app=1"
check "$HOST/frontend/app/catalog.json?v=4"
check "$HOST/frontend/app/app.js?v=93"
check "$HOST/frontend/knowledge-base/knowledge-base.html?app=1"
check "$HOST/frontend/knowledge-base/articles/cookies-complete-guide.html?app=1"
check "$HOST/frontend/tools/marketing/utm-builder.html?app=1"
check "$HOST/frontend/games/flappy/flappy.html?app=1"
check "$HOST/frontend/games/flappy/flappy.js?v=2"
check "$HOST/frontend/games/flappy/flappy.css?v=2"
check "$HOST/frontend/styles/base.css"
check "$HOST/frontend/styles/tools/tools-shell.css?v=3"
check "$HOST/frontend/scripts/tools/utm-builder.js?v=1"
check "$HOST/frontend/styles/articles/article-chrome.css"

# Neli must STILL require its own auth (regression: don't open everything)
neli=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$HOST/frontend/games/neli/index.html" || echo '000')
if [[ "$neli" == "401" ]]; then
  echo "OK   $neli $HOST/frontend/games/neli/index.html (still protected)"
else
  echo "FAIL expected 401 for neli, got $neli"
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "SMOKE FAILED"
  exit 1
fi
echo "SMOKE OK"
