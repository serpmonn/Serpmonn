// selftest — запускает relay внутри процесса и проверяет reservation.
// Используется для CI и локального теста без реального сервера.
package main

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"os"
	"time"

	dht "github.com/libp2p/go-libp2p-kad-dht"
	libp2p "github.com/libp2p/go-libp2p"
	libcrypto "github.com/libp2p/go-libp2p/core/crypto"
	relayv2client "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/client"
	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// --- Relay node ---
	relayPriv, _, err := libcrypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		log.Fatalf("relay key: %v", err)
	}
	relayHost, err := libp2p.New(
		libp2p.Identity(relayPriv),
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"),
		libp2p.DefaultTransports,
		libp2p.DefaultSecurity,
		libp2p.DefaultMuxers,
		libp2p.ForceReachabilityPublic(),
	)
	if err != nil {
		log.Fatalf("relay host: %v", err)
	}
	defer func() { _ = relayHost.Close() }()

	_, err = relayv2.New(relayHost, relayv2.WithResources(relayv2.Resources{
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
	}))
	if err != nil {
		log.Fatalf("relay v2: %v", err)
	}

	kad, err := dht.New(ctx, relayHost, dht.Mode(dht.ModeServer), dht.BootstrapPeers())
	if err != nil {
		log.Fatalf("dht: %v", err)
	}
	defer func() { _ = kad.Close() }()
	if err := kad.Bootstrap(ctx); err != nil {
		log.Fatalf("dht bootstrap: %v", err)
	}

	relayInfo := relayHost.Peerstore().PeerInfo(relayHost.ID())
	relayInfo.Addrs = relayHost.Addrs()
	log.Printf("Relay PeerID: %s", relayHost.ID())
	log.Printf("Relay Addrs:  %v", relayHost.Addrs())

	// --- Client node ---
	clientPriv, _, err := libcrypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		log.Fatalf("client key: %v", err)
	}
	clientHost, err := libp2p.New(
		libp2p.Identity(clientPriv),
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"),
		libp2p.DefaultTransports,
		libp2p.DefaultSecurity,
		libp2p.DefaultMuxers,
		libp2p.EnableRelay(),
	)
	if err != nil {
		log.Fatalf("client host: %v", err)
	}
	defer func() { _ = clientHost.Close() }()

	// Подключаемся к relay
	if err := clientHost.Connect(ctx, relayInfo); err != nil {
		log.Fatalf("connect to relay: %v", err)
	}
	log.Printf("Client connected to relay")

	// Reservation
	resv, err := relayv2client.Reserve(ctx, clientHost, relayInfo)
	if err != nil {
		log.Fatalf("FAIL — reservation: %v", err)
		os.Exit(1)
	}

	fmt.Printf("✓ reservation OK\n")
	fmt.Printf("  Relay PeerID:  %s\n", relayHost.ID())
	fmt.Printf("  Client PeerID: %s\n", clientHost.ID())
	for _, a := range resv.Addrs {
		fmt.Printf("  Relay addr:    %s\n", a)
	}
	fmt.Printf("  Expires:       %s\n", resv.Expiration.Format(time.RFC3339))
}
