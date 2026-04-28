# Signers

How to sign events and encrypt/decrypt messages with different signer implementations.

## EventSigner Interface

All signers implement this interface:

```typescript
interface EventSigner {
  init(): Promise<void>
  getPubKey(): Promise<string> | string
  nip4Encrypt(content: string, key: string): Promise<string>
  nip4Decrypt(content: string, otherKey: string): Promise<string>
  nip44Encrypt(content: string, key: string): Promise<string>
  nip44Decrypt(content: string, otherKey: string): Promise<string>
  sign(ev: NostrEvent | NotSignedNostrEvent): Promise<NostrEvent>
  get supports(): Array<SignerSupports>
}
```

**`supports`** returns an array of capability strings like `"nip04"`, `"nip44"`.

## PrivateKeySigner

Signs events with a raw private key. Supports both NIP-04 and NIP-44 encryption.

### Constructor

```typescript
import { PrivateKeySigner } from '@snort/system'

// From hex string
const signer = new PrivateKeySigner('hex-private-key')

// From Uint8Array
const signer = new PrivateKeySigner(uint8ArrayKey)
```

### Static Methods

#### `PrivateKeySigner.random(): PrivateKeySigner`

Generate a new random keypair.

```typescript
const signer = PrivateKeySigner.random()
console.log(signer.getPubKey()) // hex pubkey
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `privateKey` | `string` | Hex-encoded private key |
| `supports` | `string[]` | `["nip04", "nip44"]` |

### Usage

```typescript
const signer = new PrivateKeySigner('private-key-hex')

// Get pubkey
const pubkey = signer.getPubKey()

// Sign an event
const signedEvent = await signer.sign(unsignedEvent)

// NIP-04 encryption (legacy)
const encrypted = await signer.nip4Encrypt('hello', 'recipient-pubkey')
const decrypted = await signer.nip4Decrypt(encrypted, 'sender-pubkey')

// NIP-44 encryption (recommended)
const encrypted = await signer.nip44Encrypt('hello', 'recipient-pubkey')
const decrypted = await signer.nip44Decrypt(encrypted, 'sender-pubkey')
```

## Nip7Signer

Uses the browser's `window.nostr` extension (NIP-07). Supports NIP-04 and optionally NIP-44 if the extension provides it.

```typescript
import { Nip7Signer } from '@snort/system'

const signer = new Nip7Signer()
const pubkey = await signer.getPubKey()
const signedEvent = await signer.sign(unsignedEvent)
```

All NIP-07 calls are queued via a work queue to prevent concurrent access issues.

### Checking Availability

```typescript
if ('nostr' in window) {
  const signer = new Nip7Signer()
  // safe to use
}
```

## Nip46Signer

Remote signer using NIP-46 (Nostr Connect). Supports both `bunker://` and `nostrconnect://` protocols.

> **Note:** `nip44Encrypt` and `nip44Decrypt` are delegated to the remote signer via NIP-46 requests. They are not implemented locally — the methods send encryption/decryption commands to the remote signer over the relay.

### Constructor

```typescript
import { Nip46Signer } from '@snort/system'

// bunker:// URL (remote-signer initiated)
const signer = new Nip46Signer('bunker://<remote-pubkey>?relay=wss://...&secret=abc')

// nostrconnect:// URL (client initiated)
const signer = new Nip46Signer('nostrconnect://<client-pubkey>?relay=wss://...&secret=abc&perms=...')

// With an inside signer (for nostrconnect:// flow)
const signer = new Nip46Signer('nostrconnect://...', insideSigner)
```

### Connection Flow

```typescript
const signer = new Nip46Signer('bunker://pubkey?relay=wss://relay.example.com')

// Listen for ready event
signer.on('ready', () => {
  console.log('NIP-46 connected!')
})

// Listen for OAuth redirect
signer.on('oauth', (url) => {
  window.open(url) // user needs to approve
})

// Initialize
await signer.init()
const pubkey = await signer.getPubKey()
```

### Events

| Event | Callback | Description |
|-------|----------|-------------|
| `oauth` | `(url: string) => void` | OAuth URL to redirect user to |
| `ready` | `() => void` | Connection established and authed |

### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `isBunker` | `boolean` | Whether this is a bunker:// connection |
| `relays` | `string[]` | Relay URLs for the connection |
| `privateKey` | `string \| undefined` | Local private key (for nostrconnect:// flow) |

### Additional Methods

#### `close(): Promise<boolean>`

Close the NIP-46 connection.

#### `describe(): Promise<string>`

Get the remote signer's supported methods.

#### `createAccount(name?: string, domain?: string, perms?: string): Promise<string>`

Create a new account on the remote signer. Returns the new pubkey.

## Nip55Signer

Android clipboard-based signer using NIP-55. Opens `nostrsigner:` URI scheme and reads response from clipboard.

```typescript
import { Nip55Signer } from '@snort/system'

const signer = new Nip55Signer()
const pubkey = await signer.getPubKey() // Opens Android signer app
```

**Timeout**: 120 seconds (`Nip55SignerTimeout`). Polls clipboard every 500ms while the document has focus.

## Helper Functions

### `decryptSigner(content: string, signer: EventSigner, otherKey?: string): Promise<string>`

Auto-detects encryption version and decrypts with the appropriate method.

```typescript
import { decryptSigner } from '@snort/system'

// Automatically uses NIP-04 or NIP-44 based on content format
const plaintext = await decryptSigner(encryptedContent, signer, otherPubkey)
```

## Encryption Details

### NIP-04 (`Nip4WebCryptoEncryptor`)

Legacy encryption using AES-CBC with a shared ECDH secret.

- Format: `base64(ciphertext)?iv=base64(iv)`
- Uses WebCrypto API
- Detectable by `?iv=` in the content string

### NIP-44 (`Nip44Encryptor`)

Modern encryption using the `nip44` library with versioned payloads.

- Supports v1 and v2 payload formats
- v2 uses authenticated encryption (MAC)
- Recommended over NIP-04 for all new applications

```typescript
import { Nip44Encryptor } from '@snort/system'

const enc = new Nip44Encryptor(privateKey, publicKey)
const encrypted = enc.encryptData('hello')
const decrypted = enc.decryptData(encrypted)
```

## See Also

- [Examples → Signers](/examples/signers)
