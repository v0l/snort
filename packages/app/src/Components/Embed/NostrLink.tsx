import { Link } from "react-router-dom";
import { NostrPrefix, tryParseNostrLink } from "@snort/system";

import Mention from "@/Components/Embed/Mention";
import NoteQuote from "@/Components/Event/NoteQuote";

export default function NostrLink({ link, depth }: { link: string; depth?: number }) {
  const nav = tryParseNostrLink(link);

  if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
    if (nav.id.startsWith("npub")) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
    return <Mention link={nav} />;
  } else if (nav?.type === NostrPrefix.Note || nav?.type === NostrPrefix.Event || nav?.type === NostrPrefix.Address) {
    if ((depth ?? 0) > 0) {
      const evLink = nav.encode();
      return (
        <Link to={`/${evLink}`} onClick={e => e.stopPropagation()} state={{ from: location.pathname }}>
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
