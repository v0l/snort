import { describe, expect, test } from "bun:test"
import type { DbLock, RequestDbLockOptions } from "../src/db-lock"
import { type ChannelPort, RelayChannel } from "../src/relay-channel"
import { noLeaderFallback, RelayOwner } from "../src/relay-owner"
import type { NostrEvent, RelayHandler, WorkerMessage } from "../src/types"

/** BroadcastChannel stand-in: delivers to every other port, never back to the sender */
class FakeBus {
  ports: Array<FakePort> = []

  create = (_name: string): ChannelPort => {
    const port = new FakePort(this)
    this.ports.push(port)
    return port
  }

  channel = () => new RelayChannel("test", this.create)
}

class FakePort implements ChannelPort {
  onmessage: ((ev: { data: unknown }) => void) | null = null

  constructor(private bus: FakeBus) {}

  postMessage(msg: unknown) {
    for (const p of this.bus.ports) {
      if (p === this) continue
      const handler = p.onmessage
      if (handler) queueMicrotask(() => handler({ data: msg }))
    }
  }

  close() {
    this.bus.ports = this.bus.ports.filter(p => p !== this)
    this.onmessage = null
  }
}

/** Web Locks stand-in with exclusive ownership and a FIFO waiter queue */
class FakeLocks {
  #held = new Set<string>()
  #waiters = new Map<string, Array<(lock: DbLock) => void>>()

  request = (name: string, opts?: RequestDbLockOptions): Promise<DbLock | undefined> => {
    if (!this.#held.has(name)) {
      this.#held.add(name)
      return Promise.resolve(this.#lock(name))
    }
    if (opts?.ifAvailable) return Promise.resolve(undefined)
    return new Promise<DbLock>(resolve => {
      const queue = this.#waiters.get(name) ?? []
      queue.push(resolve)
      this.#waiters.set(name, queue)
    })
  }

  #lock(name: string): DbLock {
    let released = false
    return {
      release: () => {
        if (released) return
        released = true
        const next = this.#waiters.get(name)?.shift()
        if (next) {
          next(this.#lock(name))
        } else {
          this.#held.delete(name)
        }
      },
    }
  }
}

function fakeRelay(events: Array<NostrEvent> = []): RelayHandler {
  const stored = [...events]
  return {
    init: async () => {},
    req: () => stored,
    count: () => stored.length,
    event: (ev: NostrEvent) => {
      stored.push(ev)
      return true
    },
    close: () => {},
  } as unknown as RelayHandler
}

/** Mirrors the routing worker.ts uses, minus the SQLite specifics */
const execute = async (msg: WorkerMessage<any>, relay: RelayHandler): Promise<unknown> => {
  switch (msg.cmd) {
    case "req":
      return relay.req("test", {})
    case "count":
      return relay.count({})
    case "event":
      relay.event(msg.args as NostrEvent)
      return { ok: true, id: (msg.args as NostrEvent).id, relay: "", event: msg.args }
    default:
      return true
  }
}

const rpc = (cmd: WorkerMessage<any>["cmd"], args?: unknown): WorkerMessage<any> => ({ id: "1", cmd, args })

const note = (id: string): NostrEvent => ({
  id,
  pubkey: "a".repeat(64),
  created_at: 0,
  kind: 1,
  tags: [],
  content: "",
  sig: "",
})

function makeOwner(
  bus: FakeBus,
  locks: FakeLocks,
  relay: RelayHandler,
  opts: { failOpens?: number; onOpen?: () => void } = {},
) {
  let failures = opts.failOpens ?? 0
  return new RelayOwner({
    execute,
    createRelay: () => {
      opts.onOpen?.()
      if (failures > 0) {
        failures--
        return { init: async () => Promise.reject(new Error("OPFS busy")) } as unknown as RelayHandler
      }
      return relay
    },
    requestLock: locks.request,
    createChannel: bus.channel,
    callTimeoutMs: 50,
    promotionRetryMs: 1,
  })
}

describe("RelayOwner", () => {
  test("first context to claim the lock owns the database", async () => {
    const owner = makeOwner(new FakeBus(), new FakeLocks(), fakeRelay())
    await owner.init("db")

    expect(owner.mode).toBe("leader")
    expect(owner.relay).toBeDefined()
  })

  test("a second context follows and is served by the leader", async () => {
    const bus = new FakeBus()
    const locks = new FakeLocks()

    const leader = makeOwner(bus, locks, fakeRelay([note("aa")]))
    await leader.init("db")
    const follower = makeOwner(bus, locks, fakeRelay())
    await follower.init("db")

    expect(follower.mode).toBe("follower")
    expect(follower.relay).toBeUndefined()

    // Answered out of the leader's database, not an empty local one
    const events = (await follower.execute(rpc("req", ["REQ", "1", {}]))) as Array<NostrEvent>
    expect(events.map(a => a.id)).toEqual(["aa"])
  })

  test("a follower's writes reach the leader's database", async () => {
    const bus = new FakeBus()
    const locks = new FakeLocks()
    const leaderRelay = fakeRelay()

    const leader = makeOwner(bus, locks, leaderRelay)
    await leader.init("db")
    const follower = makeOwner(bus, locks, fakeRelay())
    await follower.init("db")

    // Acknowledged optimistically, without waiting for the leader
    const ok = (await follower.execute(rpc("event", note("bb")))) as { ok: boolean }
    expect(ok.ok).toBe(true)

    await new Promise(resolve => setTimeout(resolve, 10))
    expect(leaderRelay.count({})).toBe(1)
  })

  test("a follower is promoted when the leader goes away", async () => {
    const bus = new FakeBus()
    const locks = new FakeLocks()

    const leader = makeOwner(bus, locks, fakeRelay())
    await leader.init("db")
    const follower = makeOwner(bus, locks, fakeRelay([note("cc")]))
    await follower.init("db")
    expect(follower.mode).toBe("follower")

    leader.close()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(follower.mode).toBe("leader")
    const events = (await follower.execute(rpc("req", ["REQ", "1", {}]))) as Array<NostrEvent>
    expect(events.map(a => a.id)).toEqual(["cc"])
  })

  test("a busy database is retried rather than abandoned", async () => {
    const locks = new FakeLocks()
    const owner = makeOwner(new FakeBus(), locks, fakeRelay(), { failOpens: 1 })

    await owner.init("db")
    expect(owner.mode).toBe("follower")

    // The failed attempt hands the lock back, so the retry can claim it again
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(owner.mode).toBe("leader")
  })

  test("a database that never opens stops being retried", async () => {
    let opens = 0
    const owner = makeOwner(new FakeBus(), new FakeLocks(), fakeRelay(), {
      failOpens: Number.MAX_SAFE_INTEGER,
      onOpen: () => opens++,
    })

    await owner.init("db")
    await new Promise(resolve => setTimeout(resolve, 100))

    // 1 attempt from init() plus the capped retries, not an endless timer
    expect(owner.mode).toBe("follower")
    expect(opens).toBe(6)
  })

  test("commands are a cache miss while nobody owns the database", async () => {
    const owner = makeOwner(new FakeBus(), new FakeLocks(), fakeRelay(), { failOpens: 99 })
    await owner.init("db")

    expect(await owner.execute(rpc("req", ["REQ", "1", {}]))).toEqual([])
    expect(await owner.execute(rpc("count", ["COUNT", "1", {}]))).toEqual(0)
  })

  test("close is never proxied to the leader", async () => {
    const bus = new FakeBus()
    const locks = new FakeLocks()
    const leaderRelay = fakeRelay()
    let leaderClosed = false
    leaderRelay.close = () => {
      leaderClosed = true
    }

    const leader = makeOwner(bus, locks, leaderRelay)
    await leader.init("db")
    const follower = makeOwner(bus, locks, fakeRelay())
    await follower.init("db")

    await follower.execute(rpc("close"))
    follower.close()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(leaderClosed).toBe(false)
    expect(leader.mode).toBe("leader")
  })
})

describe("noLeaderFallback", () => {
  test("returns an empty result for every query command", () => {
    expect(noLeaderFallback("req")).toEqual([])
    expect(noLeaderFallback("forYouFeed")).toEqual([])
    expect(noLeaderFallback("delete")).toEqual([])
    expect(noLeaderFallback("count")).toBe(0)
    expect(noLeaderFallback("summary")).toEqual({})
    expect(noLeaderFallback("kvGet")).toEqual({ value: null })
    expect(noLeaderFallback("dumpDb")).toEqual(new Uint8Array())
  })
})
