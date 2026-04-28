# @snort/system

The core Nostr system library providing caching, querying, and relay management.

## Installation

```bash
bun add @snort/system
```

## Quick Example

```typescript
import { NostrSystem, RequestBuilder, EventKind } from '@snort/system'

const System = new NostrSystem({
  automaticOutboxModel: true,
  buildFollowGraph: true,
  checkSigs: true,
})

await System.Init()
await System.ConnectToRelay('wss://relay.snort.social', { read: true, write: true })

const rb = new RequestBuilder('feed')
  .withFilter().kinds([EventKind.TextNote]).limit(50)

const q = System.Query(rb)
q.on('event', (events) => console.log(events))
```

## Sections

- [NostrSystem](/packages/system/nostr-system) - Central orchestrator configuration and lifecycle
- [Relay Management](/packages/system/relays) - Connection pool, relay settings, outbox model
- [Query System](/packages/system/queries) - RequestBuilder, filters, subscriptions
- [Caching](/packages/system/caching) - Profile cache, relay cache, CacheRelay
- [Signers](/packages/system/signers) - EventSigner, PrivateKeySigner, NIP-07, NIP-46, NIP-55
- [Event Builder & Publisher](/packages/system/events) - Building, signing, and publishing events
- [NostrLink](/packages/system/nostr-link) - Link parsing, encoding, and tag conversion
- [NIP Implementations](/packages/system/nips) - NIP-04, NIP-10, NIP-25, NIP-44, NIP-57, etc.
- [Text Parsing](/packages/system/text) - Content parsing, mentions, hashtags, media
- [User State](/packages/system/user-state) - Managing user profile, follows, relays, appdata
