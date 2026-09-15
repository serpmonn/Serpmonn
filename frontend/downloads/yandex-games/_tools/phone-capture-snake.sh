#!/usr/bin/env bash
set -euo pipefail

STORE=/var/www/serpmonn.ru/frontend/downloads/yandex-games/snake
ROOT=/var/www/serpmonn.ru/frontend/games/yandex
PORT=8765
TMPDIR_CAP=/tmp/snake-phone-caps
mkdir -p "$TMPDIR_CAP" "$STORE"

fuser -k ${PORT}/tcp 2>/dev/null || true
sleep 0.3

node <<'NODE' &
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'application/javascript;charset=utf-8',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/sdk.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end('window.YaGames=undefined;');
    return;
  }
  const fp = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404);
    res.end('nf');
    return;
  }
  const ext = path.extname(fp).toLowerCase();
  let body = fs.readFileSync(fp);
  if (ext === '.html') {
    let html = body.toString('utf8');
    html = html.replace(
      '</body>',
      `<script>
(function(){
  var p=new URLSearchParams(location.search);
  var lang=(p.get('lang')||'ru').toLowerCase().slice(0,2);
  function apply(){
    if(!window.SERPMONN_LOCALES) return false;
    var loc=window.SERPMONN_LOCALES[lang]||window.SERPMONN_LOCALES.ru;
    if(window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
    window.showFullScreenAd=function(){};
    return true;
  }
  if(!apply()) setTimeout(apply, 80);
  setTimeout(apply, 400);
})();
</script></body>`
    );
    body = Buffer.from(html);
  }
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
});
server.listen(8765, '127.0.0.1', () => console.log('PHONE_SERVER_READY'));
NODE
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true; fuser -k ${PORT}/tcp 2>/dev/null || true' EXIT

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:${PORT}/sdk.js" >/dev/null; then break; fi
  sleep 0.2
done

adb reverse tcp:${PORT} tcp:${PORT}
adb shell svc power stayon true
adb shell input keyevent KEYCODE_WAKEUP
sleep 0.4

to_916() {
  local src="$1" dst="$2"
  python3 - "$src" "$dst" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
w, h = im.size
target = 9 / 16
cur = w / h
if abs(cur - target) < 0.01:
    out = im
elif cur < target:
    nh = int(w / target)
    top = max(0, (h - nh) // 2 - nh // 30)
    if top + nh > h:
        top = h - nh
    out = im.crop((0, top, w, top + nh))
else:
    nw = int(h * target)
    left = (w - nw) // 2
    out = im.crop((left, 0, left + nw, h))
out = out.resize((1080, 1920), Image.Resampling.LANCZOS)
out.save(dst)
print('ok', dst, 'from', w, h)
PY
}

shot() {
  local dst="$1"
  local raw="$TMPDIR_CAP/raw-$(basename "$dst")"
  adb exec-out screencap -p > "$raw"
  # drop carriage returns some devices add
  if ! file "$raw" | grep -qi 'PNG\|JPEG\|image'; then
    tr -d '\r' < "$raw" > "${raw}.fix" || true
    mv -f "${raw}.fix" "$raw"
  fi
  to_916 "$raw" "$dst"
}

tap_start() {
  # lower UI area on 1220x2712
  adb shell input tap 280 2080
  sleep 0.15
  adb shell input tap 360 2140
  sleep 0.15
  adb shell input tap 420 2000
}

swipe_play() {
  adb shell input swipe 500 1000 850 1000 90
  sleep 0.3
  adb shell input swipe 850 1000 850 1400 90
  sleep 0.3
  adb shell input swipe 850 1400 500 1400 90
  sleep 0.3
  adb shell input swipe 500 1400 500 1000 90
  sleep 0.25
}

capture_lang() {
  local lang="$1"
  echo "=== capture $lang ==="
  adb shell am force-stop com.android.chrome || true
  sleep 0.5
  adb shell am start -a android.intent.action.VIEW \
    -d "http://127.0.0.1:${PORT}/snake/index.html?lang=${lang}&t=$(date +%s)" \
    com.android.chrome
  sleep 4
  # enter immersive-ish: hide chrome UI with fullscreen request via volume? just wait
  tap_start
  sleep 0.8
  swipe_play
  shot "$STORE/mobile-${lang}-01.png"
  swipe_play
  shot "$STORE/mobile-${lang}-02.png"
  swipe_play
  swipe_play
  shot "$STORE/mobile-${lang}-03.png"
}

capture_lang ru
capture_lang en

cp -f "$STORE/mobile-ru-01.png" "$STORE/mobile-01-play.png"
cp -f "$STORE/mobile-ru-02.png" "$STORE/mobile-02-score.png"
cp -f "$STORE/mobile-ru-03.png" "$STORE/mobile-03-ru.png"

ls -la "$STORE"/mobile-ru-*.png "$STORE"/mobile-en-*.png
echo DONE
