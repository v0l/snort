import { EventExt, NostrLink, TaggedNostrEvent } from "@snort/system";
import React, { ReactNode } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router-dom";

import { UserCache } from "@/Cache";
import messages from "@/Components/messages";
import DisplayName from "@/Components/User/DisplayName";
import { ProfileLink } from "@/Components/User/ProfileLink";

import { ClientTag } from "./ClientTag";
import { hexToBech32, NostrPrefix } from "@snort/shared";

export default function ReplyTag({ ev }: { ev: TaggedNostrEvent }) {
  const { formatMessage } = useIntl();
  const thread = EventExt.extractThread(ev);
  if (thread === undefined) {
    return <ClientTag ev={ev} />;
  }

  const maxMentions = 2;
  const replyTo = thread?.replyTo ?? thread?.root;
  const replyLink = replyTo
    ? NostrLink.fromTag(
        [replyTo.key, replyTo.value ?? "", replyTo.relay ?? "", replyTo.marker ?? ""].filter(a => a.length > 0),
      )
    : undefined;
  const mentions: { pk: string; name: string; link: ReactNode }[] = [];
  for (const pk of thread?.pubKeys ?? []) {
    const u = UserCache.getFromCache(pk);
    const npub = hexToBech32(NostrPrefix.PublicKey, pk);
    const shortNpub = npub.substring(0, 12);
    mentions.push({
      pk,
      name: u?.name ?? shortNpub,
      link: (
        <ProfileLink pubkey={pk} user={u}>
          <DisplayName pubkey={pk} user={u} className="text-highlight" />
        </ProfileLink>
      ),
    });
  }
  mentions.sort(a => (a.name.startsWith(NostrPrefix.PublicKey) ? 1 : -1));
  const othersLength = mentions.length - maxMentions;
  const renderMention = (m: { link: React.ReactNode; pk: string; name: string }, idx: number) => {
    return (
      <React.Fragment key={m.pk}>
        {idx > 0 && ", "}
        {m.link}
      </React.Fragment>
    );
  };
  const pubMentions =
    mentions.length > maxMentions ? mentions?.slice(0, maxMentions).map(renderMention) : mentions?.map(renderMention);
  const others = mentions.length > maxMentions ? formatMessage(messages.Others, { n: othersLength }) : "";
  const link = replyLink?.encode(CONFIG.eventLinkPrefix);
  return (
    <small className="text-xs">
      re:&nbsp;
      {(mentions?.length ?? 0) > 0 ? (
        <>
          {pubMentions} {others}
        </>
      ) : (
        replyLink && <Link to={`/${link}`}>{link?.substring(0, 12)}</Link>
      )}
      <ClientTag ev={ev} />
    </small>
  );
}
