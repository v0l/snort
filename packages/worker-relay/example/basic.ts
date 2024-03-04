import { WorkerRelayInterface } from "@snort/worker-relay";

// in debug mode you may need this, to map to the correct sqlite-wasm path
// this is needed because sqlite-wasm will otherwise look inside @snort/worker-relay directory for sqlite3.wasm
const basePath = new URL("@sqlite.org/sqlite-wasm", import.meta.url);

// internally we resolve the script path like this:
const scriptPath = new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url);

// scriptPath & basePath are optional
const relay = new WorkerRelayInterface(scriptPath, basePath.href);

// load sqlite database and run migrations
await relay.init("my-relay.db");

// Query worker relay with regular nostr REQ command
const results = await relay.query(["REQ", "1", { kinds: [1], limit: 10 }]);

// publish a new event to the relay
const myEvent = {
  kind: 1,
  created_at: Math.floor(new Date().getTime() / 1000),
  content: "test",
  tags: []
};
if (await relay.event(myEvent)) {
  console.log("Success");
}