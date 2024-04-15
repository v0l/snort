import { LNURL } from "@snort/shared";
import { NostrEvent } from "@snort/system";
import { WalletInvoiceState } from "@snort/wallet";
import { FormattedMessage, FormattedNumber } from "react-intl";

import { UserCache } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import { Toastore } from "@/Components/Toaster/Toaster";
import FollowListBase from "@/Components/User/FollowListBase";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { dedupe, findTag, getDisplayName, hexToBech32 } from "@/Utils";
import { useWallet } from "@/Wallet";

export default function PubkeyList({ ev, className }: { ev: NostrEvent; className?: string }) {
  const wallet = useWallet();
  const login = useLogin();
  const { publisher } = useEventPublisher();
  const ids = dedupe(ev.tags.filter(a => a[0] === "p").map(a => a[1]));

  async function zapAll() {
    for (const pk of ids) {
      try {
        const profile = await UserCache.get(pk);
        const amtSend = login.appData.json.preferences.defaultZapAmount;
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
                    id="Ig9/a1"
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
      title={findTag(ev, "title") ?? findTag(ev, "d")}
      actions={
        <>
          <AsyncButton className="mr5 secondary" onClick={() => zapAll()}>
            <FormattedMessage
              defaultMessage="Zap all {n} sats"
              id="IVbtTS"
              values={{
                n: <FormattedNumber value={login.appData.json.preferences.defaultZapAmount * ids.length} />,
              }}
            />
          </AsyncButton>
        </>
      }
    />
  );
}
