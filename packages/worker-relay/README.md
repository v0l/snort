## Worker Relay

Worker relay is a Nostr relay built on `sqlite-wasm`

`WorkerRelayInterface` is the class which accepts the URL of the worker script

`sqlite-wasm` uses OFPS in order to persist the database.

OPFS requires special headers to be present when serving your application. Read more about it [here](https://sqlite.org/wasm/doc/trunk/persistence.md#opfs)

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Usage (Vite)

```typescript
import WorkerRelayPath from "@snort/worker-relay/dist/worker?worker&url";
```

### Example

```typescript
const relay = new WorkerRelayInterface(WorkerRelayPath);

// load sqlite database and run migrations
await relay.init();

// Query worker relay with regular nostr REQ command
const results = await relay.query(["REQ", "1", { kinds: [1], limit: 10 }]);

// publish a new event to the relay
const myEvent = {
  kind: 1,
  content: "test",
};
if (await relay.event(myEvent)) {
  console.log("Success");
}
```
