import { bech32ToHex, removeUndefined, unixNow } from "@snort/shared";
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

export function useRateHistory(symbol: string, size: number, leaveOpen = false) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`rates:${symbol}:history:${size}`);
    rb.withOptions({ leaveOpen });
    rb.withFilter()
      .kinds([1009 as EventKind])
      .authors([bech32ToHex(SnortPubkey)])
      .tag("d", [symbol])
      .since(unixNow() - size);
    return rb;
  }, [symbol, size]);

  const feed = useRequestBuilder(sub);

  return removeUndefined(
    feed.map(a => {
      const tag = a.tags.find(a => a[0] === "d" && a[1] === symbol);
      if (!tag) return undefined;
      return {
        time: a?.created_at,
        ask: Number(tag[2]),
        bid: Number(tag[3]),
        low: Number(tag[4]),
        hight: Number(tag[5]),
      };
    }),
  );
}
