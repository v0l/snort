## Worker Relay

Worker relay is a Nostr relay built on `sqlite-wasm`

`WorkerRelayInterface` is the class which accepts the URL of the worker script

`sqlite-wasm` uses OFPS in order to persist the database.

### Example

```typescript
import { WorkerRelayInterface } from "@snort/worker-relay";

// when using Vite import the worker script directly (for production)
import WorkerVite from "@snort/worker-relay/src/worker?worker";

// in dev mode import esm module, i have no idea why it has to work like this
const workerScript = import.meta.env.DEV
  ? new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url)
  : new WorkerVite();

const workerRelay = new WorkerRelayInterface(workerScript);

// load sqlite database and run migrations
await workerRelay.init("my-relay.db");

// Query worker relay with regular nostr REQ command
const results = await workerRelay.query(["REQ", "1", { kinds: [1], limit: 10 }]);

// publish a new event to the relay
const myEvent = {
  kind: 1,
  created_at: Math.floor(new Date().getTime() / 1000),
  content: "test",
  tags: [],
};
if (await workerRelay.event(myEvent)) {
  console.log("Success");
}
```
