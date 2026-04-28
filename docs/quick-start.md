# Quick Start

Get a Nostr application running in under 5 minutes.

## 1. Create a New Project

```bash
# Using Bun
bun create vite my-app --template react-ts

cd my-app
bun install
```

## 2. Install Snort

```bash
bun add @snort/system @snort/system-react @snort/shared
```

## 3. Initialize the System

Create `src/nostr.ts`:

```typescript
import { NostrSystem } from '@snort/system'

// Create singleton instance
export const System = new NostrSystem({})

// Initialize in your app entry point
export async function initNostr() {
  await System.Init()

  // Connect to bootstrap relays
  await System.ConnectToRelay('wss://relay.snort.social', { read: true, write: true })
  await System.ConnectToRelay('wss://nos.lol', { read: true, write: false })
}
```

## 4. Fetch Data in React

Create `src/App.tsx`:

```typescript
import { useEffect, useMemo } from 'react'
import { System, initNostr } from './nostr'
import { SnortContext, useRequestBuilder } from '@snort/system-react'
import { RequestBuilder, EventKind } from '@snort/system'

function Feed() {
  const rb = useMemo(() => {
    const b = new RequestBuilder('timeline')
    b.withFilter().kinds([EventKind.TextNote]).limit(20)
    return b
  }, [])

  const events = useRequestBuilder(rb)

  return (
    <div>
      <h1>Latest Notes</h1>
      {events.map(event => (
        <div key={event.id}>
          <strong>{event.pubkey.slice(0, 8)}...</strong>
          <p>{event.content}</p>
        </div>
      ))}
    </div>
  )
}

function App() {
  useEffect(() => {
    initNostr()
  }, [])

  return (
    <SnortContext.Provider value={System}>
      <Feed />
    </SnortContext.Provider>
  )
}

export default App
```

## 5. Publish a Note

```typescript
import { EventKind, EventPublisher, PrivateKeySigner } from '@snort/system'

async function publishNote(content: string, privateKey: string) {
  const publisher = EventPublisher.privateKey(privateKey)

  const note = await publisher.note(content)

  const responses = await System.BroadcastEvent(note)
  console.log('Published!', note.id, responses)
}
```

## Complete Example

Here's a minimal working example without React:

```typescript
import { NostrSystem, RequestBuilder, EventKind, EventPublisher, PrivateKeySigner } from '@snort/system'

const System = new NostrSystem({})

async function main() {
  // Initialize
  await System.Init()
  await System.ConnectToRelay('wss://relay.snort.social', { read: true, write: true })

  // Subscribe to timeline
  const rb = new RequestBuilder('timeline')
    .withFilter()
      .kinds([EventKind.TextNote])
      .limit(10)

  const q = System.Query(rb)
  q.on('event', (events) => {
    console.log('New events:', events)
  })

  // Publish a note
  const signer = PrivateKeySigner.random()
  const publisher = new EventPublisher(signer, signer.getPubKey())
  const note = await publisher.note('Hello Nostr!')

  await System.BroadcastEvent(note)
}

main()
```

## Next Steps

- [Package Documentation](/packages/system) - Learn about each package
- [NostrSystem](/packages/system/nostr-system) - System configuration and lifecycle
- [Query System](/packages/system/queries) - Building queries and subscriptions
