import { HexKey, NostrLink, NostrPrefix } from "@snort/system";
import { FormattedMessage } from "react-intl";

import Zap from "@/Components/Event/Zap";
import RelaysMetadata from "@/Components/Relay/RelaysMetadata";
import Bookmarks from "@/Components/User/Bookmarks";
import FollowsList from "@/Components/User/FollowListBase";
import useFollowersFeed from "@/Feed/FollowersFeed";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useRelaysFeed from "@/Feed/RelaysFeed";
import useZapsFeed from "@/Feed/ZapsFeed";
import { useBookmarkList } from "@/Hooks/useLists";
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
