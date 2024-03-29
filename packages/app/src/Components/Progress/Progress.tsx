import "./Progress.css";

import { CSSProperties, ReactNode } from "react";
import { FormattedNumber } from "react-intl";

export default function Progress({ value, status }: { value: number; status?: ReactNode }) {
  const v = Math.max(0.01, Math.min(1, value));
  return (
    <div className="progress">
      <div
        style={
          {
            "--progress": `${v * 100}%`,
          } as CSSProperties
        }></div>
      <span>
        {status}
        <FormattedNumber value={v} style="percent" />
      </span>
    </div>
  );
}
