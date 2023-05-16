import "./ZapPool.css";

import { useMemo, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import { SnortPubKey } from "Const";
import ProfilePreview from "Element/ProfilePreview";
import useLogin from "Hooks/useLogin";
import { System } from "System";
import { UploaderServices } from "Upload";
import { bech32ToHex, getRelayName, unwrap } from "Util";
import { ZapPoolController, ZapPoolRecipient, ZapPoolRecipientType } from "ZapPoolController";
import { useUserProfile } from "Hooks/useUserProfile";
import AsyncButton from "Element/AsyncButton";
import { useWallet } from "Wallet";

function ZapTarget({ target }: { target: ZapPoolRecipient }) {
  const login = useLogin();
  const profile = useUserProfile(target.pubkey);
  const hasAddress = profile?.lud16 || profile?.lud06;
  const defaultZapMount = Math.ceil(login.preferences.defaultZapAmount * (target.split / 100));
  return (
    <ProfilePreview
      pubkey={target.pubkey}
      actions={
        hasAddress ? (
          <div>
            <div>
              <FormattedNumber value={target.split} />% (
              <FormattedMessage defaultMessage="{n} sats" values={{ n: defaultZapMount }} />)
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={target.split}
              onChange={e =>
                ZapPoolController.set({
                  ...target,
                  split: e.target.valueAsNumber,
                })
              }
            />
          </div>
        ) : (
          <FormattedMessage defaultMessage="No lightning address" />
        )
      }
    />
  );
}

export default function ZapPoolPage() {
  const login = useLogin();
  const zapPool = useSyncExternalStore(
    c => ZapPoolController.hook(c),
    () => ZapPoolController.snapshot()
  );
  const { wallet } = useWallet();

  const relayConnections = useMemo(() => {
    return [...System.Sockets.values()]
      .map(a => {
        if (a.Info?.pubkey) {
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
    <div className="zap-pool">
      <h1>
        <FormattedMessage defaultMessage="Zap Pool" />
      </h1>
      <p>
        <FormattedMessage defaultMessage="Fund the services that you use by splitting a portion of all your zaps into a pool of funds!" />
      </p>
      <p>
        <FormattedMessage defaultMessage="Zap Pool only works if you use one of the supported wallet connections (WebLN, LNC, LNDHub or Nostr Wallet Connect)" />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="Your default zap amount is {number} sats, example values are calculated from this."
          values={{
            number: (
              <b>
                <FormattedNumber value={login.preferences.defaultZapAmount} />
              </b>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="A single zap of {nIn} sats will allocate {nOut} sats to the zap pool."
          values={{
            nIn: (
              <b>
                <FormattedNumber value={login.preferences.defaultZapAmount} />
              </b>
            ),
            nOut: (
              <b>
                <FormattedNumber value={ZapPoolController.calcAllocation(login.preferences.defaultZapAmount)} />
              </b>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          defaultMessage="You currently have {number} sats in your zap pool."
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
          <AsyncButton onClick={() => ZapPoolController.payout(wallet)}>
            <FormattedMessage defaultMessage="Payout Now" />
          </AsyncButton>
        )}
      </p>
      <div className="card">
        <ZapTarget
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
        <div className="card">
          <h4>{getRelayName(a.address)}</h4>
          <ZapTarget
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
        <div className="card">
          <h4>{a.name}</h4>
          <ZapTarget
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
    </div>
  );
}
