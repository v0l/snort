import { CachedMetadata, UserMetadata } from "@snort/system";
import { ReactNode } from "react";
import { Link, LinkProps } from "react-router-dom";

import { useProfileLink } from "@/Hooks/useProfileLink";

export function ProfileLink({
  pubkey,
  user,
  explicitLink,
  children,
  ...others
}: {
  pubkey: string;
  user?: UserMetadata | CachedMetadata;
  explicitLink?: string;
  children?: ReactNode;
} & Omit<LinkProps, "to">) {
  const link = useProfileLink(pubkey, user);
  return (
    <Link {...others} to={explicitLink ?? link} state={user}>
      {children}
    </Link>
  );
}
