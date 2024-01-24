import "./LiveStreams.css";

import { unixNow } from "@snort/shared";
import { EventKind, NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { CSSProperties, useMemo } from "react";
import { Link } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import useImgProxy from "@/Hooks/useImgProxy";
import useLogin from "@/Hooks/useLogin";
import { findTag } from "@/Utils";

export function LiveStreams() {
  const follows = useLogin(s => s.follows.item);
  const sub = useMemo(() => {
    const since = unixNow() - 60 * 60 * 24;
    const rb = new RequestBuilder("follows:streams");
    rb.withFilter().kinds([EventKind.LiveEvent]).authors(follows).since(since);
    rb.withFilter().kinds([EventKind.LiveEvent]).tag("p", follows).since(since);
    return rb;
  }, [follows]);

  const streams = useRequestBuilder(sub);
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

  const link = NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix);
  const imageProxy = proxy(image ?? "");

  return (
    <Link className="stream-event" to={`https://zap.stream/${link}`} target="_blank">
      <div
        style={
          {
            "--img": `url(${imageProxy})`,
          } as CSSProperties
        }></div>
      <div className="flex flex-col details">
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
