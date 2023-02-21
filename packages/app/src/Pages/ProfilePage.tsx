import "./ProfilePage.css";
import { useEffect, useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { unwrap } from "Util";
import { formatShort } from "Number";
import Note from "Element/Note";
import Bookmarks from "Element/Bookmarks";
import RelaysMetadata from "Element/RelaysMetadata";
import { Tab, TabElement } from "Element/Tabs";
import Link from "Icons/Link";
import Qr from "Icons/Qr";
import Zap from "Icons/Zap";
import Envelope from "Icons/Envelope";
import useMutedFeed from "Feed/MuteList";
import useRelaysFeed from "Feed/RelaysFeed";
import usePinnedFeed from "Feed/PinnedFeed";
import useBookmarkFeed from "Feed/BookmarkFeed";
import useFollowersFeed from "Feed/FollowersFeed";
import useFollowsFeed from "Feed/FollowsFeed";
import { useUserProfile } from "Feed/ProfileFeed";
import useModeration from "Hooks/useModeration";
import useZapsFeed from "Feed/ZapsFeed";
import { default as ZapElement } from "Element/Zap";
import FollowButton from "Element/FollowButton";
import { extractLnAddress, parseId, hexToBech32 } from "Util";
import Avatar from "Element/Avatar";
import Timeline from "Element/Timeline";
import Text from "Element/Text";
import SendSats from "Element/SendSats";
import Nip05 from "Element/Nip05";
import Copy from "Element/Copy";
import ProfilePreview from "Element/ProfilePreview";
import ProfileImage from "Element/ProfileImage";
import BlockList from "Element/BlockList";
import MutedList from "Element/MutedList";
import FollowsList from "Element/FollowListBase";
import IconButton from "Element/IconButton";
import { RootState } from "State/Store";
import { HexKey, NostrPrefix } from "@snort/nostr";
import FollowsYou from "Element/FollowsYou";
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";
import { ProxyImg } from "Element/ProxyImg";
import useHorizontalScroll from "Hooks/useHorizontalScroll";
import messages from "./messages";

const NOTES = 0;
const REACTIONS = 1;
const FOLLOWERS = 2;
const FOLLOWS = 3;
const ZAPS = 4;
const MUTED = 5;
const BLOCKED = 6;
const RELAYS = 7;
const BOOKMARKS = 8;

export default function ProfilePage() {
  const { formatMessage } = useIntl();
  const params = useParams();
  const navigate = useNavigate();
  const id = useMemo(() => parseId(params.id ?? ""), [params]);
  const user = useUserProfile(id);
  const loggedOut = useSelector<RootState, boolean | undefined>(s => s.login.loggedOut);
  const loginPubKey = useSelector<RootState, HexKey | undefined>(s => s.login.publicKey);
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const aboutText = user?.about || "";
  const about = Text({
    content: aboutText,
    tags: [],
    users: new Map(),
    creator: "",
  });
  const npub = !id.startsWith("npub") ? hexToBech32("npub", id || undefined) : id;

  const lnurl = extractLnAddress(user?.lud16 || user?.lud06 || "");
  const website_url =
    user?.website && !user.website.startsWith("http") ? "https://" + user.website : user?.website || "";
  // feeds
  const { blocked } = useModeration();
  const { notes: pinned, related: pinRelated } = usePinnedFeed(id);
  const { notes: bookmarks, related: bookmarkRelated } = useBookmarkFeed(id);
  const relays = useRelaysFeed(id);
  const zaps = useZapsFeed(id);
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  const followers = useFollowersFeed(id);
  const follows = useFollowsFeed(id);
  const muted = useMutedFeed(id);
  // tabs
  const ProfileTab = {
    Notes: { text: formatMessage(messages.Notes), value: NOTES },
    Reactions: { text: formatMessage(messages.Reactions), value: REACTIONS },
    Followers: { text: formatMessage(messages.FollowersCount, { n: followers.length }), value: FOLLOWERS },
    Follows: { text: formatMessage(messages.FollowsCount, { n: follows.length }), value: FOLLOWS },
    Zaps: { text: formatMessage(messages.ZapsCount, { n: zaps.length }), value: ZAPS },
    Muted: { text: formatMessage(messages.MutedCount, { n: muted.length }), value: MUTED },
    Blocked: { text: formatMessage(messages.BlockedCount, { n: blocked.length }), value: BLOCKED },
    Relays: { text: formatMessage(messages.RelaysCount, { n: relays.length }), value: RELAYS },
    Bookmarks: { text: formatMessage(messages.BookmarksCount, { n: bookmarks.length }), value: BOOKMARKS },
  };
  const [tab, setTab] = useState<Tab>(ProfileTab.Notes);
  const optionalTabs = [
    zapsTotal > 0 && ProfileTab.Zaps,
    relays.length > 0 && ProfileTab.Relays,
    bookmarks.length > 0 && ProfileTab.Bookmarks,
    muted.length > 0 && ProfileTab.Muted,
  ].filter(a => unwrap(a)) as Tab[];
  const horizontalScroll = useHorizontalScroll();

  useEffect(() => {
    setTab(ProfileTab.Notes);
  }, [params]);

  function username() {
    return (
      <div className="name">
        <h2>
          {user?.display_name || user?.name || "Nostrich"}
          <FollowsYou followsMe={follows.includes(id)} />
        </h2>
        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
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
            <span className="link-icon">
              <Link />
            </span>
            <a href={website_url} target="_blank" rel="noreferrer">
              {user.website}
            </a>
          </div>
        )}

        {lnurl && (
          <div className="lnurl f-ellipsis" onClick={() => setShowLnQr(true)}>
            <span className="link-icon">
              <Zap />
            </span>
            {lnurl}
          </div>
        )}

        <SendSats
          svc={lnurl}
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
    switch (tab.value) {
      case NOTES:
        return (
          <>
            <div className="main-content">
              {pinned.map(n => {
                return (
                  <Note
                    key={`pinned-${n.id}`}
                    data={n}
                    related={pinRelated}
                    options={{ showTime: false, showPinned: true, canUnpin: id === loginPubKey }}
                  />
                );
              })}
            </div>
            <Timeline
              key={id}
              subject={{
                type: "pubkey",
                items: [id],
                discriminator: id.slice(0, 12),
              }}
              postsOnly={false}
              method={"TIME_RANGE"}
              ignoreModeration={true}
              window={60 * 60 * 6}
            />
          </>
        );
      case ZAPS: {
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

      case FOLLOWS: {
        return (
          <div className="main-content">
            {follows.map(a => (
              <ProfilePreview key={a} pubkey={a.toLowerCase()} options={{ about: !isMe }} />
            ))}
          </div>
        );
      }
      case FOLLOWERS: {
        return <FollowsList pubkeys={followers} />;
      }
      case MUTED: {
        return <MutedList pubkeys={muted} />;
      }
      case BLOCKED: {
        return <BlockList />;
      }
      case RELAYS: {
        return <RelaysMetadata relays={relays} />;
      }
      case BOOKMARKS: {
        return <Bookmarks pubkey={id} bookmarks={bookmarks} related={bookmarkRelated} />;
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
    return (
      <div className="icon-actions">
        <IconButton onClick={() => setShowProfileQr(true)}>
          <Qr width={14} height={16} />
        </IconButton>
        {showProfileQr && (
          <Modal className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <ProfileImage pubkey={id} />
            <QrCode
              data={`nostr:${hexToBech32(NostrPrefix.PublicKey, id)}`}
              link={undefined}
              className=" m10 align-center"
            />
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
                <Zap width={14} height={16} />
              </IconButton>
            )}
            {!loggedOut && (
              <>
                <IconButton onClick={() => navigate(`/messages/${hexToBech32(NostrPrefix.PublicKey, id)}`)}>
                  <Envelope width={16} height={13} />
                </IconButton>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  function userDetails() {
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
      {tabContent()}
    </>
  );
}
