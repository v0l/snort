import { useMemo } from "react";
import { EventKind, NoteCollection, RequestBuilder } from "@snort/system";
import { unixNow } from "@snort/shared";
import { useRequestBuilder } from "@snort/system-react";

import useLogin from "@/Hooks/useLogin";
import { Hour } from "@/Const";

export default function useHashtagsFeed() {
  const { hashtags } = useLogin(s => ({ hashtags: s.tags.item }));
  const sub = useMemo(() => {
    const rb = new RequestBuilder("hashtags-feed");
    rb.withFilter()
      .kinds([EventKind.TextNote, EventKind.LiveEvent, EventKind.LongFormTextNote, EventKind.Polls])
      .tag("t", hashtags)
      .since(unixNow() - Hour * 6);
    return rb;
  }, [hashtags]);

  return {
    data: useRequestBuilder(NoteCollection, sub),
    hashtags,
  };
}
