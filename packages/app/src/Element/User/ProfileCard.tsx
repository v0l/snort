import "./ProfileCard.css";

import { ControlledMenu } from "@szhsin/react-menu";
import { UserMetadata } from "@snort/system";

import FollowButton from "./FollowButton";
import ProfileImage from "./ProfileImage";
import { UserWebsiteLink } from "./UserWebsiteLink";
import Text from "@/Element/Text";
import { useEffect, useState } from "react";
import useLogin from "../../Hooks/useLogin";

interface RectElement {
  getBoundingClientRect(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  };
}

export function ProfileCard({
  pubkey,
  user,
  show,
  ref,
  delay,
}: {
  pubkey: string;
  user?: UserMetadata;
  show: boolean;
  ref: React.RefObject<Element | RectElement>;
  delay?: number;
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [t, setT] = useState<ReturnType<typeof setTimeout>>();
  const { publicKey: myPublicKey } = useLogin(s => ({ publicKey: s.publicKey }));

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
    <ControlledMenu
      state={showProfileMenu ? "open" : "closed"}
      anchorRef={ref}
      menuClassName="profile-card"
      onClose={() => setShowProfileMenu(false)}
      align="end">
      <div className="flex flex-col g8">
        <div className="flex justify-between">
          <ProfileImage pubkey={pubkey} profile={user} showProfileCard={false} link="" />
          <div className="flex g8">
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
      </div>
    </ControlledMenu>
  );
}
