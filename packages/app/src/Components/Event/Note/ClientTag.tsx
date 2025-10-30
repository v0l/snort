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
    const fingerprint = fingerprintClient(ev);
    if (fingerprint) {
      tag = ["client", fingerprint];
    }
  }
  if (!tag) return;
  const link = tag[2] && tag[2].includes(":") ? NostrLink.tryFromTag(["a", tag[2]]) : undefined;
  return { tag, link };
}

export function fingerprintClient(ev: NostrEvent) {
  //amethyst
  const altTag = findTag(ev, "alt");
  if (ev.kind === EventKind.TextNote && altTag?.startsWith("A short note: ")) {
    return "Amethyst";
  }

  //damus iOS
  if (ev.kind === EventKind.TextNote) {
    const newlinesBeforeImages =
      ev.content.includes("\n\nhttp") && (ev.content.includes(".jpg") || ev.content.includes(".webp"));
    const rTagToImages = ev.tags.some(a => a[0] === "r" && a[1].startsWith("http"));
    const hasIMeta = ev.tags.some(a => a[0] === "imeta");
    const newlinesBeforeQuotes = ev.tags.some(a => a[0] === "q") && ev.content.includes("\n\nnostr:");
    const endsDoubleNewline = ev.content.endsWith("\n\n");
    if ((newlinesBeforeImages && rTagToImages && hasIMeta) || newlinesBeforeQuotes || endsDoubleNewline) {
      return "Damus iOS";
    }
  }
}
