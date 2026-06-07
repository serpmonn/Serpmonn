# Serpmonn Relay / Bootstrap Node

Один процесс, совмещающий:
- **DHT bootstrap** (server mode) — помогает клиентам войти в сеть
- **Circuit Relay v2** — обязательный fallback для клиентов за мобильным NAT/CGNAT

## Требования

- Linux x86_64 с публичным IP
- Go ≥ 1.21
- Порт **4001** открыт TCP + UDP (firewall/ufw)

## Деплой (первый раз)

Скачивать нужно только папку `relay/`, а не весь репозиторий.

**Вариант A — через curl (без git, рекомендуется):**
```bash
mkdir -p /opt/serpmonn-relay
curl -sL https://github.com/serpmonn/Serpmonn/archive/refs/heads/master.tar.gz \
    | tar -xz --strip-components=2 -C /opt/serpmonn-relay Serpmonn-master/relay
cd /opt/serpmonn-relay
bash deploy/install.sh
```

**Вариант B — через git sparse-checkout:**
```bash
git clone --no-checkout --depth=1 --filter=blob:none \
    https://github.com/serpmonn/Serpmonn /opt/serpmonn-tmp
cd /opt/serpmonn-tmp
git sparse-checkout set relay
git checkout
mv relay /opt/serpmonn-relay
rm -rf /opt/serpmonn-tmp
cd /opt/serpmonn-relay
bash deploy/install.sh
```

`install.sh` делает:
1. Создаёт системного пользователя `serpmonn`
2. Генерирует Ed25519 ключ → `/etc/serpmonn/relay-identity.key` (600, owner serpmonn)
3. Собирает бинарник → `/usr/local/bin/serpmonn-relay`
4. Устанавливает и запускает systemd unit `serpmonn-relay`
5. Открывает порт 4001 TCP+UDP через ufw (если установлен)

## Получить PeerID и multiaddr'ы

После первого запуска:

```bash
journalctl -u serpmonn-relay -n 20
```

Вы увидите строки вида:
```
relay: PeerID = 12D3KooW...
relay: Multiaddrs (put these in DefaultBootstraps):
  /ip4/1.2.3.4/tcp/4001/p2p/12D3KooW...
  /ip4/1.2.3.4/udp/4001/quic-v1/p2p/12D3KooW...
```

Скопируйте эти адреса в `DefaultBootstraps()` в
`packages/go-core/net/bootstrap.go` репозитория `Serpmonn_messenger`.

## Тест reservation

```bash
# На любой машине с Go:
cd /opt/serpmonn/relay
go run ./cmd/test-reservation/ -relay /ip4/<IP>/tcp/4001/p2p/<PEERID>
```

Успех:
```
✓ reservation OK
  Relay:      12D3KooW...
  Our PeerID: 12D3KooW...
  Relay addr: /ip4/1.2.3.4/tcp/4001/p2p/12D3KooW.../p2p-circuit
  Expires:    2026-06-07T06:00:00+03:00
```

## Ключи

| Файл | Содержимое | Права |
|------|-----------|-------|
| `/etc/serpmonn/relay-identity.key` | Base64 Ed25519 privkey | `600 serpmonn:serpmonn` |

**Никогда не коммитить в репозиторий.** PeerID детерминирован по ключу —
потеря ключа = смена PeerID = обновление DefaultBootstraps во всех клиентах.

## Обновление

```bash
cd /opt/serpmonn
git pull
cd relay
go build -o /usr/local/bin/serpmonn-relay .
systemctl restart serpmonn-relay
```

## Лимиты Circuit Relay v2 (MVP)

| Параметр | Значение |
|----------|---------|
| MaxReservations | 1024 |
| MaxCircuits | 512 |
| MaxReservationsPerPeer | 8 |
| MaxReservationsPerIP | 16 |
| MaxReservationsPerASN | 32 |
| Лимит трафика | нет |
| Лимит времени | нет |
