import useEventFeed from "Feed/EventFeed";
import { NostrLink } from "Util";
import HyperText from "Element/HyperText";
import { FormattedMessage } from "react-intl";
import Spinner from "Icons/Spinner";

export default function NostrFileHeader({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev.data?.length) return <Spinner />;

  // assume image or embed which can be rendered by the hypertext kind
  // todo: make use of hash
  // todo: use magnet or other links if present
  const u = ev.data?.[0]?.tags.find(a => a[0] === "u")?.[1] ?? "";
  if (u) {
    return <HyperText link={u} creator={ev.data?.[0]?.pubkey ?? ""} />;
  } else {
    return (
      <b className="error">
        <FormattedMessage defaultMessage="Unknown file header: {name}" values={{ name: ev.data?.[0]?.content }} />
      </b>
    );
  }
}
