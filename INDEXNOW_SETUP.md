# IndexNow setup for serpmonn.ru

## 1) Generate and publish key file
- Generate a random key (UUID or long token), e.g.: `6f8a1e0f3a634c5f9c9db0f5f4d9d6b1`
- Create a file at: `https://www.serpmonn.ru/<KEY>.txt`
  - Contents: the key itself (single line)
  - Example URL: `https://www.serpmonn.ru/6f8a1e0f3a634c5f9c9db0f5f4d9d6b1.txt`

## 2) Ping API (single or batch)
Environment variables:
- INDEXNOW_KEY — the key
- INDEXNOW_HOST — `www.serpmonn.ru`
- INDEXNOW_KEY_LOCATION — `https://www.serpmonn.ru/<KEY>.txt`

Usage examples:
```bash
# Single URL
INDEXNOW_KEY=<KEY> INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/<KEY>.txt \
node scripts/indexnow-ping.mjs https://www.serpmonn.ru/

# Batch URLs
INDEXNOW_KEY=<KEY> INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/<KEY>.txt \
node scripts/indexnow-ping.mjs \
  https://www.serpmonn.ru/frontend/en/index.html \
  https://www.serpmonn.ru/frontend/de/index.html

# Ping only changed files (since last run)
INDEXNOW_KEY=<KEY> INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/<KEY>.txt \
node scripts/indexnow-ping.mjs --changed-only
```

## 3) Automate
- On deploy: ping the changed URLs
- Or nightly cron for the latest pages, e.g. last modified from sitemaps

Cron example (daily at 00:05, after sitemap generation):
```bash
5 0 * * * cd /var/www/serpmonn.ru && \
INDEXNOW_KEY=<KEY> INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/<KEY>.txt \
node scripts/indexnow-ping.mjs --changed-only https://www.serpmonn.ru/sitemaps/sitemap-index.xml >> /var/log/indexnow.log 2>&1
```

This will:
1. Scan `frontend/` for HTML files modified since last run
2. Ping only those changed URLs + sitemap index
3. Save timestamp for next run

Note: IndexNow is complementary to sitemaps/robots; it speeds up discovery and recrawl.

