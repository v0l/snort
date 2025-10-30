import { dedupe } from "@snort/shared";
import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { AutoLoadMore } from "@/Components/Event/LoadMore";
import { AvatarGroup } from "@/Components/User/AvatarGroup";
import DisplayName from "@/Components/User/DisplayName";
import { ProfileLink } from "@/Components/User/ProfileLink";
import useFollowsControls from "@/Hooks/useFollowControls";
import useWoT from "@/Hooks/useWoT";
import { findTag } from "@/Utils";

export default function FollowSetsPage() {
  const sub = new RequestBuilder("follow-sets");
  sub.withFilter().kinds([EventKind.StarterPackSet, EventKind.FollowSet]);
  const { formatMessage } = useIntl();

  const data = useRequestBuilder(sub);
  const wot = useWoT();
  const control = useFollowsControls();
  const dataSorted = wot.sortEvents(data);
  const [showN, setShowN] = useState(10);
  const [search, setSearch] = useState("");

  const filtered = dataSorted.filter(s => {
    if (search) {
      const ss = search.toLowerCase();
      return s.content.toLowerCase().includes(ss) || s.tags.some(t => t[1].toLowerCase().includes(ss));
    } else {
      return true;
    }
  });
  return (
    <div className="px-3 py-2 flex flex-col gap-4">
      <input
        type="text"
        placeholder={formatMessage({ defaultMessage: "Search sets.." })}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {filtered.slice(0, showN).map(a => {
        const title = findTag(a, "title") ?? findTag(a, "d") ?? a.content;
        const pTags = wot.sortPubkeys(dedupe(a.tags.filter(a => a[0] === "p").map(a => a[1])));
        const isFollowingAll = pTags.every(a => control.isFollowing(a));
        if (pTags.length === 0) return;
        const link = NostrLink.fromEvent(a);
        return (
          <div key={a.id} className="px-3 py-2 rounded-lg bg-layer-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="text-xl">{title}</div>
                <div className="text-neutral-500 font-medium flex items-center gap-2">
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
            <AvatarGroup ids={pTags.slice(0, 10)} size={40} />
            <div>
              <FormattedMessage
                defaultMessage="<dark>Created by</dark> {name}"
                values={{
                  dark: c => <span className="text-neutral-500">{c}</span>,
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
      {filtered.length > showN && <AutoLoadMore onClick={() => setShowN(n => n + 10)} />}
    </div>
  );
}
