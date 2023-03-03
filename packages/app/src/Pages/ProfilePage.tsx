import "./ProfilePage.css";
import { useEffect, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { NostrPrefix } from "@snort/nostr";

import { unwrap } from "Util";
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
import { useUserProfile } from "Hooks/useUserProfile";
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
import ProfileImage from "Element/ProfileImage";
import BlockList from "Element/BlockList";
import MutedList from "Element/MutedList";
import FollowsList from "Element/FollowListBase";
import IconButton from "Element/IconButton";
import { RootState } from "State/Store";
import FollowsYou from "Element/FollowsYou";
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";
import { ProxyImg } from "Element/ProxyImg";
import useHorizontalScroll from "Hooks/useHorizontalScroll";
import messages from "./messages";
import { EmailRegex } from "Const";
import { getNip05PubKey } from "./Login";

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
  const [id, setId] = useState<string>();
  const user = useUserProfile(id);
  const loginPubKey = useSelector((s: RootState) => s.login.publicKey);
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const aboutText = user?.about || "";
  const about = Text({
    content: aboutText,
    tags: [],
    creator: "",
  });
  const npub = !id?.startsWith("npub") ? hexToBech32("npub", id || undefined) : id;

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
    if (params.id?.match(EmailRegex)) {
      getNip05PubKey(params.id).then(a => {
        setId(a);
      });
    } else {
      setId(parseId(params.id ?? ""));
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
            {lnurl}
          </div>
        )}

        <SendSats
          lnurl={lnurl}
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
        return <FollowsList pubkeys={follows} showFollowAll={!isMe} showAbout={!isMe} />;
      }
      case FOLLOWERS: {
        return <FollowsList pubkeys={followers} showAbout={true} />;
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
          <Icon name="qr" size={16} />
        </IconButton>
        {showProfileQr && (
          <Modal className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <ProfileImage pubkey={id ?? ""} />
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
                <Icon name="zap" size={16} />
              </IconButton>
            )}
            {loginPubKey && (
              <>
                <IconButton onClick={() => navigate(`/messages/${hexToBech32(NostrPrefix.PublicKey, id)}`)}>
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
    return (
      <div className="details-wrapper">
        {username()}
        <div className="profile-actions">
          {renderIcons()}
          {!isMe && <FollowButton pubkey={id ?? ""} />}
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
