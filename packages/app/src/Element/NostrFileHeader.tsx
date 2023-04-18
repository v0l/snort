import useEventFeed from "Feed/EventFeed";
import { NostrLink } from "Util";
import HyperText from "Element/HyperText";
import { FormattedMessage } from "react-intl";
import PageSpinner from "Element/PageSpinner";

export default function NostrFileHeader({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev.data) return <PageSpinner />;

  // assume image or embed which can be rendered by the hypertext kind
  // todo: make use of hash
  // todo: use magnet or other links if present
  const u = ev.data?.tags.find(a => a[0] === "u")?.[1] ?? "";
  if (u) {
    return <HyperText link={u} creator={ev.data?.pubkey ?? ""} />;
  } else {
    return (
      <b className="error">
        <FormattedMessage defaultMessage="Unknown file header: {name}" values={{ name: ev.data?.content }} />
      </b>
    );
  }
}
