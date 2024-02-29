import { useSyncExternalStore } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { ZapPoolTarget } from "@/Pages/ZapPool/ZapPoolTarget";
import { bech32ToHex, unwrap } from "@/Utils";
import { SnortPubKey } from "@/Utils/Const";
import { ZapPoolController, ZapPoolRecipientType } from "@/Utils/ZapPoolController";

export function ZapPoolDonateSection() {
  if (!CONFIG.features.zapPool) {
    return;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const zapPool = useSyncExternalStore(
    c => unwrap(ZapPoolController).hook(c),
    () => unwrap(ZapPoolController).snapshot(),
  );

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="ZapPool" id="pRess9" />
      </h3>
      <p>
        <FormattedMessage
          defaultMessage="Fund the services that you use by splitting a portion of all your zaps into a pool of funds!"
          id="x/Fx2P"
        />
      </p>
      <p>
        <Link to="/zap-pool" className="underline">
          <FormattedMessage defaultMessage="Configure zap pool" id="kqPQJD" />
        </Link>
      </p>
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
    </>
  );
}
