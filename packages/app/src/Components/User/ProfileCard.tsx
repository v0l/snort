import { UserMetadata } from "@snort/system";
import { ControlledMenu } from "@szhsin/react-menu";
import { useEffect, useState } from "react";

import "@szhsin/react-menu/dist/index.css";
import Text from "@/Components/Text/Text";
import FollowedBy from "@/Components/User/FollowedBy";

import useLogin from "../../Hooks/useLogin";
import { UserDebug } from "./Debug";
import FollowButton from "./FollowButton";
import ProfileImage from "./ProfileImage";
import { UserWebsiteLink } from "./UserWebsiteLink";

export function ProfileCard({
  pubkey,
  user,
  show,
  delay,
}: {
  pubkey: string;
  user?: UserMetadata;
  show: boolean;
  delay?: number;
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(true);
  const [t, setT] = useState<ReturnType<typeof setTimeout>>();
  const { publicKey: myPublicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const debug = Boolean(localStorage.getItem("debug"));

  useEffect(() => {
    if (show) {
      const tn = setTimeout(() => {
        setShowProfileMenu(true);
      }, delay ?? 1000);
      setT(tn);
    } else {
      if (t) {
        clearTimeout(t);
        setT(undefined);
      }
    }
  }, [show]);

  if (!show && !showProfileMenu) return;
  return (
    <div className="relative w-[360px] rounded-2xl bg-neutral-900 light:bg-neutral-200 shadow-md z-[42]">
      <div className="flex flex-col gap-2 text-white px-3 py-2 light:text-black">
        <div className="flex justify-between">
          <ProfileImage pubkey={pubkey} profile={user} showProfileCard={false} link="" />
          <div className="flex gap-2">
            {/*<button type="button" onClick={() => {
                        LoginStore.loginWithPubkey(pubkey, LoginSessionType.PublicKey, undefined, undefined, undefined, true);
                    }}>
                        <FormattedMessage defaultMessage="Stalk" />
                    </button>*/}
            {myPublicKey !== pubkey && <FollowButton pubkey={pubkey} />}
          </div>
        </div>
        <Text
          id={`profile-card-${pubkey}`}
          content={user?.about ?? ""}
          creator={pubkey}
          tags={[]}
          disableMedia={true}
          disableLinkPreview={true}
          truncate={250}
        />
        <UserWebsiteLink user={user} />
        {myPublicKey && (
          <FollowedBy
            pubkey={pubkey}
            showUsername={false}
            link=""
            showFollowDistance={false}
            showProfileCard={false}
            size={24}
          />
        )}
        {debug && <UserDebug pubkey={pubkey} />}
      </div>
    </div>
  );
}
