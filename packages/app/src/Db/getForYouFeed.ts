import { NostrEvent, parseZap } from "@snort/system";

import { Relay } from "@/Cache";

export async function getForYouFeed(pubkey: string): Promise<NostrEvent[]> {
  console.time("For You feed generation time");

  console.log("pubkey", pubkey);

  // Get events reacted to by me
  const myReactedEvents = await getMyReactedEventIds(pubkey);
  console.log("my reacted events", myReactedEvents);

  // Get others who reacted to the same events as me
  const othersWhoReacted = await getOthersWhoReacted(myReactedEvents, pubkey);
  // this tends to be small when the user has just logged in, we should maybe subscribe for more from relays
  console.log("others who reacted", othersWhoReacted);

  // Get event ids reacted to by those others
  const reactedByOthers = await getEventIdsReactedByOthers(othersWhoReacted);
  console.log("reacted by others", reactedByOthers);

  // Get events reacted to by others that I haven't reacted to
  const idsToFetch = Array.from(reactedByOthers).filter(id => !myReactedEvents.has(id));
  console.log("ids to fetch", idsToFetch);

  // Get full events in sorted order
  const feed = await getFeedEvents(idsToFetch);
  console.log("feed.length", feed.length);

  console.timeEnd("For You feed generation time");
  return feed;
}

async function getMyReactedEventIds(pubkey: string) {
  const myReactedEventIds = new Set<string>();
  const myEvents = await Relay.query([
    "REQ",
    "getMyReactedEventIds",
    {
      authors: [pubkey],
      kinds: [1, 6, 7, 9735],
    },
  ]);
  myEvents.forEach(ev => {
    const targetEventId = ev.kind === 9735 ? parseZap(ev).event?.id : ev.tags.find(tag => tag[0] === "e")?.[1];
    if (targetEventId) {
      myReactedEventIds.add(targetEventId);
    }
  });

  return myReactedEventIds;
}

async function getOthersWhoReacted(myReactedEventIds: Set<string>, myPubkey: string) {
  const othersWhoReacted = new Set<string>();

  const otherReactions = await Relay.query([
    "REQ",
    "getOthersWhoReacted",
    {
      "#e": Array.from(myReactedEventIds),
    },
  ]);

  otherReactions.forEach(reaction => {
    if (reaction.pubkey !== myPubkey) {
      othersWhoReacted.add(reaction.pubkey);
    }
  });

  return [...othersWhoReacted];
}

async function getEventIdsReactedByOthers(othersWhoReacted: string[]) {
  const eventIdsReactedByOthers = new Set<string>();

  const events = await Relay.query([
    "REQ",
    "getEventIdsReactedByOthers",
    {
      authors: othersWhoReacted,
    },
  ]);

  events.forEach(event => {
    event.tags.forEach(tag => {
      if (tag[0] === "e") eventIdsReactedByOthers.add(tag[1]);
    });
  });

  return [...eventIdsReactedByOthers];
}

async function getFeedEvents(ids: string[]) {
  return (await Relay.query([
    "REQ",
    "getFeedEvents",
    {
      ids,
      kinds: [1],
    },
  ])).filter((ev) => {
    // no replies
    return !ev.tags.some((tag) => tag[0] === "e");
  }).sort((a, b) => b.created_at - a.created_at);
}
