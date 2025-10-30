import { unwrap } from "@snort/shared";
import { EventKind, NostrHashtagLink } from "@snort/system";
import { useMemo } from "react";

import Timeline from "@/Components/Feed/Timeline";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useLogin from "@/Hooks/useLogin";

export function TopicsPage() {
  const { tags, pubKey } = useLogin(s => ({
    pubKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestSet),
  }));
  const subject = useMemo(
    () =>
      ({
        type: "hashtag",
        items: tags.filter(a => a instanceof NostrHashtagLink).map(a => unwrap(a.toEventTag())[1]),
        discriminator: pubKey ?? "",
      }) as TimelineSubject,
    [tags, pubKey],
  );

  return <Timeline subject={subject} postsOnly={true} method="TIME_RANGE" window={60 * 60 * 6} />;
}
