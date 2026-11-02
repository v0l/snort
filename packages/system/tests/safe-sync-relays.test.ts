import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { EventEmitter } from "eventemitter3"
import { SocialGraph } from "nostr-social-graph"

import { EventKind, type NostrEvent, NostrLink, PrivateKeySigner, type SystemInterface } from "../src"
import type { ConnectionPool, ConnectionPoolEvents, ConnectionType } from "../src/connection-pool"
import type { OkResponse, ReqCommand } from "../src/nostr"
import { QueryManager } from "../src/query-manager"
import { DefaultOptimizer } from "../src/query-optimizer"
import { OutboxModel } from "../src/outbox/outbox-model"
import { SafeSync } from "../src/sync/safe-sync"
import { MockConnection } from "./mock-connection"

class Pool extends EventEmitter<ConnectionPoolEvents> implements ConnectionPool {
  conns = new Map<string, MockConnection>()
  add(c: MockConnection) {
    this.conns.set(c.address, c)
    c.on("unverifiedEvent", (sub, ev) => this.emit("event", c.address, sub, ev))
  }
  getConnection(id: string): ConnectionType | undefined {
    return this.conns.get(id)
  }
  async connect(address: string) {
    return this.conns.get(address)
  }
  disconnect() {}
  async broadcast(): Promise<OkResponse[]> {
    return []
  }
  async broadcastTo(address: string, ev: NostrEvent): Promise<OkResponse> {
    return { ok: true, id: ev.id, message: "", relay: address, event: ev }
  }
  *[Symbol.iterator]() {
    yield* this.conns
  }
}

function makeSystem(pool: Pool) {
  const system = {
    pool,
    checkSigs: false,
    optimizer: DefaultOptimizer,
    config: {
      socialGraphInstance: new SocialGraph("00".repeat(32)),
      relays: { getFromCache: () => undefined, preload: async () => {} },
      automaticOutboxModel: false,
      buildFollowGraph: false,
      fallbackSync: "since",
      disableSyncModule: true,
      checkSigs: false,
      optimizer: DefaultOptimizer,
    },
    cacheRelay: undefined,
    requestRouter: undefined,
    relayLoader: { TrackKeys: () => {} },
    HandleEvent: () => {},
    emit: () => true,
    on: () => ({}),
    off: () => ({}),
    once: () => ({}),
  } as unknown as SystemInterface
  const qm = new QueryManager(system)
  ;(system as { Fetch: SystemInterface["Fetch"] }).Fetch = rb => qm.fetch(rb)
  return { system, qm }
}

function answerWhenAsked(conn: MockConnection, events: Array<NostrEvent>, delay: number) {
  let answered = 0
  const tick = setInterval(() => {
    const reqs = conn.sentRequests.filter((r): r is ReqCommand => r[0] === "REQ").slice(answered)
    for (const req of reqs) {
      answered++
      const sub = req[1]
      setTimeout(() => {
        for (const ev of events) conn.receiveEvent(sub, { ...ev, relays: [conn.address] })
        conn.eose(sub)
      }, delay)
    }
  }, 5)
  return () => clearInterval(tick)
}

describe("SafeSync across relays that disagree", () => {
  const signer = new PrivateKeySigner("0000000000000000000000000000000000000000000000000000000000000002")
  const pubkey = signer.getPubKey()
  const link = new NostrLink("naddr" as never, "snort", EventKind.AppData, pubkey)
  let stop: Array<() => void> = []
  let qm: QueryManager | undefined

  beforeEach(() => {
    stop = []
  })
  afterEach(() => {
    for (const s of stop) s()
    qm?.destroy()
  })

  async function appdata(content: string, age: number) {
    return await signer.sign({
      id: "",
      sig: "",
      pubkey,
      kind: EventKind.AppData,
      created_at: Math.floor(Date.now() / 1000) - age,
      content,
      tags: [["d", "snort"]],
    })
  }

  test("the newest version wins even when it comes from a slower relay", async () => {
    const stale = await appdata("old settings", 3600)
    const fresh = await appdata("new settings", 60)

    const pool = new Pool()
    const fast = new MockConnection("wss://fast.test/")
    const slow = new MockConnection("wss://slow.test/")
    fast.open()
    slow.open()
    pool.add(fast)
    pool.add(slow)
    stop.push(answerWhenAsked(fast, [stale], 10))
    stop.push(answerWhenAsked(slow, [fresh], 1500))

    const made = makeSystem(pool)
    qm = made.qm
    const sync = new SafeSync(link)
    await sync.sync(made.system)

    expect(sync.value?.content).toBe("new settings")
  }, 10_000)

  test("an update is published on top of the newest version, not the stale one", async () => {
    const stale = await appdata("old settings", 3600)
    const fresh = await appdata("new settings", 60)

    const pool = new Pool()
    const fast = new MockConnection("wss://fast.test/")
    const slow = new MockConnection("wss://slow.test/")
    fast.open()
    slow.open()
    pool.add(fast)
    pool.add(slow)
    stop.push(answerWhenAsked(fast, [stale], 10))
    stop.push(answerWhenAsked(slow, [fresh], 1500))

    const made = makeSystem(pool)
    qm = made.qm
    const published: Array<NostrEvent> = []
    ;(made.system as { BroadcastEvent: SystemInterface["BroadcastEvent"] }).BroadcastEvent = async ev => {
      published.push(ev)
      return []
    }
    const sync = new SafeSync(link)
    await sync.sync(made.system)
    await sync.update({ ...fresh, content: "edited" }, signer, made.system)

    expect(published).toHaveLength(1)
    expect(published[0].created_at).toBeGreaterThan(fresh.created_at)
  }, 10_000)

  test("sync asks every write relay of the author, not a random sample", async () => {
    const pool = new Pool()
    const urls = ["wss://a.test/", "wss://b.test/", "wss://c.test/", "wss://d.test/", "wss://e.test/"]
    const conns = urls.map(u => {
      const c = new MockConnection(u)
      c.open()
      pool.add(c)
      stop.push(answerWhenAsked(c, [], 5))
      return c
    })
    const made = makeSystem(pool)
    qm = made.qm
    const cache = {
      getFromCache: (pk: string) =>
        pk === pubkey
          ? { pubkey, created: 0, loaded: 0, relays: urls.map(url => ({ url, settings: { read: true, write: true } })) }
          : undefined,
    }
    ;(made.system as { requestRouter: unknown }).requestRouter = new OutboxModel(cache as never, made.system as never)

    await new SafeSync(link).sync(made.system)

    expect(conns.filter(c => c.sentRequests.some(r => r[0] === "REQ")).map(c => c.address)).toEqual(urls)
  }, 10_000)
})
