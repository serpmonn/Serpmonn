#!/usr/bin/env bash
# Run after DNS A record dev.serpmonn.ru -> 188.235.13.20 propagates.
set -euo pipefail
getent hosts dev.serpmonn.ru || true
curl -fsS "https://dns.google/resolve?name=dev.serpmonn.ru&type=A" | grep -q '188.235.13.20' || {
  echo "DNS for dev.serpmonn.ru is not pointing to 188.235.13.20 yet"
  exit 1
}
certbot --nginx -d dev.serpmonn.ru --non-interactive --agree-tos --redirect \
  -m support@serpmonn.ru || certbot --nginx -d dev.serpmonn.ru
echo "Update /etc/nginx/sites-available/dev.serpmonn.ru ssl_certificate paths if certbot did not auto-edit."
nginx -t && systemctl reload nginx
