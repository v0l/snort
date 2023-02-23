import { useEffect, useMemo, useState } from "react";
import { u256 } from "@snort/nostr";
import { EventKind, Subscriptions } from "@snort/nostr";
import { parseZap } from "Element/Zap";
import useSubscription from "Feed/Subscription";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";
import { debounce } from "Util";

export default function useLongFormThreadFeed(d: string, pubkey: string) {
  const [trackingEvents, setTrackingEvent] = useState<u256[]>([]);
  const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

  const repliesSub = useMemo(() => {
    const s = new Subscriptions();
    s.Id = `replies:${d.slice(0, 4)}:${pubkey.slice(0, 12)}`;
    s.Kinds = new Set([EventKind.TextNote]);
    s.ATags = new Set([`${EventKind.LongFormNote}:${pubkey}:${d}`]);
    return s;
  }, [d, pubkey]);

  const replies = useSubscription(repliesSub, { leaveOpen: true, cache: true });

  useEffect(() => {
    addId(replies.store.notes.map(n => n.id));
  }, [replies.store]);

  function addId(id: u256[]) {
    setTrackingEvent(s => {
      const orig = new Set(s);
      if (id.some(a => !orig.has(a))) {
        const tmp = new Set([...s, ...id]);
        return Array.from(tmp);
      } else {
        return s;
      }
    });
  }

  const sub = useMemo(() => {
    const thisSub = new Subscriptions();
    thisSub.Id = `thread:${d.slice(0, 4)}:${pubkey.slice(0, 12)}`;
    thisSub.Ids = new Set(trackingEvents);

    // get replies to this event
    const subRelated = new Subscriptions();
    subRelated.Kinds = new Set(
      pref.enableReactions
        ? [EventKind.Reaction, EventKind.TextNote, EventKind.Deletion, EventKind.Repost, EventKind.ZapReceipt]
        : [EventKind.TextNote]
    );
    subRelated.ETags = thisSub.Ids;
    thisSub.AddSubscription(subRelated);

    return thisSub;
  }, [trackingEvents, pref, d, pubkey]);

  const main = useSubscription(sub, { leaveOpen: true, cache: true });

  useEffect(() => {
    if (main.store) {
      return debounce(200, () => {
        const mainNotes = main.store.notes.filter(a => a.kind === EventKind.TextNote);

        const eTags = mainNotes
          .filter(a => a.kind === EventKind.TextNote)
          .map(a => a.tags.filter(b => b[0] === "e").map(b => b[1]))
          .flat();
        const ids = mainNotes.map(a => a.id);
        const allEvents = new Set([...eTags, ...ids]);
        addId(Array.from(allEvents));
      });
    }
  }, [main.store]);

  const zapsSub = useMemo(() => {
    const s = new Subscriptions();
    s.Id = `zaps:${d.slice(0, 4)}:${pubkey.slice(0, 12)}`;
    s.Kinds = new Set([EventKind.ZapReceipt]);
    s.ATags = new Set([`${EventKind.LongFormNote}:${pubkey}:${d}`]);
    return s;
  }, [d, pubkey]);

  const zaps = useSubscription(zapsSub, { leaveOpen: true, cache: true });

  const sortedZaps = useMemo(() => {
    const sorted = zaps.store.notes.map(parseZap).filter(z => z.valid && z.zapper !== pubkey);
    sorted.sort((a, b) => b.amount - a.amount);
    return sorted;
  }, [zaps.store]);

  return { notes: main.store.notes, replies: replies.store.notes, zaps: sortedZaps };
}
