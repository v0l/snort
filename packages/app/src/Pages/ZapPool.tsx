import "./ZapPool.css";

import { useUserProfile } from "@snort/system-react";
import { useMemo, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import AsyncButton from "@/Components/Button/AsyncButton";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { bech32ToHex, getRelayName, trackEvent, unwrap } from "@/Utils";
import { SnortPubKey } from "@/Utils/Const";
import { UploaderServices } from "@/Utils/Upload";
import { ZapPoolController, ZapPoolRecipient, ZapPoolRecipientType } from "@/Utils/ZapPoolController";
import { useWallet } from "@/Wallet";

const DataProviders = [
  {
    name: "nostr.band",
    owner: bech32ToHex("npub1sx9rnd03vs34lp39fvfv5krwlnxpl90f3dzuk8y3cuwutk2gdhdqjz6g8m"),
  },
];

function ZapPoolTargetInner({ target }: { target: ZapPoolRecipient }) {
  const login = useLogin();
  const profile = useUserProfile(target.pubkey);
  const hasAddress = profile?.lud16 || profile?.lud06;
  const defaultZapMount = Math.ceil(login.appData.item.preferences.defaultZapAmount * (target.split / 100));
  return (
    <ProfilePreview
      pubkey={target.pubkey}
      actions={
        hasAddress ? (
          <div>
            <div>
              <FormattedNumber value={target.split} />% (
              <FormattedMessage defaultMessage="{n} sats" id="CsCUYo" values={{ n: defaultZapMount }} />)
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={target.split}
              onChange={e =>
                ZapPoolController?.set({
                  ...target,
                  split: e.target.valueAsNumber,
                })
              }
            />
          </div>
        ) : (
          <FormattedMessage defaultMessage="No lightning address" id="JPFYIM" />
        )
      }
    />
  );
}

export function ZapPoolTarget({ target }: { target: ZapPoolRecipient }) {
  if (!ZapPoolController) {
    return null;
  }
  return <ZapPoolTargetInner target={target} />;
}

function ZapPoolPageInner() {
  const login = useLogin();
  const { system } = useEventPublisher();
  const zapPool = useSyncExternalStore(
    c => unwrap(ZapPoolController).hook(c),
    () => unwrap(ZapPoolController).snapshot(),
  );
  const { wallet } = useWallet();

  const relayConnections = useMemo(() => {
    return [...system.pool]
      .map(([, a]) => {
        if (a.Info?.pubkey && !a.Ephemeral) {
          return {
            address: a.Address,
            pubkey: a.Info.pubkey,
          };
        }
      })
      .filter(a => a !== undefined)
      .map(unwrap);
  }, [login.relays]);

  const sumPending = zapPool.reduce((acc, v) => acc + v.sum, 0);
  return (
    <div className="zap-pool main-content p">
      <h1>
        <FormattedMessage defaultMessage="Zap Pool" id="i/dBAR" />
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
                <FormattedNumber value={login.appData.item.preferences.defaultZapAmount} />
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
                <FormattedNumber value={login.appData.item.preferences.defaultZapAmount} />
              </b>
            ),
            nOut: (
              <b>
                <FormattedNumber
                  value={ZapPoolController?.calcAllocation(login.appData.item.preferences.defaultZapAmount) ?? 0}
                />
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
            <FormattedMessage defaultMessage="Payout Now" id="+PzQ9Y" />
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
        <FormattedMessage defaultMessage="Relays" id="RoOyAh" />
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
        <FormattedMessage defaultMessage="File hosts" id="XICsE8" />
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
        <FormattedMessage defaultMessage="Data Providers" id="ELbg9p" />
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

export default function ZapPoolPage() {
  if (!ZapPoolController) {
    return null;
  }
  return <ZapPoolPageInner />;
}
