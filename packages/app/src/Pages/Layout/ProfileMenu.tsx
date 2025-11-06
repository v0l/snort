import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

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
          showNip05: false,
          showProfileCard: false,
          showFollowDistance: false,
          displayNameClassName: "max-xl:hidden",
          subHeader: readonly ? (
            <div className="max-xl:hidden text-heart text-sm">
              <FormattedMessage defaultMessage="Read Only" />
            </div>
          ) : undefined,
        }}
      />
    );
  }

  const itemClassName =
    "px-6 py-2 text-base font-semibold bg-layer-2 light:bg-white hover:bg-layer-3 light:hover:bg-neutral-200 cursor-pointer outline-none";

  if (!publicKey) return;
  return (
    <div className={classNames("w-full cursor-pointer", className)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <div>{profile()}</div>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="bg-layer-2 rounded-lg overflow-hidden z-[9999] min-w-48" sideOffset={5}>
            <DropdownMenu.Item
              className={itemClassName}
              onClick={e => {
                e.stopPropagation();
                navigate(link);
              }}>
              <div className="flex gap-2 items-center">
                <Icon name="user" />
                <FormattedMessage defaultMessage="Profile" />
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item className="px-6 py-2 uppercase text-xs font-medium text-gray-light bg-layer-2 light:bg-white outline-none cursor-default">
              <FormattedMessage defaultMessage="Switch accounts" />
            </DropdownMenu.Item>
            {logins
              .filter(a => a.pubkey !== publicKey)
              .map(a => (
                <DropdownMenu.Item key={a.id} className={itemClassName}>
                  <ProfileImage
                    pubkey={a.pubkey}
                    link=""
                    size={24}
                    showBadges={false}
                    showProfileCard={false}
                    showFollowDistance={false}
                    onClick={e => {
                      e.stopPropagation();
                      LoginStore.switchAccount(a.id);
                    }}
                  />
                </DropdownMenu.Item>
              ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
