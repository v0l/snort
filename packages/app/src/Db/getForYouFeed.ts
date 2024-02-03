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
  const reactedByOthers = await getEventIdsReactedByOthers(othersWhoReacted, myReactedEvents, pubkey);
  console.log("reacted by others", reactedByOthers);

  // Get full events in sorted order
  const feed = await getFeedEvents(reactedByOthers);
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
  const othersWhoReacted = new Map<string, number>();

  const otherReactions = await Relay.query([
    "REQ",
    "getOthersWhoReacted",
    {
      "#e": Array.from(myReactedEventIds),
    },
  ]);

  otherReactions.forEach(reaction => {
    if (reaction.pubkey !== myPubkey) {
      othersWhoReacted.set(reaction.pubkey, (othersWhoReacted.get(reaction.pubkey) || 0) + 1);
    }
  });

  return othersWhoReacted;
}

async function getEventIdsReactedByOthers(othersWhoReacted: Map<string, number>, myReactedEvents: Set<string>, myPub: string) {
  const eventIdsReactedByOthers = new Map<string, number>();

  const events = await Relay.query([
    "REQ",
    "getEventIdsReactedByOthers",
    {
      authors: [...othersWhoReacted.keys()],
      kinds: [1, 6, 7, 9735],
    },
  ]);

  events.forEach(event => {
    if (event.pubkey === myPub || myReactedEvents.has(event.id)) {
      // NIP-113 NOT filter could improve performance by not selecting these events in the first place
      return;
    }
    event.tags.forEach(tag => {
      if (tag[0] === "e") {
        const score = Math.ceil(Math.sqrt(othersWhoReacted.get(event.pubkey) || 0));
        eventIdsReactedByOthers.set(tag[1], (eventIdsReactedByOthers.get(tag[1]) || 0) + score);
      }
    });
  });

  return eventIdsReactedByOthers;
}

async function getFeedEvents(reactedToIds: Map<string, number>) {
  const events = await Relay.query([
    "REQ",
    "getFeedEvents",
    {
      ids: Array.from(reactedToIds.keys()),
      kinds: [1],
      // max 24h old
      since: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7,
    },
  ]);

  // Filter out replies
  const filteredEvents = events.filter(ev => !ev.tags.some(tag => tag[0] === "e"));

  // Define constants for normalization
  // const recentnessWeight = -1;
  const currentTime = new Date().getTime();

  // Calculate min and max for normalization
  let minReactions = Infinity,
    maxReactions = -Infinity;
  let minAge = Infinity,
    maxAge = -Infinity;

  filteredEvents.forEach(event => {
    const reactions = reactedToIds.get(event.id) || 0;
    minReactions = Math.min(minReactions, reactions);
    maxReactions = Math.max(maxReactions, reactions);

    const age = currentTime - new Date(event.created_at).getTime();
    minAge = Math.min(minAge, age);
    maxAge = Math.max(maxAge, age);
  });

  const normalize = (value: number, min: number, max: number) => (value - min) / (max - min);

  // Normalize and sort events by calculated score
  filteredEvents.sort((a, b) => {
    const aReactions = normalize(reactedToIds.get(a.id) || 0, minReactions, maxReactions);
    const bReactions = normalize(reactedToIds.get(b.id) || 0, minReactions, maxReactions);

    const aAge = normalize(currentTime - new Date(a.created_at).getTime(), minAge, maxAge);
    const bAge = normalize(currentTime - new Date(b.created_at).getTime(), minAge, maxAge);

    // randomly big or small weight for recentness
    const recentnessWeight = Math.random() > 0.5 ? -0.1 : -10;
    const aScore = aReactions + recentnessWeight * aAge;
    const bScore = bReactions + recentnessWeight * bAge;

    // Sort by descending score
    return bScore - aScore;
  });

  return filteredEvents;
}
