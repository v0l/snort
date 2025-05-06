import classNames from "classnames";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import ProfilePreview, { ProfilePreviewProps } from "@/Components/User/ProfilePreview";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";
import useWoT from "@/Hooks/useWoT";

import AsyncButton from "../Button/AsyncButton";

export interface FollowListBaseProps {
  pubkeys: string[];
  title?: ReactNode;
  showFollowAll?: boolean;
  className?: string;
  actions?: ReactNode;
  profilePreviewProps?: Omit<ProfilePreviewProps, "pubkey">;
}

export default function FollowListBase({
  pubkeys,
  title,
  showFollowAll,
  className,
  actions,
  profilePreviewProps,
}: FollowListBaseProps) {
  const control = useFollowsControls();
  const readonly = useLogin(s => s.readonly);
  const wot = useWoT();

  async function followAll() {
    await control.addFollow(pubkeys);
  }

  return (
    <div className="flex flex-col gap-2">
      {(showFollowAll ?? true) && (
        <div className="flex items-center">
          <div className="grow font-bold text-xl">{title}</div>
          {actions}
          <AsyncButton className="transparent" type="button" onClick={() => followAll()} disabled={readonly}>
            <FormattedMessage defaultMessage="Follow All" />
          </AsyncButton>
        </div>
      )}
      <div className={classNames("flex flex-col gap-2", className)}>
        {wot.sortPubkeys(pubkeys).map(a => (
          <ProfilePreview pubkey={a} key={a} {...profilePreviewProps} />
        ))}
      </div>
    </div>
  );
}
