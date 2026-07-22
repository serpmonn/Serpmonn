# Serpmonn Relay / Bootstrap Node

Один процесс, совмещающий:
- **DHT bootstrap** (server mode) — помогает клиентам войти в сеть
- **Circuit Relay v2** — обязательный fallback для клиентов за мобильным NAT/CGNAT

## Требования

- Linux x86_64 (можно за NAT с `-extip`)
- Go ≥ 1.25
- **Снаружи только 443**: TCP (nginx WSS) + UDP (QUIC/WebTransport)
- Порты **4001/4002** — только `127.0.0.1` (firewall DROP с WAN)

## Публичный доступ

| Путь | Куда |
|---|---|
| `wss://relay.serpmonn.ru/api/v1/sync` | nginx → `127.0.0.1:4002` (plain WS) |
| `udp/443` QUIC | напрямую `serpmonn-relay` |

nginx: только `location = /api/v1/sync`; остальное — JSON 404.

## Деплой

```bash
cd /var/www/serpmonn.ru/relay   # или /opt/serpmonn-relay
bash deploy/install.sh
```

`install.sh`: пользователь `serpmonn`, ключ `/etc/serpmonn/relay-identity.key`,
бинарник `/usr/local/bin/serpmonn-relay`, systemd unit.

Unit выдаёт `CAP_NET_BIND_SERVICE` для UDP/443 без root.

## Bootstrap multiaddrs

```bash
journalctl -u serpmonn-relay -n 30
```

Публичные адреса (WAN):
```
/dns4/relay.serpmonn.ru/tcp/443/wss/p2p/<PEERID>
/dns4/relay.serpmonn.ru/udp/443/quic-v1/p2p/<PEERID>
```

Клиент: path `/api/v1/sync`, без 4001/4002 в bootstrap.

## Firewall (пример)

```bash
iptables -I INPUT -i lo -p tcp --dport 4001 -j ACCEPT
iptables -I INPUT -i lo -p udp --dport 4001 -j ACCEPT
iptables -I INPUT -i lo -p tcp --dport 4002 -j ACCEPT
iptables -I INPUT -p tcp --dport 4001 -j DROP
iptables -I INPUT -p udp --dport 4001 -j DROP
iptables -I INPUT -p tcp --dport 4002 -j DROP
netfilter-persistent save
```

На роутере: проброс **TCP/443** и **UDP/443**; **не** пробрасывать 4001/4002.
