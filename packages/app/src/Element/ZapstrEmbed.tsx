import useEventFeed from "Feed/EventFeed";
import Spinner from "Icons/Spinner";
import { NostrLink } from "Util";
import Text from "./Text";

export default function ZapstrEmbed({ link }: { link: NostrLink }) {
  const ev = useEventFeed(link);

  if (!ev.data) return <Spinner />;
  return <Text content={ev.data.content ?? ""} tags={[]} creator={ev.data.pubkey} />;
}
