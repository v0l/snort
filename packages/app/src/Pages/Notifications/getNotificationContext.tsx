import { unwrap } from "@snort/shared";
import { EventExt, EventKind, NostrLink, TaggedNostrEvent } from "@snort/system";

export function getNotificationContext(ev: TaggedNostrEvent) {
  switch (ev.kind) {
    case EventKind.ZapReceipt: {
      const aTag = ev.tags.find(a => a[0] === "a");
      if (aTag) {
        return NostrLink.fromTag(aTag);
      }
      const eTag = ev.tags.find(a => a[0] === "e");
      if (eTag) {
        return NostrLink.fromTag(eTag);
      }
      const pTag = ev.tags.find(a => a[0] === "p");
      if (pTag) {
        return NostrLink.fromTag(pTag);
      }
      break;
    }
    case EventKind.Repost:
    case EventKind.Reaction: {
      const thread = EventExt.extractThread(ev);
      const tag = unwrap(thread?.replyTo ?? thread?.root ?? { value: ev.id, key: "e" });
      if (tag.key === "e" || tag.key === "a") {
        return NostrLink.fromThreadTag(tag);
      } else {
        throw new Error("Unknown thread context");
      }
    }
    case EventKind.TextNote: {
      return NostrLink.fromEvent(ev);
    }
  }
}
