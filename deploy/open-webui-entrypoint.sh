#!/bin/sh
set -eu
# Keep brand as WEBUI_NAME without forced " (Open WebUI)" suffix from upstream env.py
python3 - <<'PY'
from pathlib import Path
import re
p = Path("/app/backend/open_webui/env.py")
if p.exists():
    text = p.read_text()
    text2, n = re.subn(
        r'WEBUI_NAME = os\.environ\.get\("WEBUI_NAME", "Open WebUI"\)\nif WEBUI_NAME != "Open WebUI":\n    WEBUI_NAME \+= " \(Open WebUI\)"\n',
        'WEBUI_NAME = os.environ.get("WEBUI_NAME", "Open WebUI")\n# Serpmonn: keep custom WEBUI_NAME without Open WebUI suffix\n',
        text,
        count=1,
    )
    if n:
        p.write_text(text2)
PY

# Brand favicons/logo (persist across image updates)
BRAND_SRC="/serpmonn-branding"
for dest in \
  /app/backend/open_webui/static \
  /app/build/static \
  /app/static
do
  if [ -d "$BRAND_SRC" ] && [ -d "$dest" ]; then
    for f in favicon.png favicon.ico favicon.svg favicon-96x96.png favicon-dark.png apple-touch-icon.png logo.png; do
      if [ -f "$BRAND_SRC/$f" ]; then
        cp -f "$BRAND_SRC/$f" "$dest/$f" 2>/dev/null || true
      fi
    done
  fi
done

if [ -x /app/backend/start.sh ]; then
  exec /app/backend/start.sh "$@"
fi
if [ -x /app/start.sh ]; then
  exec /app/start.sh "$@"
fi
exec "$@"
