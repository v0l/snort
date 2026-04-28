# NIP Implementations

Built-in NIP (Nostr Implementation Possibility) implementations in `@snort/system`.

## NIP-04 — Encrypted Direct Messages

Legacy encrypted messaging using AES-CBC.

### `Nip4WebCryptoEncryptor`

```typescript
import { Nip4WebCryptoEncryptor } from '@snort/system'

const enc = new Nip4WebCryptoEncryptor(privateKey, publicKey)
const encrypted = await enc.encryptData('Hello!')
const decrypted = await enc.decryptData(encrypted)
```

**Format**: `base64(ciphertext)?iv=base64(iv)`

**Note**: NIP-04 is deprecated in favor of NIP-44. Use only for backwards compatibility.

## NIP-07 — Browser Extension Signer

Signs events via `window.nostr` browser extension.

### `Nip7Signer`

```typescript
import { Nip7Signer } from '@snort/system'

const signer = new Nip7Signer()
const pubkey = await signer.getPubKey()
const signed = await signer.sign(unsignedEvent)
const encrypted = await signer.nip4Encrypt('hello', 'other-pubkey')
```

Supports `nip04` and `nip44` if the extension provides them.

## NIP-09 — Event Deletion

Handled via `EventPublisher`:

```typescript
const deletion = await publisher.delete('event-id-to-delete')
```

## NIP-10 — Thread Markers

Utilities for thread construction and parsing.

### `Nip10.replyTo(ev, eb)`

Add correct `e`/`a` tags for a reply, following NIP-10 markers.

```typescript
import { Nip10 } from '@snort/system'

const eb = new EventBuilder()
Nip10.replyTo(originalEvent, eb)
eb.content('Reply text')
```

### `Nip10.parseThread(ev: NostrEvent): Thread | undefined`

Parse thread structure from an event's tags.

```typescript
const thread = Nip10.parseThread(event)
if (thread) {
  console.log('Root:', thread.root)
  console.log('Reply to:', thread.replyTo)
  console.log('Mentions:', thread.mentions)
  console.log('Pubkeys:', thread.pubKeys)
}
```

### `Nip10.linkToTag(link: NostrLink, scope?: LinkScope): string[]`

Convert a `NostrLink` to an event tag with proper NIP-10 markers.

```typescript
const tag = Nip10.linkToTag(link, LinkScope.Root)
// ["e", "event-id", "wss://relay.example.com", "root"]
```

### `Nip10.scopeToMarker(scope?: LinkScope): string | undefined`

Convert a `LinkScope` to a NIP-10 marker string.

## NIP-11 — Relay Information Document

Relay info is automatically fetched when connecting.

```typescript
const conn = System.pool.getConnection('wss://relay.example.com')
console.log(conn.info?.name)
console.log(conn.info?.supported_nips)
console.log(conn.info?.software)
console.log(conn.info?.limitation?.max_subscriptions)
```

### `RelayInfoDocument`

```typescript
interface RelayInfoDocument {
  name?: string
  description?: string
  pubkey?: string
  contact?: string
  supported_nips?: number[]
  software?: string
  version?: string
  limitation?: {
    payment_required?: boolean
    max_subscriptions?: number
    max_filters?: number
    max_event_tags?: number
    auth_required?: boolean
    write_restricted?: boolean
  }
  relay_countries?: string[]
  language_tags?: string[]
  tags?: string[]
  posting_policy?: string
  negentropy?: number
}
```

### `Nip11.loadRelayDocument(url: string): Promise<RelayInfoDocument | undefined>`

Manually load a relay's NIP-11 document.

```typescript
import { Nip11 } from '@snort/system'

const info = await Nip11.loadRelayDocument('wss://relay.example.com')
```

## NIP-18 — Reposts

Handled via `EventPublisher`:

```typescript
const repost = await publisher.repost(originalEvent)
```

## NIP-22 — Comments

Replies to non-kind-1 events use kind 1111 comments.

```typescript
import { Nip22 } from '@snort/system'

// Handled automatically by EventPublisher.reply()
// Kind 1 replies → kind 1
// Other replies → kind 1111
const comment = await publisher.reply(articleEvent, 'Great article!')
```

### `Nip22.replyTo(other: TaggedNostrEvent, eb: EventBuilder): void`

Add correct `e`/`a` tags for a comment reply, following NIP-22 markers.

### `Nip22.parseThread(ev: NostrEvent): Thread | undefined`

Parse thread structure from a comment event's tags.

### `Nip22.fromLinks(links: NostrLink[], ev: NostrEvent): void`

Add reply tags from links to an event builder.

## NIP-25 — Reactions

### `Nip25.reactToEvent(ev): string[]`

Create the reaction tag for an event.

```typescript
import { Nip25 } from '@snort/system'

const tag = Nip25.reactToEvent(event)
// ["e", "event-id", "relay-hint", "pubkey"] for regular events
// ["a", "30023:pubkey:d-tag", "relay-hint", "pubkey"] for addressable events
```

Handled via `EventPublisher`:

```typescript
const reaction = await publisher.react(event, '+')
```

## NIP-42 — Relay Authentication

Handled via `EventPublisher` and system events:

```typescript
// Automatic auth handling
System.on('auth', async (challenge, relay, cb) => {
  const auth = await publisher.nip42Auth(challenge, relay)
  cb(auth)
})
```

## NIP-44 — Encryption

Modern encryption for Nostr. Supports v1 and v2 payload formats.

### `Nip44Encryptor`

```typescript
import { Nip44Encryptor } from '@snort/system'

const enc = new Nip44Encryptor(privateKey, publicKey)
const encrypted = enc.encryptData('Hello!')
const decrypted = enc.decryptData(encrypted)
```

**Recommended** over NIP-04 for all new applications.

## NIP-46 — Nostr Connect (Remote Signer)

Remote signing via relay communication.

### `Nip46Signer`

See [Signers](/packages/system/signers) for full documentation.

```typescript
import { Nip46Signer } from '@snort/system'

const signer = new Nip46Signer('bunker://pubkey?relay=wss://...')
await signer.init()
```

## NIP-55 — Android Signer

Clipboard-based signing for Android apps.

### `Nip55Signer`

See [Signers](/packages/system/signers) for full documentation.

## NIP-57 — Lightning Zaps

### `parseZap(zapReceipt: NostrEvent): ParsedZap`

Parse a zap receipt event (kind 9735) into a structured object.

```typescript
import { parseZap } from '@snort/system'

const zap = parseZap(zapReceiptEvent)
console.log(zap.amount)      // sats
console.log(zap.sender)      // sender pubkey
console.log(zap.receiver)    // receiver pubkey
console.log(zap.valid)       // whether zap is valid
console.log(zap.content)     // zap message
console.log(zap.anonZap)     // anonymous zap
console.log(zap.event)       // linked event
console.log(zap.errors)      // validation errors
```

### `ParsedZap`

```typescript
interface ParsedZap {
  id: string
  zapService: string
  amount: number
  event?: NostrLink
  sender?: string
  receiver?: string
  valid: boolean
  anonZap: boolean
  content?: string
  errors: string[]
  pollOption?: number
  targetEvents: NostrLink[]
  created_at: number
}
```

Create zap requests via `EventPublisher`:

```typescript
const zapRequest = await publisher.zap(
  100000, // millisats
  'author-pubkey',
  ['wss://relay.snort.social'],
  NostrLink.fromEvent(targetEvent),
  'Zap message'
)
```

## NIP-59 — Gift Wraps & Sealed Rumors

Private messaging with sealed sender.

```typescript
// Create and send a gift wrap
const rumor = publisher.createUnsigned(
  EventKind.TextNote,
  'Private message',
  eb => eb.tag(['p', 'recipient-pubkey'])
)
const sealed = await publisher.sealRumor(rumor, 'recipient-pubkey')
const giftWrap = await publisher.giftWrap(sealed)

// Unwrap a received gift wrap
const inner = await publisher.unwrapGift(giftWrap)
const unsealed = await publisher.unsealRumor(inner)
```

## NIP-65 — Relay List

Publish and read relay lists (kind 10002).

```typescript
// Publish
const event = await publisher.relayList({
  'wss://relay.snort.social': { read: true, write: true },
})

// Parse relay tags from events
import { parseRelayTags, parseRelaysFromKind } from '@snort/system'
const relays = parseRelayTags(event.tags)
```

## NIP-90 — Data Vending Machine

Kind 5900-5970 event support. Data Vending Machine jobs.

## NIP-92 — Media Attachments

Media attachment metadata parsing (kind 1063 file headers).

## NIP-94 — File Metadata

File header events with IMeta tags.

## NIP-98 — HTTP Authentication

HTTP auth event creation:

```typescript
// Kind 27235 events for HTTP authentication
```

## See Also

- [Examples → NIP Implementations](/examples/nips)
