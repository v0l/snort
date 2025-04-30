import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

export function ClientTag({ ev }: { ev: TaggedNostrEvent }) {
  const tag = ev.tags.find(a => a[0] === "client");
  if (!tag) return;
  const link = tag[2] && tag[2].includes(":") ? NostrLink.fromTag(["a", tag[2]]) : undefined;
  return (
    <span className="text-xs text-gray-light">
      {" "}
      <FormattedMessage
        defaultMessage="via {client}"
        description="via {client name} tag"
        values={{
          client: link ? <Link to={`/${link.encode()}`}>{tag[1]}</Link> : tag[1],
        }}
      />
    </span>
  );
}
