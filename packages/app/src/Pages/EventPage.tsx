import { useParams } from "react-router-dom";
import Thread from "Element/Thread";
import useThreadFeed from "Feed/ThreadFeed";
import { parseId } from "Util";

export default function EventPage() {
  const params = useParams();
  const id = parseId(params.id ?? "");
  const thread = useThreadFeed(id);

  return <Thread key={id} notes={thread.notes} this={id} />;
}
