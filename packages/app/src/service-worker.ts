/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[];
};

import { NostrEvent, NostrPrefix, mapEventToProfile, tryParseNostrLink } from "@snort/system";
import { defaultAvatar, getDisplayName } from "SnortUtils";
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
}

interface PushNotification {
  type: PushType;
  data: object;
}

interface PushNotificationMention {
  profiles: Array<NostrEvent>;
  events: Array<NostrEvent>;
}

self.addEventListener("push", async e => {
  console.debug(e);
  const data = e.data?.json() as PushNotification | undefined;
  console.debug(data);
  if (data) {
    switch (data.type) {
      case PushType.Mention: {
        const mention = data.data as PushNotificationMention;
        for (const ev of mention.events) {
          const userEvent = mention.profiles.find(a => a.pubkey === ev.pubkey);
          const userProfile = userEvent ? mapEventToProfile(userEvent) : undefined;
          const avatarUrl = userProfile?.picture ?? defaultAvatar(ev.pubkey);

          const notif = {
            title: `Reply from ${getDisplayName(userProfile, ev.pubkey)}`,
            body: replaceMentions(ev.content, mention.profiles).substring(0, 250),
            icon: avatarUrl,
            timestamp: ev.created_at * 1000,
          };

          console.debug("Sending notification", notif);
          await self.registration.showNotification(notif.title, {
            tag: "notification",
            vibrate: [500],
            ...notif,
          });
        }
        break;
      }
    }
  }
});

const MentionNostrEntityRegex = /@n(pub|profile|event|ote|addr|)1[acdefghjklmnpqrstuvwxyz023456789]+/g;

function replaceMentions(content: string, profiles: Array<NostrEvent>) {
  return content
    .split(MentionNostrEntityRegex)
    .map(i => {
      if (MentionNostrEntityRegex.test(i)) {
        const link = tryParseNostrLink(i);
        if (link?.type === NostrPrefix.PublicKey || link?.type === NostrPrefix.Profile) {
          const px = profiles.find(a => a.pubkey === link.id);
          const profile = px && mapEventToProfile(px);
          return `@${getDisplayName(profile, link.id)}`;
        }
      }
      return i;
    })
    .join("");
}
