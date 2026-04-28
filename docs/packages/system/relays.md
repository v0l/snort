# Relay Management

How `@snort/system` manages relay connections, routing, and the outbox model.

## ConnectionPool

The `ConnectionPool` manages all WebSocket connections to relays. Access it via `System.pool`.

### Events

| Event | Callback | Description |
|-------|----------|-------------|
| `connected` | `(address: string, wasReconnect: boolean) => void` | Relay connected |
| `connectFailed` | `(address: string) => void` | Connection failed |
| `event` | `(address: string, sub: string, e: TaggedNostrEvent) => void` | Event received |
| `eose` | `(address: string, sub: string) => void` | End of stored events |
| `disconnect` | `(address: string, code: number) => void` | Relay disconnected |
| `auth` | `(address: string, challenge: string, relay: string, cb) => void` | Auth requested |
| `notice` | `(address: string, msg: string) => void` | Relay notice |

### Methods

#### `connect(address: string, options: RelaySettings, ephemeral: boolean): Promise<void>`

Connect to a relay. If `ephemeral` is true, the connection will be closed after inactivity.

#### `disconnect(address: string): void`

Disconnect from a relay.

#### `broadcast(ev: NostrEvent, cb?: (rsp: OkResponse) => void): Promise<OkResponse[]>`

Broadcast an event to all connected write relays.

#### `broadcastTo(address: string, ev: NostrEvent): Promise<OkResponse>`

Broadcast to a specific relay.

## Connection

Each relay connection is represented by a `Connection` instance.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `address` | `string` | Relay WebSocket URL |
| `settings` | `RelaySettings` | Read/write settings |
| `info` | `RelayInfoDocument \| undefined` | NIP-11 relay info |
| `isOpen` | `boolean` | Whether WebSocket is open |
| `isConnecting` | `boolean` | Whether currently connecting |
| `isDown` | `boolean` | Whether connection has failed |
| `ephemeral` | `boolean` | Whether this is a temporary connection |
| `ActiveRequests` | `Map<string, ReqCommand>` | Currently active subscriptions |
| `Authed` | `boolean` | Whether NIP-42 auth completed |
| `AwaitingAuth` | `Map<string, boolean>` | Subscriptions awaiting auth |

### RelaySettings

```typescript
interface RelaySettings {
  read: boolean   // Subscribe to events from this relay
  write: boolean  // Publish events to this relay
}
```

### NIP-11 Relay Info

When a connection is established, the system automatically fetches the relay's NIP-11 document:

```typescript
const conn = System.pool.getConnection('wss://relay.example.com')
console.log(conn.info?.name)
console.log(conn.info?.supported_nips)
console.log(conn.info?.limitation)
```

## Outbox Model

When `automaticOutboxModel` is enabled (default), the system automatically:

1. **On query**: Fetches kind 10002 relay lists for queried authors, then routes requests to their preferred relays
2. **On broadcast**: Writes to inbox relays for all `p`-tagged users in addition to your own relays

### OutboxModel

The `OutboxModel` class implements the `RequestRouter` interface:

```typescript
// Access via System
if (System.requestRouter) {
  // Pick 2 relays per author for optimal delivery
  const split = System.requestRouter.forRequest(filter, 2)
}
```

### RelayMetadataLoader

Loads and caches relay metadata (kind 10002) for pubkeys:

```typescript
// Automatically used by OutboxModel
// But can be used directly:
await System.relayLoader.loadForPubkeys(['pubkey1', 'pubkey2'])
```

## FullRelaySettings

```typescript
interface FullRelaySettings {
  url: string
  settings: RelaySettings
}
```

## Relay Tag Helpers

```typescript
import { settingsToRelayTag, parseRelayTags, parseRelaysFromKind } from '@snort/system'

// Convert settings to relay tag
const tag = settingsToRelayTag({ url: 'wss://relay.example.com', settings: { read: true, write: true } })
// ["r", "wss://relay.example.com", "read", "write"]

// Parse relay tags from kind 10002 event
const relays = parseRelayTags(event.tags)

// Parse relays from kind 3 content
const relays = parseRelaysFromKind(event)
```

## Best Practices

### Choosing Relays

```typescript
// Connect to a mix of relays
await System.ConnectToRelay('wss://relay.snort.social', { read: true, write: true })
await System.ConnectToRelay('wss://nos.lol', { read: true, write: false })
await System.ConnectToRelay('wss://relay.damus.io', { read: true, write: false })
```

### Outbox Model Configuration

```typescript
// Enable outbox model (default)
const System = new NostrSystem({ automaticOutboxModel: true })

// Customize relay pick count per request
const rb = new RequestBuilder('feed')
  .withOptions({ outboxPickN: 3 }) // Pick 3 relays per author
  .withFilter().authors(['pubkey1', 'pubkey2']).kinds([1])
```

### Monitoring Connections

```typescript
System.pool.on('connected', (addr, wasReconnect) => {
  console.log(`Connected to ${addr}${wasReconnect ? ' (reconnect)' : ''}`)
})

System.pool.on('disconnect', (addr, code) => {
  console.log(`Disconnected from ${addr} (code: ${code})`)
})

System.pool.on('notice', (addr, msg) => {
  console.warn(`Notice from ${addr}: ${msg}`)
})
```
