import { sanitizeRelayUrl, unixNow } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import classNames from "classnames";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { findTag } from "@/Utils";
import { Day } from "@/Utils/Const";

const MonitorRelays = [
  "wss://relaypag.es",
  "wss://relay.nostr.watch",
  "wss://history.nostr.watch",
  "wss://monitorlizard.nostr1.com",
];
export default function RelayUptime({ url }: { url: string }) {
  const sub = useMemo(() => {
    const u = sanitizeRelayUrl(url);
    if (!u) return;

    const rb = new RequestBuilder(`uptime`);
    rb.withFilter()
      .kinds([30_166 as EventKind])
      .tag("d", [u])
      .since(unixNow() - Day)
      .relay(MonitorRelays);
    return rb;
  }, [url]);

  const data = useRequestBuilder(sub);
  const myData = data.filter(a => findTag(a, "d") === url);
  const ping = myData.reduce(
    (acc, v) => {
      const read = findTag(v, "rtt-read");
      if (read) {
        acc.n += 1;
        acc.total += Number(read);
      }
      return acc;
    },
    {
      n: 0,
      total: 0,
    },
  );
  const avgPing = ping.total / ping.n;
  const idealPing = 500;
  const badPing = idealPing * 2;
  return (
    <div
      className={classNames("font-semibold", {
        "text-error": isNaN(avgPing) || avgPing > badPing,
        "text-warning": avgPing > idealPing && avgPing < badPing,
        "text-success": avgPing < idealPing,
      })}
      title={`${avgPing.toFixed(0)} ms`}>
      {isNaN(avgPing) && <FormattedMessage defaultMessage="Dead" />}
      {avgPing > badPing && <FormattedMessage defaultMessage="Poor" />}
      {avgPing > idealPing && avgPing < badPing && <FormattedMessage defaultMessage="Good" />}
      {avgPing < idealPing && <FormattedMessage defaultMessage="Great" />}
    </div>
  );
}
