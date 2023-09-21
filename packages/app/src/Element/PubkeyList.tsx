import { NostrEvent } from "@snort/system";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { LNURL } from "@snort/shared";

import { dedupe, hexToBech32 } from "SnortUtils";
import FollowListBase from "Element/FollowListBase";
import AsyncButton from "Element/AsyncButton";
import { useWallet } from "Wallet";
import { Toastore } from "Toaster";
import { getDisplayName } from "Element/ProfileImage";
import { UserCache } from "Cache";
import useLogin from "Hooks/useLogin";
import useEventPublisher from "Hooks/useEventPublisher";
import { WalletInvoiceState } from "Wallet";

export default function PubkeyList({ ev, className }: { ev: NostrEvent; className?: string }) {
  const wallet = useWallet();
  const login = useLogin();
  const publisher = useEventPublisher();
  const ids = dedupe(ev.tags.filter(a => a[0] === "p").map(a => a[1]));

  async function zapAll() {
    for (const pk of ids) {
      try {
        const profile = await UserCache.get(pk);
        const amtSend = login.preferences.defaultZapAmount;
        const lnurl = profile?.lud16 || profile?.lud06;
        if (lnurl) {
          const svc = new LNURL(lnurl);
          await svc.load();

          const zap = await publisher?.zap(
            amtSend * 1000,
            pk,
            Object.keys(login.relays.item),
            undefined,
            `Zap from ${hexToBech32("note", ev.id)}`,
          );
          const invoice = await svc.getInvoice(amtSend, undefined, zap);
          if (invoice.pr) {
            const rsp = await wallet.wallet?.payInvoice(invoice.pr);
            if (rsp?.state === WalletInvoiceState.Paid) {
              Toastore.push({
                element: (
                  <FormattedMessage
                    defaultMessage="Sent {n} sats to {name}"
                    values={{
                      n: amtSend,
                      name: getDisplayName(profile, pk),
                    }}
                  />
                ),
                icon: "zap",
              });
            }
          }
        }
      } catch (e) {
        console.debug("Failed to zap", pk, e);
      }
    }
  }

  return (
    <FollowListBase
      pubkeys={ids}
      showAbout={true}
      className={className}
      title={ev.tags.find(a => a[0] === "d")?.[1]}
      actions={
        <>
          <AsyncButton className="mr5 transparent" onClick={() => zapAll()}>
            <FormattedMessage
              defaultMessage="Zap All {n} sats"
              values={{
                n: <FormattedNumber value={login.preferences.defaultZapAmount * ids.length} />,
              }}
            />
          </AsyncButton>
        </>
      }
    />
  );
}
