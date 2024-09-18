import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import useLiveStreams from "@/Hooks/useLiveStreams";
import { findTag, getDisplayName } from "@/Utils";

import IconButton from "../Button/IconButton";
import ZapButton from "../Event/ZapButton";
import { ProxyImg } from "../ProxyImg";
import Avatar from "../User/Avatar";
import { BaseWidget } from "./base";

export default function MiniStreamWidget() {
  const streams = useLiveStreams();

  const ev = streams.at(0);
  const host = ev?.tags.find(a => a[0] === "p" && a.at(3) === "host")?.at(1) ?? ev?.pubkey;
  const hostProfile = useUserProfile(host);

  if (!ev) return;
  const link = NostrLink.fromEvent(ev);
  const image = findTag(ev, "image");
  const title = findTag(ev, "title");
  return (
    <BaseWidget>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl relative aspect-video w-full overflow-hidden">
          <ProxyImg src={image} className="absolute w-full h-full" />
          <div className="absolute flex items-center justify-center w-full h-full">
            <IconButton
              icon={{
                name: "play-square-outline",
              }}
              onClick={() => window.open(`https://zap.stream/${link.encode()}`, "_blank")}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Avatar pubkey={host ?? ""} user={hostProfile} size={48} />
            <div className="flex flex-col">
              <div className="text-lg text-white f-ellipsis font-semibold">{title}</div>
              <div>{getDisplayName(hostProfile, host!)}</div>
            </div>
          </div>
          <div>{host && <ZapButton pubkey={host} event={link} />}</div>
        </div>
      </div>
    </BaseWidget>
  );
}
