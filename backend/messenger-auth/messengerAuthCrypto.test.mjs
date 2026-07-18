import assert from 'assert';
import crypto from 'crypto';
import {
    deriveMessengerUserId,
    buildCanonicalString,
    verifyEd25519Detached
} from './messengerAuthCrypto.mjs';

function rawEd25519PublicKey(keyObject) {
    const der = keyObject.export({ type: 'spki', format: 'der' });
    return der.subarray(der.length - 32);
}

describe('messengerAuthCrypto', () => {
    it('deriveMessengerUserId matches sha256(signPub)[:32]', () => {
        const { publicKey } = crypto.generateKeyPairSync('ed25519');
        const raw = rawEd25519PublicKey(publicKey);
        const hex = raw.toString('hex');
        const expected = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
        assert.strictEqual(deriveMessengerUserId(hex), expected);
    });

    it('verifies Ed25519 detached signature over canonical string', () => {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        const signPubHex = rawEd25519PublicKey(publicKey).toString('hex');
        const canonical = buildCanonicalString({
            challengeId: '11111111-1111-1111-1111-111111111111',
            nonce: 'abcd',
            host: 'serpmonn.ru',
            exp: 1710000000
        });
        const signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKey);
        assert.strictEqual(
            verifyEd25519Detached({
                message: canonical,
                signatureHex: signature.toString('hex'),
                signPubHex
            }),
            true
        );
        assert.strictEqual(
            verifyEd25519Detached({
                message: canonical + 'x',
                signatureHex: signature.toString('hex'),
                signPubHex
            }),
            false
        );
    });
});
