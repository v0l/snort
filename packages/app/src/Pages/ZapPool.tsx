import "./ZapPool.css";

import { useMemo, useSyncExternalStore } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { useUserProfile } from "@snort/system-react";

import { SnortPubKey } from "Const";
import ProfilePreview from "Element/User/ProfilePreview";
import useLogin from "Hooks/useLogin";
import { UploaderServices } from "Upload";
import { bech32ToHex, getRelayName, unwrap } from "SnortUtils";
import { ZapPoolController, ZapPoolRecipient, ZapPoolRecipientType } from "ZapPoolController";
import AsyncButton from "Element/AsyncButton";
import { useWallet } from "Wallet";
import useEventPublisher from "Hooks/useEventPublisher";

const DataProviders = [
  {
    name: "nostr.band",
    owner: bech32ToHex("npub1sx9rnd03vs34lp39fvfv5krwlnxpl90f3dzuk8y3cuwutk2gdhdqjz6g8m"),
  },
  {
    name: "semisol.dev",
    owner: bech32ToHex("npub12262qa4uhw7u8gdwlgmntqtv7aye8vdcmvszkqwgs0zchel6mz7s6cgrkj"),
  },
  {
    name: "nostr.directory",
    owner: bech32ToHex("npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u"),
  },
];

function ZapTarget({ target }: { target: ZapPoolRecipient }) {
  if (!ZapPoolController) return;
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
                ZapPoolController?.set({
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
  if (!ZapPoolController) return;
  const login = useLogin();
  const { system } = useEventPublisher();
  const zapPool = useSyncExternalStore(
    c => unwrap(ZapPoolController).hook(c),
    () => unwrap(ZapPoolController).snapshot(),
  );
  const { wallet } = useWallet();

  const relayConnections = useMemo(() => {
    return system.Sockets.map(a => {
      if (a.info?.pubkey && !a.ephemeral) {
        return {
          address: a.address,
          pubkey: a.info.pubkey,
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
          <AsyncButton onClick={() => ZapPoolController?.payout(wallet)}>
            <FormattedMessage defaultMessage="Payout Now" />
          </AsyncButton>
        )}
      </p>
      <div>
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
        <div>
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
        <div>
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
      <h3>
        <FormattedMessage defaultMessage="Data Providers" />
      </h3>
      {DataProviders.map(a => (
        <div>
          <h4>{a.name}</h4>
          <ZapTarget
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
