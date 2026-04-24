/**
 * SSR hydration test against real relays.
 *
 * This test instruments timing at every step to diagnose timeout issues
 * and verifies the complete server→client hydration round trip.
 *
 * Run: bun test packages/system/tests/ssr-hydration-relay.test.ts
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { NostrSystem } from "../src/nostr-system"
import { RequestBuilder } from "../src/request-builder"
import type { TaggedNostrEvent } from "../src/nostr"

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social",
]

function ts(label: string, start: number) {
  const ms = Date.now() - start
  console.log(`  [${ms}ms] ${label}`)
  return ms
}

describe("SSR Hydration — real relays", () => {
  let server: NostrSystem
  let client: NostrSystem

  beforeAll(async () => {
    const t0 = Date.now()
    server = new NostrSystem({
      automaticOutboxModel: false,
      buildFollowGraph: false,
      disableSyncModule: true,
    })

    // Connect relays and await each one
    for (const url of RELAYS) {
      try {
        await server.ConnectToRelay(url, { read: true, write: false })
        ts(`Connected: ${url}`, t0)
      } catch (e) {
        ts(`FAILED connect: ${url}: ${e}`, t0)
      }
    }

    client = new NostrSystem({
      automaticOutboxModel: false,
      buildFollowGraph: false,
      disableSyncModule: true,
    })
  }, 30_000)

  afterAll(() => {
    // Cleanup: disconnect all relays
    for (const url of RELAYS) {
      try {
        server?.DisconnectRelay(url)
        client?.DisconnectRelay(url)
      } catch {}
    }
  })

  test("FetchAll completes without hitting 30s timeout — targeted query", async () => {
    const t0 = Date.now()

    // === SERVER: Create query ===
    const rb = new RequestBuilder("ssr-targeted")
    rb.withOptions({ groupingDelay: 0 })
    // Use a targeted filter to get fast EOSE — specific kind + limit
    rb.withFilter().kinds([1]).limit(5)

    const q = server.Query(rb)
    ts(`Query created: id=${q.id}, traces=${q.traces.length}`, t0)

    q.start()
    ts(`Query started`, t0)

    // Wait a tick for async #send to create traces
    await new Promise(r => setTimeout(r, 200))
    ts(`After 200ms: traces=${q.traces.length}, progress=${q.progress}`, t0)

    // Diagnose: if no traces yet, the async send hasn't completed
    if (q.traces.length === 0) {
      console.log("  ⚠️  No traces created after 200ms — #send is still async")
      // Wait longer for traces to appear
      await new Promise(r => setTimeout(r, 2000))
      ts(`After 2s more: traces=${q.traces.length}`, t0)
    }

    // Log trace states
    for (const trace of q.traces) {
      ts(`  Trace ${trace.id.slice(0, 8)}: relay=${trace.relay} state=${trace.currentState} finished=${trace.finished}`, t0)
    }

    // === SERVER: FetchAll ===
    const fetchAllStart = Date.now()
    try {
      await server.FetchAll()
      const fetchAllMs = Date.now() - fetchAllStart
      ts(`FetchAll completed in ${fetchAllMs}ms`, t0)
      console.log(`  ✅ FetchAll took ${fetchAllMs}ms`)

      // With grace-period racing, should be well under 5s (first EOSE ~100ms + 500ms grace)
      expect(fetchAllMs).toBeLessThan(10_000)
    } catch (e) {
      const fetchAllMs = Date.now() - fetchAllStart
      ts(`FetchAll FAILED after ${fetchAllMs}ms: ${e}`, t0)
      // Log trace states at failure
      for (const trace of q.traces) {
        ts(`  Trace ${trace.id.slice(0, 8)}: state=${trace.currentState} finished=${trace.finished}`, t0)
      }
      throw e
    }

    // Verify we got data
    ts(`Snapshot: ${q.snapshot.length} events`, t0)
    expect(q.snapshot.length).toBeGreaterThan(0)

    // === SERVER: Get hydration data ===
    const hydrationData = server.getHydrationData()
    ts(`Hydration data: ${Object.keys(hydrationData).length} queries`, t0)
    expect(hydrationData["ssr-targeted"]).toBeDefined()
    expect(hydrationData["ssr-targeted"].length).toBeGreaterThan(0)

    // === SERVER: Generate script tag (inlined from system-react) ===
    const hydrationDataForScript = server.getHydrationData()
    const scriptKeys = Object.keys(hydrationDataForScript)
    let script = ""
    if (scriptKeys.length > 0) {
      script = `<script>window.__SNORT_HYDRATION__ = ${JSON.stringify(hydrationDataForScript)}</script>`
    }
    ts(`Hydration script: ${script.length} bytes`, t0)
    expect(script).toMatch(/^<script>window\.__SNORT_HYDRATION__/)

    // === JSON round-trip ===
    const serialized = JSON.stringify(hydrationData)
    const deserialized = JSON.parse(serialized) as Record<string, Array<TaggedNostrEvent>>
    ts(`JSON round-trip OK`, t0)

    // === CLIENT: Hydrate ===
    const clientRb = new RequestBuilder("ssr-targeted")
    clientRb.withOptions({ groupingDelay: 0 })
    clientRb.withFilter().kinds([1]).limit(5)
    const clientQuery = client.Query(clientRb)

    expect(clientQuery.snapshot.length).toBe(0)
    ts(`Client query created (empty)`, t0)

    for (const [id, events] of Object.entries(deserialized)) {
      client.hydrateQuery(id, events)
    }
    ts(`Client hydrated`, t0)

    expect(clientQuery.snapshot.length).toBeGreaterThan(0)
    expect(clientQuery.snapshot.length).toBe(q.snapshot.length)

    const serverIds = q.snapshot.map(e => e.id).sort()
    const clientIds = clientQuery.snapshot.map(e => e.id).sort()
    expect(clientIds).toEqual(serverIds)

    ts(`✅ Full SSR round-trip verified`, t0)
  })

  test("FetchAll with multiple queries", async () => {
    const t0 = Date.now()

    const rb1 = new RequestBuilder("ssr-notes")
    rb1.withOptions({ groupingDelay: 0 })
    rb1.withFilter().kinds([1]).limit(3)

    const rb2 = new RequestBuilder("ssr-profiles")
    rb2.withOptions({ groupingDelay: 0 })
    rb2.withFilter().kinds([0]).limit(3)

    const q1 = server.Query(rb1)
    const q2 = server.Query(rb2)
    q1.start()
    q2.start()
    ts("Both queries started", t0)

    // Wait for traces
    await new Promise(r => setTimeout(r, 200))

    const fetchAllStart = Date.now()
    await server.FetchAll()
    const fetchAllMs = Date.now() - fetchAllStart
    ts(`FetchAll completed in ${fetchAllMs}ms`, t0)
    console.log(`  ✅ Multi-query FetchAll took ${fetchAllMs}ms`)

    expect(fetchAllMs).toBeLessThan(10_000)
    expect(q1.snapshot.length).toBeGreaterThan(0)
    expect(q2.snapshot.length).toBeGreaterThan(0)

    const data = server.getHydrationData()
    expect(Object.keys(data)).toContain("ssr-notes")
    expect(Object.keys(data)).toContain("ssr-profiles")
  })

  test("race condition: FetchAll called before traces are created", async () => {
    const t0 = Date.now()

    const rb = new RequestBuilder("ssr-race")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).limit(3)

    const q = server.Query(rb)
    q.start()
    ts("Query started — calling FetchAll immediately (no delay)", t0)

    // Call FetchAll IMMEDIATELY without waiting for traces
    const fetchAllStart = Date.now()
    try {
      await server.FetchAll()
      const fetchAllMs = Date.now() - fetchAllStart
      ts(`FetchAll completed in ${fetchAllMs}ms`, t0)
      console.log(`  ✅ Race-condition FetchAll took ${fetchAllMs}ms`)
      expect(fetchAllMs).toBeLessThan(10_000)
    } catch (e) {
      const fetchAllMs = Date.now() - fetchAllStart
      ts(`FetchAll FAILED after ${fetchAllMs}ms: ${e}`, t0)
      // This is the bug — if FetchAll times out because traces don't exist yet
      console.log(`  ❌ Race condition: FetchAll timed out. This means waitFinished() hangs when traces are created asynchronously.`)
      for (const trace of q.traces) {
        ts(`  Trace ${trace.id.slice(0, 8)}: state=${trace.currentState} finished=${trace.finished}`, t0)
      }
      throw e
    }
  })

  test("diagnostic: trace state transitions with timing", async () => {
    const t0 = Date.now()

    const rb = new RequestBuilder("ssr-diag")
    rb.withOptions({ groupingDelay: 0 })
    rb.withFilter().kinds([1]).limit(1)

    const q = server.Query(rb)

    // Monitor trace creation
    const traceStates: Array<{ time: number; state: string; relay: string }> = []
    q.on("trace", event => {
      traceStates.push({
        time: Date.now() - t0,
        state: event.state,
        relay: event.relay,
      })
    })

    q.start()
    ts("Query started, monitoring trace events", t0)

    // Wait for completion
    const fetchAllStart = Date.now()
    await server.FetchAll()
    const fetchAllMs = Date.now() - fetchAllStart
    ts(`FetchAll done in ${fetchAllMs}ms`, t0)

    // Log all state transitions
    console.log("  Trace state transitions:")
    for (const s of traceStates) {
      console.log(`    [${s.time}ms] ${s.relay} → ${s.state}`)
    }

    expect(q.traces.length).toBeGreaterThan(0)
    expect(q.traces.every(t => t.finished)).toBe(true)
    expect(q.snapshot.length).toBeGreaterThan(0)

    // With grace-period racing, fetchAll should complete near
    // first-EOSE + 500ms, NOT wait for the slowest relay.
    // Fast relays typically EOSE in <200ms, so ~700ms total.
    console.log(`  FetchAll total: ${fetchAllMs}ms (expected: first-EOSE + ~500ms grace)`)
  })

  test("FetchAll with no pre-connected relays (fallback to defaults)", async () => {
    const t0 = Date.now()

    // Create a fresh system with NO pre-connected relays
    const fresh = new NostrSystem({
      automaticOutboxModel: false,
      buildFollowGraph: false,
      disableSyncModule: true,
    })

    try {
      const rb = new RequestBuilder("ssr-no-relays")
      rb.withOptions({ groupingDelay: 0 })
      rb.withFilter().kinds([1]).limit(3)

      const q = fresh.Query(rb)
      q.start()
      ts("Query started on system with NO relays", t0)

      // Wait a bit for async connection to default relays
      await new Promise(r => setTimeout(r, 500))
      ts(`After 500ms: traces=${q.traces.length}`, t0)

      for (const trace of q.traces) {
        ts(`  Trace: relay=${trace.relay} state=${trace.currentState} finished=${trace.finished}`, t0)
      }

      const fetchAllStart = Date.now()
      try {
        await fresh.FetchAll()
        const fetchAllMs = Date.now() - fetchAllStart
        ts(`FetchAll completed in ${fetchAllMs}ms`, t0)
        console.log(`  ✅ No-relay FetchAll took ${fetchAllMs}ms`)

        // Default relay connections should now be non-ephemeral so queries get sent
        expect(q.traces.length).toBeGreaterThan(0)
        expect(fetchAllMs).toBeLessThan(10_000)
      } catch (e) {
        const fetchAllMs = Date.now() - fetchAllStart
        ts(`FetchAll FAILED after ${fetchAllMs}ms: ${e}`, t0)
        for (const trace of q.traces) {
          ts(`  Trace: relay=${trace.relay} state=${trace.currentState} finished=${trace.finished}`, t0)
        }
        throw e
      }
    } finally {
      // Disconnect default relays
      for (const [, conn] of fresh.pool) {
        try { conn.close() } catch {}
      }
    }
  })
})
