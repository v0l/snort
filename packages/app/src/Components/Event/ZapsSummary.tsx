import { ParsedZap } from "@snort/system";
import { useMemo } from "react";

import { AvatarGroup } from "@/Components/User/AvatarGroup";
import { dedupe } from "@/Utils";

interface ZapsSummaryProps {
  zaps: ParsedZap[];
}
export const ZapsSummary = ({ zaps }: ZapsSummaryProps) => {
  const sortedZappers = useMemo(() => {
    const pub = [...zaps.filter(z => z.sender && z.valid)];
    const priv = [...zaps.filter(z => !z.sender && z.valid)];
    pub.sort((a, b) => b.amount - a.amount);
    return dedupe(pub.concat(priv).map(z => z.sender)).slice(0, 3);
  }, [zaps]) as string[];

  if (zaps.length === 0) {
    return null;
  }

  return (
    <div className="zaps-summary">
      <div className={`top-zap`}>
        <div className="summary">
          <AvatarGroup ids={sortedZappers} />
          {zaps.length > 3 && <div className="hidden md:flex -ml-2">+{zaps.length - 3}</div>}
        </div>
      </div>
    </div>
  );
};
