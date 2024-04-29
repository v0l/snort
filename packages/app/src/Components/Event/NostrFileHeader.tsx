import { NostrEvent, NostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import { FormattedMessage } from "react-intl";

import { MediaElement } from "@/Components/Embed/MediaElement";
import Reveal from "@/Components/Event/Reveal";
import PageSpinner from "@/Components/PageSpinner";
import { findTag } from "@/Utils";

export default function NostrFileHeader({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev) return <PageSpinner />;
  return <NostrFileElement ev={ev} />;
}

export function NostrFileElement({ ev }: { ev: NostrEvent }) {
  // assume image or embed which can be rendered by the hypertext kind
  // todo: make use of hash
  // todo: use magnet or other links if present
  const u = findTag(ev, "url");
  const x = findTag(ev, "x");
  const m = findTag(ev, "m");
  const blurHash = findTag(ev, "blurhash");
  const magnet = findTag(ev, "magnet");

  if (u && m) {
    return (
      <Reveal message={<FormattedMessage defaultMessage="Click to load content from {link}" values={{ link: u }} />}>
        <MediaElement
          mime={m}
          url={u}
          meta={{
            sha256: x,
            magnet: magnet,
            blurHash: blurHash,
          }}
        />
      </Reveal>
    );
  } else {
    return (
      <b className="error">
        <FormattedMessage defaultMessage="Unknown file header: {name}" values={{ name: ev.content }} />
      </b>
    );
  }
}
