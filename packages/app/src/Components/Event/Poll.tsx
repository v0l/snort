import { LNURL } from "@snort/shared";
import { NostrLink, ParsedZap, TaggedNostrEvent } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useState } from "react";
import { FormattedMessage, FormattedNumber, useIntl } from "react-intl";

import Spinner from "@/Components/Icons/Spinner";
import ZapModal from "@/Components/ZapModal/ZapModal";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { unwrap } from "@/Utils";
import { formatShort } from "@/Utils/Number";
import { useWallet } from "@/Wallet";

interface PollProps {
  ev: TaggedNostrEvent;
  zaps: Array<ParsedZap>;
}

type PollTally = "zaps" | "pubkeys";

export default function Poll(props: PollProps) {
  const { formatMessage } = useIntl();
  const { publisher } = useEventPublisher();
  const { wallet } = useWallet();
  const {
    preferences: prefs,
    publicKey: myPubKey,
    relays,
  } = useLogin(s => ({ preferences: s.appData.item.preferences, publicKey: s.publicKey, relays: s.relays }));
  const pollerProfile = useUserProfile(props.ev.pubkey);
  const [tallyBy, setTallyBy] = useState<PollTally>("pubkeys");
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
              id: "NepkXH",
            },
            {
              amount,
            },
          ),
        );
      }

      setVoting(opt);
      const r = Object.keys(relays.item);
      const zap = await publisher.zap(amount * 1000, props.ev.pubkey, r, NostrLink.fromEvent(props.ev), undefined, eb =>
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
            id: "fOksnD",
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
            id: "g985Wp",
          }),
        );
      }
    } finally {
      setVoting(undefined);
    }
  }

  const totalVotes = (() => {
    switch (tallyBy) {
      case "zaps":
        return props.zaps.filter(a => a.pollOption !== undefined).reduce((acc, v) => (acc += v.amount), 0);
      case "pubkeys":
        return new Set(props.zaps.filter(a => a.pollOption !== undefined).map(a => unwrap(a.sender))).size;
    }
  })();

  return (
    <>
      <div className="flex justify-between p">
        <small>
          <FormattedMessage
            defaultMessage="You are voting with {amount} sats"
            id="3qnJlS"
            values={{
              amount: formatShort(prefs.defaultZapAmount),
            }}
          />
        </small>
        <button type="button" onClick={() => setTallyBy(s => (s !== "zaps" ? "zaps" : "pubkeys"))}>
          <FormattedMessage
            defaultMessage="Votes by {type}"
            id="xIcAOU"
            values={{
              type:
                tallyBy === "zaps" ? (
                  <FormattedMessage defaultMessage="zap" id="5BVs2e" />
                ) : (
                  <FormattedMessage defaultMessage="user" id="sUNhQE" />
                ),
            }}
          />
        </button>
      </div>
      <div className="poll-body">
        {options.map(a => {
          const opt = Number(a[1]);
          const desc = a[2];
          const zapsOnOption = props.zaps.filter(b => b.pollOption === opt);
          const total = (() => {
            switch (tallyBy) {
              case "zaps":
                return zapsOnOption.reduce((acc, v) => (acc += v.amount), 0);
              case "pubkeys":
                return new Set(zapsOnOption.map(a => unwrap(a.sender))).size;
            }
          })();
          const weight = totalVotes === 0 ? 0 : total / totalVotes;
          return (
            <div key={a[1]} className="flex" onClick={e => zapVote(e, opt)}>
              <div className="grow">{opt === voting ? <Spinner /> : <>{desc}</>}</div>
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

      <ZapModal show={invoice !== ""} onClose={() => setInvoice("")} invoice={invoice} />
    </>
  );
}
