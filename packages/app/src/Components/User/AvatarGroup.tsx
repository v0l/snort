import { HexKey } from "@snort/system";
import React from "react";

import ProfileImage from "@/Components/User/ProfileImage";

export function AvatarGroup({ ids, onClick }: { ids: HexKey[]; onClick?: () => void }) {
  return ids.map((a, index) => (
    <div className={`inline-block ${index > 0 ? "-ml-5" : ""}`} key={a} style={{ zIndex: ids.length - index }}>
      <ProfileImage link="" onClick={onClick} showFollowDistance={false} pubkey={a} size={24} showUsername={false} />
    </div>
  ));
}
