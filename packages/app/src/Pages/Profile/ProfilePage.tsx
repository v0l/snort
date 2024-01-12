import "./ProfilePage.css";

import { fetchNip05Pubkey, LNURL } from "@snort/shared";
import { CachedMetadata, EventKind, NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Note from "@/Components/Event/EventComponent";
import Timeline from "@/Components/Feed/Timeline";
import { ProxyImg } from "@/Components/ProxyImg";
import { SpotlightMediaModal } from "@/Components/Spotlight/SpotlightMedia";
import { Tab, TabElement } from "@/Components/Tabs/Tabs";
import BlockList from "@/Components/User/BlockList";
import FollowsList from "@/Components/User/FollowListBase";
import MutedList from "@/Components/User/MutedList";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useHorizontalScroll from "@/Hooks/useHorizontalScroll";
import { useMuteList, usePinList } from "@/Hooks/useLists";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import AvatarSection from "@/Pages/Profile/AvatarSection";
import ProfileDetails from "@/Pages/Profile/ProfileDetails";
import ProfileTab from "@/Pages/Profile/ProfileTab";
import { BookMarksTab, FollowersTab, FollowsTab, RelaysTab, ZapsProfileTab } from "@/Pages/Profile/ProfileTabs";
import { ProfileTabType } from "@/Pages/Profile/ProfileTabType";
import { parseId, unwrap } from "@/Utils";
import { EmailRegex } from "@/Utils/Const";

interface ProfilePageProps {
  id?: string;
  state?: CachedMetadata;
}

export default function ProfilePage({ id: propId, state }: ProfilePageProps) {
  const params = useParams();
  const location = useLocation();
  const profileState = (location.state as CachedMetadata | undefined) || state;
  const navigate = useNavigate();
  const [id, setId] = useState<string | undefined>(profileState?.pubkey);
  const [relays, setRelays] = useState<Array<string>>();
  const user = useUserProfile(profileState ? undefined : id) || profileState;
  const { loginPubKey, readonly } = useLogin(s => ({
    loginPubKey: s.publicKey,
    readonly: s.readonly,
  }));
  const isMe = loginPubKey === id;
  const [modalImage, setModalImage] = useState<string>("");
  const aboutText = user?.about || "";

  const lnurl = useMemo(() => {
    try {
      return new LNURL(user?.lud16 || user?.lud06 || "");
    } catch {
      // ignored
    }
  }, [user]);

  // feeds
  const { blocked } = useModeration();
  const pinned = usePinList(id);
  const muted = useMuteList(id);
  const follows = useFollowsFeed(id);

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
                    options={{ showTime: false, showPinned: true, canUnpin: isMe }}
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
            onClick={() => setModalImage(user?.banner || "")}
            missingImageElement={<></>}
          />
        )}
        <div className="profile-wrapper w-max">
          <AvatarSection id={id} loginPubKey={loginPubKey} user={user} readonly={readonly} lnurl={lnurl} />
          <ProfileDetails user={user} loginPubKey={loginPubKey} id={id} aboutText={aboutText} lnurl={lnurl} />
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
      {modalImage && <SpotlightMediaModal onClose={() => setModalImage("")} media={[modalImage]} idx={0} />}
    </>
  );
}
