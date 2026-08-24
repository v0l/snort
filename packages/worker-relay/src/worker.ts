/// <reference lib="webworker" />

import { setLogging } from "./debug"
import { getForYouFeed } from "./forYouFeed"
import { RelayOwner } from "./relay-owner"
import type {
  EventMetadata,
  NostrEvent,
  OkResponse,
  RelayHandler,
  ReqCommand,
  ReqFilter,
  WorkerMessage,
  WorkerMessageCommand,
} from "./types"

// Timer-windowed event batch.
// Events are accumulated for up to BATCH_WINDOW_MS before being flushed
// together in a single DB transaction, reducing the number of SQLite writes
// when many events arrive in quick succession (e.g. initial relay sync).
// Callers receive an optimistic ok reply immediately; the actual write is
// fire-and-forget from the caller's perspective.
const BATCH_WINDOW_MS = 50
const pendingEvents: Array<NostrEvent> = []
let flushScheduled = false

function flushPendingEvents() {
  flushScheduled = false
  const relay = owner.relay
  if (!relay || pendingEvents.length === 0) return
  const evs = pendingEvents.splice(0)
  relay.eventBatch(evs)
}

// Timer-windowed seen_at batch.
// setSeenAt messages are fire-and-forget: no reply is sent, and all IDs that
// arrive within BATCH_WINDOW_MS are flushed as a single UPDATE in one DB roundtrip.
const pendingSeenAt: Array<string> = []
let seenAtFlushScheduled = false

function flushPendingSeenAt() {
  seenAtFlushScheduled = false
  const relay = owner.relay
  if (!relay || pendingSeenAt.length === 0) return
  const ids = pendingSeenAt.splice(0)
  const seen_at = Math.round(Date.now() / 1000)
  relay.batchSetSeenAt(ids, seen_at)
}

interface InitAargs {
  databasePath: string
}

/** Commands that send no reply to their caller */
const NO_REPLY: ReadonlySet<WorkerMessageCommand> = new Set(["setSeenAt"])

/**
 * Run a command against a relay this context owns.
 *
 * Used both for messages from this worker's own page and, when this context is
 * the leader, for messages proxied from other tabs.
 */
async function executeCommand(msg: WorkerMessage<any>, relay: RelayHandler): Promise<unknown> {
  switch (msg.cmd) {
    case "event": {
      const ev = msg.args as NostrEvent
      // Reply immediately (optimistic ok) so the caller is not blocked waiting
      // for the DB flush. Events are accumulated and written in a single
      // SQLite transaction once the BATCH_WINDOW_MS timer fires.
      pendingEvents.push(ev)
      if (!flushScheduled) {
        flushScheduled = true
        setTimeout(flushPendingEvents, BATCH_WINDOW_MS)
      }
      return { ok: true, id: ev.id, relay: "", event: ev } as OkResponse
    }
    case "close": {
      return relay.close()
    }
    case "req": {
      const req = msg.args as ReqCommand
      const filters = req.slice(2) as Array<ReqFilter>
      const results: Array<string | NostrEvent> = []
      const ids = new Set<string>()
      for (const r of filters) {
        const rx = relay.req(req[1], r) ?? []
        for (const x of rx) {
          if ((typeof x === "string" && ids.has(x)) || ids.has((x as NostrEvent).id)) {
            continue
          }
          ids.add(typeof x === "string" ? x : (x as NostrEvent).id)
          results.push(x)
        }
      }
      return results
    }
    case "count": {
      const req = msg.args as ReqCommand
      let results = 0
      const filters = req.slice(2) as Array<ReqFilter>
      for (const r of filters) {
        results += relay.count(r) ?? 0
      }
      return results
    }
    case "delete": {
      const req = msg.args as ReqCommand
      const results = []
      const filters = req.slice(2) as Array<ReqFilter>
      for (const r of filters) {
        const c = relay.delete(r) ?? []
        results.push(...c)
      }
      return results
    }
    case "summary": {
      return relay.summary()
    }
    case "dumpDb": {
      return await relay.dump()
    }
    case "wipe": {
      await relay.wipe()
      return true
    }
    case "forYouFeed": {
      return await getForYouFeed(relay, msg.args as string)
    }
    case "setSeenAt": {
      // Fire-and-forget: no reply. Accumulate IDs and flush as one UPDATE per tick.
      pendingSeenAt.push(msg.args as string)
      if (!seenAtFlushScheduled) {
        seenAtFlushScheduled = true
        setTimeout(flushPendingSeenAt, BATCH_WINDOW_MS)
      }
      return undefined
    }
    case "setEventMetadata": {
      // Legacy path kept for backward compat; new callers should use setSeenAt.
      const [id, metadata] = msg.args as [string, EventMetadata]
      relay.setEventMetadata(id, metadata)
      return true
    }
    case "configureSearchIndex": {
      relay.configureSearchIndex(msg.args as Record<number, string[]>)
      return true
    }
    case "kvGet": {
      // Wrap in an object so the reply args are never undefined
      return { value: relay.kvGet(msg.args as string) ?? null }
    }
    case "kvSet": {
      const { key, value } = msg.args as { key: string; value: string }
      relay.kvSet(key, value)
      return true
    }
    default: {
      return { error: "Unknown command" }
    }
  }
}

const owner = new RelayOwner({ execute: executeCommand })

const handleMsg = async (port: MessagePort | DedicatedWorkerGlobalScope, ev: MessageEvent) => {
  async function reply<T>(id: string, obj?: T) {
    port.postMessage({
      id,
      cmd: "reply",
      args: obj,
    } as WorkerMessage<T>)
  }

  const msg = ev.data as WorkerMessage<any>
  try {
    switch (msg.cmd) {
      case "debug": {
        setLogging(true)
        reply(msg.id, true)
        break
      }
      case "init": {
        const args = msg.args as InitAargs
        await owner.init(args.databasePath)
        reply(msg.id, true)
        break
      }
      case "close": {
        const res = await owner.execute(msg)
        owner.close()
        reply(msg.id, res)
        break
      }
      default: {
        const res = await owner.execute(msg)
        if (!NO_REPLY.has(msg.cmd)) {
          reply(msg.id, res)
        }
        break
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      reply(msg.id, { error: e.message })
    } else if (typeof e === "string") {
      reply(msg.id, { error: e })
    } else {
      reply(msg.id, "Unknown error")
    }
  }
}

if ("SharedWorkerGlobalScope" in globalThis) {
  onconnect = e => {
    const port = e.ports[0]
    port.onmessage = msg => handleMsg(port, msg)
    port.start()
  }
}
if ("DedicatedWorkerGlobalScope" in globalThis) {
  onmessage = e => {
    handleMsg(self as DedicatedWorkerGlobalScope, e)
  }
}

export default {}
