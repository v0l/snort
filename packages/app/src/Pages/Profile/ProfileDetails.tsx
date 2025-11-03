import { LNURL } from "@snort/shared";
import { CachedMetadata } from "@snort/system";
import { useState } from "react";

import Icon from "@/Components/Icons/Icon";
import Text from "@/Components/Text/Text";
import { ProfileBadges } from "@/Components/User/BadgeList";
import DisplayName from "@/Components/User/DisplayName";
import FollowedBy from "@/Components/User/FollowedBy";
import FollowsYou from "@/Components/User/FollowsYou";
import Nip05 from "@/Components/User/Nip05";
import { UserWebsiteLink } from "@/Components/User/UserWebsiteLink";
import ZapModal from "@/Components/ZapModal/ZapModal";
import useFollowsFeed from "@/Feed/FollowsFeed";
import usePreferences from "@/Hooks/usePreferences";
import { MusicStatus } from "@/Pages/Profile/MusicStatus";

const ProfileDetails = ({
  user,
  loginPubKey,
  id,
  aboutText,
  lnurl,
}: {
  user?: CachedMetadata;
  loginPubKey?: string;
  showLnQr: boolean;
  id?: string;
  aboutText: string;
  lnurl?: LNURL;
}) => {
  const follows = useFollowsFeed(id);
  const { showStatus, showBadges } = usePreferences(s => ({
    showStatus: s.showStatus ?? false,
    showBadges: s.showBadges ?? false,
  }));
  const [showLnQr, setShowLnQr] = useState<boolean>(false);

  if (!user) {
    return null;
  }

  const username = () => (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2">
          <DisplayName user={user} pubkey={user?.pubkey ?? ""} />
          <FollowsYou followsMe={user?.pubkey !== loginPubKey && follows.includes(loginPubKey ?? "")} />
        </h2>
        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
      </div>
      {showBadges && id && <ProfileBadges pubkey={id} />}
      {showStatus && id && <MusicStatus id={id} />}
      {links()}
    </>
  );

  const links = () => (
    <div className="flex flex-col gap-1">
      <UserWebsiteLink user={user} />
      {lnurl && (
        <div className="flex gap-2 items-center" onClick={() => setShowLnQr(true)}>
          <Icon name="zapCircle" size={16} />
          <div className="text-ellipsis overflow-hidden hover:underline cursor-pointer">{lnurl.name}</div>
        </div>
      )}
      <ZapModal
        targets={
          lnurl?.lnurl && id
            ? [
                {
                  type: "lnurl",
                  value: lnurl?.lnurl,
                  weight: 1,
                  name: user?.display_name || user?.name,
                  zap: { pubkey: id, anon: false },
                },
              ]
            : undefined
        }
        show={showLnQr}
        onClose={() => setShowLnQr(false)}
      />
    </div>
  );

  const bio = () =>
    aboutText.length > 0 && (
      <Text
        id={id ?? user?.pubkey ?? "unknown-profile-about"}
        content={aboutText}
        tags={[]}
        creator={id!}
        disableMedia={true}
        disableLinkPreview={true}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      {username()}
      {bio()}
      {user?.pubkey && loginPubKey && (
        <FollowedBy
          pubkey={user.pubkey}
          showUsername={false}
          link=""
          showFollowDistance={false}
          showProfileCard={false}
          size={24}
        />
      )}
    </div>
  );
};

export default ProfileDetails;
