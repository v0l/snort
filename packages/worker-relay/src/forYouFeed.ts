import debug from "debug";

import { RelayHandler, NostrEvent } from "./types";

// import { parseZap } from "../../system/src/zaps";
// placeholder:
const parseZap = (_zap: NostrEvent) => {
  return { event: null } as { event: null | NostrEvent };
}

const log = debug("getForYouFeed");

export async function getForYouFeed(relay: RelayHandler, pubkey: string): Promise<NostrEvent[]> {
  console.time("For You feed generation time");

  log("pubkey", pubkey);

  // Get events reacted to by me
  const myReactedEventIds = await getMyReactedEvents(relay, pubkey);
  log("my reacted events", myReactedEventIds);

  const myReactedAuthors = await getMyReactedAuthors(relay, myReactedEventIds, pubkey);
  log("my reacted authors", myReactedAuthors);

  // Get others who reacted to the same events as me
  const othersWhoReacted = await getOthersWhoReacted(relay, myReactedEventIds, pubkey);
  // this tends to be small when the user has just logged in, we should maybe subscribe for more from relays
  log("others who reacted", othersWhoReacted);

  // Get event ids reacted to by those others
  const reactedByOthers = await getEventIdsReactedByOthers(relay, othersWhoReacted, myReactedEventIds, pubkey);
  log("reacted by others", reactedByOthers);

  // Get full events in sorted order
  const feed = await getFeedEvents(relay, reactedByOthers, myReactedAuthors);
  log("feed.length", feed.length);

  console.timeEnd("For You feed generation time");
  return feed;
}

async function getMyReactedAuthors(relay: RelayHandler, myReactedEventIds: Set<string>, myPubkey: string) {
  const myReactedAuthors = new Map<string, number>();

  const myReactions = relay.req("getMyReactedAuthors", {
    "#e": Array.from(myReactedEventIds),
  }) as NostrEvent[];

  myReactions.forEach(reaction => {
    if (reaction.pubkey !== myPubkey) {
      myReactedAuthors.set(reaction.pubkey, (myReactedAuthors.get(reaction.pubkey) || 0) + 1);
    }
  });

  return myReactedAuthors;
}

async function getMyReactedEvents(relay: RelayHandler, pubkey: string) {
  const myReactedEventIds = new Set<string>();

  const myEvents = relay.req("getMyReactedEventIds", {
    authors: [pubkey],
    kinds: [1, 6, 7, 9735],
  }) as NostrEvent[];
  myEvents.forEach(ev => {
    const targetEventId = ev.kind === 9735 ? parseZap(ev).event?.id : ev.tags.find((tag: string[]) => tag[0] === "e")?.[1];
    if (targetEventId) {
      myReactedEventIds.add(targetEventId);
    }
  });

  return myReactedEventIds;
}

async function getOthersWhoReacted(relay: RelayHandler, myReactedEventIds: Set<string>, myPubkey: string) {
  const othersWhoReacted = new Map<string, number>();

  const otherReactions = relay.req("getOthersWhoReacted", {
    "#e": Array.from(myReactedEventIds),
  }) as NostrEvent[];

  otherReactions.forEach(reaction => {
    if (reaction.pubkey !== myPubkey) {
      othersWhoReacted.set(reaction.pubkey, (othersWhoReacted.get(reaction.pubkey) || 0) + 1);
    }
  });

  return othersWhoReacted;
}

async function getEventIdsReactedByOthers(
  relay: RelayHandler,
  othersWhoReacted: Map<string, number>,
  myReactedEvents: Set<string>,
  myPub: string,
) {
  const eventIdsReactedByOthers = new Map<string, number>();

  const events = relay.req("getEventIdsReactedByOthers", {
    authors: [...othersWhoReacted.keys()],
    kinds: [1, 6, 7, 9735],
  }) as NostrEvent[];

  events.forEach(event => {
    if (event.pubkey === myPub || myReactedEvents.has(event.id)) {
      // NIP-113 NOT filter could improve performance by not selecting these events in the first place
      return;
    }
    event.tags.forEach((tag: string[]) => {
      if (tag[0] === "e") {
        const score = Math.ceil(Math.sqrt(othersWhoReacted.get(event.pubkey) || 0));
        eventIdsReactedByOthers.set(tag[1], (eventIdsReactedByOthers.get(tag[1]) || 0) + score);
      }
    });
  });

  return eventIdsReactedByOthers;
}

async function getFeedEvents(
  relay: RelayHandler,
  reactedToIds: Map<string, number>,
  reactedToAuthors: Map<string, number>,
) {
  const events = relay
    .sql(
      `select json from events where id in (${Array.from(reactedToIds.keys())
        .map(() => "?")
        .join(", ")}) and kind = 1 order by seen_at ASC, created DESC limit 1000`,
      Array.from(reactedToIds.keys()),
    )
    .map(row => JSON.parse(row[0] as string) as NostrEvent);

  const seen = new Set<string>(events.map(ev => ev.id));

  log("reactedToAuthors", reactedToAuthors);

  const favoriteAuthors = Array.from(reactedToAuthors.keys())
    .sort((a, b) => reactedToAuthors.get(b)! - reactedToAuthors.get(a)!)
    .slice(20);

  const eventsByFavoriteAuthors = relay
    .sql(
      `select json from events where pubkey in (${favoriteAuthors
        .map(() => "?")
        .join(", ")}) and kind = 1 order by seen_at ASC, created DESC limit 100`,
      favoriteAuthors,
    )
    .map(row => JSON.parse(row[0] as string) as NostrEvent);

  eventsByFavoriteAuthors.forEach(ev => {
    if (!seen.has(ev.id)) {
      events.push(ev);
    }
  });

  // Filter out replies
  const filteredEvents = events.filter(ev => !ev.tags.some((tag: string[]) => tag[0] === "e"));

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

  const maxFavoriteness = Math.max(...Array.from(reactedToAuthors.values()));
  const favoritenessWeight = 0.5;

  // Normalize and sort events by calculated score
  filteredEvents.sort((a, b) => {
    const aReactions = normalize(reactedToIds.get(a.id) || 0, minReactions, maxReactions);
    const bReactions = normalize(reactedToIds.get(b.id) || 0, minReactions, maxReactions);

    const aAge = normalize(currentTime - new Date(a.created_at).getTime(), minAge, maxAge);
    const bAge = normalize(currentTime - new Date(b.created_at).getTime(), minAge, maxAge);

    const aFavoriteness = normalize(reactedToAuthors.get(a.pubkey) || 0, 0, maxFavoriteness);
    const bFavoriteness = normalize(reactedToAuthors.get(b.pubkey) || 0, 0, maxFavoriteness);

    // randomly big or small weight for recentness
    const recentnessWeight = Math.random() > 0.75 ? -0.1 : -10;
    const aScore = aReactions + recentnessWeight * aAge + aFavoriteness * favoritenessWeight;
    const bScore = bReactions + recentnessWeight * bAge + bFavoriteness * favoritenessWeight;

    // Sort by descending score
    return bScore - aScore;
  });

  return filteredEvents;
}
