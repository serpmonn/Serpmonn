#!/usr/bin/env bash
# Точечный деплой ТОЛЬКО лендинга приложения — без полного overwrite сайта.
# Usage:
#   scripts/deploy-landing.sh prod
#   scripts/deploy-landing.sh dev
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "Usage: $0 <dev|prod>"
  exit 1
fi

cd "$ROOT"

if [[ "$TARGET" == "prod" ]]; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  if [[ "$branch" != "master" && "$branch" != "main" ]]; then
    echo "ERROR: deploy-landing prod только с master/main (сейчас: $branch)"
    exit 1
  fi
  DEST="/var/www/serpmonn.ru/frontend"
else
  DEST="/var/www/serpmonn-dev/frontend"
  if [[ ! -d "$DEST" ]]; then
    echo "ERROR: нет $DEST"
    exit 1
  fi
fi

echo "==> landing-only deploy → $TARGET ($DEST)"
echo "    НЕ запускает полный deploy-locales / не трогает app|auth|profile|findings|snake|main"

cd "$ROOT/assembly"
DIST="$ROOT/assembly/dist/frontend"

copy_one() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp -f "$src" "$dst"
  echo "  ✓ $(realpath --relative-to="$DEST" "$dst" 2>/dev/null || echo "$dst")"
}

# Лендинг приложения
npx eleventy --input=site/serpmonn-app.njk
if [[ ! -f "$DIST/app/serpmonn-app.html" ]]; then
  echo "ERROR: нет $DIST/app/serpmonn-app.html после сборки"
  exit 1
fi
copy_one "$DIST/app/serpmonn-app.html" "$DEST/app/serpmonn-app.html"
shopt -s nullglob
for src in "$DIST"/*/app/serpmonn-app.html; do
  loc="$(basename "$(dirname "$(dirname "$src")")")"
  copy_one "$src" "$DEST/$loc/app/serpmonn-app.html"
done

# Мини-магазин (отдельная сборка — не затирает уже скопированный app)
npx eleventy --input=site/serpmonn-store.njk
if [[ ! -f "$DIST/store/index.html" ]]; then
  echo "ERROR: нет $DIST/store/index.html после сборки"
  exit 1
fi
copy_one "$DIST/store/index.html" "$DEST/store/index.html"
for src in "$DIST"/store/*/index.html; do
  loc="$(basename "$(dirname "$src")")"
  copy_one "$src" "$DEST/store/$loc/index.html"
done

# Ассеты лендинга (бейджи/видео/og) — только stores + screenshots игр/сообщений если есть
STORES_SRC="$ROOT/frontend/images/stores"
STORES_DST="$DEST/images/stores"
if [[ -d "$STORES_SRC" ]]; then
  mkdir -p "$STORES_DST"
  # уже лежат в DEST если DEST==ROOT/frontend; для dev — копируем
  if [[ "$(realpath "$STORES_SRC")" != "$(realpath "$STORES_DST")" ]]; then
    rsync -a --include='badge-*.svg' --include='hero-preview-*.mp4' --include='serpmonn-app-og.png' --include='*-mark.png' --exclude='*' "$STORES_SRC"/ "$STORES_DST"/
    echo "  ✓ images/stores (badges/video/og)"
  else
    echo "  · images/stores уже на месте (prod tree)"
  fi
fi

echo "==> landing-only done"
echo "    Проверка: $DEST/app/serpmonn-app.html"
test -f "$DEST/app/serpmonn-app.html"
