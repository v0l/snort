/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[];
};

import { clientsClaim } from "workbox-core";
import { PrecacheEntry, precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
