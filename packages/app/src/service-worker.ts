/// <reference lib="webworker" />
import {} from ".";
declare const self: ServiceWorkerGlobalScope;

import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

clientsClaim();

const staticTypes = ["image", "video", "audio", "script", "style", "font"];
registerRoute(
  ({ request, url }) => url.origin === self.location.origin && staticTypes.includes(request.destination),
  new CacheFirst({
    cacheName: "static-content",
  })
);

// External media domains which have unique urls (never changing content) and can be cached forever
const externalMediaHosts = ["void.cat", "nostr.build", "imgur.com", "i.imgur.com", "pbs.twimg.com", "i.ibb.co"];
registerRoute(
  ({ url }) => externalMediaHosts.includes(url.host),
  new CacheFirst({
    cacheName: "ext-content-hosts",
  })
);

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
