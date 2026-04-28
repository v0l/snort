# NostrLink

Parsing, encoding, and working with NIP-19 entity links.

## NostrLink Class

A `NostrLink` represents a reference to a Nostr entity (event, profile, address, etc.) following [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md).

### Constructor

```typescript
new NostrLink(
  type: NostrPrefix,
  id: string,
  kind?: number,
  author?: string,
  relays?: string[],
  scope?: LinkScope | string,
)
```

### LinkScope

```typescript
enum LinkScope {
  Root = "root",      // Root of a thread
  Reply = "reply",    // Reply target
  Mention = "mention", // Mentioned without replying
  Quote = "quote",     // Quoted event
}
```

## Static Factories

### `NostrLink.fromEvent(ev: NostrEvent | TaggedNostrEvent): NostrLink`

Create a link from any event. Returns `naddr` for parameterized replaceable events (kind 30000-39999), `nevent` otherwise.

```typescript
const link = NostrLink.fromEvent(event)
```

### `NostrLink.profile(pk: string, relays?: string[]): NostrLink`

Create a profile link.

```typescript
const link = NostrLink.profile('hex-pubkey', ['wss://relay.example.com'])
```

### `NostrLink.publicKey(pk: string, relays?: string[]): NostrLink`

Create a pubkey link (npub, not nprofile).

### `NostrLink.fromTag(tag: string[], author?: string, kind?: number): NostrLink`

Parse from an event tag (`e`, `p`, `a` tags).

```typescript
// e tag: ["e", "event-id", "wss://relay", "reply"]
const link = NostrLink.fromTag(['e', 'event-id', 'wss://relay.example.com', 'reply'])

// p tag: ["p", "pubkey", "wss://relay"]
const link = NostrLink.fromTag(['p', 'pubkey', 'wss://relay.example.com'])

// a tag: ["a", "30023:pubkey:identifier", "wss://relay"]
const link = NostrLink.fromTag(['a', '30023:pubkey:my-article', 'wss://relay.example.com'])
```

Uppercase tags (`E`, `A`, `P`) are treated as root-scoped (NIP-10).

### `NostrLink.fromAllTags(tags: string[][]): Array<ToNostrEventTag>`

Parse all recognized tags from a tag array, including `UnknownTag` for unrecognized tags. Returns a mix of `NostrLink`, `NostrHashtagLink`, and `UnknownTag` objects.

### `NostrLink.fromTags(tags: string[][]): NostrLink[]`

Parse all recognized tags from a tag array.

### `NostrLink.replyTags(tags: string[][]): NostrLink[]`

Get only reply tags (`e` and `a`).

### `NostrLink.tryFromTag(tag: string[], author?: string, kind?: number): NostrLink | undefined`

Same as `fromTag` but returns `undefined` instead of throwing.

## Methods

### `encode(type?: NostrPrefix): string`

Encode to a NIP-19 bech32 string.

```typescript
const link = NostrLink.fromEvent(event)

link.encode()                          // nevent1... or naddr1...
link.encode(NostrPrefix.Note)          // note1...
link.encode(NostrPrefix.Event)         // nevent1...
```

### `toEventTag(): string[] | undefined`

Convert to an event tag using NIP-10 formatting.

```typescript
const tag = link.toEventTag()
// ["e", "event-id", "wss://relay.example.com", "reply"]
```

### `matchesEvent(ev: NostrEvent): boolean`

Check if an event matches this link.

```typescript
if (link.matchesEvent(someEvent)) {
  console.log('This event is the one we linked to')
}
```

### `isReplyToThis(ev: NostrEvent): boolean`

Check if an event is a reply to this link.

### `referencesThis(ev: NostrEvent): boolean`

Check if an event tags this link.

### `equals(other: NostrLink): boolean`

Check equality by tag key.

### `tagKey: string`

String identifier. For address links: `kind:author:d-tag`. For others: the hex ID.

## Parsing Functions

### `parseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink`

Parse a NIP-19 string into a NostrLink.

```typescript
import { parseNostrLink } from '@snort/system'

const link = parseNostrLink('npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws')
const link = parseNostrLink('nevent1qqs...')
const link = parseNostrLink('naddr1qq...')
const link = parseNostrLink('nprofile1qqs...')
```

### `tryParseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink | undefined`

Same as `parseNostrLink` but returns `undefined` instead of throwing.

### `isNostrLink(link: string): boolean`

Check if a string looks like a NIP-19 entity.

### `trimNostrLink(link: string): string`

Trim `nostr:` or `web+nostr:` prefix and non-bech32 characters.

## Other Link Types

### NostrHashtagLink

```typescript
import { NostrHashtagLink } from '@snort/system'

const tag = new NostrHashtagLink('bitcoin')
tag.toEventTag() // ["t", "bitcoin"]
```

### UnknownTag

Holds any unrecognized tag.

```typescript
import { UnknownTag } from '@snort/system'

const tag = new UnknownTag(['custom', 'value'])
tag.toEventTag() // ["custom", "value"]
```

## ToNostrEventTag Interface

Both `NostrLink` and `NostrHashtagLink` implement `ToNostrEventTag`:

```typescript
interface ToNostrEventTag {
  toEventTag(): string[] | undefined
  equals(other: ToNostrEventTag): boolean
}
```

## NostrPrefix Enum

From `@snort/shared`:

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

## Complete Example

```typescript
import { NostrLink, parseNostrLink, LinkScope } from '@snort/system'
import { NostrPrefix } from '@snort/shared'

// From event
const link = NostrLink.fromEvent(event)
console.log(link.encode())  // nevent1qqs...
console.log(link.type)      // NostrPrefix.Event
console.log(link.id)        // hex event id
console.log(link.kind)      // event kind
console.log(link.author)    // event author
console.log(link.relays)    // relay hints

// Parse from string
const parsed = parseNostrLink('nevent1qqs...')

// Use in RequestBuilder
const rb = new RequestBuilder('by-link')
  .withFilter().link(parsed)

// Use in event tags
const eb = new EventBuilder()
eb.tag(parsed.toEventTag())

// Check thread relationships
if (link.isReplyToThis(replyEvent)) {
  console.log('This is a reply')
}
```

## See Also

- [Examples → NostrLink](/examples/nostr-link)
