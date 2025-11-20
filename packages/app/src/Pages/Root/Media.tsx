import { EventKind } from "@snort/system";

import TimelineFollows from "@/Components/Feed/TimelineFollows";
import { Day } from "@/Utils/Const";

export default function MediaPosts() {
  return (
    <div className="py-2">
      <TimelineFollows
        id="media"
        postsOnly={true}
        kinds={[EventKind.Photo, EventKind.Video, EventKind.ShortVideo]}
        firstChunkSize={Day * 7}
        windowSize={Day}
      />
    </div>
  );
}
