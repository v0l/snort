import { Menu, MenuItem } from "@szhsin/react-menu";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import Icon from "@/Components/Icons/Icon";
import ProfileImage from "@/Components/User/ProfileImage";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useLogin from "@/Hooks/useLogin";
import { useProfileLink } from "@/Hooks/useProfileLink";
import useWindowSize from "@/Hooks/useWindowSize";
import { LoginStore } from "@/Utils/Login";

export default function ProfileMenu({ className }: { className?: string }) {
  const { publicKey, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));
  const logins = LoginStore.getSessions();
  const navigate = useNavigate();
  const link = useProfileLink(publicKey);

  const pageSize = useWindowSize();
  const isNarrow = pageSize.width <= 1280; //xl
  function profile() {
    return (
      <ProfilePreview
        pubkey={publicKey!}
        className={isNarrow ? "!justify-center" : ""}
        actions={<>{!isNarrow && <Icon name="arrowFront" className="rotate-90 align-end" size={14} />}</>}
        profileImageProps={{
          size: 40,
          link: "",
          showBadges: false,
          showProfileCard: false,
          showFollowDistance: false,
          displayNameClassName: "max-xl:hidden",
          subHeader: readonly ? (
            <div className="max-xl:hidden text-nostr-red text-sm">
              <FormattedMessage defaultMessage="Read Only" />
            </div>
          ) : undefined,
        }}
      />
    );
  }

  if (!publicKey) return;
  return (
    <div className={classNames("w-full cursor-pointer", className)}>
      <Menu menuButton={profile()} menuClassName="ctx-menu no-icons">
        <div className="close-menu-container">
          <MenuItem>
            <div className="close-menu" />
          </MenuItem>
        </div>
        <MenuItem onClick={() => navigate(link)}>
          <div className="flex gap-2 items-center">
            <Icon name="user" />
            <FormattedMessage defaultMessage="Profile" />
          </div>
        </MenuItem>
        <MenuItem className="!uppercase !text-xs !font-medium !text-gray-light">
          <FormattedMessage defaultMessage="Switch accounts" />
        </MenuItem>
        {logins
          .filter(a => a.pubkey !== publicKey)
          .map(a => (
            <MenuItem key={a.id}>
              <ProfileImage
                pubkey={a.pubkey}
                link=""
                size={24}
                showBadges={false}
                showProfileCard={false}
                showFollowDistance={false}
                onClick={() => LoginStore.switchAccount(a.id)}
              />
            </MenuItem>
          ))}
        <MenuItem>
          <AsyncButton className="!bg-gray-light !text-white">
            <FormattedMessage defaultMessage="Add Account" />
          </AsyncButton>
        </MenuItem>
      </Menu>
    </div>
  );
}
