import Timeline from "@/Components/Feed/Timeline";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import { sanitizeRelayUrl } from "@snort/shared";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

export default function RelayFeedPage() {
  const relayParam = useParams().relay as string | undefined;
  const relay = useMemo(() => {
    if (relayParam) {
      let u = relayParam;
      if (!u?.startsWith("ws")) {
        u = `wss://${u}`;
      }
      return sanitizeRelayUrl(u);
    }
  }, [relayParam]);

  const subject = useMemo(
    () =>
      ({
        type: "global",
        discriminator: `relays:${relayParam}`,
        relay: relay ? [relay] : undefined,
      }) as TimelineSubject,
    [relay],
  );

  return <Timeline postsOnly={false} subject={subject} method={"LIMIT_UNTIL"} />;
}
