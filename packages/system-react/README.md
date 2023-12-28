## @snort/system-react

React hooks for @snort/system

### Available hooks

#### `useRequestBuilder(NoteStore, RequestBuilder)`

The main hook which allows you to subscribe to nostr relays and returns a reactive store.

#### `useUserProfile(pubkey: string | undefined)`

Profile hook, profile loading is automated, this hook will return the profile from cache and also refresh the cache in the background (`stale-while-revalidate`)

#### `useEventFeed(NostrLink)` / `useEventsFeed(Array<NostrLink>)`

A simple hook which can load events using the `NostrLink` class, this class contains one NIP-19 entity `nevent/naddr` etc.

#### `useReactions(id, Array<NostrLink>)`

Loads reactions for a set of events, this can be a set of posts on a profile or an arbitary list of events.

#### `useEventReactions(NostrLink, Array<NostrEvent>)`

Process a set of related events (usually results from `useReactions`) and return likes/dislikes/reposts/zaps

#### `useUserSearch()`

Search for profiles in the profile cache, this also returns exact links if they match

#### `useSystemState(System)`

Hook state of the nostr system

## Example:

```js
import { useMemo } from "react";
import { SnortContext, useRequestBuilder, useUserProfile } from "@snort/system-react";
import { NostrSystem, NoteCollection, RequestBuilder, TaggedNostrEvent } from "@snort/system";

const System = new NostrSystem({});

// some bootstrap relays
["wss://relay.snort.social", "wss://nos.lol"].forEach(r => System.ConnectToRelay(r, { read: true, write: false }));

export function Note({ ev }: { ev: TaggedNostrEvent }) {
  const profile = useUserProfile(ev.pubkey);

  return (
    <div>
      Post by: {profile.name ?? profile.display_name}
      <p>{ev.content}</p>
    </div>
  );
}

export function UserPosts(props: { pubkey: string }) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder("get-posts");
    rb.withFilter().authors([props.pubkey]).kinds([1]).limit(10);

    return rb;
  }, [props.pubkey]);

  const data = useRequestBuilder(NoteCollection, sub);
  return (
    <>
      {data.data.map(a => (
        <Note ev={a} />
      ))}
    </>
  );
}

export function MyApp() {
  return (
    <SnortContext.Provider value={System}>
      <UserPosts pubkey="63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed" />
    </SnortContext.Provider>
  );
}
```
