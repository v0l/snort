import { FormattedMessage } from "react-intl";
import { NostrEvent } from "System";

import { findTag, NostrLink } from "SnortUtils";
import useEventFeed from "Feed/EventFeed";
import PageSpinner from "Element/PageSpinner";
import Reveal from "Element/Reveal";
import { MediaElement } from "Element/MediaElement";

export default function NostrFileHeader({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev.data) return <PageSpinner />;
  return <NostrFileElement ev={ev.data} />;
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
        <MediaElement mime={m} url={u} sha256={x} magnet={magnet} blurHash={blurHash} />
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
