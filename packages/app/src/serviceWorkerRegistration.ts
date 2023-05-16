export function register() {
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      registerValidSW("/service-worker.js");
    });
  }
}

async function registerValidSW(swUrl: string) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }
      installingWorker.onstatechange = () => {
        if (installingWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            console.log("Service worker updated, pending reload");
          } else {
            console.log("Content is cached for offline use.");
          }
        }
      };
    };
  } catch (e) {
    console.error("Error during service worker registration:", e);
  }
}

export async function unregister() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  }
}
