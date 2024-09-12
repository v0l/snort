import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";

import useFollowsControls from "./useFollowControls";

export default function useAppHandler(kind: EventKind) {
  const { followList } = useFollowsControls();

  const sub = new RequestBuilder(`app-handler:${kind}`);
  sub
    .withFilter()
    .kinds([31990 as EventKind])
    .tag("k", [kind.toString()]);

  const dataApps = useRequestBuilder(sub);

  const reccomendsSub = new RequestBuilder(`app-handler:${kind}:recommends`);
  if (dataApps.length > 0 && followList.length > 0) {
    reccomendsSub
      .withFilter()
      .kinds([31989 as EventKind])
      .replyToLink(dataApps.map(a => NostrLink.fromEvent(a)))
      .authors(followList);
  }

  const dataRecommends = useRequestBuilder(reccomendsSub);
  return {
    reccomends: dataRecommends,
    apps: dataApps,
  };
}
