import { useParams } from "react-router-dom";

import { EventKind } from "@snort/nostr";
import useAddressFeed from "Feed/AddressFeed";
import LongFormNote from "Element/LongFormNote";
import { parseAddress } from "Util";

export default function AddressPage() {
  const { address } = useParams();
  const [d, p, k] = parseAddress(address ?? "") ?? [];
  const note = useAddressFeed(d, p, k);

  if (d && p && note?.kind === EventKind.LongFormNote) {
    return <LongFormNote d={d} pubkey={p} key={address} data={note} />;
  }

  return null;
}
