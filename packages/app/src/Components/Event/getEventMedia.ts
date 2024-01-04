import { TaggedNostrEvent } from "@snort/system";

import { transformTextCached } from "@/Hooks/useTextTransformCache";

export default function getEventMedia(event: TaggedNostrEvent) {
  const parsed = transformTextCached(event.id, event.content, event.tags);
  return parsed.filter(
    a => a.type === "media" && (a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/")),
  );
}
