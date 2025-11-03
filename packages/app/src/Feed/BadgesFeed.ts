import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useEventFeed, useEventsFeed, useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { findTag, unwrap } from "@/Utils";
import { NostrPrefix, removeUndefined } from "@snort/shared";

type BadgeAwards = {
  pubkeys: string[];
  ds: string[];
};

export default function useProfileBadges(pubkey: string) {
  const profileBadgesLink = new NostrLink(NostrPrefix.Address, "profile_badges", EventKind.ProfileBadges, pubkey);
  const profileBadges = useEventFeed(profileBadgesLink);
  const links = NostrLink.fromTags(profileBadges?.tags ?? []);
  const linkedEvents = useEventsFeed(`badges:${pubkey}`, links);

  // filter badge award events to selected profile badges
  const validBadgeAwards = useMemo(() => {
    const selectedBadges = links.filter(a => a.type === NostrPrefix.Address && a.kind === EventKind.Badge);
    const wasAwardedByAuthorBadges = selectedBadges.filter(a => {
      const awardEvent = linkedEvents.find(
        b =>
          b.kind === EventKind.BadgeAward &&
          b.pubkey === a.author! &&
          b.tags.some(c => c[0] === "p" && c[1] === pubkey),
      );
      return awardEvent !== undefined;
    });
    return wasAwardedByAuthorBadges;
  }, [links, linkedEvents]);
  return removeUndefined(validBadgeAwards.map(a => linkedEvents.find(b => a.matchesEvent(b))));
}
