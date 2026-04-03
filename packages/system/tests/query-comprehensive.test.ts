import { beforeEach, describe, expect, test } from "bun:test"
import type { TaggedNostrEvent } from "../src/nostr"
import { Query, QueryTrace, QueryTraceState } from "../src/query"
import { RequestBuilder } from "../src/request-builder"

function createEv(id: string, kind = 1, created_at = 100, pubkey = "aa", tags: string[][] = []): TaggedNostrEvent {
  return { id, kind, created_at, pubkey, tags, content: "", sig: "", relays: [] }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

describe("Query", () => {
  let rb: RequestBuilder

  beforeEach(() => {
    rb = new RequestBuilder("test-query")
    rb.withFilter().kinds([1])
  })

  describe("Initialization and RequestBuilder integration", () => {
    test("correctly initializes with RequestBuilder", () => {
      const q = new Query(rb)
      expect(q.id).toBe("test-query")
      expect(q.requests).toHaveLength(1)
      expect(q.requests[0].kinds).toContain(1)
    })

    test("addRequest deduplicates by builder instance", () => {
      const q = new Query(rb)
      const result = q.addRequest(rb)
      expect(result).toBeUndefined()
      expect(q.requests).toHaveLength(1)
    })

    test("addRequest merges filters from different builder instances with same ID", () => {
      const q = new Query(rb)
      const rb2 = new RequestBuilder("test-query")
      rb2.withFilter().kinds([2])
      const result = q.addRequest(rb2)
      expect(result).toBe(true)
      expect(q.requests).toHaveLength(2)
      expect(q.requests[0].kinds).toContain(1)
      expect(q.requests[1].kinds).toContain(2)
    })

    test("addRequest handles extraEvents", () => {
      const q = new Query(rb)
      const rbExtra = new RequestBuilder("test-query")
      const extraEv = createEv("extra", 1, 100)
      rbExtra.withOptions({ extraEvents: [extraEv] })
      q.addRequest(rbExtra)
      expect(q.snapshot).toContainEqual(extraEv)
    })

    test("addRequest ignores builders with no filters", () => {
      const q = new Query(rb)
      const rbEmpty = new RequestBuilder("test-query")
      const result = q.addRequest(rbEmpty)
      expect(result).toBe(false)
      expect(q.requests).toHaveLength(1)
    })
  })

  describe("Event Flow and Filtering", () => {
    test("addEvent filters out events that do not match trace filters", () => {
      const q = new Query(rb)
      const trace = new QueryTrace("wss://r.test", [{ kinds: [1] }], "conn1", false)
      q.addTrace(trace)

      const matchingEv = createEv("match", 1, 100)
      const nonMatchingEv = createEv("no-match", 2, 100)

      q.addEvent(trace.id, matchingEv)
      q.addEvent(trace.id, nonMatchingEv)

      expect(q.snapshot).toContainEqual(matchingEv)
      expect(q.snapshot).not.toContainEqual(nonMatchingEv)
    })

    test("addEvent handles global events (sub === '*')", () => {
      const q = new Query(rb)
      // Query has filters [kinds: [1]] from rb
      const trace = new QueryTrace("wss://r.test", [{ kinds: [1] }], "conn1", false)
      q.addTrace(trace)

      const matchingEv = createEv("match", 1, 100)
      q.addEvent("*", matchingEv)

      expect(q.snapshot).toContainEqual(matchingEv)
    })

    test("addEvent with non-existent sub is ignored", () => {
      const q = new Query(rb)
      const matchingEv = createEv("match", 1, 100)
      q.addEvent("unknown-sub", matchingEv)
      expect(q.snapshot).toHaveLength(0)
    })

    test("addEvent tracks duplicates", () => {
      const q = new Query(rb)
      const trace = new QueryTrace("wss://r.test", [{ kinds: [1] }], "conn1", false)
      q.addTrace(trace)
      const ev1 = createEv("evt1", 1, 100)

      q.addEvent(trace.id, ev1)
      q.addEvent(trace.id, ev1) // Duplicate

      expect(q.snapshot).toHaveLength(1)
    })
  })

  describe("Trace Management and Progress", () => {
    test("progress is calculated correctly", () => {
      const q = new Query(rb)
      expect(q.progress).toBe(0)

      const t1 = new QueryTrace("r1", [], "c1", false)
      const t2 = new QueryTrace("r2", [], "c2", false)
      q.addTrace(t1)
      q.addTrace(t2)

      expect(q.progress).toBe(0)

      t1.eose()
      expect(q.progress).toBe(0.5)

      t2.timeout()
      expect(q.progress).toBe(1)
    })

    test("eose event fires when all traces finish", () => {
      const q = new Query(rb)
      let eoseFired = false
      q.on("eose", () => {
        eoseFired = true
      })

      const t1 = new QueryTrace("r1", [], "c1", false)
      q.addTrace(t1)
      t1.eose()

      expect(eoseFired).toBe(true)
    })

    test("streaming traces (leaveOpen=true) do not contribute to finished progress", () => {
      const rbStream = new RequestBuilder("stream")
      rbStream.withOptions({ leaveOpen: true })
      rbStream.withFilter().kinds([1])
      const q = new Query(rbStream)

      const t1 = new QueryTrace("r1", [], "c1", true)
      q.addTrace(t1)
      t1.sent() // State: WAITING_STREAM

      expect(t1.finished).toBe(false)
      expect(q.progress).toBe(0)
    })
  })

  describe("Lifecycle and Timers", () => {
    test("start() emits request synchronously if groupingDelay is 0", () => {
      rb.withOptions({ groupingDelay: 0 })
      const q = new Query(rb)
      let requestEmitted = false
      q.on("request", () => {
        requestEmitted = true
      })

      q.start()
      expect(requestEmitted).toBe(true)
    })

    test("start() debounces request emission if groupingDelay > 0", async () => {
      rb.withOptions({ groupingDelay: 100 })
      const q = new Query(rb)
      let requestEmitted = false
      q.on("request", () => {
        requestEmitted = true
      })

      q.start()
      expect(requestEmitted).toBe(false)

      await sleep(150)
      expect(requestEmitted).toBe(true)
    })

    test("cancel() sets grace window for removal", async () => {
      const q = new Query(rb)
      expect(q.canRemove()).toBe(false)

      q.cancel()
      expect(q.canRemove()).toBe(false) // Still in grace window

      await sleep(1100)
      expect(q.canRemove()).toBe(true)
    })

    test("uncancel() clears the grace window", async () => {
      const q = new Query(rb)
      q.cancel()
      q.uncancel()
      await sleep(1100)
      expect(q.canRemove()).toBe(false)
    })

    test("closeQuery() closes all active traces and cleans up", () => {
      const q = new Query(rb)
      const t1 = new QueryTrace("r1", [], "c1", false)
      q.addTrace(t1)

      let endFired = false
      q.on("end", () => {
        endFired = true
      })

      q.closeQuery()
      expect(t1.currentState).toBe(QueryTraceState.LOCAL_CLOSE)
      expect(endFired).toBe(true)
    })
  })

  describe("Feed and Snapshot", () => {
    test("snapshot delegates to NoteCollection", () => {
      const q = new Query(rb)
      const ev1 = createEv("evt1", 1, 100)
      q.feed.add(ev1)
      expect(q.snapshot).toContainEqual(ev1)
    })

    test("flush() forces immediate feed emission and filter emission", () => {
      rb.withOptions({ groupingDelay: 100 })
      const q = new Query(rb)
      let eventFired = false
      let requestFired = false

      q.on("event", () => {
        eventFired = true
      })
      q.on("request", () => {
        requestFired = true
      })

      q.feed.add(createEv("evt1", 1, 100))
      q.start()

      expect(eventFired).toBe(false)
      expect(requestFired).toBe(false)

      q.flush()
      expect(eventFired).toBe(true)
      expect(requestFired).toBe(true)
    })
  })
})
