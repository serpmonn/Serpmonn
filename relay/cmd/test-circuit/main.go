// test-circuit — два клиента через live Circuit Relay v2 (reservation + dial).
//
// Использование (на сервере, без nginx):
//
//	./test-circuit -relay /ip4/127.0.0.1/tcp/4002/ws/p2p/12D3KooW...
package main

import (
	"context"
	"crypto/rand"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	libp2p "github.com/libp2p/go-libp2p"
	libcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	relayv2client "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/client"
	ma "github.com/multiformats/go-multiaddr"
)

const echoProto protocol.ID = "/serpmonn/test-circuit/1.0.0"

func main() {
	relayAddr := flag.String("relay", "", "Relay multiaddr with /p2p/<id>")
	flag.Parse()
	if *relayAddr == "" {
		fmt.Fprintln(os.Stderr, "Usage: test-circuit -relay /ip4/127.0.0.1/tcp/4002/ws/p2p/<PEERID>")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	maddr, err := ma.NewMultiaddr(*relayAddr)
	if err != nil {
		log.Fatalf("parse relay: %v", err)
	}
	relayInfo, err := peer.AddrInfoFromP2pAddr(maddr)
	if err != nil {
		log.Fatalf("addr info: %v", err)
	}

	listener, err := newClient("listener")
	if err != nil {
		log.Fatalf("listener: %v", err)
	}
	defer func() { _ = listener.Close() }()

	dialer, err := newClient("dialer")
	if err != nil {
		log.Fatalf("dialer: %v", err)
	}
	defer func() { _ = dialer.Close() }()

	got := make(chan string, 1)
	listener.SetStreamHandler(echoProto, func(s network.Stream) {
		defer s.Close()
		buf, err := io.ReadAll(s)
		if err != nil {
			log.Printf("listener read: %v", err)
			return
		}
		got <- string(buf)
	})

	log.Printf("listener connect+reserve...")
	if err := listener.Connect(ctx, *relayInfo); err != nil {
		log.Fatalf("listener→relay: %v", err)
	}
	if _, err := relayv2client.Reserve(ctx, listener, *relayInfo); err != nil {
		log.Fatalf("FAIL — reservation: %v", err)
	}
	fmt.Println("✓ reservation OK")

	circuit, err := ma.NewMultiaddr(fmt.Sprintf(
		"/p2p/%s/p2p-circuit/p2p/%s", relayInfo.ID, listener.ID()))
	if err != nil {
		log.Fatalf("circuit addr: %v", err)
	}
	ai := peer.AddrInfo{ID: listener.ID(), Addrs: []ma.Multiaddr{circuit}}

	log.Printf("dialer connect to relay, then circuit-dial listener...")
	if err := dialer.Connect(ctx, *relayInfo); err != nil {
		log.Fatalf("dialer→relay: %v", err)
	}
	if err := dialer.Connect(ctx, ai); err != nil {
		log.Fatalf("FAIL — circuit dial: %v", err)
	}
	fmt.Println("✓ circuit dial OK")

	s, err := dialer.NewStream(ctx, listener.ID(), echoProto)
	if err != nil {
		log.Fatalf("FAIL — new stream: %v", err)
	}
	payload := "hello-via-circuit"
	if _, err := s.Write([]byte(payload)); err != nil {
		log.Fatalf("FAIL — write: %v", err)
	}
	_ = s.Close()

	select {
	case msg := <-got:
		if msg != payload {
			log.Fatalf("FAIL — echo mismatch: %q", msg)
		}
		fmt.Println("✓ echo OK via circuit")
	case <-ctx.Done():
		log.Fatalf("FAIL — echo timeout: %v", ctx.Err())
	}
}

func newClient(name string) (host.Host, error) {
	priv, _, err := libcrypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return nil, err
	}
	h, err := libp2p.New(
		libp2p.Identity(priv),
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"),
		libp2p.DefaultTransports,
		libp2p.DefaultSecurity,
		libp2p.DefaultMuxers,
		libp2p.EnableRelay(),
		libp2p.ForceReachabilityPrivate(),
	)
	if err != nil {
		return nil, err
	}
	log.Printf("%s PeerID=%s", name, h.ID())
	return h, nil
}
