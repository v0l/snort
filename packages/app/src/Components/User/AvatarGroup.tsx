import { HexKey } from "@snort/system";
import React from "react";

import ProfileImage from "@/Components/User/ProfileImage";

export function AvatarGroup({ ids, onClick, size }: { ids: HexKey[]; onClick?: () => void, size?: number }) {
  return ids.map((a, index) => (
    <div className={`inline-block ${index > 0 ? "-ml-4" : ""}`} key={a} style={{ zIndex: ids.length - index }}>
      <ProfileImage link="" onClick={onClick} showFollowDistance={false} pubkey={a} size={size ?? 24} showUsername={false} />
    </div>
  ));
}
