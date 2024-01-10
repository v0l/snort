import { useParams } from "react-router-dom";

import Timeline from "@/Components/Feed/Timeline";
import { TimelineSubject } from "@/Feed/TimelineFeed";

export const TagsTab = (params: { tag?: string }) => {
  const { tag } = useParams();
  const t = params.tag ?? tag ?? "";
  const subject: TimelineSubject = {
    type: "hashtag",
    items: [t],
    discriminator: `tags-${t}`,
    streams: true,
  };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} />;
};
