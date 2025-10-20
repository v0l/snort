import { ParsedZap } from "@snort/system";
import React, { useMemo } from "react";

import { AvatarGroup } from "@/Components/User/AvatarGroup";
import { dedupe } from "@/Utils";

interface ZapsSummaryProps {
  zaps: ParsedZap[];
  onClick: () => void;
}
export const ZapsSummary = ({ zaps, onClick }: ZapsSummaryProps) => {
  const sortedZappers = useMemo(() => {
    const pub = [...zaps.filter(z => z.sender && z.valid)];
    const priv = [...zaps.filter(z => !z.sender && z.valid)];
    pub.sort((a, b) => b.amount - a.amount);
    return dedupe(pub.concat(priv).map(z => z.sender)).slice(0, 3);
  }, [zaps]) as string[];

  if (zaps.length === 0) {
    return null;
  }

  const myOnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div className="flex items-center cursor-pointer" onClick={myOnClick}>
      <AvatarGroup
        ids={sortedZappers}
        onClick={() => {}}
        showUsername={false}
        size={24}
        showBadges={false}
        showFollowDistance={false}
      />
      {zaps.length > 3 && <div className="hidden md:inline-flex">+{zaps.length - 3}</div>}
    </div>
  );
};
