/// <reference lib="webworker" />
import { UsersRelaysCache } from "../Cache/UserRelayCache";
import { NostrSystem } from ".";
declare const self: SharedWorkerGlobalScope;

const RelayCache = new UsersRelaysCache();
const System = new NostrSystem({
  get: pk => RelayCache.getFromCache(pk)?.relays,
});

self.onconnect = e => {
  const port = e.ports[0];

  port.addEventListener("message", async e1 => {
    console.debug(e1);
    const [cmd, ...others] = e1.data;
    switch (cmd) {
    }
  });
  port.start();
};
