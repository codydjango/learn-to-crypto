const sodium = require('sodium-native')
const prompt = require('./prompt')
const runAsCli = (require.main.filename === module.filename)

// Create a new random keypair.
function createKeypair() {
    const publicKeyBuf = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
    const secretKeyBuf = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

    sodium.crypto_sign_keypair(publicKeyBuf, secretKeyBuf)

    return {
        public: publicKeyBuf.toString('hex'),
        secret: secretKeyBuf.toString('hex')
    }
}

// Sign a message using a secret key.
function sign(message, secret) {
    const secretBuf = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES, Buffer.from(secret, 'hex'))
    const messageBuf = Buffer.from(message)
    const signatureBuf = Buffer.alloc(sodium.crypto_sign_BYTES)

    sodium.crypto_sign_detached(signatureBuf, messageBuf, secretBuf)

    return signatureBuf.toString('hex')
}

if (runAsCli && (async () => {
    const { public, secret } = createKeypair()
    const message = await prompt('Message: ')
    const signature = sign(message, secret)

    console.log(`PublicKey: ${ public }`)
    console.log(`Signature: ${ signature }`)
})())

module.exports = sign
