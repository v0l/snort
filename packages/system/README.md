## @snort/system

A collection of caching and querying techniquies used by https://snort.social to serve all content from the nostr protocol.

Simple example:

```js
import { NostrSystem, RequestBuilder, StoreSnapshot, NoteCollection } from "@snort/system";

// Singleton instance to store all connections and access query fetching system
const System = new NostrSystem({});

(async () => {
  // Setup cache system
  await System.Init();

  // connec to one "bootstrap" relay to pull profiles/relay lists from
  // also used as a fallback relay when gossip model doesnt know which relays to pick, or "authors" are not provided in the request
  await System.ConnectToRelay("wss://relay.snort.social", { read: true, write: false });

  // ID should be unique to the use case, this is important as all data fetched from this ID will be merged into the same NoteStore
  const rb = new RequestBuilder("get-posts");
  rb.withFilter()
    .authors(["63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"]) // Kieran pubkey
    .kinds([1])
    .limit(10);

  const q = System.Query(rb);
  // basic usage using "onEvent", fired every 100ms
  q.on("event", evs => {
    console.log(evs);
    // something else..
  });
})();
```
