import type { ReactNode } from "react";
import { FormattedNumber } from "react-intl";

export default function Progress({ value, status }: { value: number; status?: ReactNode }) {
  const v = Math.max(0.01, Math.min(1, value));
  return (
    <div className="relative h-4 rounded overflow-hidden bg-neutral-600">
      <div className="absolute bg-success h-full" style={{ width: `${v * 100}%` }}></div>
      <span className="absolute w-full h-full text-center text-sm leading-4">
        {status}
        <FormattedNumber value={v} style="percent" />
      </span>
    </div>
  );
}
