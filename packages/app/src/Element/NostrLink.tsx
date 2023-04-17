import { EventKind, NostrPrefix } from "@snort/nostr";
import { Link } from "react-router-dom";

import Mention from "Element/Mention";
import NostrFileHeader from "Element/NostrFileHeader";
import { parseNostrLink } from "Util";

export default function NostrLink({ link }: { link: string }) {
  const nav = parseNostrLink(link);

  if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
    return <Mention pubkey={nav.id} relays={nav.relays} />;
  } else if (nav?.type === NostrPrefix.Note || nav?.type === NostrPrefix.Event || nav?.type === NostrPrefix.Address) {
    if (nav.kind === EventKind.FileHeader) {
      return <NostrFileHeader link={nav} />;
    }
    const evLink = nav.encode();
    return (
      <Link to={`/e/${evLink}`} onClick={e => e.stopPropagation()} state={{ from: location.pathname }}>
        #{evLink.substring(0, 12)}
      </Link>
    );
  } else {
    return (
      <a href={link} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
        {link}
      </a>
    );
  }
}
