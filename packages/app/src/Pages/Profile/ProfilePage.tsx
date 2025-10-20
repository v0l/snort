import { fetchNip05Pubkey, LNURL, NostrPrefix } from "@snort/shared";
import { CachedMetadata, tryParseNostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { ProxyImg } from "@/Components/ProxyImg";
import { SpotlightMediaModal } from "@/Components/Spotlight/SpotlightMedia";
import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import FollowsList from "@/Components/User/FollowListBase";
import MutedList from "@/Components/User/MutedList";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useLogin from "@/Hooks/useLogin";
import AvatarSection from "@/Pages/Profile/AvatarSection";
import ProfileDetails from "@/Pages/Profile/ProfileDetails";
import {
  BookMarksTab,
  FollowersTab,
  FollowsTab,
  ProfileNotesTab,
  ReactionsTab,
  RelaysTab,
  ZapsProfileTab,
} from "@/Pages/Profile/ProfileTabComponents";
import ProfileTabSelectors from "@/Pages/Profile/ProfileTabSelectors";
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
  const follows = useFollowsFeed(id);

  // tabs
  const [tab, setTab] = useState<Tab>(ProfileTabSelectors.Notes);
  const optionalTabs = [ProfileTabSelectors.Zaps, ProfileTabSelectors.Relays, ProfileTabSelectors.Bookmarks].filter(a =>
    unwrap(a),
  ) as Tab[];

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
    setTab(ProfileTabSelectors.Notes);
  }, [id, propId, params]);

  function tabContent() {
    if (!id) return null;

    switch (tab.value) {
      case ProfileTabType.NOTES:
        return <ProfileNotesTab id={id} relays={relays} isMe={isMe} />;
      case ProfileTabType.ZAPS: {
        return <ZapsProfileTab id={id} />;
      }
      case ProfileTabType.FOLLOWS: {
        if (isMe) {
          return <FollowsList pubkeys={follows ?? []} showFollowAll={!isMe} className="px-3 py-2" />;
        } else {
          return <FollowsTab id={id} />;
        }
      }
      case ProfileTabType.FOLLOWERS: {
        return <FollowersTab id={id} />;
      }
      case ProfileTabType.RELAYS: {
        return <RelaysTab id={id} />;
      }
      case ProfileTabType.BOOKMARKS: {
        return <BookMarksTab id={id} />;
      }
      case ProfileTabType.REACTIONS: {
        return <ReactionsTab id={id} />;
      }
      case ProfileTabType.MUTED: {
        return <MutedList />;
      }
    }
  }

  const bannerWidth = Math.min(window.innerWidth, 940);

  return (
    <>
      <div>
        {user?.banner && (
          <ProxyImg
            alt="banner"
            className="cursor-pointer max-h-[200px] object-cover -mb-6"
            src={user.banner}
            size={bannerWidth}
            onClick={() => setModalImage(user?.banner || "")}
            missingImageElement={<></>}
          />
        )}
        <div className="px-4">
          <AvatarSection id={id} loginPubKey={loginPubKey} user={user} readonly={readonly} lnurl={lnurl} />
          <ProfileDetails
            user={user}
            loginPubKey={loginPubKey}
            id={id}
            aboutText={aboutText}
            lnurl={lnurl}
            showLnQr={true}
          />
        </div>
      </div>
      <div>
        <TabSelectors
          tabs={[
            ProfileTabSelectors.Notes,
            ProfileTabSelectors.Reactions,
            ProfileTabSelectors.Followers,
            ProfileTabSelectors.Follows,
          ].concat(isMe ? [...optionalTabs, ProfileTabSelectors.Muted] : optionalTabs)}
          className="px-3 py-2"
          tab={tab}
          setTab={setTab}
        />
      </div>
      <div>{tabContent()}</div>
      {modalImage && <SpotlightMediaModal onClose={() => setModalImage("")} media={[modalImage]} idx={0} />}
    </>
  );
}
