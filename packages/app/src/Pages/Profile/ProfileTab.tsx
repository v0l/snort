import { FormattedMessage } from "react-intl";
import { EventKind, HexKey, NostrLink, NostrPrefix } from "@snort/system";

import useZapsFeed from "Feed/ZapsFeed";
import { formatShort } from "Number";
import useFollowersFeed from "Feed/FollowersFeed";
import FollowsList from "Element/User/FollowListBase";
import useFollowsFeed from "Feed/FollowsFeed";
import useRelaysFeed from "Feed/RelaysFeed";
import RelaysMetadata from "Element/Relay/RelaysMetadata";
import useBookmarkFeed from "Feed/BookmarkFeed";
import Bookmarks from "Element/User/Bookmarks";
import Icon from "Icons/Icon";
import { Tab } from "Element/Tabs";
import { default as ZapElement } from "Element/Event/Zap";

import messages from "../messages";

export enum ProfileTabType {
  NOTES = 0,
  REACTIONS = 1,
  FOLLOWERS = 2,
  FOLLOWS = 3,
  ZAPS = 4,
  MUTED = 5,
  BLOCKED = 6,
  RELAYS = 7,
  BOOKMARKS = 8,
}

export function ZapsProfileTab({ id }: { id: HexKey }) {
  const zaps = useZapsFeed(new NostrLink(NostrPrefix.PublicKey, id));
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  return (
    <>
      <h2 className="p">
        <FormattedMessage {...messages.Sats} values={{ n: formatShort(zapsTotal) }} />
      </h2>
      {zaps.map(z => (
        <ZapElement showZapped={false} zap={z} />
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
  const bookmarks = useBookmarkFeed(id);
  return (
    <Bookmarks
      pubkey={id}
      bookmarks={bookmarks.filter(e => e.kind === EventKind.TextNote)}
      related={bookmarks.filter(e => e.kind !== EventKind.TextNote)}
    />
  );
}

const ProfileTab = {
  Notes: {
    text: (
      <>
        <Icon name="pencil" size={16} />
        <FormattedMessage defaultMessage="Notes" />
      </>
    ),
    value: ProfileTabType.NOTES,
  },
  Reactions: {
    text: (
      <>
        <Icon name="reaction" size={16} />
        <FormattedMessage defaultMessage="Reactions" />
      </>
    ),
    value: ProfileTabType.REACTIONS,
  },
  Followers: {
    text: (
      <>
        <Icon name="user-v2" size={16} />
        <FormattedMessage defaultMessage="Followers" />
      </>
    ),
    value: ProfileTabType.FOLLOWERS,
  },
  Follows: {
    text: (
      <>
        <Icon name="stars" size={16} />
        <FormattedMessage defaultMessage="Follows" />
      </>
    ),
    value: ProfileTabType.FOLLOWS,
  },
  Zaps: {
    text: (
      <>
        <Icon name="zap-solid" size={16} />
        <FormattedMessage defaultMessage="Zaps" />
      </>
    ),
    value: ProfileTabType.ZAPS,
  },
  Muted: {
    text: (
      <>
        <Icon name="mute" size={16} />
        <FormattedMessage defaultMessage="Muted" />
      </>
    ),
    value: ProfileTabType.MUTED,
  },
  Blocked: {
    text: (
      <>
        <Icon name="block" size={16} />
        <FormattedMessage defaultMessage="Blocked" />
      </>
    ),
    value: ProfileTabType.BLOCKED,
  },
  Relays: {
    text: (
      <>
        <Icon name="wifi" size={16} />
        <FormattedMessage defaultMessage="Relays" />
      </>
    ),
    value: ProfileTabType.RELAYS,
  },
  Bookmarks: {
    text: (
      <>
        <Icon name="bookmark-solid" size={16} />
        <FormattedMessage defaultMessage="Bookmarks" />
      </>
    ),
    value: ProfileTabType.BOOKMARKS,
  },
} as { [key: string]: Tab };

export default ProfileTab;
