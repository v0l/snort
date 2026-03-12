/// <reference lib="webworker" />

import { setLogging } from "./debug"
import { getForYouFeed } from "./forYouFeed"
import { InMemoryRelay } from "./memory-relay"
import { SqliteRelay } from "./sqlite/sqlite-relay"
import type { EventMetadata, NostrEvent, OkResponse, RelayHandler, ReqCommand, ReqFilter, WorkerMessage } from "./types"

let relay: RelayHandler | undefined

// Microtask-coalesced event batch.
// Events received within the same message-loop tick are accumulated here and
// flushed together in a single DB transaction via queueMicrotask, so we get
// the same batching benefit as the old setTimeout queue without the 100ms
// artificial delay or the false-ok responses.
type PendingEvent = { ev: NostrEvent; resolve: (ok: OkResponse) => void }
const pendingEvents: Array<PendingEvent> = []
let flushScheduled = false

function flushPendingEvents() {
  flushScheduled = false
  if (!relay || pendingEvents.length === 0) return
  const batch = pendingEvents.splice(0)
  const evs = batch.map(p => p.ev)
  relay.eventBatch(evs)
  for (const { ev, resolve } of batch) {
    resolve({ ok: true, id: ev.id, relay: "", event: ev })
  }
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
        // Accumulate into the current tick's batch; the microtask will flush
        // them all in one DB transaction once the current message handler returns.
        const ok = await new Promise<OkResponse>(resolve => {
          pendingEvents.push({ ev, resolve })
          if (!flushScheduled) {
            flushScheduled = true
            queueMicrotask(flushPendingEvents)
          }
        })
        reply(msg.id, ok)
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
      case "setEventMetadata": {
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
