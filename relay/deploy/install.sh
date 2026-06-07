#!/usr/bin/env bash
# install.sh — деплой Serpmonn relay/bootstrap ноды на сервер.
#
# Запускать с правами root на целевом сервере:
#   bash install.sh
#
# Что делает:
#   1. Создаёт системного пользователя serpmonn (без shell, без home).
#   2. Создаёт /etc/serpmonn/ и генерирует ключ (если нет).
#   3. Собирает бинарники из relay/ (нужен Go >= 1.21).
#   4. Устанавливает systemd unit и запускает сервис.
#
# После установки: смотри journalctl -u serpmonn-relay -f
# PeerID и multiaddr'ы будут в логе сразу после старта.

set -euo pipefail

RELAY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KEY_FILE="/etc/serpmonn/relay-identity.key"
BINARY="/usr/local/bin/serpmonn-relay"
KEYGEN="/usr/local/bin/serpmonn-keygen"
SERVICE_FILE="/etc/systemd/system/serpmonn-relay.service"
PORT=4001

echo "=== Serpmonn Relay Install ==="

# 1. Системный пользователь
if ! id serpmonn &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin serpmonn
    echo "[ok] user serpmonn created"
else
    echo "[ok] user serpmonn exists"
fi

# 2. Директория конфига и ключ
mkdir -p /etc/serpmonn
chmod 700 /etc/serpmonn

# Сборка keygen
echo "[..] building keygen..."
(cd "$RELAY_DIR" && go build -o "$KEYGEN" ./cmd/keygen/)
echo "[ok] keygen -> $KEYGEN"

if [[ ! -f "$KEY_FILE" ]]; then
    echo "[..] generating relay identity key..."
    "$KEYGEN" -out "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    chown serpmonn:serpmonn "$KEY_FILE"
    echo "[ok] key written to $KEY_FILE"
else
    echo "[ok] key already exists at $KEY_FILE — skipping generation"
fi

# 3. Сборка relay daemon
echo "[..] building relay daemon..."
(cd "$RELAY_DIR" && go build -o "$BINARY" .)
chmod 755 "$BINARY"
echo "[ok] relay -> $BINARY"

# 4. systemd unit
cp "$RELAY_DIR/deploy/serpmonn-relay.service" "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable serpmonn-relay
systemctl restart serpmonn-relay
echo "[ok] systemd unit installed and started"

# 5. Открываем порт (если ufw установлен)
if command -v ufw &>/dev/null; then
    ufw allow "$PORT"/tcp comment "Serpmonn relay TCP" 2>/dev/null || true
    ufw allow "$PORT"/udp comment "Serpmonn relay QUIC" 2>/dev/null || true
    echo "[ok] ufw: port $PORT TCP+UDP opened"
fi

echo ""
echo "=== DONE ==="
echo "Check logs:   journalctl -u serpmonn-relay -f"
echo "Status:       systemctl status serpmonn-relay"
echo ""
echo "After start, copy the printed multiaddrs into:"
echo "  packages/go-core/net/bootstrap.go -> DefaultBootstraps()"
echo ""
echo "Then test reservation:"
echo "  serpmonn-test-reservation -relay /ip4/<IP>/tcp/$PORT/p2p/<PEERID>"
