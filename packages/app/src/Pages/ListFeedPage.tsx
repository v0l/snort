import { dedupe, unwrap } from "@snort/shared";
import { parseNostrLink } from "@snort/system";
import { useEventFeed } from "@snort/system-react";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";

import Timeline from "@/Components/Feed/Timeline";
import PageSpinner from "@/Components/PageSpinner";
import type { TimelineSubject } from "@/Feed/TimelineFeed";
import { Hour } from "@/Utils/Const";

export function ListFeedPage() {
  const { id } = useParams();
  const link = parseNostrLink(unwrap(id));
  const data = useEventFeed(link);

  const pubkeys = dedupe(data?.tags.filter(a => a[0] === "p").map(a => a[1]) ?? []);
  const subject = useMemo(
    () =>
      ({
        type: "pubkey",
        items: pubkeys,
        discriminator: "list-feed",
      }) as TimelineSubject,
    [pubkeys],
  );

  if (!data) return <PageSpinner />;
  const hasPTags = data.tags.some(a => a[0] === "p");
  if (!hasPTags) {
    return (
      <b>
        <FormattedMessage defaultMessage="Must be a contact list or pubkey list" />
      </b>
    );
  }
  return <Timeline subject={subject} postsOnly={true} method="TIME_RANGE" window={Hour * 12} />;
}
