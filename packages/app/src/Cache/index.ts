import { CacheRelay, Connection, ConnectionCacheRelay, UserRelaysCache } from "@snort/system";
import { WorkerRelayInterface } from "@snort/worker-relay";
import WorkerVite from "@snort/worker-relay/src/worker?worker";

import { GiftWrapCache } from "./GiftWrapCache";
import { ProfileCacheRelayWorker } from "./ProfileWorkerCache";
import { UserFollowsWorker } from "./UserFollowsWorker";
import { RelaysWorkerCache } from "./RelaysWorkerCache";

const cacheRelay = localStorage.getItem("cache-relay");

const workerRelay = new WorkerRelayInterface(
  import.meta.env.DEV ? new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url) : new WorkerVite(),
);

export const Relay: CacheRelay = cacheRelay
  ? new ConnectionCacheRelay(new Connection(cacheRelay, { read: true, write: true }))
  : workerRelay;

async function tryUseCacheRelay(url: string) {
  try {
    const conn = new Connection(url, { read: true, write: true });
    await conn.connect(true);
    localStorage.setItem("cache-relay", url);
    return conn;
  } catch (e) {
    console.warn(e);
  }
}

export async function tryUseLocalRelay() {
  let conn = await tryUseCacheRelay("ws://localhost:4869");
  if (!conn) {
    conn = await tryUseCacheRelay("ws://umbrel:4848");
  }
  return conn;
}

export async function initRelayWorker() {
  try {
    if (Relay instanceof ConnectionCacheRelay) {
      await Relay.connection.connect(true);
      return;
    }
  } catch (e) {
    localStorage.removeItem("cache-relay");
    console.error(e);
    if (cacheRelay) {
      window.location.reload();
    }
  }

  try {
    await workerRelay.debug("*");
    await workerRelay.init({
      databasePath: "relay.db",
      insertBatchSize: 100,
    });
    await workerRelay.configureSearchIndex({
      1: [], // add index for kind 1, dont index tags
    });
  } catch (e) {
    console.error(e);
  }
}

export const UserRelays = new RelaysWorkerCache(Relay);
export const UserFollows = new UserFollowsWorker(Relay);
export const ProfilesCache = new ProfileCacheRelayWorker(Relay);
export const GiftsCache = new GiftWrapCache();

export async function preload(follows?: Array<string>) {
  const preloads = [
    ProfilesCache.preload(follows),
    GiftsCache.preload(),
    UserRelays.preload(follows),
    UserFollows.preload(follows),
  ];
  await Promise.all(preloads);
}
