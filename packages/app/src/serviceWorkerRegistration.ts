// Import the service worker with Vite's special syntax
//import ServiceWorkerURL from "./service-worker?worker&url";

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      //registerValidSW(ServiceWorkerURL);
    });
  }
}

/*
async function registerValidSW(swUrl: string) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl,
      { type: 'module' });
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            console.log('Service worker updated, pending reload');
          } else {
            console.log('Content is cached for offline use.');
          }
        }
      };
    };
  } catch (e) {
    console.error('Error during service worker registration:', e);
  }
}

 */

export async function unregister() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  }
}
