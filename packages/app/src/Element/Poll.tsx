import { TaggedRawEvent } from "@snort/nostr";
import { useState } from "react";
import { useSelector } from "react-redux";
import { FormattedNumber, useIntl } from "react-intl";

import { ParsedZap } from "Element/Zap";
import Text from "Element/Text";
import useEventPublisher from "Feed/EventPublisher";
import { RootState } from "State/Store";
import { useWallet } from "Wallet";
import { useUserProfile } from "Hooks/useUserProfile";
import { LNURL } from "LNURL";
import { unwrap } from "Util";
import { formatShort } from "Number";
import Spinner from "Icons/Spinner";
import SendSats from "Element/SendSats";

interface PollProps {
  ev: TaggedRawEvent;
  zaps: Array<ParsedZap>;
}

export default function Poll(props: PollProps) {
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const { wallet } = useWallet();
  const prefs = useSelector((s: RootState) => s.login.preferences);
  const pollerProfile = useUserProfile(props.ev.pubkey);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState("");
  const [voting, setVoting] = useState<number>();

  const options = props.ev.tags.filter(a => a[0] === "poll_option").sort((a, b) => Number(a[1]) - Number(b[1]));
  async function zapVote(opt: number) {
    const amount = prefs.defaultZapAmount;
    try {
      setVoting(opt);
      const zap = await publisher.zap(amount * 1000, props.ev.pubkey, props.ev.id, undefined, [
        ["poll_option", opt.toString()],
      ]);

      const lnurl = props.ev.tags.find(a => a[0] === "zap")?.[1] || pollerProfile?.lud16 || pollerProfile?.lud06;
      if (!lnurl) return;

      const svc = new LNURL(lnurl);
      await svc.load();

      if (!svc.canZap) {
        throw new Error("Cant vote because LNURL service does not support zaps");
      }

      const invoice = await svc.getInvoice(amount, undefined, zap);
      if (wallet?.isReady()) {
        await wallet?.payInvoice(unwrap(invoice.pr));
      } else {
        setInvoice(unwrap(invoice.pr));
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
      setError(
        formatMessage({
          defaultMessage: "Failed to send vote",
        })
      );
    } finally {
      setVoting(undefined);
    }
  }

  const allTotal = props.zaps.filter(a => a.pollOption !== undefined).reduce((acc, v) => (acc += v.amount), 0);
  return (
    <>
      <div className="poll-body">
        {options.map(a => {
          const opt = Number(a[1]);
          const desc = a[2];
          const zapsOnOption = props.zaps.filter(b => b.pollOption === opt);
          const total = zapsOnOption.reduce((acc, v) => (acc += v.amount), 0);
          const weight = total / allTotal;
          return (
            <div key={a[1]} className="flex" onClick={() => zapVote(opt)}>
              <div className="f-grow">
                {opt === voting ? <Spinner /> : <Text content={desc} tags={props.ev.tags} creator={props.ev.pubkey} />}
              </div>
              <div className="flex">
                <FormattedNumber value={weight * 100} maximumFractionDigits={0} />% &nbsp;
                <small>({formatShort(total)})</small>
              </div>
              <div style={{ width: `${weight * 100}%` }} className="progress"></div>
            </div>
          );
        })}
        {error && <b className="error">{error}</b>}
      </div>

      <SendSats show={invoice !== ""} onClose={() => setInvoice("")} invoice={invoice} />
    </>
  );
}
