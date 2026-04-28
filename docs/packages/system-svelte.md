# @snort/system-svelte

Svelte bindings for the Snort system.

## Installation

```bash
bun add @snort/system-svelte
```

## Overview

`@snort/system-svelte` provides a Svelte store adapter for querying Nostr data via `@snort/system`.

## Setup

Provide the `SystemInterface` via Svelte context:

```typescript
import { setContext } from 'svelte'
import { NostrSystem } from '@snort/system'

const system = new NostrSystem({})
await system.Init()

setContext('snort', system)
```

## useRequestBuilder

Svelte store for querying Nostr events.

```typescript
import { useRequestBuilder } from '@snort/system-svelte'
import { RequestBuilder, EventKind } from '@snort/system'

const rb = new RequestBuilder('timeline')
rb.withFilter().kinds([EventKind.TextNote]).limit(20)

const store = useRequestBuilder(rb)
```

### Usage in Components

```svelte
<script>
  import { useRequestBuilder } from '@snort/system-svelte'
  import { RequestBuilder, EventKind } from '@snort/system'

  const rb = new RequestBuilder('feed')
  rb.withFilter().kinds([EventKind.TextNote]).limit(20)

  const feed = useRequestBuilder(rb)
</script>

{#each $feed as event}
  <div>
    <strong>{event.pubkey.slice(0, 8)}</strong>
    <p>{event.content}</p>
  </div>
{/each}
```

The returned object is a Svelte-compatible store with a `subscribe` method. It automatically:

- Creates a query on mount
- Updates the store when new events arrive
- Cancels the query when all subscribers unsubscribe

## See Also

- [@snort/system](/packages/system) - Core system
- [@snort/system-react](/packages/system-react) - React bindings
