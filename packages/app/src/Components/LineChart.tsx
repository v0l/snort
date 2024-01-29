import { sha256 } from "@snort/shared";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function SensorChart({ data }: { data: Array<{ time: number; [k: string]: number }> }) {
  return (
    <ResponsiveContainer height={250}>
      <LineChart data={data}>
        <XAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={v => new Date(Number(v)).toLocaleTimeString()}
        />
        {Object.keys(data[0] ?? {})
          .filter(a => a !== "time")
          .map(a => {
            const mapUnit = () => {
              switch (a) {
                case "temperature":
                  return "C";
                case "humidity":
                  return "%";
                case "wind_direction":
                  return "deg";
                case "wind_speed":
                  return "m/s";
                case "rain":
                  return "mm";
              }
            };
            interface MinMax {
              min: number;
              max: number;
            }
            const domainOf = () => {
              const domain = data.reduce<MinMax>(
                (acc, v) => {
                  if (v[a] < acc.min) {
                    acc.min = v[a];
                  }
                  if (v[a] > acc.max) {
                    acc.max = v[a];
                  }
                  return acc;
                },
                { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER } as MinMax,
              );
              return [domain.min * 0.95, domain.max * 1.05];
            };

            return (
              <>
                <Line dataKey={a} type="monotone" dot={false} stroke={`#${sha256(a).slice(0, 6)}`} yAxisId={a} />
                <YAxis
                  dataKey={a}
                  unit={mapUnit()}
                  yAxisId={a}
                  type="number"
                  scale="linear"
                  domain={domainOf()}
                  tickFormatter={v => Number(v).toLocaleString()}
                  hide={true}
                />
              </>
            );
          })}
        <Legend />
        <Tooltip />
      </LineChart>
    </ResponsiveContainer>
  );
}
