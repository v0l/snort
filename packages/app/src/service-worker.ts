/// <reference lib="webworker" />
import { hexToBytes } from "@noble/hashes/utils.js"
import { bech32 } from "@scure/base"
import { encodeTLVEntries, NostrPrefix, TLVEntryType } from "@snort/shared"
import { NostrLink, tryParseNostrLink } from "@snort/system/dist/nostr-link"
import { CacheableResponsePlugin } from "workbox-cacheable-response"
import { clientsClaim } from "workbox-core"
import { ExpirationPlugin } from "workbox-expiration"
import { cleanupOutdatedCaches, matchPrecache, type PrecacheEntry, precacheAndRoute } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies"

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[]
}

const Day = 24 * 60 * 60
const LegacyCaches = ["translate-cache", "image-cache"]

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", event => {
  event.waitUntil(Promise.all(LegacyCaches.map(name => caches.delete(name))))
})

registerRoute(
  new NavigationRoute(async ({ request }) => {
    try {
      return await fetch(request)
    } catch (e) {
      const shell = await matchPrecache("/index.html")
      if (shell) return shell
      throw e
    }
  }),
)

const notHtml = {
  cacheWillUpdate: async ({ response }: { response: Response }) =>
    response.headers.get("content-type")?.includes("text/html") ? null : response,
}

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/assets/"),
  new CacheFirst({
    cacheName: "assets-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      notHtml,
      new ExpirationPlugin({ maxEntries: 200, purgeOnQuotaError: true }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.pathname.endsWith("/.well-known/nostr.json"),
  new StaleWhileRevalidate({
    cacheName: "nostr-json-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: Day / 6, purgeOnQuotaError: true }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
)

registerRoute(
  ({ request, url }) =>
    request.destination === "image" &&
    !url.pathname.endsWith(".gif") &&
    (request.mode === "cors" || url.origin === self.location.origin),
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * Day,
        purgeOnQuotaError: true,
        matchOptions: {
          ignoreVary: true,
        },
      }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.origin === "https://nostr-rs-api.v0l.io" && url.pathname === "/preview",
  new CacheFirst({
    cacheName: "preview-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: Day, purgeOnQuotaError: true }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
)

enum PushType {
  Mention = 1,
  Reaction = 2,
  Zap = 3,
  Repost = 4,
  DirectMessage = 5,
}

interface PushNotification {
  type: PushType
  data: object
}

interface CompactMention {
  id: string
  created_at: number
  content: string
  author: CompactProfile
  mentions: Array<CompactProfile>
}

interface CompactReaction {
  id: string
  created_at: number
  content: string
  author: CompactProfile
  event?: string
  amount?: number
}

interface CompactProfile {
  pubkey: string
  name?: string
  avatar?: string
}

self.addEventListener("notificationclick", event => {
  const id = event.notification.tag as string
  const ev = JSON.parse(event.notification.data) as PushNotification

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window" })
      const url = () => {
        if (ev.type === PushType.Zap || ev.type === PushType.Reaction) {
          const mention = ev.data as CompactReaction
          if (mention.event) {
            return `/${new NostrLink(NostrPrefix.Note, mention.event).encode()}`
          }
        } else if (ev.type === PushType.DirectMessage) {
          const reaction = ev.data as CompactReaction
          return `/messages/${encodeTLVEntries("nchat17", {
            type: TLVEntryType.Author,
            value: reaction.author.pubkey,
            length: 32,
          })}`
        }
        return `/${new NostrLink(NostrPrefix.Note, id).encode()}`
      }
      for (const client of windows) {
        if (client.url === url() && "focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url())
    })(),
  )
})

self.addEventListener("push", e => {
  e.waitUntil(showPushNotification(e.data?.json() as PushNotification | undefined))
})

async function showPushNotification(data: PushNotification | undefined) {
  if (data) {
    switch (data.type) {
      case PushType.Mention: {
        const evx = data.data as CompactMention
        await self.registration.showNotification(`${displayNameOrDefault(evx.author)} replied`, makeNotification(data))
        break
      }
      case PushType.Reaction: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(`${displayNameOrDefault(evx.author)} reacted`, makeNotification(data))
        break
      }
      case PushType.Zap: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} zapped${evx.amount ? ` ${formatShort(evx.amount)} sats` : ""}`,
          makeNotification(data),
        )
        break
      }
      case PushType.Repost: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(`${displayNameOrDefault(evx.author)} reposted`, makeNotification(data))
        break
      }
      case PushType.DirectMessage: {
        const evx = data.data as CompactReaction
        await self.registration.showNotification(
          `${displayNameOrDefault(evx.author)} sent you a DM`,
          makeNotification(data),
        )
        break
      }
    }
  }
}

const MentionNostrEntityRegex = /(nostr:n(?:pub|profile|event|ote|addr)1[acdefghjklmnpqrstuvwxyz023456789]+)/g

function replaceMentions(content: string, profiles: Array<CompactProfile>) {
  return content
    .split(MentionNostrEntityRegex)
    .map(i => {
      if (MentionNostrEntityRegex.test(i)) {
        const link = tryParseNostrLink(i)
        if (link && (link.type === NostrPrefix.PublicKey || link.type === NostrPrefix.Profile)) {
          const px = profiles.find(a => a.pubkey === link.id)
          return `@${displayNameOrDefault(px ?? { pubkey: link.id })}`
        }
      }
      return i
    })
    .join("")
}

function displayNameOrDefault(p: CompactProfile) {
  if ((p.name?.length ?? 0) > 0) {
    return p.name
  }
  return bech32.encode("npub", bech32.toWords(hexToBytes(p.pubkey))).slice(0, 12)
}

function makeNotification(n: PushNotification) {
  const evx = n.data as CompactMention | CompactReaction

  const body = () => {
    if (n.type === PushType.Mention) {
      return ("mentions" in evx ? replaceMentions(evx.content, evx.mentions) : evx.content).substring(0, 250)
    } else if (n.type === PushType.Reaction) {
      if (evx.content === "+") return "💜"
      if (evx.content === "-") return "👎"
      return evx.content
    } else if (n.type === PushType.DirectMessage) {
      return ""
    } else if (n.type === PushType.Repost) {
      return ""
    }
    return evx.content.substring(0, 250)
  }
  const ret = {
    body: body(),
    icon: evx.author.avatar ?? `https://nostr-rs-api.v0l.io/avatar/robots/${evx.author.pubkey}.webp`,
    timestamp: evx.created_at * 1000,
    tag: evx.id,
    data: JSON.stringify(n),
  }
  console.debug(ret)
  return ret
}

function formatShort(n: number) {
  if (n > 1000) {
    return (n / 1000).toFixed(1)
  } else {
    return n.toFixed(0)
  }
}
