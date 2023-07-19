import "./ProfilePage.css";
import { useEffect, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import {
  encodeTLV,
  encodeTLVEntries,
  EventKind,
  HexKey,
  NostrPrefix,
  TLVEntryType,
  tryParseNostrLink,
} from "@snort/system";
import { LNURL } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";

import { getReactions, unwrap } from "SnortUtils";
import { formatShort } from "Number";
import Note from "Element/Note";
import Bookmarks from "Element/Bookmarks";
import RelaysMetadata from "Element/RelaysMetadata";
import { Tab, TabElement } from "Element/Tabs";
import Icon from "Icons/Icon";
import useMutedFeed from "Feed/MuteList";
import useRelaysFeed from "Feed/RelaysFeed";
import usePinnedFeed from "Feed/PinnedFeed";
import useBookmarkFeed from "Feed/BookmarkFeed";
import useFollowersFeed from "Feed/FollowersFeed";
import useFollowsFeed from "Feed/FollowsFeed";
import useProfileBadges from "Feed/BadgesFeed";
import useModeration from "Hooks/useModeration";
import useZapsFeed from "Feed/ZapsFeed";
import { default as ZapElement } from "Element/Zap";
import FollowButton from "Element/FollowButton";
import { parseId, hexToBech32 } from "SnortUtils";
import Avatar from "Element/Avatar";
import Timeline from "Element/Timeline";
import Text from "Element/Text";
import SendSats from "Element/SendSats";
import Nip05 from "Element/Nip05";
import Copy from "Element/Copy";
import ProfileImage from "Element/ProfileImage";
import BlockList from "Element/BlockList";
import MutedList from "Element/MutedList";
import FollowsList from "Element/FollowListBase";
import IconButton from "Element/IconButton";
import FollowsYou from "Element/FollowsYou";
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";
import BadgeList from "Element/BadgeList";
import { ProxyImg } from "Element/ProxyImg";
import useHorizontalScroll from "Hooks/useHorizontalScroll";
import { EmailRegex } from "Const";
import { getNip05PubKey } from "Pages/LoginPage";
import useLogin from "Hooks/useLogin";

import messages from "./messages";
import { System } from "index";

const NOTES = 0;
const REACTIONS = 1;
const FOLLOWERS = 2;
const FOLLOWS = 3;
const ZAPS = 4;
const MUTED = 5;
const BLOCKED = 6;
const RELAYS = 7;
const BOOKMARKS = 8;

function ZapsProfileTab({ id }: { id: HexKey }) {
  const zaps = useZapsFeed(id);
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  return (
    <div className="main-content">
      <div className="zaps-total">
        <FormattedMessage {...messages.Sats} values={{ n: formatShort(zapsTotal) }} />
      </div>
      {zaps.map(z => (
        <ZapElement showZapped={false} zap={z} />
      ))}
    </div>
  );
}

function FollowersTab({ id }: { id: HexKey }) {
  const followers = useFollowersFeed(id);
  return <FollowsList pubkeys={followers} showAbout={true} />;
}

function FollowsTab({ id }: { id: HexKey }) {
  const follows = useFollowsFeed(id);
  return <FollowsList pubkeys={follows} showAbout={true} />;
}

function RelaysTab({ id }: { id: HexKey }) {
  const relays = useRelaysFeed(id);
  return <RelaysMetadata relays={relays} />;
}

function BookMarksTab({ id }: { id: HexKey }) {
  const bookmarks = useBookmarkFeed(id);
  return (
    <Bookmarks
      pubkey={id}
      bookmarks={bookmarks.filter(e => e.kind === EventKind.TextNote)}
      related={bookmarks.filter(e => e.kind !== EventKind.TextNote)}
    />
  );
}

export default function ProfilePage() {
  const { formatMessage } = useIntl();
  const params = useParams();
  const navigate = useNavigate();
  const [id, setId] = useState<string>();
  const user = useUserProfile(System, id);
  const loginPubKey = useLogin().publicKey;
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const aboutText = user?.about || "";
  const about = Text({
    content: aboutText,
    tags: [],
    creator: "",
    disableMedia: true,
  });
  const npub = !id?.startsWith(NostrPrefix.PublicKey) ? hexToBech32(NostrPrefix.PublicKey, id || undefined) : id;

  const lnurl = (() => {
    try {
      return new LNURL(user?.lud16 || user?.lud06 || "");
    } catch {
      // ignored
    }
  })();
  const website_url =
    user?.website && !user.website.startsWith("http") ? "https://" + user.website : user?.website || "";
  // feeds
  const { blocked } = useModeration();
  const pinned = usePinnedFeed(id);
  const muted = useMutedFeed(id);
  const badges = useProfileBadges(id);
  const follows = useFollowsFeed(id);
  // tabs
  const ProfileTab = {
    Notes: { text: formatMessage({ defaultMessage: "Notes" }), value: NOTES },
    Reactions: { text: formatMessage(messages.Reactions), value: REACTIONS },
    Followers: { text: formatMessage(messages.Followers), value: FOLLOWERS },
    Follows: { text: formatMessage(messages.Follows), value: FOLLOWS },
    Zaps: { text: formatMessage(messages.Zaps), value: ZAPS },
    Muted: { text: formatMessage(messages.Muted), value: MUTED },
    Blocked: { text: formatMessage(messages.BlockedCount, { n: blocked.length }), value: BLOCKED },
    Relays: { text: formatMessage(messages.Relays), value: RELAYS },
    Bookmarks: { text: formatMessage(messages.Bookmarks), value: BOOKMARKS },
  };
  const [tab, setTab] = useState<Tab>(ProfileTab.Notes);
  const optionalTabs = [ProfileTab.Zaps, ProfileTab.Relays, ProfileTab.Bookmarks, ProfileTab.Muted].filter(a =>
    unwrap(a)
  ) as Tab[];
  const horizontalScroll = useHorizontalScroll();

  useEffect(() => {
    if (params.id?.match(EmailRegex)) {
      getNip05PubKey(params.id).then(a => {
        setId(a);
      });
    } else {
      const nav = tryParseNostrLink(params.id ?? "");
      if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
        // todo: use relays if any for nprofile
        setId(nav.id);
      } else {
        setId(parseId(params.id ?? ""));
      }
    }
    setTab(ProfileTab.Notes);
  }, [params]);

  function username() {
    return (
      <div className="name">
        <h2>
          {user?.display_name || user?.name || "Nostrich"}
          <FollowsYou followsMe={follows.includes(loginPubKey ?? "")} />
        </h2>
        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
        <BadgeList badges={badges} />
        <Copy text={npub} />
        {links()}
      </div>
    );
  }

  function links() {
    return (
      <div className="links">
        {user?.website && (
          <div className="website f-ellipsis">
            <Icon name="link" />
            <a href={website_url} target="_blank" rel="noreferrer">
              {user.website}
            </a>
          </div>
        )}

        {lnurl && (
          <div className="lnurl f-ellipsis" onClick={() => setShowLnQr(true)}>
            <Icon name="zap" />
            {lnurl.name}
          </div>
        )}

        <SendSats
          lnurl={lnurl?.lnurl}
          show={showLnQr}
          onClose={() => setShowLnQr(false)}
          author={id}
          target={user?.display_name || user?.name}
        />
      </div>
    );
  }

  function bio() {
    return (
      aboutText.length > 0 && (
        <div dir="auto" className="details">
          {about}
        </div>
      )
    );
  }

  function tabContent() {
    if (!id) return null;

    switch (tab.value) {
      case NOTES:
        return (
          <>
            {pinned
              .filter(a => a.kind === EventKind.TextNote)
              .map(n => {
                return (
                  <Note
                    key={`pinned-${n.id}`}
                    data={n}
                    related={getReactions(pinned, n.id)}
                    options={{ showTime: false, showPinned: true, canUnpin: id === loginPubKey }}
                  />
                );
              })}
            <Timeline
              key={id}
              subject={{
                type: "pubkey",
                items: [id],
                discriminator: id.slice(0, 12),
              }}
              postsOnly={false}
              method={"LIMIT_UNTIL"}
              loadMore={false}
              ignoreModeration={true}
              window={60 * 60 * 6}
            />
          </>
        );
      case ZAPS: {
        return <ZapsProfileTab id={id} />;
      }
      case FOLLOWS: {
        if (isMe) {
          return <FollowsList pubkeys={follows} showFollowAll={!isMe} showAbout={false} />;
        } else {
          return <FollowsTab id={id} />;
        }
      }
      case FOLLOWERS: {
        return <FollowersTab id={id} />;
      }
      case MUTED: {
        return <MutedList pubkeys={muted} />;
      }
      case BLOCKED: {
        return <BlockList />;
      }
      case RELAYS: {
        return <RelaysTab id={id} />;
      }
      case BOOKMARKS: {
        return <BookMarksTab id={id} />;
      }
    }
  }

  function avatar() {
    return (
      <div className="avatar-wrapper">
        <Avatar user={user} />
      </div>
    );
  }

  function renderIcons() {
    if (!id) return;

    const link = encodeTLV(NostrPrefix.Profile, id);
    return (
      <div className="icon-actions">
        <IconButton onClick={() => setShowProfileQr(true)}>
          <Icon name="qr" size={16} />
        </IconButton>
        {showProfileQr && (
          <Modal className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <ProfileImage pubkey={id} />
            <QrCode data={link} className="m10 align-center" />
            <Copy text={link} className="align-center" />
          </Modal>
        )}
        {isMe ? (
          <>
            <button type="button" onClick={() => navigate("/settings")}>
              <FormattedMessage {...messages.Settings} />
            </button>
          </>
        ) : (
          <>
            {lnurl && (
              <IconButton onClick={() => setShowLnQr(true)}>
                <Icon name="zap" size={16} />
              </IconButton>
            )}
            {loginPubKey && (
              <>
                <IconButton
                  onClick={() =>
                    navigate(
                      `/messages/${encodeTLVEntries("chat4" as NostrPrefix, {
                        type: TLVEntryType.Author,
                        length: 64,
                        value: id,
                      })}`
                    )
                  }>
                  <Icon name="envelope" size={16} />
                </IconButton>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  function userDetails() {
    if (!id) return;
    return (
      <div className="details-wrapper">
        {username()}
        <div className="profile-actions">
          {renderIcons()}
          {!isMe && <FollowButton pubkey={id} />}
        </div>
        {bio()}
      </div>
    );
  }

  function renderTab(v: Tab) {
    return <TabElement key={v.value} t={v} tab={tab} setTab={setTab} />;
  }

  const w = window.document.querySelector(".page")?.clientWidth;
  return (
    <>
      <div className="profile flex">
        {user?.banner && <ProxyImg alt="banner" className="banner" src={user.banner} size={w} />}
        <div className="profile-wrapper flex">
          {avatar()}
          {userDetails()}
        </div>
      </div>
      <div className="main-content">
        <div className="tabs" ref={horizontalScroll}>
          {[ProfileTab.Notes, ProfileTab.Followers, ProfileTab.Follows].map(renderTab)}
          {optionalTabs.map(renderTab)}
          {isMe && blocked.length > 0 && renderTab(ProfileTab.Blocked)}
        </div>
      </div>
      <div className="main-content">{tabContent()}</div>
    </>
  );
}
