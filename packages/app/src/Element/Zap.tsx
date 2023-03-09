import "./Zap.css";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useSelector } from "react-redux";
import { HexKey, TaggedRawEvent } from "@snort/nostr";

import { decodeInvoice, InvoiceDetails, sha256, unwrap } from "Util";
import { formatShort } from "Number";
import Text from "Element/Text";
import ProfileImage from "Element/ProfileImage";
import { RootState } from "State/Store";
import { ZapperSpam } from "Const";
import { UserCache } from "State/Users/UserCache";

import messages from "./messages";

function findTag(e: TaggedRawEvent, tag: string) {
  const maybeTag = e.tags.find(evTag => {
    return evTag[0] === tag;
  });
  return maybeTag && maybeTag[1];
}

function getInvoice(zap: TaggedRawEvent): InvoiceDetails | undefined {
  const bolt11 = findTag(zap, "bolt11");
  if (!bolt11) {
    throw new Error("Invalid zap, missing bolt11 tag");
  }
  return decodeInvoice(bolt11);
}

export function parseZap(zapReceipt: TaggedRawEvent): ParsedZap {
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
      const anonZap = findTag(zapRequest, "anon");
      const metaHash = sha256(innerZapJson);
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
      };
      if (invoice?.descriptionHash !== metaHash) {
        ret.valid = false;
        ret.errors.push("description_hash does not match zap request");
      }
      if (ZapperSpam.includes(zapReceipt.pubkey)) {
        ret.valid = false;
        ret.errors.push("zapper is banned");
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
      if (UserCache.get(ret.receiver)?.zapService !== ret.zapService) {
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
}

const Zap = ({ zap, showZapped = true }: { zap: ParsedZap; showZapped?: boolean }) => {
  const { amount, content, sender, valid, receiver } = zap;
  const pubKey = useSelector((s: RootState) => s.login.publicKey);

  return valid && sender ? (
    <div className="zap note card">
      <div className="header">
        <ProfileImage autoWidth={false} pubkey={sender} />
        {receiver !== pubKey && showZapped && <ProfileImage autoWidth={false} pubkey={unwrap(receiver)} />}
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
                autoWidth={false}
                pubkey={anonZap ? "" : sender}
                overrideUsername={anonZap ? formatMessage({ defaultMessage: "Anonymous" }) : undefined}
              />
            )}
            {restZaps.length > 0 && <FormattedMessage {...messages.Others} values={{ n: restZaps.length }} />}{" "}
            <FormattedMessage {...messages.OthersZapped} values={{ n: restZaps.length }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Zap;
