import {
  EventKind,
  mapEventToProfile,
  NostrEvent,
  NostrLink,
  RequestBuilder,
  TaggedNostrEvent,
  UserMetadata,
} from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import useWoT from "./useWoT";

export interface AppHandler {
  event: TaggedNostrEvent;
  metadata?: UserMetadata;
  reccomendations: Array<NostrEvent>;
}

export default function useAppHandler(kind: EventKind): Array<AppHandler> {
  const sub = useMemo(() => {
    const sub = new RequestBuilder(`app-handler:${kind}`);
    sub
      .withFilter()
      .kinds([31990 as EventKind])
      .tag("k", [kind.toString()]);
    return sub;
  }, [kind]);

  const dataApps = useRequestBuilder(sub);

  const reccomendsSub = useMemo(() => {
    const reccomendsSub = new RequestBuilder(`app-handler:${kind}:reccomends`);
    if (dataApps.length > 0) {
      reccomendsSub
        .withFilter()
        .kinds([31989 as EventKind])
        .replyToLink(dataApps.map(a => NostrLink.fromEvent(a)));
    }
    return reccomendsSub;
  }, [kind, dataApps.length]);

  const wot = useWoT();
  const dataRecommends = useRequestBuilder(reccomendsSub);
  const apps = useMemo(
    () =>
      dataApps.map(a => {
        const meta = a.content.startsWith("{") && a.content.endsWith("}") ? mapEventToProfile(a) : undefined;
        const link = NostrLink.fromEvent(a);
        return {
          event: a,
          metadata: meta,
          reccomendations: wot.sortEvents(dataRecommends.filter(a => link.isReplyToThis(a))),
        } as AppHandler;
      }),
    [dataApps.length, dataRecommends.length, wot],
  );

  return apps.sort((a, b) => (a.reccomendations.length > b.reccomendations.length ? -1 : 1));
}
