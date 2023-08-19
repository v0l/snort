/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

clientsClaim();

const staticTypes = ["image", "video", "audio", "script", "style", "font"];
const paths = ["/"];
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin && (staticTypes.includes(request.destination) || paths.includes(url.pathname)),
  new CacheFirst({
    cacheName: "static-content",
  })
);

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
