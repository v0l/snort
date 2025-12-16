import { useMemo, useState } from "react";
import { FormattedNumber } from "react-intl";
import { Line, LineChart, ResponsiveContainer, Tooltip, type TooltipProps, XAxis, YAxis } from "recharts";

import { useRateHistory } from "@/Hooks/useRates";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

interface ChartData {
  time: number;
  ask: number;
  bid: number;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as ChartData;
  const date = new Date(data.time * 1000);

  return (
    <div className="bg-layer-2 px-3 py-2 rounded border border-neutral-700">
      <div className="text-xs text-neutral-400 mb-1">
        {date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      <div className="font-medium">
        <FormattedNumber value={data.ask} style="currency" currency="USD" />
      </div>
    </div>
  );
}

const TIME_RANGES: Record<TimeRange, { interval: number; range: number }> = {
  "1D": { interval: 3600, range: 3600 * 24 },
  "1W": { interval: 3600 * 4, range: 3600 * 24 * 7 },
  "1M": { interval: 3600 * 24, range: 3600 * 24 * 30 },
  "3M": { interval: 3600 * 24, range: 3600 * 24 * 90 },
  "1Y": { interval: 3600 * 24 * 7, range: 3600 * 24 * 365 },
  ALL: { interval: 3600 * 24 * 7, range: 3600 * 24 * 365 * 5 },
};

export default function PriceChart() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1D");
  const { interval, range } = TIME_RANGES[selectedRange];
  const history = useRateHistory("BTCUSD", range, true);

  const reduced = useMemo(() => {
    if (history.length === 0) {
      return { data: [], min: 0, max: 0, minAsk: 0, maxAsk: 0 };
    }

    let minAsk = Number.MAX_SAFE_INTEGER;
    let maxAsk = 0;

    // Group data points by interval buckets
    const buckets = new Map<number, { time: number; ask: number; bid: number }>();

    for (const point of history) {
      const bucketKey = Math.floor(point.time / interval) * interval;

      // Keep the most recent value in each bucket
      if (!buckets.has(bucketKey) || point.time > buckets.get(bucketKey)!.time) {
        buckets.set(bucketKey, { time: bucketKey, ask: point.ask, bid: point.bid });
      }

      if (point.ask > maxAsk) maxAsk = point.ask;
      if (point.ask < minAsk) minAsk = point.ask;
    }

    // Convert to sorted array
    const data = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
    const min = data[0]?.time ?? 0;
    const max = data[data.length - 1]?.time ?? 0;

    return { data, min, max, minAsk, maxAsk };
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

  const priceChange = useMemo(() => {
    if (reduced.data.length < 2) {
      return { absolute: 0, percentage: 0 };
    }
    const firstPrice = reduced.data[0].ask;
    const lastPrice = reduced.data[reduced.data.length - 1].ask;
    const absolute = lastPrice - firstPrice;
    const percentage = (absolute / firstPrice) * 100;
    return { absolute, percentage };
  }, [reduced.data]);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(Object.keys(TIME_RANGES) as TimeRange[]).map(rangeKey => (
            <div
              key={rangeKey}
              onClick={() => setSelectedRange(rangeKey)}
              className={`px-3 py-1 rounded text-sm cursor-pointer ${
                selectedRange === rangeKey ? "bg-primary text-white" : "bg-layer-2 text-neutral-400 hover:bg-layer-3"
              }`}>
              {rangeKey}
            </div>
          ))}
        </div>
        <div className="text-right">
          <h3>
            <FormattedNumber value={lastRate.ask} style="currency" currency="USD" />
          </h3>
          <div className={`text-xs font-medium ${priceChange.absolute >= 0 ? "text-success" : "text-error"}`}>
            {priceChange.absolute >= 0 ? "+" : ""}
            <FormattedNumber value={priceChange.absolute} style="currency" currency="USD" /> (
            {priceChange.percentage >= 0 ? "+" : ""}
            {priceChange.percentage.toFixed(2)}%)
          </div>
        </div>
      </div>
      <ResponsiveContainer height={200}>
        <LineChart data={reduced.data}>
          <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} hide={true} />
          <YAxis
            dataKey="ask"
            type="number"
            scale="auto"
            domain={["dataMin - 100", "dataMax + 100"]}
            tickFormatter={v => Number(v).toLocaleString()}
            hide={true}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line dataKey="ask" type="monotone" dot={false} connectNulls={false} stroke="var(--primary)" />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
