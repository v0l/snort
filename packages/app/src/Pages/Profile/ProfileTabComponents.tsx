import { EventKind, NostrLink, ParsedZap } from "@snort/system";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { Note } from "@/Components/Event/Note/Note";
import Timeline from "@/Components/Feed/Timeline";
import { RelayFavicon } from "@/Components/Relay/RelaysMetadata";
import Bookmarks from "@/Components/User/Bookmarks";
import FollowsList from "@/Components/User/FollowListBase";
import ProfilePreview from "@/Components/User/ProfilePreview";
import ZapAmount from "@/Components/zap-amount";
import useFollowersFeed from "@/Feed/FollowersFeed";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useRelaysFeed from "@/Feed/RelaysFeed";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useZapsFeed from "@/Feed/ZapsFeed";
import { useBookmarkList, usePinList } from "@/Hooks/useLists";
import { NostrPrefix } from "@snort/shared";

export function ZapsProfileTab({ id }: { id: string }) {
  const zaps = useZapsFeed(new NostrLink(NostrPrefix.PublicKey, id));
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const fromGrouped = zaps.reduce(
    (acc, v) => {
      if (!v.sender) return acc;
      acc[v.sender] ??= [];
      acc[v.sender].push(v);
      return acc;
    },
    {} as Record<string, Array<ParsedZap>>,
  );

  return (
    <>
      <div className="px-3 py-2 text-2xl font-medium flex justify-between">
        <div>
          <FormattedMessage defaultMessage="Profile Zaps" />
        </div>
        <ZapAmount n={zapsTotal} />
      </div>
      {Object.entries(fromGrouped)
        .map(a => ({
          pubkey: a[0],
          total: a[1].reduce((acc, v) => acc + v.amount, 0),
          topZap: a[1].reduce((acc, v) => (v.amount > acc.amount ? v : acc), a[1][0]),
          zaps: a[1],
        }))
        .sort((a, b) => {
          return b.total > a.total ? 1 : -1;
        })
        .map(a => (
          <div
            className="px-4 py-1 hover:bg-neutral-800 cursor:pointer rounded-lg flex items-center justify-between"
            key={a.pubkey}>
            <ProfilePreview
              pubkey={a.pubkey}
              profileImageProps={{
                subHeader: a.topZap.content ? <div className="about">&quot;{a.topZap.content}&quot;</div> : undefined,
              }}
              options={{
                about: false,
              }}
              actions={<></>}
            />
            <div>
              <ZapAmount n={a.total} />
            </div>
          </div>
        ))}
    </>
  );
}

export function FollowersTab({ id }: { id: string }) {
  const followers = useFollowersFeed(id);
  return (
    <FollowsList
      pubkeys={followers.map(a => a.pubkey)}
      className="px-3 py-2 flex flex-col gap-1"
      profilePreviewProps={{
        options: {
          about: true,
        },
      }}
    />
  );
}

export function FollowsTab({ id }: { id: string }) {
  const follows = useFollowsFeed(id);
  return (
    <FollowsList
      pubkeys={follows}
      className="px-3 py-2 flex flex-col gap-1"
      profilePreviewProps={{
        options: {
          about: true,
        },
      }}
    />
  );
}

export function RelaysTab({ id }: { id: string }) {
  const relays = useRelaysFeed(id);
  return (
    <div className="flex flex-col gap-1">
      {relays?.map(({ url, settings }) => {
        return (
          <div key={url} className="flex gap-2 layer-1">
            <RelayFavicon url={url} />
            <code className="grow f-ellipsis">{url}</code>
            <div className="flex gap-2">
              {settings.read && <span>R</span>}
              {settings.write && <span>W</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BookMarksTab({ id }: { id: string }) {
  const bookmarks = useBookmarkList(id);
  return <Bookmarks pubkey={id} bookmarks={bookmarks} />;
}

export function ReactionsTab({ id }: { id: string }) {
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

export function ProfileNotesTab({ id, relays, isMe }: { id: string; relays?: Array<string>; isMe: boolean }) {
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
