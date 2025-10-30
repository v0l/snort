import { NostrLink, parseNostrLink } from "@snort/system";
import { useParams } from "react-router-dom";

import { ThreadElement } from "@/Components/Event/Thread/Thread";
import { ThreadContextWrapper } from "@/Utils/Thread/ThreadContextWrapper";
import { NostrPrefix } from "@snort/shared";

export function ThreadRoute({ id }: { id?: string | NostrLink }) {
  const params = useParams();
  const link = id instanceof NostrLink ? id : parseNostrLink(id ?? params.id ?? "", NostrPrefix.Note);

  return (
    <ThreadContextWrapper link={link}>
      <ThreadElement />
    </ThreadContextWrapper>
  );
}
