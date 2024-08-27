import { unwrap } from "@snort/shared";
import { decodeTLV, EventKind, NostrPrefix, RequestBuilder, TLVEntryType } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

import { createEmptyChatObject } from "@/chat";

export function useEmptyChatSystem(id?: string) {
  const sub = useMemo(() => {
    if (!id) return;

    if (id.startsWith(NostrPrefix.Chat28)) {
      const cx = unwrap(decodeTLV(id).find(a => a.type === TLVEntryType.Special)).value as string;
      const rb = new RequestBuilder(`nip28:${id}`);
      rb.withFilter().ids([cx]).kinds([EventKind.PublicChatChannel, EventKind.PublicChatMetadata]);
      rb.withFilter()
        .tag("e", [cx])
        .kinds([EventKind.PublicChatChannel, EventKind.PublicChatMessage, EventKind.PublicChatMetadata]);

      return rb;
    }
  }, [id]);

  const data = useRequestBuilder(sub);
  return useMemo(() => {
    if (!id) return;
    return createEmptyChatObject(id, data);
  }, [id, data.length]);
}
