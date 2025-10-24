import { findTag } from "@/Utils";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

export function ClientTag({ ev }: { ev: TaggedNostrEvent }) {
  const info = getClientInfo(ev);
  if (!info) return;
  return (
    <span className="text-xs text-neutral-400 light:text-neutral-500">
      {" "}
      <FormattedMessage
        defaultMessage="via {client}"
        description="via {client name} tag"
        values={{
          client: info.link ? <Link to={`/${info.link.encode()}`}>{info.tag[1]}</Link> : info.tag[1],
        }}
      />
    </span>
  );
}

export function getClientInfo(ev: NostrEvent) {
  let tag = ev.tags.find(a => a[0] === "client");
  // try fingerprinting note when no client tag set
  if (!tag) {
    //amethyst
    const altTag = findTag(ev, "alt");
    if (ev.kind === EventKind.TextNote && altTag?.startsWith("A short note: ")) {
      tag = ["client", "Amethyst"];
    }
  }
  if (!tag) return;
  const link = tag[2] && tag[2].includes(":") ? NostrLink.tryFromTag(["a", tag[2]]) : undefined;
  return { tag, link };
}
