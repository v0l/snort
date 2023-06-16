import { useMemo } from "react";
import { EventKind, HexKey, Lists, RequestBuilder, FlatNoteStore, ReplaceableNoteStore } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import { unwrap, findTag, chunks } from "SnortUtils";
import { System } from "index";

type BadgeAwards = {
  pubkeys: string[];
  ds: string[];
};

export default function useProfileBadges(pubkey?: HexKey) {
  const sub = useMemo(() => {
    if (!pubkey) return null;
    const b = new RequestBuilder(`badges:${pubkey.slice(0, 12)}`);
    b.withFilter().kinds([EventKind.ProfileBadges]).tag("d", [Lists.Badges]).authors([pubkey]);
    return b;
  }, [pubkey]);

  const profileBadges = useRequestBuilder<ReplaceableNoteStore>(System, ReplaceableNoteStore, sub);

  const profile = useMemo(() => {
    if (profileBadges.data) {
      return chunks(
        profileBadges.data.tags.filter(t => t[0] === "a" || t[0] === "e"),
        2
      ).reduce((acc, [a, e]) => {
        return {
          ...acc,
          [e[1]]: a[1],
        };
      }, {});
    }
    return {};
  }, [profileBadges]);

  const { ds, pubkeys } = useMemo(() => {
    return Object.values(profile).reduce(
      (acc: BadgeAwards, addr) => {
        const [, pubkey, d] = (addr as string).split(":");
        acc.pubkeys.push(pubkey);
        if (d?.length > 0) {
          acc.ds.push(d);
        }
        return acc;
      },
      { pubkeys: [], ds: [] } as BadgeAwards
    ) as BadgeAwards;
  }, [profile]);

  const awardsSub = useMemo(() => {
    const ids = Object.keys(profile);
    if (!pubkey || ids.length === 0) return null;
    const b = new RequestBuilder(`profile_awards:${pubkey.slice(0, 12)}`);
    b.withFilter().kinds([EventKind.BadgeAward]).ids(ids);
    b.withFilter().kinds([EventKind.Badge]).tag("d", ds).authors(pubkeys);
    return b;
  }, [profile, ds]);

  const awards = useRequestBuilder<FlatNoteStore>(System, FlatNoteStore, awardsSub);

  const result = useMemo(() => {
    if (awards.data) {
      return awards.data
        .map((award, _, arr) => {
          const [, pubkey, d] =
            award.tags
              .find(t => t[0] === "a")
              ?.at(1)
              ?.split(":") ?? [];
          const badge = arr.find(b => b.pubkey === pubkey && findTag(b, "d") === d);

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
    }
  }, [pubkey, awards]);

  return result ?? [];
}
