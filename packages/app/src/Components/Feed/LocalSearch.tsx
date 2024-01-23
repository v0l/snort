import { EventKind, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";

import { Relay } from "@/Cache";
import { SearchRelays } from "@/Utils/Const";

import PageSpinner from "../PageSpinner";
import { TimelineFragment } from "./TimelineFragment";

export function LocalSearch({ term, kind }: { term: string; kind: EventKind }) {
  const [frag, setFrag] = useState<TimelineFragment>();

  const r = useMemo(() => {
    const rb = new RequestBuilder("search");
    rb.withFilter().search(term).kinds([kind]).relay(SearchRelays).limit(100);
    return rb;
  }, [term]);
  useRequestBuilder(r);

  useEffect(() => {
    setFrag(undefined);
    if (term) {
      Relay.query([
        "REQ",
        "local-search",
        {
          kinds: [kind],
          limit: 100,
          search: term,
        },
      ]).then(res => {
        setFrag({
          refTime: 0,
          events: res as Array<TaggedNostrEvent>,
        });
      });
    }
  }, [term, kind]);

  if (frag) {
    return <TimelineFragment frag={frag} />;
  }
  return <PageSpinner />;
}
