import {
  type CacheRelay,
  Connection,
  ConnectionCacheRelay,
  UserFollowsCache,
  UserProfileCache,
  UserRelaysCache,
} from "@snort/system"
import { WorkerRelayInterface } from "@snort/worker-relay"

import { GiftWrapCache } from "./GiftWrapCache"
import { ProfileCacheRelayWorker } from "./ProfileWorkerCache"
import { UserFollowsWorker } from "./UserFollowsWorker"
import { RelaysWorkerCache } from "./RelaysWorkerCache"
import { hasWasm } from "@/Utils/wasm"

const cacheRelayUrl = typeof localStorage !== "undefined" ? localStorage.getItem("cache-relay") : undefined

let _workerRelay: WorkerRelayInterface | undefined
function getWorkerRelay() {
  if (_workerRelay === undefined && hasWasm) {
    const workerSrc = /* @vite-ignore */ new URL("@snort/worker-relay/dist/esm/worker.mjs", import.meta.url)
    _workerRelay = new WorkerRelayInterface(workerSrc)
  }
  return _workerRelay
}

function getRelay(): CacheRelay | undefined {
  if (cacheRelayUrl) {
    return new ConnectionCacheRelay(new Connection(cacheRelayUrl, { read: true, write: true }))
  }
  return getWorkerRelay()
}

export const Relay: CacheRelay | undefined = getRelay()

async function tryUseCacheRelay(url: string) {
  try {
    const conn = new Connection(url, { read: true, write: true })
    await conn.connect(true)
    localStorage.setItem("cache-relay", url)
    return conn
  } catch (e) {
    console.warn(e)
  }
}

export async function tryUseLocalRelay() {
  let conn = await tryUseCacheRelay("ws://localhost:4869")
  if (!conn) {
    conn = await tryUseCacheRelay("ws://umbrel:4848")
  }
  return conn
}

export async function initRelayWorker() {
  try {
    if (ConnectionCacheRelay.isInstance(Relay)) {
      await Relay.connection.connect(true)
      return
    }
  } catch (e) {
    localStorage.removeItem("cache-relay")
    console.error(e)
    if (cacheRelayUrl) {
      window.location.reload()
    }
  }

  try {
    const wr = getWorkerRelay()
    if (wr) {
      await wr.debug("*")
      await wr.init({
        databasePath: "relay.db",
        insertBatchSize: 100,
      })
      await wr.configureSearchIndex({
        1: [], // add index for kind 1, dont index tags
      })
    }
  } catch (e) {
    console.error(e)
  }
}

export const UserRelays = Relay ? new RelaysWorkerCache(Relay) : new UserRelaysCache()
export const UserFollows = Relay ? new UserFollowsWorker(Relay) : new UserFollowsCache()
export const ProfilesCache = Relay ? new ProfileCacheRelayWorker(Relay) : new UserProfileCache()
export const GiftsCache = new GiftWrapCache()
if (Relay) {
  GiftsCache.setRelay(Relay)
}

export async function preload(follows?: Array<string>) {
  const preloads = [
    ProfilesCache.preload(follows),
    GiftsCache.preload(),
    UserRelays.preload(follows),
    UserFollows.preload(follows),
  ]
  await Promise.all(preloads)
}
