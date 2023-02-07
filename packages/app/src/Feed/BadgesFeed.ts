import { useMemo } from "react";
import { TaggedRawEvent, EventKind, HexKey, Lists, Subscriptions } from "@snort/nostr";
import useSubscription from "Feed/Subscription";
import { unwrap, findTag, chunks } from "Util";

type BadgeAwards = {
  pubkeys: string[];
  ds: string[];
};

export default function useProfileBadges(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const s = new Subscriptions();
    s.Id = `profile_badges:${pubkey.slice(0, 12)}`;
    s.Kinds = new Set([EventKind.ProfileBadges]);
    s.DTags = new Set([Lists.Badges]);
    s.Authors = new Set([pubkey]);
    return s;
  }, [pubkey]);
  const profileBadges = useSubscription(sub, { leaveOpen: true, cache: false });

  const profile = useMemo(() => {
    const sorted = [...profileBadges.store.notes];
    sorted.sort((a, b) => b.created_at - a.created_at);
    const last = sorted[0];
    if (last) {
      return chunks(
        last.tags.filter(t => t[0] === "a" || t[0] === "e"),
        2
      ).reduce((acc, [a, e]) => {
        return {
          ...acc,
          [e[1]]: a[1],
        };
      }, {});
    }
    return {};
  }, [pubkey, profileBadges.store.notes]);

  const awardsSub = useMemo(() => {
    if (!pubkey) return null;
    const s = new Subscriptions();
    s.Id = `profile_awards:${pubkey.slice(0, 12)}`;
    s.Kinds = new Set([EventKind.BadgeAward]);
    s.Ids = new Set(Object.keys(profile));
    return s;
  }, [pubkey, profileBadges.store.notes]);

  const awards = useSubscription(awardsSub);

  const { ds, pubkeys } = useMemo(() => {
    return Object.values(profile).reduce(
      (acc: BadgeAwards, addr) => {
        const [, pubkey, d] = (addr as string).split(":");
        acc.pubkeys.push(pubkey);
        acc.ds.push(d);
        return acc;
      },
      { pubkeys: [], ds: [] } as BadgeAwards
    ) as BadgeAwards;
  }, [profile]);

  const badgesSub = useMemo(() => {
    if (!pubkey) return null;
    const s = new Subscriptions();
    s.Id = `profile_awards:${pubkey.slice(0, 12)}`;
    s.Kinds = new Set([EventKind.Badge]);
    s.DTags = new Set(ds);
    s.Authors = new Set(pubkeys);
    return s;
  }, [pubkey, profile]);

  const badges = useSubscription(badgesSub, { leaveOpen: true, cache: false });

  const result = useMemo(() => {
    return awards.store.notes
      .map((award: TaggedRawEvent) => {
        const [, pubkey, d] =
          award.tags
            .find(t => t[0] === "a")
            ?.at(1)
            ?.split(":") ?? [];
        const badge = badges.store.notes.find(b => b.pubkey === pubkey && findTag(b, "d") === d);

        return {
          award,
          badge,
        };
      })
      .filter(
        ({ award, badge }) =>
          badge && award.pubkey === badge.pubkey && award.tags.find(t => t[0] === "p" && t[1] === pubkey)
      )
      .map(({ badge }) => unwrap(badge));
  }, [pubkey, awards.store.notes, badges.store.notes]);

  return result;
}
