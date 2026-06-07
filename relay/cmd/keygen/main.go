// keygen — одноразовая утилита генерации Ed25519 ключа для relay-узла.
//
// Использование:
//
//	sudo mkdir -p /etc/serpmonn
//	sudo ./keygen -out /etc/serpmonn/relay-identity.key
//	sudo chmod 600 /etc/serpmonn/relay-identity.key
//	sudo chown serpmonn:serpmonn /etc/serpmonn/relay-identity.key
//
// После генерации запустите relay — он выведет PeerID и multiaddr'ы.
// Скопируйте multiaddr'ы в DefaultBootstraps() в Serpmonn_messenger.
package main

import (
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"os"

	libcrypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
)

func main() {
	out := flag.String("out", "/etc/serpmonn/relay-identity.key",
		"Output path for the base64-encoded Ed25519 private key")
	flag.Parse()

	priv, pub, err := libcrypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		log.Fatalf("keygen: generate: %v", err)
	}

	raw, err := libcrypto.MarshalPrivateKey(priv)
	if err != nil {
		log.Fatalf("keygen: marshal: %v", err)
	}

	encoded := base64.StdEncoding.EncodeToString(raw)

	// Записываем ключ.
	if err := os.MkdirAll("/etc/serpmonn", 0700); err != nil {
		log.Printf("keygen: cannot create /etc/serpmonn: %v (trying current dir)", err)
	}
	if err := os.WriteFile(*out, []byte(encoded), 0600); err != nil {
		log.Fatalf("keygen: write %s: %v", *out, err)
	}

	// Выводим PeerID — нужно для DefaultBootstraps().
	pid, err := peer.IDFromPublicKey(pub)
	if err != nil {
		log.Fatalf("keygen: peer id: %v", err)
	}

	fmt.Printf("Key written to: %s\n", *out)
	fmt.Printf("PeerID:         %s\n", pid)
	fmt.Printf("\nAdd to DefaultBootstraps() in packages/go-core/net/bootstrap.go:\n")
	fmt.Printf("  \"/ip4/<SERVER_IP>/tcp/4001/p2p/%s\",\n", pid)
	fmt.Printf("  \"/ip4/<SERVER_IP>/udp/4001/quic-v1/p2p/%s\",\n", pid)
}
