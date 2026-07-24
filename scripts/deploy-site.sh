#!/usr/bin/env bash
# Deploy site build to DEV or PROD frontend tree.
# Usage:
#   scripts/deploy-site.sh dev
#   scripts/deploy-site.sh prod
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "Usage: $0 <dev|prod>"
  exit 1
fi

cd "$ROOT"

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

if [[ "$TARGET" == "prod" ]]; then
  if [[ "$branch" != "master" && "$branch" != "main" ]]; then
    echo "ERROR: deploy:prod разрешён только с ветки master (сейчас: $branch)"
    echo "Смержите develop → master, затем повторите."
    exit 1
  fi
  if [[ "$ROOT" == "/var/www/serpmonn-dev" ]]; then
    echo "ERROR: не запускайте deploy:prod из worktree develop ($ROOT)"
    exit 1
  fi
fi

if [[ "$TARGET" == "dev" ]]; then
  if [[ ! -d /var/www/serpmonn-dev/frontend ]]; then
    echo "ERROR: нет /var/www/serpmonn-dev/frontend — сначала создайте worktree"
    exit 1
  fi
fi

export DEPLOY_TARGET="$TARGET"

echo "==> site deploy: $TARGET (branch=$branch, root=$ROOT)"
cd "$ROOT/assembly"
npm run build
node ../scripts/count-stats.mjs || true
node deploy-locales.js
node ../scripts/write-news-redirects.mjs
echo "==> done: DEPLOY_TARGET=$TARGET"
