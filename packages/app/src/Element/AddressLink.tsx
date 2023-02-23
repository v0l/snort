import { useMemo } from "react";
import { Link } from "react-router-dom";

import { encodeTLV, NostrPrefix, EventKind } from "@snort/nostr";
import useAddressFeed from "Feed/AddressFeed";

export default function AddressLink({ address }: { address: string }) {
  const [k, p, d] = address.split(":");
  const kind = Number(k);
  const naddr = useMemo(() => {
    if (d && p && k) {
      try {
        return encodeTLV(d, NostrPrefix.Address, [], p, kind);
      } catch (error) {
        console.error(error);
      }
    }
  }, [d, p, k]);
  const note = useAddressFeed(d, p, kind);

  if (note?.kind === EventKind.LongFormNote) {
    const title = note.tags.find((t: string[]) => t[0] === "title")?.at(1);
    return <Link to={`/a/${naddr}`}>{title || naddr}</Link>;
  }

  return <Link to={`/a/${naddr}`}>{naddr}</Link>;
}
