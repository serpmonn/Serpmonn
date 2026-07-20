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
if [ -x /app/backend/start.sh ]; then
  exec /app/backend/start.sh "$@"
fi
if [ -x /app/start.sh ]; then
  exec /app/start.sh "$@"
fi
exec "$@"
