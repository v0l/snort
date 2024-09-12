import { removeUndefined, unixNow } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import useLogin from "@/Hooks/useLogin";
import { Hour } from "@/Utils/Const";

export default function useHashtagsFeed() {
  const { hashtags } = useLogin(s => ({ hashtags: s.state.getList(EventKind.InterestsList) }));
  const sub = useMemo(() => {
    const rb = new RequestBuilder("hashtags-feed");
    rb.withFilter()
      .kinds([EventKind.TextNote, EventKind.LiveEvent, EventKind.LongFormTextNote, EventKind.Polls])
      .tag("t", removeUndefined(hashtags.map(a => a.toEventTag()?.[1])))
      .since(unixNow() - Hour * 6);
    return rb;
  }, [hashtags]);

  return {
    data: useRequestBuilder(sub),
    hashtags,
  };
}
