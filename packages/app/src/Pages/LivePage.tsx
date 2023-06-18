import "./LivePage.css";
import { parseNostrLink } from "@snort/system";
import { useParams } from "react-router-dom";

import { LiveVideoPlayer } from "Element/LiveVideoPlayer";
import { findTag, unwrap } from "SnortUtils";
import PageSpinner from "Element/PageSpinner";
import { LiveChat } from "Element/LiveChat";
import useEventFeed from "Feed/EventFeed";

export function LivePage() {
  const params = useParams();
  const link = parseNostrLink(unwrap(params.id));
  const thisEvent = useEventFeed(link);

  if (!thisEvent.data) {
    return <PageSpinner />;
  }

  return (
    <div className="live-page main-content">
      <div>
        <h3>{findTag(thisEvent.data, "title")}</h3>
        <LiveVideoPlayer stream={unwrap(findTag(thisEvent.data, "streaming"))} autoPlay={true} />
      </div>
      <LiveChat ev={thisEvent.data} link={link} />
    </div>
  );
}
