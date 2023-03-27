import { NostrPrefix } from "@snort/nostr";
import { Link } from "react-router-dom";

import Mention from "Element/Mention";
import { eventLink, parseNostrLink } from "Util";

export default function NostrLink({ link }: { link: string }) {
  const nav = parseNostrLink(link);

  if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
    return <Mention pubkey={nav.id} relays={nav.relays} />;
  } else if (nav?.type === NostrPrefix.Note || nav?.type === NostrPrefix.Event) {
    const evLink = eventLink(nav.id, nav.relays);
    return (
      <Link to={evLink} onClick={e => e.stopPropagation()} state={{ from: location.pathname }}>
        #{evLink.split("/").at(-1)?.substring(0, 12)}
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
