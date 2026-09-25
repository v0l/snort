import type { WebSocketRoute } from "@playwright/test"
import type { NostrEvent, ReqFilter } from "@snort/system"

type Responder = (ev: NostrEvent, relay: FakeRelay) => Promise<Array<NostrEvent>> | Array<NostrEvent>

interface Subscription {
  ws: WebSocketRoute
  id: string
  filters: Array<ReqFilter>
}

export function matchesFilter(ev: NostrEvent, f: ReqFilter) {
  if (f.ids && !f.ids.includes(ev.id)) return false
  if (f.authors && !f.authors.includes(ev.pubkey)) return false
  if (f.kinds && !f.kinds.includes(ev.kind)) return false
  if (f.since !== undefined && ev.created_at < f.since) return false
  if (f.until !== undefined && ev.created_at > f.until) return false
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith("#") && Array.isArray(v) && v.length > 0) {
      const values = v as Array<string>
      if (!ev.tags.some(t => t[0] === k.slice(1) && values.includes(t[1]))) return false
    }
  }
  if (typeof f.search === "string" && f.search.length > 0) {
    const terms = f.search
      .toLowerCase()
      .split(/\s+/)
      .filter(a => !a.includes(":"))
    const haystack = ev.content.toLowerCase()
    if (!terms.every(t => haystack.includes(t))) return false
  }
  return true
}

function replaceKey(ev: NostrEvent) {
  if (ev.kind === 0 || ev.kind === 3 || (ev.kind >= 10_000 && ev.kind < 20_000)) {
    return `${ev.kind}:${ev.pubkey}`
  }
  if (ev.kind >= 30_000 && ev.kind < 40_000) {
    return `${ev.kind}:${ev.pubkey}:${ev.tags.find(t => t[0] === "d")?.[1] ?? ""}`
  }
}

export class FakeRelay {
  events: Array<NostrEvent> = []
  readonly requests: Array<ReqFilter> = []
  readonly published: Array<NostrEvent> = []
  readonly #subs: Array<Subscription> = []
  readonly #responders: Array<Responder> = []

  constructor(events: Array<NostrEvent>) {
    for (const ev of events) this.#store(ev)
  }

  onEvent(responder: Responder) {
    this.#responders.push(responder)
  }

  query(filter: ReqFilter) {
    const matched = this.events.filter(e => matchesFilter(e, filter)).sort((a, b) => b.created_at - a.created_at)
    return filter.limit !== undefined ? matched.slice(0, filter.limit) : matched
  }

  latest(filter: ReqFilter) {
    return this.query(filter).at(0)
  }

  connect(ws: WebSocketRoute) {
    const log = process.env.E2E_RELAY_LOG ? (...a: Array<unknown>) => console.log(ws.url(), ...a) : () => {}
    log("connect")
    ws.onMessage(async raw => {
      const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as Array<unknown>
      log(">>", JSON.stringify(msg).slice(0, 300))
      switch (msg[0]) {
        case "REQ": {
          const id = msg[1] as string
          const filters = msg.slice(2) as Array<ReqFilter>
          this.#close(ws, id)
          this.#subs.push({ ws, id, filters })
          this.requests.push(...filters)
          const seen = new Set<string>()
          for (const f of filters) {
            for (const ev of this.query(f)) {
              if (seen.has(ev.id)) continue
              seen.add(ev.id)
              log("<<", ev.kind, ev.id.slice(0, 8))
              ws.send(JSON.stringify(["EVENT", id, ev]))
            }
          }
          ws.send(JSON.stringify(["EOSE", id]))
          break
        }
        case "COUNT": {
          const id = msg[1] as string
          const filters = msg.slice(2) as Array<ReqFilter>
          const count = new Set(filters.flatMap(f => this.query({ ...f, limit: undefined }).map(e => e.id))).size
          ws.send(JSON.stringify(["COUNT", id, { count }]))
          break
        }
        case "CLOSE": {
          this.#close(ws, msg[1] as string)
          break
        }
        case "EVENT": {
          const ev = msg[1] as NostrEvent
          this.published.push(ev)
          const duplicate = this.events.some(e => e.id === ev.id)
          this.#store(ev)
          ws.send(JSON.stringify(["OK", ev.id, true, duplicate ? "duplicate: already have this event" : ""]))
          this.#broadcast(ev)
          for (const r of this.#responders) {
            for (const reply of await r(ev, this)) {
              this.#store(reply)
              this.#broadcast(reply)
            }
          }
          break
        }
        case "NEG-OPEN": {
          ws.send(JSON.stringify(["NEG-ERR", msg[1], "error: unsupported"]))
          break
        }
      }
    })
    ws.onClose(() => {
      for (let i = this.#subs.length - 1; i >= 0; i--) {
        if (this.#subs[i].ws === ws) this.#subs.splice(i, 1)
      }
    })
  }

  #close(ws: WebSocketRoute, id: string) {
    const idx = this.#subs.findIndex(s => s.ws === ws && s.id === id)
    if (idx !== -1) this.#subs.splice(idx, 1)
  }

  #broadcast(ev: NostrEvent) {
    for (const s of this.#subs) {
      if (s.filters.some(f => matchesFilter(ev, { ...f, since: undefined, until: undefined, limit: undefined }))) {
        s.ws.send(JSON.stringify(["EVENT", s.id, ev]))
      }
    }
  }

  add(ev: NostrEvent) {
    this.#store(ev)
  }

  #store(ev: NostrEvent) {
    if (this.events.some(e => e.id === ev.id)) return
    const key = replaceKey(ev)
    if (key) {
      const existing = this.events.findIndex(e => replaceKey(e) === key)
      if (existing !== -1) {
        if (this.events[existing].created_at > ev.created_at) return
        this.events.splice(existing, 1)
      }
    }
    if (ev.kind === 5) {
      const ids = new Set(ev.tags.filter(t => t[0] === "e").map(t => t[1]))
      this.events = this.events.filter(e => !(ids.has(e.id) && e.pubkey === ev.pubkey))
    }
    this.events.push(ev)
  }
}
