import { NostrSystem, RequestBuilder, FlatNoteStore, StoreSnapshot, NoteCollection } from "../src";

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

  const q = System.Query(NoteCollection, rb);
  // basic usage using "onEvent", fired every 100ms
  q.feed.onEvent(evs => {
    console.log(evs);
    // something else..
  });

  // Hookable type using change notification, limited to every 500ms
  const release = q.feed.hook(() => {
    // since we use the FlatNoteStore we expect NostrEvent[]
    // other stores provide different data, like a single event instead of an array (latest version)
    const state = q.feed.snapshot as StoreSnapshot<ReturnType<NoteCollection["getSnapshotData"]>>;

    // do something with snapshot of store
    console.log(`We have ${state.data?.length} events now!`);
  });

  // release the hook when its not needed anymore
  // these patterns will be managed in @snort/system-react to make it easier to use react or other UI frameworks
  release();
})();
