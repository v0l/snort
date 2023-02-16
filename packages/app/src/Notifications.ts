import Nostrich from "nostrich.webp";

import { TaggedRawEvent } from "@snort/nostr";
import { EventKind } from "@snort/nostr";
import type { NotificationRequest } from "State/Login";
import { MetadataCache, UsersDb } from "State/Users";
import { getDisplayName } from "Element/ProfileImage";
import { MentionRegex } from "Const";
import { tagFilterOfTextRepost } from "Util";

export async function makeNotification(db: UsersDb, ev: TaggedRawEvent): Promise<NotificationRequest | null> {
  switch (ev.kind) {
    case EventKind.TextNote: {
      if (ev.tags.some(tagFilterOfTextRepost(ev))) {
        return null;
      }
      const pubkeys = new Set([ev.pubkey, ...ev.tags.filter(a => a[0] === "p").map(a => a[1])]);
      const users = await db.bulkGet(Array.from(pubkeys));
      const fromUser = users.find(a => a?.pubkey === ev.pubkey);
      const name = getDisplayName(fromUser, ev.pubkey);
      const avatarUrl = fromUser?.picture || Nostrich;
      return {
        title: `Reply from ${name}`,
        body: replaceTagsWithUser(ev, users).substring(0, 50),
        icon: avatarUrl,
        timestamp: ev.created_at * 1000,
      };
    }
  }
  return null;
}

function replaceTagsWithUser(ev: TaggedRawEvent, users: MetadataCache[]) {
  return ev.content
    .split(MentionRegex)
    .map(match => {
      const matchTag = match.match(/#\[(\d+)\]/);
      if (matchTag && matchTag.length === 2) {
        const idx = parseInt(matchTag[1]);
        const ref = ev.tags[idx];
        if (ref && ref[0] === "p" && ref.length > 1) {
          const u = users.find(a => a.pubkey === ref[1]);
          return `@${getDisplayName(u, ref[1])}`;
        }
      }
      return match;
    })
    .join();
}
