import "./ProfilePage.css";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  encodeTLVEntries,
  EventKind,
  MetadataCache,
  NostrLink,
  NostrPrefix,
  TLVEntryType,
  tryParseNostrLink,
} from "@snort/system";
import { fetchNip05Pubkey, LNURL } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";

import { findTag, getLinkReactions, hexToBech32, parseId, unwrap } from "@/SnortUtils";
import Note from "@/Element/Event/Note";
import { Tab, TabElement } from "@/Element/Tabs";
import Icon from "@/Icons/Icon";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useProfileBadges from "@/Feed/BadgesFeed";
import useModeration from "@/Hooks/useModeration";
import FollowButton from "@/Element/User/FollowButton";
import Avatar from "@/Element/User/Avatar";
import Timeline from "@/Element/Feed/Timeline";
import Text from "@/Element/Text";
import SendSats from "@/Element/SendSats";
import Nip05 from "@/Element/User/Nip05";
import Copy from "@/Element/Copy";
import ProfileImage from "@/Element/User/ProfileImage";
import BlockList from "@/Element/User/BlockList";
import MutedList from "@/Element/User/MutedList";
import FollowsList from "@/Element/User/FollowListBase";
import IconButton from "@/Element/Button/IconButton";
import FollowsYou from "@/Element/User/FollowsYou";
import QrCode from "@/Element/QrCode";
import Modal from "@/Element/Modal";
import BadgeList from "@/Element/User/BadgeList";
import { ProxyImg } from "@/Element/ProxyImg";
import useHorizontalScroll from "@/Hooks/useHorizontalScroll";
import { EmailRegex } from "@/Const";
import useLogin from "@/Hooks/useLogin";
import { ZapTarget } from "@/Zapper";
import { useStatusFeed } from "@/Feed/StatusFeed";
import { SpotlightMediaModal } from "@/Element/Spotlight/SpotlightMedia";
import ProfileTab, {
  BookMarksTab,
  FollowersTab,
  FollowsTab,
  ProfileTabType,
  RelaysTab,
  ZapsProfileTab,
} from "@/Pages/Profile/ProfileTab";
import DisplayName from "@/Element/User/DisplayName";
import { UserWebsiteLink } from "@/Element/User/UserWebsiteLink";
import { useMuteList, usePinList } from "@/Hooks/useLists";

import messages from "../messages";
import FollowedBy from "@/Element/User/FollowedBy";
import AsyncButton from "@/Element/Button/AsyncButton";

interface ProfilePageProps {
  id?: string;
  state?: MetadataCache;
}

export default function ProfilePage({ id: propId, state }: ProfilePageProps) {
  const params = useParams();
  const location = useLocation();
  const profileState = (location.state as MetadataCache | undefined) || state;
  const navigate = useNavigate();
  const [id, setId] = useState<string | undefined>(profileState?.pubkey);
  const [relays, setRelays] = useState<Array<string>>();
  const user = useUserProfile(profileState ? undefined : id) || profileState;
  const login = useLogin();
  const loginPubKey = login.publicKey;
  const isMe = loginPubKey === id;
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const [showProfileQr, setShowProfileQr] = useState<boolean>(false);
  const [modalImage, setModalImage] = useState<string>("");
  const aboutText = user?.about || "";

  const lnurl = (() => {
    try {
      return new LNURL(user?.lud16 || user?.lud06 || "");
    } catch {
      // ignored
    }
  })();
  const showBadges = login.appData.item.preferences.showBadges ?? false;
  const showStatus = login.appData.item.preferences.showStatus ?? true;

  // feeds
  const { blocked } = useModeration();
  const pinned = usePinList(id);
  const muted = useMuteList(id);
  const badges = useProfileBadges(showBadges ? id : undefined);
  const follows = useFollowsFeed(id);
  const status = useStatusFeed(showStatus ? id : undefined, true);

  // tabs
  const [tab, setTab] = useState<Tab>(ProfileTab.Notes);
  const optionalTabs = [ProfileTab.Zaps, ProfileTab.Relays, ProfileTab.Bookmarks, ProfileTab.Muted].filter(a =>
    unwrap(a),
  ) as Tab[];
  const horizontalScroll = useHorizontalScroll();

  useEffect(() => {
    if (
      user?.nip05 &&
      user.nip05.endsWith(`@${CONFIG.nip05Domain}`) &&
      (!("isNostrAddressValid" in user) || user.isNostrAddressValid)
    ) {
      const [username] = user.nip05.split("@");
      navigate(`/${username}`, { replace: true });
    }
  }, [user]);

  useEffect(() => {
    if (!id) {
      const resolvedId = propId || params.id;
      if (resolvedId?.match(EmailRegex)) {
        const [name, domain] = resolvedId.split("@");
        fetchNip05Pubkey(name, domain).then(a => {
          setId(a);
        });
      } else {
        const nav = tryParseNostrLink(resolvedId ?? "");
        if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
          setId(nav.id);
          setRelays(nav.relays);
        } else {
          setId(parseId(resolvedId ?? ""));
        }
      }
    }
    setTab(ProfileTab.Notes);
  }, [id, propId, params]);

  function musicStatus() {
    if (!status.music) return;

    const link = findTag(status.music, "r");
    const cover = findTag(status.music, "cover");
    const inner = () => {
      return (
        <div className="flex g8">
          {cover && <ProxyImg src={cover} size={40} />}
          🎵 {unwrap(status.music).content}
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
        <div className="flex flex-col g4">
          <h2 className="flex items-center g4">
            <DisplayName user={user} pubkey={user?.pubkey ?? ""} />
            <FollowsYou followsMe={user?.pubkey !== loginPubKey && follows.includes(loginPubKey ?? "")} />
          </h2>
          {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
        </div>
        {showBadges && <BadgeList badges={badges} />}
        {showStatus && <>{musicStatus()}</>}
        <div className="link-section">{links()}</div>
      </>
    );
  }

  function links() {
    return (
      <>
        <UserWebsiteLink user={user} />
        {lnurl && (
          <div className="link lnurl f-ellipsis flex gap-2 items-center" onClick={() => setShowLnQr(true)}>
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
      case ProfileTabType.NOTES:
        return (
          <>
            {pinned
              .filter(a => a.kind === EventKind.TextNote)
              .map(n => {
                return (
                  <Note
                    key={`pinned-${n.id}`}
                    data={n}
                    related={getLinkReactions(pinned, NostrLink.fromEvent(n))}
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
                relay: relays,
              }}
              postsOnly={false}
              method={"LIMIT_UNTIL"}
              loadMore={false}
              ignoreModeration={true}
              window={60 * 60 * 6}
            />
          </>
        );
      case ProfileTabType.ZAPS: {
        return <ZapsProfileTab id={id} />;
      }
      case ProfileTabType.FOLLOWS: {
        if (isMe) {
          return <FollowsList pubkeys={follows} showFollowAll={!isMe} showAbout={false} className="p" />;
        } else {
          return <FollowsTab id={id} />;
        }
      }
      case ProfileTabType.FOLLOWERS: {
        return <FollowersTab id={id} />;
      }
      case ProfileTabType.MUTED: {
        return <MutedList pubkeys={muted.map(a => a.id)} />;
      }
      case ProfileTabType.BLOCKED: {
        return <BlockList />;
      }
      case ProfileTabType.RELAYS: {
        return <RelaysTab id={id} />;
      }
      case ProfileTabType.BOOKMARKS: {
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
          {!isMe && id && <FollowButton pubkey={id} />}
          {isMe && id && <AsyncButton className="secondary">
            <FormattedMessage defaultMessage="Edit" id="wEQDC6" />
          </AsyncButton>}
        </div>
      </div>
    );
  }

  function renderIcons() {
    if (!id) return;

    const profileId = hexToBech32(CONFIG.profileLinkPrefix, id);

    return (
      <>
        <IconButton onClick={() => setShowProfileQr(true)} icon={{ name: "qr", size: 16 }} />
        {showProfileQr && (
          <Modal id="profile-qr" className="qr-modal" onClose={() => setShowProfileQr(false)}>
            <ProfileImage pubkey={id} />
            <div className="flex flex-col items-center">
              <QrCode data={`nostr:${profileId}`} className="m10" />
              <Copy text={profileId} className="py-3" />
            </div>
          </Modal>
        )}
        {isMe ? (
          <>
            <button className="md:hidden" type="button" onClick={() => navigate("/settings")}>
              <FormattedMessage {...messages.Settings} />
            </button>
          </>
        ) : (
          <>
            {lnurl && <IconButton onClick={() => setShowLnQr(true)} icon={{ name: "zap", size: 16 }} />}
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
                  }
                  icon={{ name: "envelope", size: 16 }}
                />
              </>
            )}
          </>
        )}
      </>
    );
  }

  function userDetails() {
    if (!id) return;
    return (
      <div className="details-wrapper w-max">
        {username()}
        {bio()}
        {user?.pubkey && loginPubKey && <FollowedBy pubkey={user.pubkey} />}
      </div>
    );
  }

  function renderTab(v: Tab) {
    return <TabElement key={v.value} t={v} tab={tab} setTab={setTab} />;
  }

  const bannerWidth = Math.min(window.innerWidth, 940);

  return (
    <>
      <div className="profile">
        {user?.banner && (
          <ProxyImg
            alt="banner"
            className="banner pointer"
            src={user.banner}
            size={bannerWidth}
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
