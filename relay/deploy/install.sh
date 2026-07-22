#!/usr/bin/env bash
# install.sh — деплой Serpmonn relay/bootstrap ноды на сервер.
#
# Запускать с правами root на целевом сервере:
#
#   # Скачать только папку relay (без клонирования всего репозитория):
#   apt-get install -y git  # или yum install git
#   git clone --no-checkout --depth=1 --filter=blob:none \
#       https://github.com/serpmonn/Serpmonn /opt/serpmonn-tmp
#   cd /opt/serpmonn-tmp && git sparse-checkout set relay
#   git checkout
#   mv relay /opt/serpmonn-relay
#   cd /opt/serpmonn-relay
#   rm -rf /opt/serpmonn-tmp
#   bash deploy/install.sh
#
# ИЛИ — скачать напрямую архивом (без git):
#   curl -sL https://github.com/serpmonn/Serpmonn/archive/refs/heads/master.tar.gz \
#       | tar -xz --strip=2 Serpmonn-master/relay -C /opt/serpmonn-relay
#   bash /opt/serpmonn-relay/deploy/install.sh
#
# Что делает скрипт:
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

# 5. Порты 4001/4002 наружу НЕ открываем — только 443 (nginx WSS + UDP QUIC).
#    При необходимости: iptables -I INPUT -p tcp --dport 4001 -j DROP (и udp/4001, tcp/4002)

echo ""
echo "=== DONE ==="
echo "Check logs:   journalctl -u serpmonn-relay -f"
echo "Status:       systemctl status serpmonn-relay"
echo ""
echo "Public bootstrap (after start):"
echo "  /dns4/relay.serpmonn.ru/tcp/443/wss/p2p/<PEERID>"
echo "  /dns4/relay.serpmonn.ru/udp/443/quic-v1/p2p/<PEERID>"
echo ""
echo "nginx must proxy: /api/v1/sync → http://127.0.0.1:4002/"
