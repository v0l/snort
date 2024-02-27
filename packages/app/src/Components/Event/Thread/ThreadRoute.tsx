import { NostrPrefix, parseNostrLink } from "@snort/system";
import { useParams } from "react-router-dom";

import { Thread } from "@/Components/Event/Thread/Thread";
import { ThreadContextWrapper } from "@/Utils/Thread/ThreadContextWrapper";

export function ThreadRoute({ id }: { id?: string }) {
  const params = useParams();
  const resolvedId = id ?? params.id;
  const link = parseNostrLink(resolvedId ?? "", NostrPrefix.Note);

  return (
    <ThreadContextWrapper link={link}>
      <Thread />
    </ThreadContextWrapper>
  );
}
