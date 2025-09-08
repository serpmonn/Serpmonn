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
```

## 3) Automate
- On deploy: ping the changed URLs
- Or nightly cron for the latest pages, e.g. last modified from sitemaps

Cron example (daily at 01:10):
```bash
10 1 * * * cd /var/www/serpmonn.ru && \
INDEXNOW_KEY=<KEY> INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/<KEY>.txt \
node scripts/indexnow-ping.mjs https://www.serpmonn.ru/sitemaps/sitemap-index.xml >> /var/log/indexnow.log 2>&1
```

Note: IndexNow is complementary to sitemaps/robots; it speeds up discovery and recrawl.

