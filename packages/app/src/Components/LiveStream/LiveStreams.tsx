import { NostrEvent, NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import useImgProxy from "@/Hooks/useImgProxy";
import useLiveStreams from "@/Hooks/useLiveStreams";
import { findTag } from "@/Utils";

import Avatar from "../User/Avatar";

export function LiveStreams() {
  const streams = useLiveStreams();
  if (streams.length === 0) return null;

  return (
    <div className="flex mx-2 gap-4 overflow-x-auto sm-hide-scrollbar">
      {streams.map(v => (
        <LiveStreamEvent ev={v} key={`${v.kind}:${v.pubkey}:${findTag(v, "d")}`} className="h-[80px]" />
      ))}
    </div>
  );
}

export function LiveStreamEvent({ ev, className }: { ev: NostrEvent; className?: string }) {
  const { proxy } = useImgProxy();
  const title = findTag(ev, "title");
  const image = findTag(ev, "image");
  const status = findTag(ev, "status");
  const viewers = findTag(ev, "current_participants");
  const host = ev.tags.find(a => a[0] === "p" && a[3] === "host")?.[1] ?? ev.pubkey;
  const hostProfile = useUserProfile(host);

  const link = NostrLink.fromEvent(ev).encode();
  const imageProxy = proxy(image ?? "");

  return (
    <Link className={classNames("flex gap-2", className)} to={`https://zap.stream/${link}`} target="_blank">
      <div className="relative aspect-video">
        <div
          className="absolute h-full w-full bg-center bg-cover bg-gray-ultradark rounded-lg"
          style={
            {
              backgroundImage: `url(${imageProxy})`,
            } as CSSProperties
          }></div>
        <div className="absolute left-0 top-0 w-full overflow-hidden">
          <div
            className="whitespace-nowrap px-1 text-ellipsis overflow-hidden text-xs font-medium bg-background opacity-70 text-center"
            title={title}>
            {title}
          </div>
        </div>
        <div className="absolute bottom-1 left-1 bg-heart rounded-md px-2 uppercase font-bold">{status}</div>
        <div className="absolute right-1 bottom-1">
          <Avatar pubkey={host} user={hostProfile} size={25} className="outline outline-2 outline-highlight" />
        </div>
        {viewers && (
          <div className="absolute left-1 bottom-7 rounded-md px-2 py-1 text-xs bg-gray font-medium">
            <FormattedMessage defaultMessage="{n} viewers" values={{ n: viewers }} />
          </div>
        )}
      </div>
    </Link>
  );
}
