import { base64 } from "@scure/base";
import { removeUndefined, unwrap } from "@snort/shared";
import { CachedMetadata, EventKind, EventPublisher, TaggedNostrEvent } from "@snort/system";

import { UserCache } from "@/Cache";
import SnortApi from "@/External/SnortApi";
import { MentionRegex } from "@/Utils/Const";
import { defaultAvatar, getDisplayName, tagFilterOfTextRepost } from "@/Utils/index";
import { LoginSession } from "@/Utils/Login";

export interface NotificationRequest {
  title: string;
  body: string;
  icon: string;
  timestamp: number;
}

export async function makeNotification(ev: TaggedNostrEvent): Promise<NotificationRequest | null> {
  switch (ev.kind) {
    case EventKind.TextNote: {
      if (ev.tags.some(tagFilterOfTextRepost(ev))) {
        return null;
      }
      const pubkeys = new Set([ev.pubkey, ...ev.tags.filter(a => a[0] === "p").map(a => a[1])]);
      await UserCache.buffer([...pubkeys]);
      const allUsers = removeUndefined([...pubkeys].map(a => UserCache.getFromCache(a)));
      const fromUser = UserCache.getFromCache(ev.pubkey);
      const name = getDisplayName(fromUser, ev.pubkey);
      const avatarUrl = fromUser?.picture || defaultAvatar(ev.pubkey);
      return {
        title: `Reply from ${name}`,
        body: replaceTagsWithUser(ev, allUsers).substring(0, 50),
        icon: avatarUrl,
        timestamp: ev.created_at * 1000,
      };
    }
  }
  return null;
}

function replaceTagsWithUser(ev: TaggedNostrEvent, users: CachedMetadata[]) {
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

export async function sendNotification(state: LoginSession, req: NotificationRequest) {
  const hasPermission = "Notification" in window && Notification.permission === "granted";
  const shouldShowNotification = hasPermission && req.timestamp > state.readNotifications;
  if (shouldShowNotification) {
    try {
      const worker = await navigator.serviceWorker.ready;
      worker.showNotification(req.title, {
        tag: "notification",
        vibrate: [500],
        ...req,
      });
    } catch (error) {
      console.warn(error);
    }
  }
}

export async function subscribeToNotifications(publisher: EventPublisher) {
  if (!CONFIG.features.pushNotifications) {
    return;
  }
  // request permissions to send notifications
  if ("Notification" in window) {
    try {
      if (Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
    } catch (e) {
      console.error(e);
    }
  }
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && publisher) {
        const api = new SnortApi(undefined, publisher);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: (await api.getPushNotificationInfo()).publicKey,
        });
        await api.registerPushNotifications({
          endpoint: sub.endpoint,
          p256dh: base64.encode(new Uint8Array(unwrap(sub.getKey("p256dh")))),
          auth: base64.encode(new Uint8Array(unwrap(sub.getKey("auth")))),
          scope: `${location.protocol}//${location.hostname}`,
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}
