import { LNURL } from "@snort/shared";
import { CachedMetadata } from "@snort/system";
import React, { useState } from "react";

import Icon from "@/Components/Icons/Icon";
import Text from "@/Components/Text/Text";
import BadgeList from "@/Components/User/BadgeList";
import DisplayName from "@/Components/User/DisplayName";
import FollowedBy from "@/Components/User/FollowedBy";
import FollowsYou from "@/Components/User/FollowsYou";
import Nip05 from "@/Components/User/Nip05";
import { UserWebsiteLink } from "@/Components/User/UserWebsiteLink";
import ZapModal from "@/Components/ZapModal/ZapModal";
import useProfileBadges from "@/Feed/BadgesFeed";
import useFollowsFeed from "@/Feed/FollowsFeed";
import useLogin from "@/Hooks/useLogin";
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
  const { showStatus, showBadges } = useLogin(s => ({
    showStatus: s.appData.json.preferences.showStatus ?? false,
    showBadges: s.appData.json.preferences.showBadges ?? false,
  }));
  const [showLnQr, setShowLnQr] = useState<boolean>(false);
  const badges = useProfileBadges(showBadges ? id : undefined);

  if (!user) {
    return null;
  }

  const username = () => (
    <>
      <div className="flex flex-col g4">
        <h2 className="flex items-center g4">
          <DisplayName user={user} pubkey={user?.pubkey ?? ""} />
          <FollowsYou followsMe={user?.pubkey !== loginPubKey && follows.includes(loginPubKey ?? "")} />
        </h2>
        {user?.nip05 && <Nip05 nip05={user.nip05} pubkey={user.pubkey} />}
      </div>
      {showBadges && <BadgeList badges={badges} />}
      {showStatus && <MusicStatus id={id} />}
      <div className="link-section">{links()}</div>
    </>
  );

  const links = () => (
    <>
      <UserWebsiteLink user={user} />
      {lnurl && (
        <div className="link lnurl f-ellipsis flex gap-2 items-center" onClick={() => setShowLnQr(true)}>
          <Icon name="zapCircle" size={16} />
          {lnurl.name}
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
    </>
  );

  const bio = () =>
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
    );

  return (
    <div className="details-wrapper w-max">
      {username()}
      {bio()}
      {user?.pubkey && loginPubKey && <FollowedBy pubkey={user.pubkey} />}
    </div>
  );
};

export default ProfileDetails;
