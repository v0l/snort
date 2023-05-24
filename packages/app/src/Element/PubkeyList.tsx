import { RawEvent } from "@snort/nostr";
import { dedupe } from "SnortUtils";
import FollowListBase from "./FollowListBase";

export default function PubkeyList({ ev, className }: { ev: RawEvent; className?: string }) {
  const ids = dedupe(ev.tags.filter(a => a[0] === "p").map(a => a[1]));
  return <FollowListBase pubkeys={ids} showAbout={true} className={className} />;
}
