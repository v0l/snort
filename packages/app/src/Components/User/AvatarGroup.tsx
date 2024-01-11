import { HexKey } from "@snort/system";
import React from "react";

import ProfileImage from "@/Components/User/ProfileImage";

export function AvatarGroup({ ids }: { ids: HexKey[] }) {
  return ids.map((a, index) => (
    <div className={`inline-block ${index > 0 ? "-ml-5" : ""}`} key={a} style={{ zIndex: ids.length - index }}>
      <ProfileImage showFollowDistance={false} pubkey={a} size={24} showUsername={false} />
    </div>
  ));
}
