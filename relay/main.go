// relay/main.go — Serpmonn bootstrap + Circuit Relay v2 daemon.
//
// Один процесс совмещает:
//   - DHT server mode (kademlia) — помогает клиентам войти в сеть и найти
//     друг друга через DHT. Это «bootstrap peer».
//   - Circuit Relay v2 server — обязательный fallback для клиентов за NAT
//     операторов (мобильный NAT, CGNAT), когда прямой dial невозможен.
//
// Identity (PeerID):
//   Ключи генерируются утилитой keygen (см. cmd/keygen) один раз,
//   сохраняются в /etc/serpmonn/relay-identity.key (вне репозитория).
//   При каждом запуске daemon читает ключ оттуда → PeerID постоянный.
//
// Лимиты Circuit Relay v2 (MVP):
//   - MaxReservations: 1024 (одновременные слоты)
//   - MaxCircuits: 512 (одновременные проксируемые соединения)
//   - BufferSize: 4096 байт — дефолт libp2p, не ограничиваем
//   - Limit по трафику: не устанавливаем (nil)
//
// Транспорт: TCP + QUIC-v1 на 4001. Оба нужны: QUIC оптимальнее,
// но некоторые мобильные сети блокируют UDP — TCP как fallback.
package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	libp2p "github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	libcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	ma "github.com/multiformats/go-multiaddr"
	"github.com/libp2p/go-libp2p/p2p/net/connmgr"
	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
)

func main() {
	keyFile  := flag.String("key", "/etc/serpmonn/relay-identity.key",
		"Path to Ed25519 private key file (base64-encoded)")
	port     := flag.Int("port", 4001, "TCP/UDP port to listen on")
	announce := flag.String("announce", "",
		"Public IP to announce (e.g. 188.235.13.20); leave empty if server has a direct public IP")
	flag.Parse()

	ctx, cancel := signal.NotifyContext(context.Background(),
		os.Interrupt, syscall.SIGTERM)
	defer cancel()

	priv, err := loadOrCreateKey(*keyFile)
	if err != nil {
		log.Fatalf("relay: key: %v", err)
	}

	connMgr, err := connmgr.NewConnManager(100, 2000,
		connmgr.WithGracePeriod(60*time.Second))
	if err != nil {
		log.Fatalf("relay: connmgr: %v", err)
	}

	// Опции libp2p — базовые.
	opts := []libp2p.Option{
		libp2p.Identity(priv),
		// TCP + QUIC: оба транспорта на одном порту.
		libp2p.ListenAddrStrings(
			fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", *port),
			fmt.Sprintf("/ip6/::/tcp/%d", *port),
			fmt.Sprintf("/ip4/0.0.0.0/udp/%d/quic-v1", *port),
			fmt.Sprintf("/ip6/::/udp/%d/quic-v1", *port),
		),
		libp2p.DefaultTransports,
		libp2p.DefaultSecurity,
		libp2p.DefaultMuxers,
		libp2p.ConnectionManager(connMgr),
		libp2p.DisableMetrics(),
		libp2p.ForceReachabilityPublic(),
	}

	// Если указан -announce — подменяем исходящие адреса публичным IP.
	// Это нужно когда сервер за NAT (напр. MikroTik): libp2p слушает 0.0.0.0,
	// но в DHT и клиентам объявляет внешний IP.
	if *announce != "" {
		if net.ParseIP(*announce) == nil {
			log.Fatalf("relay: -announce: invalid IP address %q", *announce)
		}
		p   := *port
		pub := *announce
		opts = append(opts, libp2p.AddrsFactory(func(addrs []ma.Multiaddr) []ma.Multiaddr {
			return []ma.Multiaddr{
				ma.StringCast(fmt.Sprintf("/ip4/%s/tcp/%d", pub, p)),
				ma.StringCast(fmt.Sprintf("/ip4/%s/udp/%d/quic-v1", pub, p)),
			}
		}))
		log.Printf("relay: announcing public IP %s port %d", pub, p)
	}

	h, err := libp2p.New(opts...)
	if err != nil {
		log.Fatalf("relay: libp2p.New: %v", err)
	}
	defer func() { _ = h.Close() }()

	// Circuit Relay v2 — сервер.
	relayLimits := relayv2.Resources{
		ReservationTTL:         time.Hour,
		MaxReservations:        1024,
		MaxCircuits:            512,
		MaxReservationsPerPeer: 8,
		MaxReservationsPerIP:   16,
		MaxReservationsPerASN:  32,
		Limit: &relayv2.RelayLimit{
			Duration: 24 * time.Hour,
			Data:     0,
		},
	}

	_, err = relayv2.New(h, relayv2.WithResources(relayLimits))
	if err != nil {
		log.Fatalf("relay: circuit relay v2: %v", err)
	}

	// DHT server mode.
	kad, err := dht.New(ctx, h,
		dht.Mode(dht.ModeServer),
		dht.BootstrapPeers(),
	)
	if err != nil {
		log.Fatalf("relay: dht: %v", err)
	}
	defer func() { _ = kad.Close() }()

	if err := kad.Bootstrap(ctx); err != nil {
		log.Fatalf("relay: dht bootstrap: %v", err)
	}

	printAddrs(h, *port)

	log.Println("relay: running — waiting for connections")
	<-ctx.Done()
	log.Println("relay: shutdown")
}

func loadOrCreateKey(path string) (libcrypto.PrivKey, error) {
	data, err := os.ReadFile(path)
	if err == nil {
		raw, err := base64.StdEncoding.DecodeString(string(data))
		if err != nil {
			return nil, fmt.Errorf("decode key %s: %w", path, err)
		}
		priv, err := libcrypto.UnmarshalPrivateKey(raw)
		if err != nil {
			return nil, fmt.Errorf("unmarshal key %s: %w", path, err)
		}
		log.Printf("relay: loaded key from %s", path)
		return priv, nil
	}
	if !os.IsNotExist(err) {
		return nil, fmt.Errorf("read key %s: %w", path, err)
	}
	log.Printf("relay: key file %s not found — generating new Ed25519 key", path)
	priv, _, err := libcrypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}
	raw, err := libcrypto.MarshalPrivateKey(priv)
	if err != nil {
		return nil, fmt.Errorf("marshal key: %w", err)
	}
	encoded := base64.StdEncoding.EncodeToString(raw)
	if err := os.MkdirAll("/etc/serpmonn", 0700); err != nil {
		log.Printf("relay: cannot create /etc/serpmonn (%v), saving key to ./relay-identity.key", err)
		path = "relay-identity.key"
	}
	if err := os.WriteFile(path, []byte(encoded), 0600); err != nil {
		return nil, fmt.Errorf("write key %s: %w", path, err)
	}
	log.Printf("relay: new key written to %s", path)
	return priv, nil
}

func printAddrs(h host.Host, port int) {
	pid := h.ID()
	log.Printf("relay: PeerID = %s", pid)
	log.Printf("relay: Multiaddrs (put these in DefaultBootstraps):")
	for _, a := range h.Addrs() {
		log.Printf("  %s/p2p/%s", a, pid)
	}
	log.Printf("relay: If behind NAT, use /ip4/<PUBLIC_IP>/tcp/%d/p2p/%s", port, pid)
	log.Printf("relay: If behind NAT, use /ip4/<PUBLIC_IP>/udp/%d/quic-v1/p2p/%s", port, pid)
}