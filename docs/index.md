---
title: Snort - Nostr TypeScript Libraries
---

# Snort

A comprehensive suite of TypeScript libraries for building Nostr applications. Powers [snort.social](https://snort.social), [zap.stream](https://zap.stream), [dtan.xyz](https://dtan.xyz), [nwb.tf](https://nwb.tf), [lnvps.net](https://lnvps.net), and many other popular Nostr applications.

## Why Snort?

- **Production-Ready**: Battle-tested in production at snort.social with millions of requests
- **Type-Safe**: Full TypeScript support with strict typing
- **Performant**: Optimized for speed with caching, connection pooling, and efficient query handling
- **Modular**: Choose only the packages you need
- **Well-Documented**: Comprehensive API documentation and examples

## Quick Start

```bash
# Install the core package
bun add @snort/system

# Or install all packages
bun add @snort/system @snort/system-react @snort/shared @snort/wallet
```

## Core Packages

### [@snort/system](/packages/system)
The heart of Snort - Nostr protocol implementation with caching, querying, and relay management.

```typescript
import { NostrSystem, RequestBuilder } from '@snort/system'

const System = new NostrSystem({})
await System.Init()
await System.ConnectToRelay('wss://relay.snort.social', { read: true })

const rb = new RequestBuilder('feed')
  .withFilter().kinds([1]).limit(50)

System.Query(rb).on('event', (events) => {
  console.log('New events:', events)
})
```

### [@snort/system-react](/packages/system-react)
React hooks and components for building Nostr applications.

```typescript
import { useRequestBuilder, useUserProfile } from '@snort/system-react'
import { RequestBuilder, EventKind } from '@snort/system'

function Feed() {
  const rb = useMemo(() => {
    const b = new RequestBuilder('feed')
    b.withFilter().kinds([EventKind.TextNote]).limit(20)
    return b
  }, [])
  const events = useRequestBuilder(rb)
  const profile = useUserProfile(events[0]?.pubkey)
  return <div>{events.map(e => <Note key={e.id} event={e} />)}</div>
}
```

### [@snort/shared](/packages/shared)
Utility functions for Nostr operations - key generation, event signing, parsing, and more.

### [@snort/wallet](/packages/wallet)
Lightning Network wallet integration for zaps and payments.

## Features

- ✅ **Full Nostr Support**: Kinds 1-30000+, NIPs 01-65+
- ✅ **Relay Management**: Automatic relay selection, connection pooling
- ✅ **Smart Caching**: Multi-layer caching with IndexedDB support
- ✅ **Query Builder**: Fluent API for complex Nostr queries
- ✅ **React Hooks**: Drop-in components for common patterns
- ✅ **TypeScript First**: Full type safety and IDE support
- ✅ **Zero Dependencies**: Minimal external dependencies for fast bundles

## Ecosystem

Snort is used by:
- [snort.social](https://snort.social) - Full-featured Nostr client
- [zap.stream](https://zap.stream) - Nostr live streaming
- [dtan.xyz](https://dtan.xyz) - Decentralized torrent tracker
- [nwb.tf](https://nwb.tf) - Decentralized web hosting on Nostr
- [lnvps.net](https://lnvps.net) - Bitcoin Lightning VPS hosting
- And many other Nostr applications

## Community

- [GitHub](https://github.com/v0l/snort) - Source code and issues
- [Snort on Nostr](https://snort.social/p/npub1sn0rtcjcf543gj4wsg7fa59s700d5ztys5ctj0g69g2x6802npjqhjjtws) - Follow for updates
