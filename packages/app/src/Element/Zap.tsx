import "./Zap.css";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { HexKey, TaggedRawEvent } from "System";

import { decodeInvoice, InvoiceDetails, sha256, unwrap } from "SnortUtils";
import { formatShort } from "Number";
import Text from "Element/Text";
import ProfileImage from "Element/ProfileImage";
import { findTag } from "SnortUtils";
import { UserCache } from "Cache/UserCache";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

function getInvoice(zap: TaggedRawEvent): InvoiceDetails | undefined {
  const bolt11 = findTag(zap, "bolt11");
  if (!bolt11) {
    throw new Error("Invalid zap, missing bolt11 tag");
  }
  return decodeInvoice(bolt11);
}

export function parseZap(zapReceipt: TaggedRawEvent, refNote?: TaggedRawEvent): ParsedZap {
  let innerZapJson = findTag(zapReceipt, "description");
  if (innerZapJson) {
    try {
      const invoice = getInvoice(zapReceipt);
      if (innerZapJson.startsWith("%")) {
        innerZapJson = decodeURIComponent(innerZapJson);
      }
      const zapRequest: TaggedRawEvent = JSON.parse(innerZapJson);
      if (Array.isArray(zapRequest)) {
        // old format, ignored
        throw new Error("deprecated zap format");
      }
      const isForwardedZap = refNote?.tags.some(a => a[0] === "zap") ?? false;
      const anonZap = zapRequest.tags.find(a => a[0] === "anon");
      const metaHash = sha256(innerZapJson);
      const pollOpt = zapRequest.tags.find(a => a[0] === "poll_option")?.[1];
      const ret: ParsedZap = {
        id: zapReceipt.id,
        zapService: zapReceipt.pubkey,
        amount: (invoice?.amount ?? 0) / 1000,
        event: findTag(zapRequest, "e"),
        sender: zapRequest.pubkey,
        receiver: findTag(zapRequest, "p"),
        valid: true,
        anonZap: anonZap !== undefined,
        content: zapRequest.content,
        errors: [],
        pollOption: pollOpt ? Number(pollOpt) : undefined,
      };
      if (invoice?.descriptionHash !== metaHash) {
        ret.valid = false;
        ret.errors.push("description_hash does not match zap request");
      }
      if (findTag(zapRequest, "p") !== findTag(zapReceipt, "p")) {
        ret.valid = false;
        ret.errors.push("p tags dont match");
      }
      if (ret.event && ret.event !== findTag(zapReceipt, "e")) {
        ret.valid = false;
        ret.errors.push("e tags dont match");
      }
      if (findTag(zapRequest, "amount") === invoice?.amount) {
        ret.valid = false;
        ret.errors.push("amount tag does not match invoice amount");
      }
      if (UserCache.getFromCache(ret.receiver)?.zapService !== ret.zapService && !isForwardedZap) {
        ret.valid = false;
        ret.errors.push("zap service pubkey doesn't match");
      }
      return ret;
    } catch (e) {
      // ignored: console.debug("Invalid zap", zapReceipt, e);
    }
  }
  return {
    id: zapReceipt.id,
    zapService: zapReceipt.pubkey,
    amount: 0,
    valid: false,
    anonZap: false,
    errors: ["invalid zap, parsing failed"],
  };
}

export interface ParsedZap {
  id: HexKey;
  event?: HexKey;
  receiver?: HexKey;
  amount: number;
  content?: string;
  sender?: HexKey;
  valid: boolean;
  zapService: HexKey;
  anonZap: boolean;
  errors: Array<string>;
  pollOption?: number;
}

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
