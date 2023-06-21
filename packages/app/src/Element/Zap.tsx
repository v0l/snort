import "./Zap.css";
import { useMemo } from "react";
import { ParsedZap } from "@snort/system";
import { FormattedMessage, useIntl } from "react-intl";

import { unwrap } from "SnortUtils";
import { formatShort } from "Number";
import Text from "Element/Text";
import ProfileImage from "Element/ProfileImage";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

const Zap = ({ zap, showZapped = true }: { zap: ParsedZap; showZapped?: boolean }) => {
  const { amount, content, sender, valid, receiver } = zap;
  const pubKey = useLogin().publicKey;

  return valid && sender ? (
    <div className="zap note card">
      <div className="header">
        <ProfileImage pubkey={sender} />
        {receiver !== pubKey && showZapped && <ProfileImage pubkey={unwrap(receiver)} />}
        <div className="amount">
          <span className="amount-number">
            <FormattedMessage {...messages.Sats} values={{ n: formatShort(amount ?? 0) }} />
          </span>
        </div>
      </div>
      {(content?.length ?? 0) > 0 && sender && (
        <div className="body">
          <Text creator={sender} content={unwrap(content)} tags={[]} />
        </div>
      )}
    </div>
  ) : null;
};

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
                overrideUsername={anonZap ? formatMessage({ defaultMessage: "Anonymous" }) : undefined}
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

export default Zap;
