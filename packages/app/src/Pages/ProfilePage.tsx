import "./ProfilePage.css";
import { useEffect, useState } from "react";
import FormattedMessage from "Element/FormattedMessage";
import { useNavigate, useParams } from "react-router-dom";
import {
  encodeTLV,
  encodeTLVEntries,
  EventKind,
  HexKey,
  NostrLink,
  NostrPrefix,
  TLVEntryType,
  tryParseNostrLink,
} from "@snort/system";
import { LNURL } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";

import { findTag, getReactions, unwrap } from "SnortUtils";
import { formatShort } from "Number";
import Note from "Element/Event/Note";
import Bookmarks from "Element/Bookmarks";
import RelaysMetadata from "Element/Relay/RelaysMetadata";
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
import { default as ZapElement } from "Element/Event/Zap";
import FollowButton from "Element/User/FollowButton";
import { parseId, hexToBech32 } from "SnortUtils";
import Avatar from "Element/User/Avatar";
import Timeline from "Element/Feed/Timeline";
import Text from "Element/Text";
import SendSats from "Element/SendSats";
import Nip05 from "Element/User/Nip05";
import Copy from "Element/Copy";
import ProfileImage from "Element/User/ProfileImage";
import BlockList from "Element/User/BlockList";
import MutedList from "Element/User/MutedList";
import FollowsList from "Element/User/FollowListBase";
import IconButton from "Element/IconButton";
import FollowsYou from "Element/User/FollowsYou";
import QrCode from "Element/QrCode";
import Modal from "Element/Modal";
import BadgeList from "Element/User/BadgeList";
import { ProxyImg } from "Element/ProxyImg";
import useHorizontalScroll from "Hooks/useHorizontalScroll";
import { EmailRegex } from "Const";
import { getNip05PubKey } from "Pages/LoginPage";
import useLogin from "Hooks/useLogin";
import { ZapTarget } from "Zapper";
import { useStatusFeed } from "Feed/StatusFeed";

import messages from "./messages";
import { SpotlightMediaModal } from "../Element/Deck/SpotlightMedia";

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
  const zaps = useZapsFeed(new NostrLink(NostrPrefix.PublicKey, id));
  const zapsTotal = zaps.reduce((acc, z) => acc + z.amount, 0);
  return (
    <div className="main-content">
      <h2 className="p">
        <FormattedMessage {...messages.Sats} values={{ n: formatShort(zapsTotal) }} />
      </h2>
      {zaps.map(z => (
        <ZapElement showZapped={false} zap={z} />
      ))}
    </div>
  );
}

function FollowersTab({ id }: { id: HexKey }) {
  const followers = useFollowersFeed(id);
  return <FollowsList pubkeys={followers} showAbout={true} className="p" />;
}

function FollowsTab({ id }: { id: HexKey }) {
  const follows = useFollowsFeed(id);
  return <FollowsList pubkeys={follows} showAbout={true} className="p" />;
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
  const params = useParams();
  const navigate = useNavigate();
  const [id, setId] = useState<string>();
  const user = useUserProfile(id);
  const login = useLogin();
  const loginPubKey = login.publicKey;
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const [modalImage, setModalImage] = useState<string>("");
  const aboutText = user?.about || "";
  const npub = !id?.startsWith(NostrPrefix.PublicKey) ? hexToBech32(NostrPrefix.PublicKey, id || undefined) : id;

  const lnurl = (() => {
    try {
      return new LNURL(user?.lud16 || user?.lud06 || "");
    } catch {
      // ignored
    }
  })();
  const showBadges = login.preferences.showBadges ?? false;
  const showStatus = login.preferences.showStatus ?? true;

  const website_url =
    user?.website && !user.website.startsWith("http") ? "https://" + user.website : user?.website || "";
  // feeds
  const { blocked } = useModeration();
  const pinned = usePinnedFeed(id);
  const muted = useMutedFeed(id);
  const badges = useProfileBadges(showBadges ? id : undefined);
  const follows = useFollowsFeed(id);
  const status = useStatusFeed(showStatus ? id : undefined, true);

  // tabs
  const ProfileTab = {
    Notes: {
      text: (
        <>
          <Icon name="pencil" size={16} />
          <FormattedMessage defaultMessage="Notes" />
        </>
      ),
      value: NOTES,
    },
    Reactions: {
      text: (
        <>
          <Icon name="reaction" size={16} />
          <FormattedMessage defaultMessage="Reactions" />
        </>
      ),
      value: REACTIONS,
    },
    Followers: {
      text: (
        <>
          <Icon name="user-v2" size={16} />
          <FormattedMessage defaultMessage="Followers" />
        </>
      ),
      value: FOLLOWERS,
    },
    Follows: {
      text: (
        <>
          <Icon name="stars" size={16} />
          <FormattedMessage defaultMessage="Follows" />
        </>
      ),
      value: FOLLOWS,
    },
    Zaps: {
      text: (
        <>
          <Icon name="zap-solid" size={16} />
          <FormattedMessage defaultMessage="Zaps" />
        </>
      ),
      value: ZAPS,
    },
    Muted: {
      text: (
        <>
          <Icon name="mute" size={16} />
          <FormattedMessage defaultMessage="Muted" />
        </>
      ),
      value: MUTED,
    },
    Blocked: {
      text: (
        <>
          <Icon name="block" size={16} />
          <FormattedMessage defaultMessage="Blocked" />
        </>
      ),
      value: BLOCKED,
    },
    Relays: {
      text: (
        <>
          <Icon name="wifi" size={16} />
          <FormattedMessage defaultMessage="Relays" />
        </>
      ),
      value: RELAYS,
    },
    Bookmarks: {
      text: (
        <>
          <Icon name="bookmark-solid" size={16} />
          <FormattedMessage defaultMessage="Bookmarks" />
        </>
      ),
      value: BOOKMARKS,
    },
  } as { [key: string]: Tab };
  const [tab, setTab] = useState<Tab>(ProfileTab.Notes);
  const optionalTabs = [ProfileTab.Zaps, ProfileTab.Relays, ProfileTab.Bookmarks, ProfileTab.Muted].filter(a =>
    unwrap(a),
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

  function musicStatus() {
    if (!status.music) return;

    const link = findTag(status.music, "r");
    const cover = findTag(status.music, "cover");
    const inner = () => {
      return (
        <div className="flex g8">
          {cover && <ProxyImg src={cover} size={40} />}
          <small>🎵 {unwrap(status.music).content}</small>
        </div>
      );
    };
    if (link) {
      return (
        <a href={link} rel="noreferer" target="_blank" className="ext">
          {inner()}
        </a>
      );
    }
    return inner();
  }

  function username() {
    return (
      <>
        <div className="flex-column g4">
          <h2 className="flex g4">
            {user?.display_name || user?.name || "Nostrich"}
            <FollowsYou followsMe={follows.includes(loginPubKey ?? "")} />
          </h2>
          {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
        </div>
        {showBadges && <BadgeList badges={badges} />}
        {showStatus && <>{musicStatus()}</>}
        <div className="link-section">
          <Copy text={npub} />
          {links()}
        </div>
      </>
    );
  }

  function tryFormatWebsite(url: string) {
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname !== "/" ? u.pathname : ""}`;
    } catch {
      // ignore
    }
    return url;
  }

  function links() {
    return (
      <>
        {user?.website && (
          <div className="link website f-ellipsis">
            <Icon name="link-02" size={16} />
            <a href={website_url} target="_blank" rel="noreferrer">
              {tryFormatWebsite(user.website)}
            </a>
          </div>
        )}

        {lnurl && (
          <div className="link lnurl f-ellipsis" onClick={() => setShowLnQr(true)}>
            <Icon name="zapCircle" size={16} />
            {lnurl.name}
          </div>
        )}

        <SendSats
          targets={
            lnurl?.lnurl && id
              ? [
                  {
                    type: "lnurl",
                    value: lnurl?.lnurl,
                    weight: 1,
                    name: user?.display_name || user?.name,
                    zap: { pubkey: id },
                  } as ZapTarget,
                ]
              : undefined
          }
          show={showLnQr}
          onClose={() => setShowLnQr(false)}
        />
      </>
    );
  }

  function bio() {
    if (!id) return null;

    return (
      aboutText.length > 0 && (
        <div dir="auto" className="about">
          <Text
            id={id}
            content={aboutText}
            tags={[]}
            creator={id}
            disableMedia={true}
            disableLinkPreview={true}
            disableMediaSpotlight={true}
          />
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
          return <FollowsList pubkeys={follows} showFollowAll={!isMe} showAbout={false} className="p" />;
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
      <div className="avatar-wrapper w-max">
        <Avatar pubkey={id ?? ""} user={user} onClick={() => setModalImage(user?.picture || "")} className="pointer" />
        <div className="profile-actions">
          {renderIcons()}
          {!isMe && id && <FollowButton className="primary" pubkey={id} />}
        </div>
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
          <Modal id="profile-qr" className="qr-modal" onClose={() => setShowProfileQr(false)}>
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
            {loginPubKey && !login.readonly && (
              <>
                <IconButton
                  onClick={() =>
                    navigate(
                      `/messages/${encodeTLVEntries("chat4" as NostrPrefix, {
                        type: TLVEntryType.Author,
                        length: 32,
                        value: id,
                      })}`,
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
      <div className="details-wrapper w-max">
        {username()}
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
      <div className="profile">
        {user?.banner && (
          <ProxyImg
            alt="banner"
            className="banner pointer"
            src={user.banner}
            size={w}
            onClick={() => setModalImage(user.banner || "")}
          />
        )}
        <div className="profile-wrapper w-max">
          {avatar()}
          {userDetails()}
        </div>
      </div>
      <div className="main-content">
        <div className="tabs p" ref={horizontalScroll}>
          {[ProfileTab.Notes, ProfileTab.Followers, ProfileTab.Follows].map(renderTab)}
          {optionalTabs.map(renderTab)}
          {isMe && blocked.length > 0 && renderTab(ProfileTab.Blocked)}
        </div>
      </div>
      <div className="main-content">{tabContent()}</div>
      {modalImage && <SpotlightMediaModal onClose={() => setModalImage("")} images={[modalImage]} idx={0} />}
    </>
  );
}
