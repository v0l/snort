# @snort/shared

Common utilities shared across the Snort ecosystem.

## Installation

```bash
bun add @snort/shared
```

## Key Management

### `getPublicKey(privKey: string | Uint8Array): string`

Derive a public key from a private key.

```typescript
import { getPublicKey } from '@snort/shared'

const pubkey = getPublicKey('hex-private-key')
```

### `sha256(data: string | Uint8Array): string`

Compute SHA-256 hash.

```typescript
import { sha256 } from '@snort/shared'

const hash = sha256('hello world')
```

## Bech32 Encoding

### `hexToBech32(hrp: string, id?: string): string`

Encode hex data to bech32.

```typescript
import { hexToBech32 } from '@snort/shared'

const npub = hexToBech32('npub', 'hex-pubkey')
const note = hexToBech32('note', 'hex-event-id')
```

### `bech32ToHex(str: string): string`

Decode bech32 to hex.

```typescript
const hex = bech32ToHex('npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws')
```

### `bech32ToText(str: string): string`

Decode bech32 to UTF-8 text.

## TLV Encoding

### `encodeTLV(prefix: string, id: Uint8Array, relays?: string[], kind?: number, author?: string): string`

Encode TLV data into a bech32 string (used for nprofile, nevent, naddr).

### `decodeTLV(str: string): TLVEntry[]`

Decode TLV entries from a bech32 string.

### `TLVEntryType`

```typescript
enum TLVEntryType {
  Special = 0,  // The entity ID
  Relay = 1,    // Relay hint
  Author = 2,   // Author pubkey
  Kind = 3,     // Event kind
}
```

## NostrPrefix

```typescript
enum NostrPrefix {
  PublicKey = "npub",
  PrivateKey = "nsec",
  Note = "note",
  Profile = "nprofile",
  Event = "nevent",
  Relay = "nrelay",
  Address = "naddr",
}
```

## NIP-05

### `fetchNip05Pubkey(name: string, domain: string, timeout?: number): Promise<string | undefined>`

Resolve a NIP-05 identifier to a hex pubkey.

```typescript
import { fetchNip05Pubkey } from '@snort/shared'

const pubkey = await fetchNip05Pubkey('kieran', 'snort.social')
```

### `fetchNostrAddress(name: string, domain: string, timeout?: number): Promise<NostrJson | undefined>`

Fetch full NIP-05 JSON document.

### `fetchNip05PubkeyWithThrow(name: string, domain: string, timeout?: number): Promise<string>`

Same as `fetchNip05Pubkey` but throws on error.

## LNURL

### `LNURL`

LNURL-pay client implementation.

```typescript
import { LNURL } from '@snort/shared'

// From lightning address
const svc = new LNURL('kieran@snort.social')

// From lnurl bech32
const svc = new LNURL('lnurl1...')

// Load service info
await svc.load()

// Check capabilities
svc.canZap        // boolean
svc.min           // min millisats
svc.max           // max millisats
svc.maxCommentLength
svc.zapperPubkey

// Get invoice
const invoice = await svc.getInvoice(100, 'Zap comment', zapRequestEvent)
console.log(invoice.pr) // bolt11 invoice
```

### `LNURLService`

```typescript
interface LNURLService {
  tag: string
  nostrPubkey?: string
  minSendable?: number
  maxSendable?: number
  metadata: string
  callback: string
  commentAllowed?: number
}
```

## Invoice Decoding

### `decodeInvoice(pr: string): InvoiceDetails | undefined`

Decode a bolt11 Lightning invoice.

```typescript
import { decodeInvoice } from '@snort/shared'

const details = decodeInvoice('lnbc1000...')
console.log(details?.amount)       // millisats
console.log(details?.description)  // payment description
console.log(details?.expired)      // boolean
console.log(details?.paymentHash)  // hex
console.log(details?.timestamp)    // unix timestamp
```

### `InvoiceDetails`

```typescript
interface InvoiceDetails {
  amount?: number
  expire?: number
  timestamp?: number
  description?: string
  descriptionHash?: string
  paymentHash?: string
  expired: boolean
  pr: string
}
```

## Utility Functions

### `unixNow(): number`

Current Unix timestamp in seconds.

### `unixNowMs(): number`

Current Unix timestamp in milliseconds.

### `unwrap<T>(v: T | undefined | null): T`

Throw if value is null/undefined, otherwise return it.

### `sanitizeRelayUrl(url: string): string | undefined`

Normalize a relay URL.

### `dedupe<T>(v: T[]): T[]`

Remove duplicates from array.

### `appendDedupe<T>(a?: T[], b?: T[]): T[]`

Concat two arrays and deduplicate.

### `dedupeBy<T>(v: T[], mapper: (x: T) => string): T[]`

Deduplicate by a key function.

### `removeUndefined<T>(v: (T | undefined)[]): T[]`

Filter out undefined values.

### `deepClone<T>(obj: T): T`

Deep clone an object.

### `deepEqual(x: any, y: any): boolean`

Deep equality check.

### `isHex(s?: string): boolean`

Check if a string is valid hex.

### `isOffline(): boolean`

Check if the browser is offline.

### `normalizeReaction(content: string): Reaction`

Normalize reaction content to `+` or `-`.

```typescript
import { normalizeReaction, Reaction } from '@snort/shared'

normalizeReaction('👍') // Reaction.Positive
normalizeReaction('👎') // Reaction.Negative
normalizeReaction('+')  // Reaction.Positive
```

## FeedCache

Base cache class with optional persistent storage. See [Caching](/packages/system/caching) for full documentation.

## CacheStore

Interface for persistent storage backends.

```typescript
interface CacheStore<T> {
  get(key: string): Promise<T | undefined>
  bulkGet(keys: string[]): Promise<T[]>
  put(obj: T): Promise<void>
  bulkPut(obj: T[]): Promise<void>
  delete(key: string): Promise<void>
  bulkDelete(keys: string[]): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}
```

## ExternalStore

React-like external store for subscribing to state changes.

## WorkQueue

Simple work queue for serializing async operations.

### `WorkQueueItem`

```typescript
interface WorkQueueItem {
  next: () => Promise<void>
  resolve: (value: any) => void
  reject: (reason?: any) => void
}
```

### `processWorkQueue(queue?: WorkQueueItem[], queueDelay?: number): void`

Start processing a work queue. Default delay is 200ms.

### `barrierQueue<T>(queue: WorkQueueItem[], fn: () => Promise<T>): Promise<T>`

Execute a function exclusively (one at a time per queue).

## SortedMap

A map that maintains sorted order by key.

## ImgProxy

URL builder for ImgProxy image resizing service.

### `ImgProxySettings`

```typescript
interface ImgProxySettings {
  url: string
  key: string
  salt: string
}
```

### `DefaultImgProxy`

Default ImgProxy settings object.

### `proxyImg(url: string, settings?: ImgProxySettings, resize?: number, sha256?: string): string`

Generate a proxied/resized image URL.

```typescript
import { proxyImg, DefaultImgProxy } from '@snort/shared'

// Using default settings
const url = proxyImg('https://example.com/image.jpg', DefaultImgProxy, 200)

// Without settings, returns the original URL
const original = proxyImg('https://example.com/image.jpg')
```

## See Also

- [Examples → Shared Utilities](/examples/shared)
