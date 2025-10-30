import { SnortContext } from "@snort/system-react";
import { useContext, useMemo, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import usePreferences from "@/Hooks/usePreferences";
import { ZapPoolTarget } from "@/Pages/ZapPool/ZapPoolTarget";
import { getRelayName, trackEvent, unwrap } from "@/Utils";
import { SnortPubKey } from "@/Utils/Const";
import { UploaderServices } from "@/Utils/Upload";
import { ZapPoolController, ZapPoolRecipientType } from "@/Utils/ZapPoolController";
import { useWallet } from "@/Wallet";
import { bech32ToHex } from "@snort/shared";

const DataProviders = [
  {
    name: "nostr.band",
    owner: bech32ToHex("npub1sx9rnd03vs34lp39fvfv5krwlnxpl90f3dzuk8y3cuwutk2gdhdqjz6g8m"),
  },
];

export function ZapPoolPageInner() {
  const defaultZapAmount = usePreferences(s => s.defaultZapAmount);
  const system = useContext(SnortContext);
  const zapPool = useSyncExternalStore(
    c => unwrap(ZapPoolController).hook(c),
    () => unwrap(ZapPoolController).snapshot(),
  );
  const { wallet } = useWallet();

  const relayConnections = useMemo(() => {
    return [...system.pool]
      .map(([, a]) => {
        if (a.info?.pubkey && !a.ephemeral) {
          return {
            address: a.address,
            pubkey: a.info.pubkey,
          };
        }
      })
      .filter(a => a !== undefined)
      .map(unwrap);
  }, []);

  const sumPending = zapPool.reduce((acc, v) => acc + v.sum, 0);
  return (
    <div className="zap-pool px-3 py-2">
      <h1>
        <FormattedMessage defaultMessage="Zap Pool" />
      </h1>
      <p>
        <FormattedMessage
          defaultMessage="Fund the services that you use by splitting a portion of all your zaps into a pool of funds!"
          id="x/Fx2P"
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="Zap Pool only works if you use one of the supported wallet connections (WebLN, LNC, LNDHub or Nostr Wallet Connect)"
          id="QWhotP"
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="Your default zap amount is {number} sats, example values are calculated from this."
          id="Xopqkl"
          values={{
            number: (
              <b>
                <FormattedNumber value={defaultZapAmount} />
              </b>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="A single zap of {nIn} sats will allocate {nOut} sats to the zap pool."
          id="eSzf2G"
          values={{
            nIn: (
              <b>
                <FormattedNumber value={defaultZapAmount} />
              </b>
            ),
            nOut: (
              <b>
                <FormattedNumber value={ZapPoolController?.calcAllocation(defaultZapAmount) ?? 0} />
              </b>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="You currently have {number} sats in your zap pool."
          id="Qxv0B2"
          values={{
            number: (
              <b>
                <FormattedNumber value={sumPending} />
              </b>
            ),
          }}
        />
      </p>
      <p>
        {wallet && (
          <AsyncButton
            onClick={async () => {
              trackEvent("ZapPool", { manual: true });
              await ZapPoolController?.payout(wallet);
            }}>
            <FormattedMessage defaultMessage="Payout Now" />
          </AsyncButton>
        )}
      </p>
      <div>
        <ZapPoolTarget
          target={
            zapPool.find(b => b.pubkey === bech32ToHex(SnortPubKey) && b.type === ZapPoolRecipientType.Generic) ?? {
              type: ZapPoolRecipientType.Generic,
              pubkey: bech32ToHex(SnortPubKey),
              split: 0,
              sum: 0,
            }
          }
        />
      </div>
      <h3>
        <FormattedMessage defaultMessage="Relays" />
      </h3>
      {relayConnections.map(a => (
        <div key={a.address}>
          <h4>{getRelayName(a.address)}</h4>
          <ZapPoolTarget
            target={
              zapPool.find(b => b.pubkey === a.pubkey && b.type === ZapPoolRecipientType.Relay) ?? {
                type: ZapPoolRecipientType.Relay,
                pubkey: a.pubkey,
                split: 0,
                sum: 0,
              }
            }
          />
        </div>
      ))}
      <h3>
        <FormattedMessage defaultMessage="File hosts" />
      </h3>
      {UploaderServices.map(a => (
        <div key={a.name}>
          <h4>{a.name}</h4>
          <ZapPoolTarget
            target={
              zapPool.find(b => b.pubkey === a.owner && b.type === ZapPoolRecipientType.FileHost) ?? {
                type: ZapPoolRecipientType.FileHost,
                pubkey: a.owner,
                split: 0,
                sum: 0,
              }
            }
          />
        </div>
      ))}
      <h3>
        <FormattedMessage defaultMessage="Data Providers" />
      </h3>
      {DataProviders.map(a => (
        <div key={a.name}>
          <h4>{a.name}</h4>
          <ZapPoolTarget
            target={
              zapPool.find(b => b.pubkey === a.owner && b.type === ZapPoolRecipientType.DataProvider) ?? {
                type: ZapPoolRecipientType.DataProvider,
                pubkey: a.owner,
                split: 0,
                sum: 0,
              }
            }
          />
        </div>
      ))}
    </div>
  );
}
