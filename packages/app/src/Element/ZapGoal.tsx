import "./ZapGoal.css";
import { CSSProperties, useState } from "react";
import { NostrEvent, NostrLink } from "@snort/system";
import useZapsFeed from "Feed/ZapsFeed";
import { formatShort } from "Number";
import { findTag } from "SnortUtils";
import Icon from "Icons/Icon";
import SendSats from "./SendSats";
import { Zapper } from "Zapper";

export function ZapGoal({ ev }: { ev: NostrEvent }) {
  const [zap, setZap] = useState(false);
  const zaps = useZapsFeed(NostrLink.fromEvent(ev));
  const target = Number(findTag(ev, "amount"));
  const amount = zaps.reduce((acc, v) => (acc += v.amount * 1000), 0);
  const progress = 100 * (amount / target);

  return (
    <div className="zap-goal card">
      <div className="flex f-space">
        <h2>{ev.content}</h2>
        <div className="zap-button flex" onClick={() => setZap(true)}>
          <Icon name="zap" size={15} />
        </div>
        <SendSats targets={Zapper.fromEvent(ev)} show={zap} onClose={() => setZap(false)} />
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
              "--progress": `${Math.min(100, progress)}%`,
            } as CSSProperties
          }></div>
      </div>
    </div>
  );
}
