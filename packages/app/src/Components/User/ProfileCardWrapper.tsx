import type { UserMetadata } from "@snort/system";
import type { ReactNode } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";

import { ProfileCard } from "./ProfileCard";

interface ProfileCardWrapperProps {
  pubkey: string;
  user?: UserMetadata;
  children: ReactNode;
}

export function ProfileCardWrapper({ pubkey, user, children }: ProfileCardWrapperProps) {
  return (
    <HoverCard.Root openDelay={100} closeDelay={300}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content className="z-[9999]" sideOffset={5}>
          <ProfileCard pubkey={pubkey} user={user} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
