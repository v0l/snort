import { LNURL } from "@snort/shared";
import { NostrEvent } from "@snort/system";
import { WalletInvoiceState } from "@snort/wallet";
import { FormattedMessage, FormattedNumber } from "react-intl";

import { UserCache } from "@/Cache";
import AsyncButton from "@/Components/Button/AsyncButton";
import { Toastore } from "@/Components/Toaster/Toaster";
import FollowListBase from "@/Components/User/FollowListBase";
import useEventPublisher from "@/Hooks/useEventPublisher";
import usePreferences from "@/Hooks/usePreferences";
import { dedupe, findTag, getDisplayName, hexToBech32 } from "@/Utils";
import { useWallet } from "@/Wallet";

import { ProxyImg } from "../ProxyImg";

export default function PubkeyList({ ev, className }: { ev: NostrEvent; className?: string }) {
  const wallet = useWallet();
  const defaultZapAmount = usePreferences(s => s.defaultZapAmount);
  const { publisher, system } = useEventPublisher();
  const ids = dedupe(ev.tags.filter(a => a[0] === "p").map(a => a[1]));

  async function zapAll() {
    for (const pk of ids) {
      try {
        const profile = await UserCache.get(pk);
        const amtSend = defaultZapAmount;
        const lnurl = profile?.lud16 || profile?.lud06;
        if (lnurl) {
          const svc = new LNURL(lnurl);
          await svc.load();

          const relays = await system.requestRouter?.forReplyTo(pk);
          const zap = await publisher?.zap(
            amtSend * 1000,
            pk,
            relays ?? [],
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

  const picture = findTag(ev, "image");
  return (
    <>
      {picture && <ProxyImg src={picture} className="br max-h-44 w-full object-cover mb-4" />}
      <FollowListBase
        pubkeys={ids}
        className={className}
        title={findTag(ev, "title") ?? findTag(ev, "d")}
        actions={
          <>
            <AsyncButton className="mr5 secondary" onClick={() => zapAll()}>
              <FormattedMessage
                defaultMessage="Zap all {n} sats"
                id="IVbtTS"
                values={{
                  n: <FormattedNumber value={defaultZapAmount * ids.length} />,
                }}
              />
            </AsyncButton>
          </>
        }
        profilePreviewProps={{
          options: {
            about: true,
          },
        }}
      />
    </>
  );
}
