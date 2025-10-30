import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { chunks, findTag, unwrap } from "@/Utils";

type BadgeAwards = {
  pubkeys: string[];
  ds: string[];
};

export default function useProfileBadges(pubkey?: string) {
  const sub = useMemo(() => {
    const b = new RequestBuilder("badges");
    if (pubkey) {
      b.withFilter().kinds([EventKind.ProfileBadges]).tag("d", ["profile_badges"]).authors([pubkey]);
    }
    return b;
  }, [pubkey]);

  const profileBadges = useRequestBuilder(sub);

  const profile = useMemo(() => {
    if (profileBadges) {
      return chunks(profileBadges[0]?.tags.filter(t => t[0] === "a" || t[0] === "e") ?? [], 2).reduce((acc, [a, e]) => {
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
        if (pubkey) {
          acc.pubkeys.push(pubkey);
        }
        if (d?.length > 0) {
          acc.ds.push(d);
        }
        return acc;
      },
      { pubkeys: [], ds: [] } as BadgeAwards,
    ) as BadgeAwards;
  }, [profile]);

  const awardsSub = useMemo(() => {
    const ids = Object.keys(profile);
    const b = new RequestBuilder(`profile_awards`);
    if (pubkey && ids.length > 0) {
      b.withFilter().kinds([EventKind.BadgeAward]).ids(ids);
      b.withFilter().kinds([EventKind.Badge]).tag("d", ds).authors(pubkeys);
    }
    return b;
  }, [profile, ds]);

  const awards = useRequestBuilder(awardsSub);

  const result = useMemo(() => {
    if (awards) {
      return awards
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
            badge && award.pubkey === badge.pubkey && award.tags.find(t => t[0] === "p" && t[1] === pubkey),
        )
        .map(({ badge }) => unwrap(badge));
    }
  }, [pubkey, awards]);

  return result ?? [];
}
