import "./ZapGoal.css";
import { NostrEvent, NostrPrefix, createNostrLink } from "@snort/system";
import useZapsFeed from "Feed/ZapsFeed";
import { formatShort } from "Number";
import { findTag } from "SnortUtils";
import { CSSProperties } from "react";
import ZapButton from "./ZapButton";

export function ZapGoal({ ev }: { ev: NostrEvent }) {
  const zaps = useZapsFeed(createNostrLink(NostrPrefix.Note, ev.id));
  const target = Number(findTag(ev, "amount"));
  const amount = zaps.reduce((acc, v) => (acc += v.amount * 1000), 0);
  const progress = Math.min(100, 100 * (amount / target));

  return (
    <div className="zap-goal card">
      <div className="flex f-space">
        <h2>{ev.content}</h2>
        <ZapButton pubkey={ev.pubkey} event={ev.id} />
      </div>

      <div className="flex f-space">
        <div>{progress.toFixed(1)}%</div>
        <div>
          {formatShort(amount / 1000)}/{formatShort(target / 1000)}
        </div>
      </div>
      <div className="progress">
        <div
          style={
            {
              "--progress": `${progress}%`,
            } as CSSProperties
          }></div>
      </div>
    </div>
  );
}
