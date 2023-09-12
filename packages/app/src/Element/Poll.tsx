import { TaggedNostrEvent, ParsedZap } from "@snort/system";
import { LNURL } from "@snort/shared";
import { useState } from "react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";
import { useUserProfile } from "@snort/system-react";

import useEventPublisher from "Feed/EventPublisher";
import { useWallet } from "Wallet";
import { unwrap } from "SnortUtils";
import { formatShort } from "Number";
import Spinner from "Icons/Spinner";
import SendSats from "Element/SendSats";
import useLogin from "Hooks/useLogin";

interface PollProps {
  ev: TaggedNostrEvent;
  zaps: Array<ParsedZap>;
}

export default function Poll(props: PollProps) {
  const { formatMessage } = useIntl();
  const publisher = useEventPublisher();
  const { wallet } = useWallet();
  const { preferences: prefs, publicKey: myPubKey, relays } = useLogin();
  const pollerProfile = useUserProfile(props.ev.pubkey);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState("");
  const [voting, setVoting] = useState<number>();
  const didVote = props.zaps.some(a => a.sender === myPubKey);
  const isMyPoll = props.ev.pubkey === myPubKey;
  const showResults = didVote || isMyPoll;

  const options = props.ev.tags
    .filter(a => a[0] === "poll_option")
    .sort((a, b) => (Number(a[1]) > Number(b[1]) ? 1 : -1));
  async function zapVote(ev: React.MouseEvent, opt: number) {
    ev.stopPropagation();
    if (voting || !publisher) return;

    const amount = prefs.defaultZapAmount;
    try {
      if (amount <= 0) {
        throw new Error(
          formatMessage(
            {
              defaultMessage: "Can't vote with {amount} sats, please set a different default zap amount",
            },
            {
              amount,
            },
          ),
        );
      }

      setVoting(opt);
      const r = Object.keys(relays.item);
      const zap = await publisher.zap(amount * 1000, props.ev.pubkey, r, props.ev.id, undefined, eb =>
        eb.tag(["poll_option", opt.toString()]),
      );

      const lnurl = props.ev.tags.find(a => a[0] === "zap")?.[1] || pollerProfile?.lud16 || pollerProfile?.lud06;
      if (!lnurl) return;

      const svc = new LNURL(lnurl);
      await svc.load();

      if (!svc.canZap) {
        throw new Error(
          formatMessage({
            defaultMessage: "Can't vote because LNURL service does not support zaps",
          }),
        );
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
      } else {
        setError(
          formatMessage({
            defaultMessage: "Failed to send vote",
          }),
        );
      }
    } finally {
      setVoting(undefined);
    }
  }

  const allTotal = props.zaps.filter(a => a.pollOption !== undefined).reduce((acc, v) => (acc += v.amount), 0);
  return (
    <>
      <small>
        <FormattedMessage
          defaultMessage="You are voting with {amount} sats"
          values={{
            amount: formatShort(prefs.defaultZapAmount),
          }}
        />
      </small>
      <div className="poll-body">
        {options.map(a => {
          const opt = Number(a[1]);
          const desc = a[2];
          const zapsOnOption = props.zaps.filter(b => b.pollOption === opt);
          const total = zapsOnOption.reduce((acc, v) => (acc += v.amount), 0);
          const weight = allTotal === 0 ? 0 : total / allTotal;
          return (
            <div key={a[1]} className="flex" onClick={e => zapVote(e, opt)}>
              <div className="f-grow">{opt === voting ? <Spinner /> : <>{desc}</>}</div>
              {showResults && (
                <>
                  <div className="flex">
                    <FormattedNumber value={weight * 100} maximumFractionDigits={0} />% &nbsp;
                    <small>({formatShort(total)})</small>
                  </div>
                  <div style={{ width: `${weight * 100}%` }} className="progress"></div>
                </>
              )}
            </div>
          );
        })}
        {error && <b className="error">{error}</b>}
      </div>

      <SendSats show={invoice !== ""} onClose={() => setInvoice("")} invoice={invoice} />
    </>
  );
}
