// test-reservation — тест Circuit Relay v2 reservation.
//
// Создаёт временный libp2p-пир, подключается к relay-ноде и проверяет,
// что reservation проходит успешно.
//
// Использование:
//
//	./test-reservation -relay /ip4/1.2.3.4/tcp/4001/p2p/12D3KooW...
//
// Успех: "✓ reservation OK" + relay addr
// Ошибка: ненулевой exit code + описание
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	libp2p "github.com/libp2p/go-libp2p"
	libcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
	ma "github.com/multiformats/go-multiaddr"

	"crypto/rand"

	relayv2client "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/client"
)

func main() {
	relayAddr := flag.String("relay", "", "Relay multiaddr, e.g. /ip4/1.2.3.4/tcp/4001/p2p/12D3KooW...")
	flag.Parse()

	if *relayAddr == "" {
		fmt.Fprintln(os.Stderr, "Usage: test-reservation -relay /ip4/<IP>/tcp/<PORT>/p2p/<PEERID>")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Генерируем временный ключ для тестового пира.
	priv, _, err := libcrypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		log.Fatalf("keygen: %v", err)
	}

	h, err := libp2p.New(
		libp2p.Identity(priv),
		libp2p.ListenAddrStrings(
			"/ip4/0.0.0.0/tcp/0",
			"/ip4/0.0.0.0/udp/0/quic-v1",
		),
		libp2p.DefaultTransports,
		libp2p.DefaultSecurity,
		libp2p.DefaultMuxers,
		libp2p.EnableRelay(),
	)
	if err != nil {
		log.Fatalf("libp2p: %v", err)
	}
	defer func() { _ = h.Close() }()

	// Парсим relay multiaddr.
	maddr, err := ma.NewMultiaddr(*relayAddr)
	if err != nil {
		log.Fatalf("parse relay addr %q: %v", *relayAddr, err)
	}
	relayInfo, err := peer.AddrInfoFromP2pAddr(maddr)
	if err != nil {
		log.Fatalf("addr info: %v", err)
	}

	// Подключаемся к relay.
	log.Printf("Connecting to relay %s ...", relayInfo.ID)
	if err := h.Connect(ctx, *relayInfo); err != nil {
		log.Fatalf("connect to relay: %v", err)
	}
	log.Printf("Connected. Requesting reservation...")

	// Запрашиваем reservation.
	resv, err := relayv2client.Reserve(ctx, h, *relayInfo)
	if err != nil {
		log.Fatalf("FAIL — reservation: %v", err)
	}

	fmt.Printf("✓ reservation OK\n")
	fmt.Printf("  Relay:      %s\n", relayInfo.ID)
	fmt.Printf("  Our PeerID: %s\n", h.ID())
	for _, a := range resv.Addrs {
		fmt.Printf("  Relay addr: %s\n", a)
	}
	fmt.Printf("  Expires:    %s\n", resv.Expiration.Format(time.RFC3339))
}
