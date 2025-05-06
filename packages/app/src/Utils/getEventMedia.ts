import { EventKind, ParsedFragment, readNip94TagsFromIMeta, TaggedNostrEvent } from "@snort/system";

import { transformTextCached } from "@/Hooks/useTextTransformCache";

export default function getEventMedia(event: TaggedNostrEvent) {
  // emulate parsed media from imeta kinds
  const mediaKinds = [EventKind.Photo, EventKind.Video, EventKind.ShortVideo];
  if (mediaKinds.includes(event.kind)) {
    const meta = event.tags.filter(a => a[0] === "imeta").map(readNip94TagsFromIMeta);
    return meta.map(
      a =>
        ({
          type: "media",
          mimeType: a.mimeType,
          content: a.url,
        }) as ParsedFragment,
    );
  }
  const parsed = transformTextCached(event.id, event.content, event.tags);
  return parsed.filter(
    a => a.type === "media" && (a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/")),
  );
}
