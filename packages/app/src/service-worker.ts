/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[];
};

import { NostrLink, NostrPrefix, tryParseNostrLink } from "@snort/system";
import { formatShort } from "Number";
import { defaultAvatar, hexToBech32 } from "SnortUtils";
import { clientsClaim } from "workbox-core";
import { PrecacheEntry, precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const enum PushType {
  Mention = 1,
  Reaction = 2,
  Zap = 3,
  Repost = 4,
  DirectMessage = 5,
}

interface PushNotification {
  type: PushType;
  data: object;
}

interface CompactMention {
  id: string;
  created_at: number;
  content: string;
  author: CompactProfile;
  mentions: Array<CompactProfile>;
}

interface CompactReaction {
  id: string;
  created_at: number;
  content: string;
  author: CompactProfile;
  event?: string;
  amount?: number;
}

interface CompactProfile {
  pubkey: string;
  name?: string;
  avatar?: string;
}

self.addEventListener("notificationclick", event => {
  const id = event.notification.tag as string;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window" });
      const url = `/${id}`;
      for (const client of windows) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("push", async e => {
  console.debug(e);
  const data = e.data?.json() as PushNotification | undefined;
  console.debug(data);
  if (data) {
    switch (data.type) {
      case PushType.Mention: {
        const evx = data.data as CompactMention;
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} replied`,
          makeNotification(data.type, evx),
        );
        break;
      }
      case PushType.Reaction: {
        const evx = data.data as CompactReaction;
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} reacted`,
          makeNotification(data.type, evx),
        );
        break;
      }
      case PushType.Zap: {
        const evx = data.data as CompactReaction;
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} zapped${evx.amount ? ` ${formatShort(evx.amount)} sats` : ""}`,
          makeNotification(data.type, evx),
        );
        break;
      }
      case PushType.Repost: {
        const evx = data.data as CompactReaction;
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} reposted`,
          makeNotification(data.type, evx),
        );
        break;
      }
      case PushType.DirectMessage: {
        const evx = data.data as CompactReaction;
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} sent you a DM`,
          makeNotification(data.type, evx),
        );
        break;
      }
    }
  }
});

const MentionNostrEntityRegex = /(nostr:n(?:pub|profile|event|ote|addr)1[acdefghjklmnpqrstuvwxyz023456789]+)/g;

function replaceMentions(content: string, profiles: Array<CompactProfile>) {
  return content
    .split(MentionNostrEntityRegex)
    .map(i => {
      if (MentionNostrEntityRegex.test(i)) {
        const link = tryParseNostrLink(i);
        if (link?.type === NostrPrefix.PublicKey || link?.type === NostrPrefix.Profile) {
          const px = profiles.find(a => a.pubkey === link.id);
          return `@${displayNameOrDefault(px ?? { pubkey: link.id })}`;
        }
      }
      return i;
    })
    .join("");
}

function displayNameOrDefault(p: CompactProfile) {
  if ((p.name?.length ?? 0) > 0) {
    return p.name;
  }
  return hexToBech32("npub", p.pubkey).slice(0, 12);
}

function makeNotification(type: PushType, evx: CompactMention | CompactReaction) {
  return {
    body: (() => {
      if (type === PushType.Mention) {
        return ("mentions" in evx ? replaceMentions(evx.content, evx.mentions) : evx.content).substring(0, 250);
      } else if (type === PushType.Reaction) {
        if (evx.content === "+") return "💜";
        if (evx.content === "-") return "👎";
        return evx.content;
      } else if (type === PushType.DirectMessage) {
        return "";
      } else if (type === PushType.Repost) {
        return "";
      }
      return evx.content.substring(0, 250);
    })(),
    icon: evx.author.avatar ?? defaultAvatar(evx.author.pubkey),
    badge: CONFIG.appleTouchIconUrl,
    timestamp: evx.created_at * 1000,
    tag: new NostrLink(NostrPrefix.Event, evx.id, undefined, evx.author.pubkey, undefined).encode(),
  };
}
