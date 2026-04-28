# Event Builder & Publisher

How to build, sign, and publish Nostr events.

## EventBuilder

Fluent API for constructing events with optional proof-of-work.

### Constructor

```typescript
import { EventBuilder } from '@snort/system'

const eb = new EventBuilder()
```

### Methods

#### `kind(k: EventKind): this`

Set the event kind.

```typescript
eb.kind(EventKind.TextNote)
```

#### `content(c: string): this`

Set the event content.

```typescript
eb.content('Hello Nostr!')
```

#### `createdAt(n: number): this`

Set the `created_at` timestamp. Defaults to `unixNow()`.

#### `pubKey(k: string): this`

Set the pubkey. Automatically set by `buildAndSign()`.

#### `tag(t: string[]): this`

Add a tag. Deduplicates identical tags.

```typescript
eb.tag(['p', 'pubkey-hex'])
eb.tag(['e', 'event-id', 'wss://relay.example.com', 'reply'])
eb.tag(['t', 'bitcoin'])
eb.tag(['d', 'unique-identifier'])
```

#### `pow(target: number, miner?: PowMiner): this`

Set proof-of-work difficulty target. Optional custom miner function.

```typescript
eb.pow(20) // 20 bits of PoW
```

#### `jitter(n: number): this`

Add random jitter (0–n seconds) to `created_at`. Used in gift wraps to obscure timing.

```typescript
eb.jitter(86400) // up to 24h jitter
```

#### `processContent(): this`

Extract mentions and hashtags from content and add corresponding tags automatically.

```typescript
eb.content('Hello @npub1... and check out #bitcoin')
  .processContent()
// Automatically adds ["p", "..."] and ["t", "bitcoin"] tags
// Replaces @npub1... with nostr:nevent1... in content
```

#### `fromLink(link: NostrLink): void`

Populate builder from a NostrLink (sets kind, author, d-tag for addressable events). **Not chainable** — does not return `this`.

#### `build(): NostrEvent`

Build the unsigned event object. Throws if kind or pubkey is not set.

```typescript
const unsigned = eb.pubKey('pubkey').kind(1).content('hello').build()
```

#### `buildAndSign(pk: string | EventSigner): Promise<NostrEvent>`

Build and sign the event.

```typescript
// With private key string
const signed = await eb.kind(1).content('hello').buildAndSign('private-key-hex')

// With EventSigner
const signed = await eb.kind(1).content('hello').buildAndSign(signer)
```

### Static Properties

#### `EventBuilder.ClientTag: string[] | undefined`

Client tag attached to all events. Defaults to `["client", "snort_system"]`. Set to `undefined` to disable.

```typescript
EventBuilder.ClientTag = ["client", "my-app"]
```

## EventPublisher

High-level API for building and signing common event types. Wraps `EventBuilder` with a signer.

### Creating a Publisher

```typescript
import { EventPublisher } from '@snort/system'

// From private key
const publisher = EventPublisher.privateKey('hex-private-key')

// From NIP-07 browser extension (returns undefined if no extension available)
const publisher = await EventPublisher.nip7()

// From any EventSigner
const signer = new PrivateKeySigner('key')
const publisher = new EventPublisher(signer, signer.getPubKey())
```

### Proof-of-Work

```typescript
const powPublisher = publisher.pow(20) // Returns a copy with PoW enabled
```

### Text Notes

#### `note(msg: string, fnExtra?: EventBuilderHook): Promise<NostrEvent>`

Create a kind 1 text note. Automatically processes mentions and hashtags.

```typescript
const event = await publisher.note('Hello Nostr! #intro')
```

### Replies

#### `reply(replyTo: TaggedNostrEvent, msg: string, fnExtra?: EventBuilderHook): Promise<NostrEvent>`

Reply to an event. Uses kind 1 for kind 1 replies, kind 1111 (NIP-22 comment) otherwise.

```typescript
const reply = await publisher.reply(originalEvent, 'Great post!')
```

### Reactions

#### `react(evRef: NostrEvent, content?: string): Promise<NostrEvent>`

React to an event (kind 7). Default content is `"+"`.

```typescript
const like = await publisher.react(event)        // 👍 (default "+")
const dislike = await publisher.react(event, '-') // 👎
```

### Reposts

#### `repost(note: NostrEvent): Promise<NostrEvent>`

Repost an event (kind 6, NIP-18).

```typescript
const repost = await publisher.repost(originalEvent)
```

### Profile

#### `metadata(obj: UserMetadata): Promise<NostrEvent>`

Update user profile (kind 0).

```typescript
const profile = await publisher.metadata({
  name: 'kieran',
  about: 'Building stuff',
  picture: 'https://example.com/avatar.png',
  nip05: 'kieran@snort.social',
})
```

### Relay List

#### `relayList(relays: FullRelaySettings[] | Record<string, RelaySettings>): Promise<NostrEvent>`

Publish relay list (kind 10002, NIP-65).

```typescript
const event = await publisher.relayList({
  'wss://relay.snort.social': { read: true, write: true },
  'wss://nos.lol': { read: true, write: false },
})
```

### Contact List

#### `contactList(tags: [string, string][], relays?: Record<string, RelaySettings>): Promise<NostrEvent>`

Publish contact list (kind 3).

```typescript
const event = await publisher.contactList(
  [['p', 'pubkey1'], ['p', 'pubkey2']],
  { 'wss://relay.snort.social': { read: true, write: true } }
)
```

### Deletion

#### `delete(id: string): Promise<NostrEvent>`

Delete an event (kind 5, NIP-09).

```typescript
const deletion = await publisher.delete('event-id-to-delete')
```

### Zaps

#### `zap(amount: number, author: string, relays: string[], note?: NostrLink, msg?: string, fnExtra?: EventBuilderHook): Promise<NostrEvent>`

Create a zap request event (kind 9734, NIP-57). Amount is in **millisats**.

```typescript
const zapRequest = await publisher.zap(
  100000, // 100 sats in millisats
  'author-pubkey',
  ['wss://relay.snort.social'],
  NostrLink.fromEvent(targetEvent),
  'Great work!'
)
```

### Direct Messages

#### `sendDm(content: string, to: string): Promise<NostrEvent>`

Send a NIP-04 encrypted DM (kind 4).

```typescript
const dm = await publisher.sendDm('Secret message', 'recipient-pubkey')
```

#### `decryptDm(note: NostrEvent): Promise<string>`

Decrypt a DM. Supports both kind 4 (NIP-04) and kind 13 (sealed rumor).

```typescript
const plaintext = await publisher.decryptDm(dmEvent)
```

### Gift Wraps (NIP-59)

#### `giftWrap(inner: NostrEvent, explicitP?: string, powTarget?: number, powMiner?: PowMiner): Promise<NostrEvent>`

Wrap an event in a gift wrap (kind 1059) using an ephemeral key.

```typescript
const rumor = publisher.createUnsigned(
  EventKind.TextNote,
  'Secret message',
  eb => eb.tag(['p', 'recipient-pubkey'])
)
const sealed = await publisher.sealRumor(rumor, 'recipient-pubkey')
const giftWrap = await publisher.giftWrap(sealed)
```

#### `unwrapGift(gift: NostrEvent): Promise<NostrEvent>`

Unwrap a gift wrap event.

```typescript
const inner = await publisher.unwrapGift(giftWrapEvent)
```

### Sealed Rumors (NIP-59)

#### `sealRumor(inner: NotSignedNostrEvent, toKey: string): Promise<NostrEvent>`

Seal a rumor event (kind 13) with NIP-44 encryption.

#### `unsealRumor(inner: NostrEvent): Promise<NostrEvent>`

Unseal a sealed rumor.

### NIP-42 Auth

#### `nip42Auth(challenge: string, relay: string): Promise<NostrEvent>`

Create an auth event for relay authentication (kind 22242).

```typescript
const authEvent = await publisher.nip42Auth('challenge-string', 'wss://relay.example.com')
```

### Lists (NIP-51)

#### `muted(pub: string[], priv: string[]): Promise<NostrEvent>`

Create mute list (kind 10000). Private mutes are NIP-44 encrypted in the content.

```typescript
const muteList = await publisher.muted(
  ['pubkey1', 'pubkey2'], // public mute list
  ['pubkey3']              // private (encrypted) mute list
)
```

#### `pinned(notes: ToNostrEventTag[]): Promise<NostrEvent>`

Create pin list (kind 10001).

#### `bookmarks(notes: ToNostrEventTag[]): Promise<NostrEvent>`

Create bookmarks list (kind 10003).

### App Data (NIP-78)

#### `appData(data: object, id: string): Promise<NostrEvent>`

Store encrypted app data (kind 30078).

```typescript
const appDataEvent = await publisher.appData(
  { theme: 'dark', lastRead: Date.now() },
  'my-app-settings'
)
```

### Generic Events

#### `generic(fnHook: EventBuilderHook): Promise<NostrEvent>`

Build any event type with a custom hook.

```typescript
const custom = await publisher.generic(eb => {
  eb.kind(31990 as EventKind) // Custom kind
  eb.content('Custom content')
  eb.tag(['d', 'my-custom-event'])
})
```

## See Also

- [Examples → Event Builder & Publisher](/examples/events)
