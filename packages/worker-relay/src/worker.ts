/// <reference lib="webworker" />

import { setLogging } from "./debug"
import { getForYouFeed } from "./forYouFeed"
import { InMemoryRelay } from "./memory-relay"
import { SqliteRelay } from "./sqlite/sqlite-relay"
import type { EventMetadata, NostrEvent, OkResponse, RelayHandler, ReqCommand, ReqFilter, WorkerMessage } from "./types"

let relay: RelayHandler | undefined

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
  if (!relay || pendingSeenAt.length === 0) return
  const ids = pendingSeenAt.splice(0)
  const seen_at = Math.round(Date.now() / 1000)
  relay.batchSetSeenAt(ids, seen_at)
}

interface InitAargs {
  databasePath: string
}

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
        try {
          if ("WebAssembly" in self) {
            relay = new SqliteRelay()
          } else {
            relay = new InMemoryRelay()
          }
          await relay.init(args.databasePath)
        } catch (e) {
          console.error("Fallback to InMemoryRelay", e)
          relay = new InMemoryRelay()
          await relay.init(args.databasePath)
        }
        reply(msg.id, true)
        break
      }
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
        reply(msg.id, { ok: true, id: ev.id, relay: "", event: ev } as OkResponse)
        break
      }
      case "close": {
        const res = relay?.close()
        reply(msg.id, res)
        break
      }
      case "req": {
        const req = msg.args as ReqCommand
        const filters = req.slice(2) as Array<ReqFilter>
        const results: Array<string | NostrEvent> = []
        const ids = new Set<string>()
        for (const r of filters) {
          const rx = relay?.req(req[1], r) ?? []
          for (const x of rx) {
            if ((typeof x === "string" && ids.has(x)) || ids.has((x as NostrEvent).id)) {
              continue
            }
            ids.add(typeof x === "string" ? x : (x as NostrEvent).id)
            results.push(x)
          }
        }
        reply(msg.id, results)
        break
      }
      case "count": {
        const req = msg.args as ReqCommand
        let results = 0
        const filters = req.slice(2) as Array<ReqFilter>
        for (const r of filters) {
          const c = relay?.count(r) ?? 0
          results += c
        }
        reply(msg.id, results)
        break
      }
      case "delete": {
        const req = msg.args as ReqCommand
        const results = []
        const filters = req.slice(2) as Array<ReqFilter>
        for (const r of filters) {
          const c = relay?.delete(r) ?? []
          results.push(...c)
        }
        reply(msg.id, results)
        break
      }
      case "summary": {
        const res = relay?.summary()
        reply(msg.id, res)
        break
      }
      case "dumpDb": {
        const res = await relay?.dump()
        reply(msg.id, res)
        break
      }
      case "wipe": {
        await relay?.wipe()
        reply(msg.id, true)
        break
      }
      case "forYouFeed": {
        const res = await getForYouFeed(relay!, msg.args as string)
        reply(msg.id, res)
        break
      }
      case "setSeenAt": {
        // Fire-and-forget: no reply. Accumulate IDs and flush as one UPDATE per tick.
        const id = msg.args as string
        pendingSeenAt.push(id)
        if (!seenAtFlushScheduled) {
          seenAtFlushScheduled = true
          setTimeout(flushPendingSeenAt, BATCH_WINDOW_MS)
        }
        break
      }
      case "setEventMetadata": {
        // Legacy path kept for backward compat; new callers should use setSeenAt.
        const [id, metadata] = msg.args as [string, EventMetadata]
        relay?.setEventMetadata(id, metadata)
        reply(msg.id, true)
        break
      }
      case "configureSearchIndex": {
        const kindTagsMapping = msg.args as Record<number, string[]>
        relay?.configureSearchIndex(kindTagsMapping)
        reply(msg.id, true)
        break
      }
      default: {
        reply(msg.id, { error: "Unknown command" })
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
