#!/usr/bin/env bash
# Обновление Go-зависимостей relay под Dependabot.
#
# Важно: нельзя тянуть quic-go/@latest поверх старого go-libp2p — пакет
# github.com/quic-go/quic-go/logging удалён в новых релизах.
# Рабочий путь: поднять go-libp2p + kad-dht вместе, затем crypto/net/ipld.
set -euo pipefail
cd "$(dirname "$0")/../relay"
export GOTOOLCHAIN=auto

# Совместимый стек libp2p (quic-go >=0.54.1 закрывает CVE-2025-59530)
go get github.com/libp2p/go-libp2p@v0.48.0
go get github.com/libp2p/go-libp2p-kad-dht@v0.41.0
go get github.com/multiformats/go-multiaddr@v0.16.1

# Транзитивные security-пины
go get golang.org/x/crypto@v0.54.0
go get golang.org/x/net@v0.57.0
# ipld >=0.23.0 = CVE-2026-42328; не @latest (v0.24 требует лишний toolchain)
go get github.com/ipld/go-ipld-prime@v0.23.0

go mod tidy

echo "=== relay pins ==="
grep -E 'go 1\.|go-libp2p |kad-dht|quic-go v|webtransport|x/crypto |x/net |go-ipld-prime |pion/dtls|blake3' go.mod

echo "=== build check ==="
go build -o /tmp/serpmonn-relay-test .
echo "OK: relay builds"
