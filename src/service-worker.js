/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(({ request, url }) => {
  if (request.mode !== 'navigate' || url.pathname.startsWith('/_') || url.pathname.match(fileExtensionRegexp)) {
    return false;
  }
  return true;
},
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

const staticTypes = ["image", "video", "audio"]
registerRoute(({ request, url }) => url.origin === self.location.origin && staticTypes.includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'static-content',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 }),
    ],
  })
);

// External media domains which have unique urls (never changing content) and can be cached forever
const externalMediaHosts = ["void.cat", "nostr.build", "imgur.com", "i.imgur.com", "pbs.twimg.com", "i.ibb.co"];
registerRoute(({ url }) => externalMediaHosts.includes(url.host),
  new CacheFirst({
    cacheName: "ext-content-hosts"
  }));

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Any other custom service worker logic can go here.
