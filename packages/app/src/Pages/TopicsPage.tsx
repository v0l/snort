import { useMemo } from "react";

import Timeline from "@/Components/Feed/Timeline";
import useLogin from "@/Hooks/useLogin";
import { EventKind } from "@snort/system";
import { unwrap } from "@snort/shared";
import { TimelineSubject } from "@/Feed/TimelineFeed";

export function TopicsPage() {
  const { tags, pubKey } = useLogin(s => ({
    pubKey: s.publicKey,
    tags: s.state.getList(EventKind.InterestSet),
  }));
  const subject = useMemo(
    () =>
      ({
        type: "hashtag",
        items: tags.filter(a => a.toEventTag()?.[0] === "t").map(a => unwrap(a.toEventTag())[1]),
        discriminator: pubKey ?? "",
      }) as TimelineSubject,
    [tags, pubKey],
  );

  return <Timeline subject={subject} postsOnly={true} method="TIME_RANGE" window={60 * 60 * 6} />;
}
