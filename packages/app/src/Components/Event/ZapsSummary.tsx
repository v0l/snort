import { ParsedZap } from "@snort/system";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import messages from "@/Components/messages";
import ProfileImage from "@/Components/User/ProfileImage";

interface ZapsSummaryProps {
  zaps: ParsedZap[];
}
export const ZapsSummary = ({ zaps }: ZapsSummaryProps) => {
  const { formatMessage } = useIntl();
  const sortedZaps = useMemo(() => {
    const pub = [...zaps.filter(z => z.sender && z.valid)];
    const priv = [...zaps.filter(z => !z.sender && z.valid)];
    pub.sort((a, b) => b.amount - a.amount);
    return pub.concat(priv);
  }, [zaps]);

  if (zaps.length === 0) {
    return null;
  }

  const [topZap, ...restZaps] = sortedZaps;
  const { sender, amount, anonZap } = topZap;

  return (
    <div className="zaps-summary">
      {amount && (
        <div className={`top-zap`}>
          <div className="summary">
            {sender && (
              <ProfileImage
                pubkey={anonZap ? "" : sender}
                showFollowDistance={false}
                overrideUsername={anonZap ? formatMessage({ defaultMessage: "Anonymous", id: "LXxsbk" }) : undefined}
              />
            )}
            {restZaps.length > 0 ? (
              <FormattedMessage {...messages.Others} values={{ n: restZaps.length }} />
            ) : (
              <FormattedMessage {...messages.Zapped} />
            )}{" "}
            <FormattedMessage {...messages.OthersZapped} values={{ n: restZaps.length }} />
          </div>
        </div>
      )}
    </div>
  );
};
