import classNames from "classnames";
import { type ReactNode, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import ProfilePreview, { type ProfilePreviewProps } from "@/Components/User/ProfilePreview";
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
  pageSize?: number;
}

export default function FollowListBase({
  pubkeys,
  title,
  showFollowAll,
  className,
  actions,
  profilePreviewProps,
  pageSize = 50,
}: FollowListBaseProps) {
  const control = useFollowsControls();
  const readonly = useLogin(s => s.readonly);
  const wot = useWoT();
  const [currentPage, setCurrentPage] = useState(1);

  const sortedPubkeys = useMemo(() => wot.sortPubkeys(pubkeys), [pubkeys, wot]);

  const totalPages = Math.ceil(sortedPubkeys.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPagePubkeys = sortedPubkeys.slice(startIndex, endIndex);

  async function followAll() {
    await control.addFollow(pubkeys);
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <>
      <div className={classNames("flex flex-col gap-2", className)}>
        {(showFollowAll ?? true) && (
          <div className="flex items-center">
            <div className="grow font-bold text-xl">{title}</div>
            {actions}
            <AsyncButton className="transparent" type="button" onClick={() => followAll()} disabled={readonly}>
              <FormattedMessage defaultMessage="Follow All" />
            </AsyncButton>
          </div>
        )}
        {currentPagePubkeys.map(a => (
          <ProfilePreview pubkey={a} key={a} {...profilePreviewProps} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 mb-10">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
            <FormattedMessage defaultMessage="Previous" />
          </button>
          <span className="text-sm">
            <FormattedMessage
              defaultMessage="Page {current} of {total} ({count} items)"
              values={{ current: currentPage, total: totalPages, count: sortedPubkeys.length }}
            />
          </span>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
            <FormattedMessage defaultMessage="Next" />
          </button>
        </div>
      )}
    </>
  );
}
