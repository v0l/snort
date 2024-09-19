import { useUserProfile } from "@snort/system-react";

import { UserRelays } from "@/Cache";
import useWoT from "@/Hooks/useWoT";
import { getRelayName } from "@/Utils";

export function UserDebug({ pubkey }: { pubkey: string }) {
  const profile = useUserProfile(pubkey);
  const relays = UserRelays.getFromCache(pubkey);
  const wot = useWoT();

  return (
    <div className="text-xs">
      <div className="flex flex-col overflow-wrap">
        <div className="flex justify-between gap-1">
          <div>WoT Distance:</div>
          <div>{wot.followDistance(pubkey)}</div>
        </div>
        {Object.entries(profile ?? {}).map(([k, v]) => {
          let vv = <div>{v}</div>;

          if (k === "loaded") vv = <div>{new Date(Number(v)).toISOString()}</div>;
          if (k === "created") vv = <div>{new Date(Number(v) * 1000).toISOString()}</div>;
          if (k === "npub" || k === "pubkey") return;
          return (
            <div key={`${pubkey}-${k}`} className="flex justify-between gap-1">
              <div>{k}</div>
              {vv}
            </div>
          );
        })}
      </div>
      <br />
      <div className="flex flex-col">
        <div>Relays Updated: {new Date(1000 * (relays?.created ?? 0)).toISOString()}</div>
        {relays?.relays.map(a => (
          <div className="flex hover:bg-[--gray-ultradark]" key={a.url}>
            <div className="grow">{getRelayName(a.url)}</div>
            <div>{a.settings.read && <>R</>}</div>
            <div>{a.settings.write && <>W</>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
