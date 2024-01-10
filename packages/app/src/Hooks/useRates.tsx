import { bech32ToHex } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { getNewest } from "@/Utils";
import { SnortPubkey } from "@/Utils/Const";

export function useRates(symbol: string, leaveOpen = true) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`rates:${symbol}`);
    rb.withOptions({
      leaveOpen,
    });
    rb.withFilter()
      .kinds([1009 as EventKind])
      .authors([bech32ToHex(SnortPubkey)])
      .tag("d", [symbol])
      .limit(1);
    return rb;
  }, [symbol]);

  const feed = useRequestBuilder(sub);
  const ev = getNewest(feed);

  const tag = ev?.tags.find(a => a[0] === "d" && a[1] === symbol);
  if (!tag) return undefined;
  return {
    time: ev?.created_at,
    ask: Number(tag[2]),
    bid: Number(tag[3]),
    low: Number(tag[4]),
    hight: Number(tag[5]),
  };
}
