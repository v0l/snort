import { transformTextCached } from "@/Hooks/useTextTransformCache";
import { TaggedNostrEvent } from "@snort/system";

export default function getEventMedia(event: TaggedNostrEvent) {
  const parsed = transformTextCached(event.id, event.content, event.tags);
  return parsed.filter(
    a => a.type === "media" && (a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/")),
  );
}
