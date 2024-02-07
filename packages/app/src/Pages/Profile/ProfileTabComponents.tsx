import { EventKind, HexKey, NostrLink, NostrPrefix } from "@snort/system";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { Note } from "@/Components/Event/Note/Note";
import Zap from "@/Components/Event/Zap";
import Timeline from "@/Components/Feed/Timeline";
import RelaysMetadata from "@/Components/Relay/RelaysMetadata";
import Bookmarks from "@/Components/User/Bookmarks";
import FollowsList from "@/Components/User/FollowListBase";
import useFollowersFeed from "@/Feed/FollowersFeed";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useRelaysFeed from "@/Feed/RelaysFeed";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useZapsFeed from "@/Feed/ZapsFeed";
import { useBookmarkList, usePinList } from "@/Hooks/useLists";
import messages from "@/Pages/messages";
import { formatShort } from "@/Utils/Number";

export function ZapsProfileTab({ id }: { id: HexKey }) {
  const zaps = useZapsFeed(new NostrLink(NostrPrefix.PublicKey, id));
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  return (
    <>
      <h2 className="p">
        <FormattedMessage {...messages.Sats} values={{ n: formatShort(zapsTotal) }} />
      </h2>
      {zaps.map(z => (
        <Zap key={z.id} showZapped={false} zap={z} />
      ))}
    </>
  );
}

export function FollowersTab({ id }: { id: HexKey }) {
  const followers = useFollowersFeed(id);
  return <FollowsList pubkeys={followers} showAbout={true} className="p" />;
}

export function FollowsTab({ id }: { id: HexKey }) {
  const follows = useFollowsFeed(id);
  return <FollowsList pubkeys={follows} showAbout={true} className="p" />;
}

export function RelaysTab({ id }: { id: HexKey }) {
  const relays = useRelaysFeed(id);
  return <RelaysMetadata relays={relays} />;
}

export function BookMarksTab({ id }: { id: HexKey }) {
  const bookmarks = useBookmarkList(id);
  return <Bookmarks pubkey={id} bookmarks={bookmarks} />;
}

export function ReactionsTab({ id }: { id: HexKey }) {
  const subject = useMemo(
    () =>
      ({
        type: "pubkey",
        items: [id],
        discriminator: `reactions:${id.slice(0, 12)}`,
        kinds: [EventKind.Reaction],
      }) as TimelineSubject,
    [id],
  );
  return (
    <Timeline subject={subject} postsOnly={false} method={"LIMIT_UNTIL"} ignoreModeration={true} window={60 * 60 * 6} />
  );
}

export function ProfileNotesTab({ id, relays, isMe }: { id: HexKey; relays?: Array<string>; isMe: boolean }) {
  const pinned = usePinList(id);
  const options = useMemo(() => ({ showTime: false, showPinned: true, canUnpin: isMe }), [isMe]);
  const subject = useMemo(
    () =>
      ({
        type: "pubkey",
        items: [id],
        discriminator: `profile:${id.slice(0, 12)}`,
        relay: relays,
      }) as TimelineSubject,
    [id, relays],
  );
  return (
    <>
      {pinned
        .filter(a => a.kind === EventKind.TextNote)
        .map(n => {
          return <Note key={`pinned-${n.id}`} data={n} options={options} />;
        })}
      <Timeline
        key={id}
        subject={subject}
        postsOnly={false}
        method={"LIMIT_UNTIL"}
        ignoreModeration={true}
        window={60 * 60 * 6}
      />
    </>
  );
}
