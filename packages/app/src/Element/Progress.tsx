import { FormattedNumber } from "react-intl";
import "./Progress.css";
import { CSSProperties } from "react";

export default function Progress({ value }: { value: number }) {
    const v = Math.max(0.01, Math.min(1, value));
    return <div className="progress">
        <div
            style={
                {
                    "--progress": `${v * 100}%`,
                } as CSSProperties
            }></div>
        <span>
            <FormattedNumber value={v} style="percent" />
        </span>
    </div>
}