import { Link } from "react-router-dom";
import { EventKind, NostrPrefix } from "@snort/nostr";

import Mention from "Element/Mention";
import NostrFileHeader from "Element/NostrFileHeader";
import { parseNostrLink } from "Util";
import NoteQuote from "Element/NoteQuote";
import ZapstrEmbed from "Element/ZapstrEmbed";

export default function NostrLink({ link, depth }: { link: string; depth?: number }) {
  const nav = parseNostrLink(link);

  if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
    return <Mention pubkey={nav.id} relays={nav.relays} />;
  } else if (nav?.type === NostrPrefix.Note || nav?.type === NostrPrefix.Event || nav?.type === NostrPrefix.Address) {
    if (nav.kind === EventKind.FileHeader) {
      return <NostrFileHeader link={nav} />;
    }
    if (nav.kind === 31337) {
      return <ZapstrEmbed link={nav} />;
    }

    if ((depth ?? 0) > 0) {
      const evLink = nav.encode();
      return (
        <Link to={`/e/${evLink}`} onClick={e => e.stopPropagation()} state={{ from: location.pathname }}>
          #{evLink.substring(0, 12)}
        </Link>
      );
    } else {
      return <NoteQuote link={nav} depth={depth} />;
    }
  } else {
    return (
      <a href={link} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="ext">
        {link}
      </a>
    );
  }
}
