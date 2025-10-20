import { useMemo } from "react";
import { FormattedNumber } from "react-intl";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useRateHistory } from "@/Hooks/useRates";

export default function PriceChart({ interval, range }: { interval: number; range: number }) {
  const history = useRateHistory("BTCUSD", range, true);

  const reduced = useMemo(() => {
    let min = Number.MAX_SAFE_INTEGER,
      max = 0;
    let minAsk = Number.MAX_SAFE_INTEGER,
      maxAsk = 0;
    const ret = history.reduce(
      (acc, v) => {
        const key = v.time - (v.time % interval);
        acc[key] ??= { time: key, ask: 0, bid: 0 };
        acc[key].ask = v.ask;
        acc[key].bid = v.bid;
        if (key < min) {
          min = key;
        }
        if (key > max) {
          max = key;
        }
        if (v.ask > maxAsk) {
          maxAsk = v.ask;
        }
        if (v.ask < minAsk) {
          minAsk = v.ask;
        }
        return acc;
      },
      {} as Record<string, { time: number; ask: number | null; bid: number | null }>,
    );

    for (let x = min; x < max; x += interval) {
      ret[x] ??= { time: x, ask: null, bid: null };
    }
    return { data: ret, min, max, minAsk, maxAsk };
  }, [history, interval]);

  const lastRate = useMemo(() => {
    return history.reduce(
      (acc, v) => {
        if (acc.time < v.time) {
          acc = v;
        }
        return acc;
      },
      { time: 0, ask: 0, bid: 0 } as { time: number; ask: number; bid: number },
    );
  }, [history]);

  return (
    <>
      <h3 className="text-right">
        <FormattedNumber value={lastRate.ask} style="currency" currency="USD" />
      </h3>
      <ResponsiveContainer height={250}>
        <LineChart data={Object.values(reduced.data)}>
          <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} hide={true} />
          <YAxis
            dataKey="ask"
            type="number"
            scale="auto"
            domain={["dataMin - 100", "dataMax + 100"]}
            tickFormatter={v => Number(v).toLocaleString()}
            hide={true}
          />
          <Tooltip content={() => ""} />
          <Line dataKey="ask" type="monotone" dot={false} connectNulls={false} stroke="var(--primary)" />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
