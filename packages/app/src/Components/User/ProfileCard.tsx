import { UserMetadata } from "@snort/system";

import Text from "@/Components/Text/Text";
import FollowedBy from "@/Components/User/FollowedBy";

import useLogin from "../../Hooks/useLogin";
import { UserDebug } from "./Debug";
import FollowButton from "./FollowButton";
import ProfileImage from "./ProfileImage";
import { UserWebsiteLink } from "./UserWebsiteLink";

export function ProfileCard({ pubkey, user }: { pubkey: string; user?: UserMetadata }) {
  const { publicKey: myPublicKey } = useLogin(s => ({ publicKey: s.publicKey }));
  const debug = Boolean(localStorage.getItem("debug"));

  return (
    <div className="w-[360px] layer-2 overflow-hidden">
      <div className="flex flex-col gap-2 text-white px-3 py-2 light:text-black">
        <div className="flex justify-between">
          <ProfileImage pubkey={pubkey} profile={user} showProfileCard={false} link="" showNip05={false} />
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
