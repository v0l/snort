import "./ZapGoal.css";

import { NostrEvent, NostrLink } from "@snort/system";
import { useState } from "react";
import { FormattedNumber } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import Progress from "@/Components/Progress/Progress";
import useZapsFeed from "@/Feed/ZapsFeed";
import { findTag } from "@/Utils";
import { formatShort } from "@/Utils/Number";
import { Zapper } from "@/Utils/Zapper";

import SendSats from "../SendSats/SendSats";

export function ZapGoal({ ev }: { ev: NostrEvent }) {
  const [zap, setZap] = useState(false);
  const zaps = useZapsFeed(NostrLink.fromEvent(ev));
  const target = Number(findTag(ev, "amount"));
  const amount = zaps.reduce((acc, v) => (acc += v.amount * 1000), 0);
  const progress = amount / target;

  return (
    <div className="zap-goal card">
      <div className="flex items-center justify-between">
        <h2>{ev.content}</h2>
        <div className="zap-button flex" onClick={() => setZap(true)}>
          <Icon name="zap" size={15} />
        </div>
        <SendSats targets={Zapper.fromEvent(ev)} show={zap} onClose={() => setZap(false)} />
      </div>

      <div className="flex justify-between">
        <div>
          <FormattedNumber value={progress} style="percent" />
        </div>
        <div>
          {formatShort(amount / 1000)}/{formatShort(target / 1000)}
        </div>
      </div>
      <Progress value={progress} />
    </div>
  );
}
