import { useMemo } from "react";
import { SnortContext, useRequestBuilder, useUserProfile } from "../src";

import { NostrSystem, RequestBuilder, TaggedNostrEvent } from "@snort/system";

const System = new NostrSystem({});

// some bootstrap relays
["wss://relay.snort.social", "wss://nos.lol"].forEach(r => System.ConnectToRelay(r, { read: true, write: false }));

export function Note({ ev }: { ev: TaggedNostrEvent }) {
  const profile = useUserProfile(ev.pubkey);

  return (
    <div>
      Post by: {profile?.name ?? profile?.display_name}
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

  const data = useRequestBuilder(sub);
  return (
    <>
      {data.map(a => (
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
