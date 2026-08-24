import { type DbLock, dbLockName, type RequestDbLockOptions, requestDbLock } from "./db-lock"
import { debugLog } from "./debug"
import { NoLeaderError, RelayChannel, relayChannelName } from "./relay-channel"
import { SqliteRelay } from "./sqlite/sqlite-relay"
import type { NostrEvent, OkResponse, RelayHandler, WorkerMessage, WorkerMessageCommand } from "./types"

const log = (msg: string, ...args: Array<any>) => debugLog("RelayOwner", msg, ...args)

/** How long to wait before trying to open the database again after a failed attempt */
const DEFAULT_PROMOTION_RETRY_MS = 2_000

/**
 * Commands that always run in the calling context and are never proxied.
 *
 * `close` is per-worker teardown: a follower closing must not close the leader's
 * database out from under the tabs still using it.
 */
const LOCAL_ONLY: ReadonlySet<WorkerMessageCommand> = new Set(["init", "debug", "close"])

/** Commands with no reply, forwarded without waiting */
const FIRE_AND_FORGET: ReadonlySet<WorkerMessageCommand> = new Set(["setSeenAt"])

export type RelayMode = "leader" | "follower"

export interface RelayOwnerOptions {
  /** Run a command against a locally owned relay */
  execute: (msg: WorkerMessage<any>, relay: RelayHandler) => Promise<unknown>
  /** Construct the relay implementation (injectable for tests) */
  createRelay?: () => RelayHandler
  /** Take the ownership lock (injectable for tests) */
  requestLock?: (name: string, opts?: RequestDbLockOptions) => Promise<DbLock | undefined>
  /** Build the cross-tab channel (injectable for tests) */
  createChannel?: (name: string) => RelayChannel
  /** How long a follower waits for the leader before falling back */
  callTimeoutMs?: number
  /** How long to wait between attempts to open the database */
  promotionRetryMs?: number
}

/**
 * Decides who owns the database and routes commands accordingly.
 *
 * The OPFS SAH pool VFS takes exclusive sync access handles, so exactly one
 * context can have the database open. Rather than letting tabs race for it —
 * where the loser used to silently degrade to a memory-only cache for the rest of
 * its life — ownership is arbitrated by a Web Lock:
 *
 * - the lock holder (*leader*) opens SQLite and answers commands for everybody
 * - everybody else (*followers*) proxies commands to the leader over a BroadcastChannel
 * - when the leader goes away its lock is released automatically, and the next
 *   follower in the queue is promoted and opens the database itself
 */
export class RelayOwner {
  #path?: string
  #mode: RelayMode = "follower"
  #relay?: RelayHandler
  #lock?: DbLock
  #channel?: RelayChannel
  #execute: RelayOwnerOptions["execute"]
  #createRelay: () => RelayHandler
  #requestLock: (name: string, opts?: RequestDbLockOptions) => Promise<DbLock | undefined>
  #createChannel: (name: string) => RelayChannel
  #callTimeoutMs?: number
  #promotionRetryMs: number

  constructor(options: RelayOwnerOptions) {
    this.#execute = options.execute
    this.#createRelay = options.createRelay ?? (() => new SqliteRelay())
    this.#requestLock = options.requestLock ?? requestDbLock
    this.#createChannel = options.createChannel ?? (name => new RelayChannel(name))
    this.#callTimeoutMs = options.callTimeoutMs
    this.#promotionRetryMs = options.promotionRetryMs ?? DEFAULT_PROMOTION_RETRY_MS
  }

  get mode() {
    return this.#mode
  }

  /** The locally owned relay, only set while this context is the leader */
  get relay() {
    return this.#relay
  }

  /**
   * Claim the database if it is free, otherwise become a follower and queue for
   * ownership in the background.
   */
  async init(path: string) {
    this.#path = path
    this.#channel ??= this.#createChannel(relayChannelName(path))

    const lock = await this.#requestLock(dbLockName(path), { ifAvailable: true })
    if (lock && (await this.#becomeLeader(lock))) return

    log("Database is owned by another context, proxying to it")
    this.#mode = "follower"
    void this.#waitForPromotion()
  }

  /**
   * Route a command to the local relay when we own the database, or to the
   * leader when we don't.
   */
  async execute(msg: WorkerMessage<any>): Promise<unknown> {
    if (this.#mode === "leader" && this.#relay) {
      return await this.#execute(msg, this.#relay)
    }
    if (LOCAL_ONLY.has(msg.cmd)) {
      return undefined
    }
    const channel = this.#channel
    if (!channel) throw new Error("Must call init first")

    if (FIRE_AND_FORGET.has(msg.cmd)) {
      channel.notify(msg)
      return undefined
    }
    if (msg.cmd === "event") {
      // Matches the leader's own optimistic reply: the write is confirmed to the
      // caller before it reaches the database.
      channel.notify(msg)
      const ev = msg.args as NostrEvent
      return { ok: true, id: ev.id, relay: "", event: ev } as OkResponse
    }
    try {
      return await channel.call(msg, this.#callTimeoutMs)
    } catch (e) {
      if (e instanceof NoLeaderError) {
        // Nobody owns the database right now (the leader is being replaced, or is
        // still retrying to open it). Treat it as a cache miss so the caller falls
        // through to the network instead of failing.
        log(`${msg.cmd} had no leader, treating as a cache miss`)
        return noLeaderFallback(msg.cmd)
      }
      throw e
    }
  }

  /** Release ownership and tear down the channel */
  close() {
    this.#channel?.close()
    this.#channel = undefined
    this.#relay = undefined
    this.#lock?.release()
    this.#lock = undefined
    this.#mode = "follower"
  }

  async #becomeLeader(lock: DbLock) {
    const path = this.#path
    if (!path) throw new Error("Must call init first")
    try {
      const relay = this.#createRelay()
      await relay.init(path)
      this.#relay = relay
      this.#lock = lock
      this.#mode = "leader"
      this.#channel?.serve(msg => this.#execute(msg, relay))
      log("Owning the database")
      return true
    } catch (e) {
      // Hand ownership back so another context can try; we re-queue for it below.
      log("Failed to open the database", e)
      lock.release()
      return false
    }
  }

  async #waitForPromotion() {
    const path = this.#path
    if (!path) return
    while (this.#mode === "follower" && this.#channel) {
      // Unbounded wait: resolves as soon as the current leader goes away
      const lock = await this.#requestLock(dbLockName(path))
      if (!lock) return
      if (await this.#becomeLeader(lock)) return
      await new Promise(resolve => setTimeout(resolve, this.#promotionRetryMs))
    }
  }
}

/**
 * Result to hand back when a proxied command went unanswered.
 * Every value here means "nothing cached", never "failed".
 */
export function noLeaderFallback(cmd: WorkerMessageCommand): unknown {
  switch (cmd) {
    case "req":
    case "delete":
    case "forYouFeed":
      return []
    case "count":
      return 0
    case "summary":
      return {}
    case "kvGet":
      return { value: null }
    case "dumpDb":
      return new Uint8Array()
    default:
      return true
  }
}
