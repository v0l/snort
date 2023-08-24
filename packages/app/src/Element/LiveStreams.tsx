import "./LiveStreams.css";
import { NostrEvent, NostrPrefix, encodeTLV } from "@snort/system";
import { findTag } from "SnortUtils";
import { CSSProperties, useMemo } from "react";
import { Link } from "react-router-dom";
import useImgProxy from "Hooks/useImgProxy";
import Icon from "Icons/Icon";

export function LiveStreams({ evs }: { evs: Array<NostrEvent> }) {
  const streams = useMemo(() => {
    return [...evs].sort((a, b) => {
      const aStarts = Number(findTag(a, "starts") ?? a.created_at);
      const bStarts = Number(findTag(b, "starts") ?? b.created_at);
      return aStarts > bStarts ? -1 : 1;
    });
  }, [evs]);

  if (streams.length === 0) return null;

  return (
    <div className="stream-list">
      {streams.map(v => (
        <LiveStreamEvent ev={v} key={`${v.kind}:${v.pubkey}:${findTag(v, "d")}`} />
      ))}
    </div>
  );
}

function LiveStreamEvent({ ev }: { ev: NostrEvent }) {
  const { proxy } = useImgProxy();
  const title = findTag(ev, "title");
  const image = findTag(ev, "image");
  const status = findTag(ev, "status");

  const link = encodeTLV(NostrPrefix.Address, findTag(ev, "d") ?? "", undefined, ev.kind, ev.pubkey);
  const imageProxy = proxy(image ?? "");

  return (
    <Link className="stream-event" to={`https://zap.stream/${link}`} target="_blank">
      <div
        style={
          {
            "--img": `url(${imageProxy})`,
          } as CSSProperties
        }></div>
      <div className="flex f-col details">
        <div className="flex g2">
          <span className="live">{status}</span>
          <div className="reaction-pill">
            <Icon name="zap" size={24} />
            <div className="reaction-pill-number">0</div>
          </div>
        </div>
        <div>{title}</div>
      </div>
    </Link>
  );
}
