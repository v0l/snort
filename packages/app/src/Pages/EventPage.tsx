import { useParams } from "react-router-dom";

import Thread from "Element/Thread";
import useThreadFeed from "Feed/ThreadFeed";
import { parseNostrLink, unwrap } from "Util";

export default function EventPage() {
  const params = useParams();
  const link = parseNostrLink(params.id ?? "");
  const thread = useThreadFeed(unwrap(link));

  if (link) {
    return <Thread key={link.id} notes={thread.notes} selected={link.id} />;
  } else {
    return <b>{params.id}</b>;
  }
}
