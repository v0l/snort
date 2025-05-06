import { dedupe } from "@snort/shared";
import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { AvatarGroup } from "@/Components/User/AvatarGroup";
import DisplayName from "@/Components/User/DisplayName";
import { ProfileLink } from "@/Components/User/ProfileLink";
import useFollowsControls from "@/Hooks/useFollowControls";
import useWoT from "@/Hooks/useWoT";
import { findTag } from "@/Utils";

export default function FollowSetsPage() {
  const sub = new RequestBuilder("follow-sets");
  sub.withFilter().kinds([EventKind.StarterPackSet, EventKind.FollowSet]);

  const data = useRequestBuilder(sub);
  const wot = useWoT();
  const control = useFollowsControls();
  const dataSorted = wot.sortEvents(data);

  return (
    <div className="p flex flex-col gap-4">
      {dataSorted.map(a => {
        const title = findTag(a, "title") ?? findTag(a, "d") ?? a.content;
        const pTags = wot.sortPubkeys(dedupe(a.tags.filter(a => a[0] === "p").map(a => a[1])));
        const isFollowingAll = pTags.every(a => control.isFollowing(a));
        if (pTags.length === 0) return;
        const link = NostrLink.fromEvent(a);
        return (
          <div key={a.id} className="p br bg-gray-ultradark flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="text-xl">{title}</div>
                <div className="text-gray-medium font-medium flex items-center gap-2">
                  <Link to={`/${link.encode()}`} state={a}>
                    <FormattedMessage defaultMessage="{n} people" values={{ n: pTags.length }} />
                  </Link>
                  -
                  <Link to={`/list-feed/${link.encode()}`}>
                    <FormattedMessage defaultMessage="View Feed" />
                  </Link>
                </div>
              </div>
              {!isFollowingAll && (
                <div className="flex gap-4">
                  <AsyncButton
                    className="secondary"
                    onClick={async () => {
                      await control.addFollow(pTags);
                    }}>
                    <FormattedMessage defaultMessage="Follow All" />
                  </AsyncButton>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <AvatarGroup ids={pTags.slice(0, 10)} size={40} />
            </div>
            <div>
              <FormattedMessage
                defaultMessage="<dark>Created by</dark> {name}"
                values={{
                  dark: c => <span className="text-gray-medium">{c}</span>,
                  name: (
                    <ProfileLink pubkey={a.pubkey}>
                      <DisplayName pubkey={a.pubkey} />
                    </ProfileLink>
                  ),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
