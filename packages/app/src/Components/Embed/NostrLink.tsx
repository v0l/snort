import { tryParseNostrLink } from "@snort/system";
import { Link } from "react-router-dom";

import Mention from "@/Components/Embed/Mention";
import NoteQuote from "@/Components/Event/Note/NoteQuote";
import { NostrPrefix } from "@snort/shared";
import classNames from "classnames";

export default function NostrLink({ link, depth, className }: { link: string; depth?: number; className?: string }) {
  const nav = tryParseNostrLink(link);

  if (nav?.type === NostrPrefix.PublicKey || nav?.type === NostrPrefix.Profile) {
    return <Mention link={nav} className={className} />;
  } else if (nav?.type === NostrPrefix.Note || nav?.type === NostrPrefix.Event || nav?.type === NostrPrefix.Address) {
    if ((depth ?? 0) > 1) {
      const evLink = nav.encode();
      return (
        <Link
          to={`/${evLink}`}
          onClick={e => e.stopPropagation()}
          state={{ from: location.pathname }}
          className={className}>
          #{evLink.substring(0, 12)}
        </Link>
      );
    } else {
      return <NoteQuote link={nav} depth={depth} className={className} />;
    }
  } else {
    return (
      <a
        href={link}
        onClick={e => e.stopPropagation()}
        target="_blank"
        rel="noreferrer"
        className={classNames("text-highlight no-underline hover:underline", className)}>
        {link}
      </a>
    );
  }
}
