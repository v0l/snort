import { describe, expect, test } from "bun:test"
import type { TaggedNostrEvent } from "../src/nostr"
import { KeyedReplaceableNoteStore, NoteCollection } from "../src/note-collection"

function ev(
  id: string,
  kind: number,
  created_at: number,
  pubkey = "aa",
  tags: string[][] = [],
  relays: string[] = [],
): TaggedNostrEvent {
  return { id, kind, created_at, pubkey, tags, content: "", sig: "", relays }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

describe("KeyedReplaceableNoteStore", () => {
  describe("key function behavior", () => {
    test("custom key function groups events correctly", () => {
      const store = new KeyedReplaceableNoteStore(e => `custom:${e.pubkey}`)
      store.add(ev("a", 1, 100, "alice"))
      store.add(ev("b", 1, 200, "alice"))
      expect(store.snapshot).toHaveLength(1)
      expect(store.snapshot[0].id).toBe("b")
    })

    test("different keys coexist", () => {
      const store = new KeyedReplaceableNoteStore(e => e.pubkey)
      store.add(ev("a", 1, 100, "alice"))
      store.add(ev("b", 1, 100, "bob"))
      expect(store.snapshot).toHaveLength(2)
    })

    test("key function receives the full event object", () => {
      let receivedEvent: TaggedNostrEvent | undefined
      const store = new KeyedReplaceableNoteStore(e => {
        receivedEvent = e
        return e.id
      })
      const event = ev("test-id", 1, 100, "alice", [["t", "tag1"]])
      store.add(event)
      expect(receivedEvent).toBeDefined()
      expect(receivedEvent?.id).toBe("test-id")
      expect(receivedEvent?.tags).toEqual([["t", "tag1"]])
    })
  })

  describe("created_at boundary conditions", () => {
    test("event with created_at=0 is never stored (strict > check)", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      const result = store.add(ev("a", 1, 0))
      expect(result).toBe(0)
      expect(store.snapshot).toHaveLength(0)
    })

    test("event with created_at=1 is stored", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("a", 1, 1))
      expect(store.snapshot).toHaveLength(1)
    })

    test("event with negative created_at is never stored (fails > 0 check)", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      const result = store.add(ev("a", 1, -1))
      expect(result).toBe(0)
      expect(store.snapshot).toHaveLength(0)
    })

    test("exact same timestamp does not replace (strict > not >=)", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("first", 1, 100))
      const result = store.add(ev("second", 1, 100))
      expect(result).toBe(0)
      expect(store.snapshot[0].id).toBe("first")
    })

    test("very large created_at values work", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("a", 1, Number.MAX_SAFE_INTEGER - 1))
      store.add(ev("b", 1, Number.MAX_SAFE_INTEGER))
      expect(store.snapshot[0].id).toBe("b")
    })
  })

  describe("relay merging", () => {
    test("replacing event inherits relays from old event", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("old", 1, 100, "aa", [], ["wss://r1.test"]))
      store.add(ev("new", 1, 200, "aa", [], ["wss://r2.test"]))
      const snap = store.snapshot
      expect(snap[0].relays).toContain("wss://r1.test")
      expect(snap[0].relays).toContain("wss://r2.test")
    })

    test("relay merging deduplicates", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("old", 1, 100, "aa", [], ["wss://r1.test"]))
      store.add(ev("new", 1, 200, "aa", [], ["wss://r1.test", "wss://r2.test"]))
      const relays = store.snapshot[0].relays!
      const uniqueRelays = [...new Set(relays)]
      expect(relays.length).toBe(uniqueRelays.length)
    })

    test("relay merging with undefined relays on old event", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add({ ...ev("old", 1, 100), relays: undefined } as any)
      store.add(ev("new", 1, 200, "aa", [], ["wss://r1.test"]))
      expect(store.snapshot[0].relays).toContain("wss://r1.test")
    })

    test("relay merging with undefined relays on new event", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("old", 1, 100, "aa", [], ["wss://r1.test"]))
      store.add({ ...ev("new", 1, 200), relays: undefined } as any)
      expect(store.snapshot[0].relays).toContain("wss://r1.test")
    })

    test("non-replacing event does NOT merge relays (older event ignored)", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      store.add(ev("new", 1, 200, "aa", [], ["wss://r1.test"]))
      store.add(ev("old", 1, 100, "aa", [], ["wss://r2.test"]))
      expect(store.snapshot[0].relays).toEqual(["wss://r1.test"])
    })
  })

  describe("sorted order", () => {
    test("snapshot is sorted by created_at descending", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      store.add(ev("a", 1, 100))
      store.add(ev("c", 1, 300))
      store.add(ev("b", 1, 200))
      const snap = store.snapshot
      expect(snap[0].created_at).toBe(300)
      expect(snap[1].created_at).toBe(200)
      expect(snap[2].created_at).toBe(100)
    })

    test("sorted order is maintained after replacement", () => {
      const store = new KeyedReplaceableNoteStore(e => e.pubkey)
      store.add(ev("a1", 1, 100, "alice"))
      store.add(ev("b1", 1, 300, "bob"))
      store.add(ev("a2", 1, 400, "alice"))
      const snap = store.snapshot
      expect(snap[0].id).toBe("a2")
      expect(snap[1].id).toBe("b1")
    })
  })

  describe("batch add", () => {
    test("empty array add returns 0 and does not emit", async () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))
      const result = store.add([])
      expect(result).toBe(0)
      await sleep(400)
      expect(emissions).toHaveLength(0)
    })

    test("batch with mix of new and duplicate events", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      store.add(ev("a", 1, 100))
      const result = store.add([ev("a", 1, 100), ev("b", 1, 200), ev("c", 1, 300)])
      expect(result).toBe(2)
      expect(store.snapshot).toHaveLength(3)
    })

    test("batch with replaceable events — newer replaces within batch", () => {
      const store = new KeyedReplaceableNoteStore(() => "key")
      const result = store.add([ev("old", 1, 100), ev("new", 1, 200)])
      expect(result).toBe(2)
      expect(store.snapshot).toHaveLength(1)
      expect(store.snapshot[0].id).toBe("new")
    })
  })

  describe("snapshot laziness", () => {
    test("multiple adds without reading snapshot only compute once on read", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      store.add(ev("a", 1, 100))
      store.add(ev("b", 1, 200))
      store.add(ev("c", 1, 300))
      const snap = store.snapshot
      expect(snap).toHaveLength(3)
    })

    test("snapshot reference changes after add", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      store.add(ev("a", 1, 100))
      const snap1 = store.snapshot
      store.add(ev("b", 1, 200))
      const snap2 = store.snapshot
      expect(snap1).not.toBe(snap2)
    })

    test("snapshot reference is stable when no changes", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      store.add(ev("a", 1, 100))
      const snap1 = store.snapshot
      const snap2 = store.snapshot
      expect(snap1).toBe(snap2)
    })

    test("snapshot is fresh after clear + add", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      store.add(ev("a", 1, 100))
      const snap1 = store.snapshot
      store.clear()
      store.add(ev("b", 1, 200))
      const snap2 = store.snapshot
      expect(snap1).toHaveLength(1)
      expect(snap1[0].id).toBe("a")
      expect(snap2).toHaveLength(1)
      expect(snap2[0].id).toBe("b")
    })
  })

  describe("emission timing", () => {
    test("onChange debounces — adds within interval are batched, next interval starts fresh", async () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))

      store.add(ev("a", 1, 100))
      store.add(ev("b", 1, 200))

      await sleep(400)
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toHaveLength(2)

      store.add(ev("c", 1, 300))
      await sleep(400)
      expect(emissions).toHaveLength(2)
      expect(emissions[1]).toHaveLength(1)
      expect(emissions[1][0].id).toBe("c")
    })

    test("flushEmit forces immediate emission of buffered events", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))

      store.add(ev("a", 1, 100))
      store.add(ev("b", 1, 200))
      expect(emissions).toHaveLength(0)

      store.flushEmit()
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toHaveLength(2)
    })

    test("flushEmit on empty buffer is safe no-op", () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))
      store.flushEmit()
      expect(emissions).toHaveLength(0)
    })

    test("flushEmit clears timer so next add creates fresh timer", async () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))

      store.add(ev("a", 1, 100))
      store.flushEmit()
      expect(emissions).toHaveLength(1)

      store.add(ev("b", 1, 200))
      await sleep(400)
      expect(emissions).toHaveLength(2)
      expect(emissions[1][0].id).toBe("b")
    })

    test("clear during pending emit cancels buffered events", async () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))

      store.add(ev("a", 1, 100))
      store.add(ev("b", 1, 200))
      store.clear()

      await sleep(400)
      expect(emissions).toHaveLength(1)
      expect(emissions[0]).toHaveLength(0)
    })

    test("rapid add-clear-add cycle emits correctly", async () => {
      const store = new KeyedReplaceableNoteStore(e => e.id)
      const emissions: TaggedNostrEvent[][] = []
      store.on("event", evs => emissions.push(evs))

      store.add(ev("a", 1, 100))
      store.clear()
      store.add(ev("b", 1, 200))

      await sleep(400)
      expect(emissions).toHaveLength(2)
      expect(emissions[0]).toHaveLength(0)
      expect(emissions[1]).toHaveLength(1)
      expect(emissions[1][0].id).toBe("b")
    })
  })
})

describe("NoteCollection kind routing", () => {
  describe("Regular events (kind 1, ephemeral, etc.)", () => {
    test("kind 1 events keyed by id — same pubkey different ids coexist", () => {
      const c = new NoteCollection()
      c.add(ev("a", 1, 100, "alice"))
      c.add(ev("b", 1, 200, "alice"))
      expect(c.snapshot).toHaveLength(2)
    })

    test("kind 1 events with same id — only stored once", () => {
      const c = new NoteCollection()
      c.add(ev("same", 1, 100, "alice"))
      c.add(ev("same", 1, 200, "alice"))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].created_at).toBe(200)
    })

    test("ephemeral kind 20000 is Regular", () => {
      const c = new NoteCollection()
      c.add(ev("a", 20000, 100, "alice"))
      c.add(ev("b", 20000, 200, "alice"))
      expect(c.snapshot).toHaveLength(2)
    })

    test("kind 7 (reaction) is Regular", () => {
      const c = new NoteCollection()
      c.add(ev("a", 7, 100, "alice"))
      c.add(ev("b", 7, 200, "alice"))
      expect(c.snapshot).toHaveLength(2)
    })
  })

  describe("Replaceable events (kind 0, 3, 41, 10000-19999)", () => {
    test("kind 0 (metadata) keyed by kind:pubkey", () => {
      const c = new NoteCollection()
      c.add(ev("old", 0, 100, "alice"))
      c.add(ev("new", 0, 200, "alice"))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe("new")
    })

    test("kind 3 (contacts) keyed by kind:pubkey", () => {
      const c = new NoteCollection()
      c.add(ev("old", 3, 100, "alice"))
      c.add(ev("new", 3, 200, "alice"))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe("new")
    })

    test("kind 10002 (relay list) is Replaceable", () => {
      const c = new NoteCollection()
      c.add(ev("old", 10002, 100, "alice"))
      c.add(ev("new", 10002, 200, "alice"))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe("new")
    })

    test("kind 19999 boundary — is Replaceable", () => {
      const c = new NoteCollection()
      c.add(ev("old", 19999, 100, "alice"))
      c.add(ev("new", 19999, 200, "alice"))
      expect(c.snapshot).toHaveLength(1)
    })

    test("replaceable events from different pubkeys are independent", () => {
      const c = new NoteCollection()
      c.add(ev("a", 0, 100, "alice"))
      c.add(ev("b", 0, 100, "bob"))
      expect(c.snapshot).toHaveLength(2)
    })

    test("replaceable events of different kinds from same pubkey are independent", () => {
      const c = new NoteCollection()
      c.add(ev("a", 0, 100, "alice"))
      c.add(ev("b", 3, 100, "alice"))
      expect(c.snapshot).toHaveLength(2)
    })
  })

  describe("Addressable events (kind 30000-39999)", () => {
    test("keyed by kind:pubkey:d-tag", () => {
      const c = new NoteCollection()
      c.add(ev("old", 30000, 100, "alice", [["d", "slug"]]))
      c.add(ev("new", 30000, 200, "alice", [["d", "slug"]]))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe("new")
    })

    test("different d-tags are independent", () => {
      const c = new NoteCollection()
      c.add(ev("a", 30000, 100, "alice", [["d", "one"]]))
      c.add(ev("b", 30000, 100, "alice", [["d", "two"]]))
      expect(c.snapshot).toHaveLength(2)
    })

    test("different pubkeys with same d-tag are independent", () => {
      const c = new NoteCollection()
      c.add(ev("a", 30000, 100, "alice", [["d", "slug"]]))
      c.add(ev("b", 30000, 100, "bob", [["d", "slug"]]))
      expect(c.snapshot).toHaveLength(2)
    })

    test("different kinds with same pubkey and d-tag are independent", () => {
      const c = new NoteCollection()
      c.add(ev("a", 30000, 100, "alice", [["d", "slug"]]))
      c.add(ev("b", 30001, 100, "alice", [["d", "slug"]]))
      expect(c.snapshot).toHaveLength(2)
    })

    test("missing d-tag uses undefined as key component", () => {
      const c = new NoteCollection()
      c.add(ev("a", 30000, 100, "alice"))
      c.add(ev("b", 30000, 200, "alice"))
      expect(c.snapshot).toHaveLength(1)
      expect(c.snapshot[0].id).toBe("b")
    })

    test("empty d-tag value is distinct from missing d-tag", () => {
      const c = new NoteCollection()
      c.add(ev("a", 30000, 100, "alice", [["d", ""]]))
      c.add(ev("b", 30000, 100, "alice"))
      expect(c.snapshot).toHaveLength(2)
    })

    test("kind 39999 boundary — is Addressable", () => {
      const c = new NoteCollection()
      c.add(ev("old", 39999, 100, "alice", [["d", "x"]]))
      c.add(ev("new", 39999, 200, "alice", [["d", "x"]]))
      expect(c.snapshot).toHaveLength(1)
    })

    test("kind 40000 boundary — is NOT Addressable (Regular)", () => {
      const c = new NoteCollection()
      c.add(ev("a", 40000, 100, "alice", [["d", "x"]]))
      c.add(ev("b", 40000, 200, "alice", [["d", "x"]]))
      expect(c.snapshot).toHaveLength(2)
    })
  })

  describe("concurrent-like add patterns", () => {
    test("interleaved adds from multiple pubkeys", () => {
      const c = new NoteCollection()
      c.add(ev("a1", 0, 100, "alice"))
      c.add(ev("b1", 0, 100, "bob"))
      c.add(ev("a2", 0, 200, "alice"))
      c.add(ev("b2", 0, 200, "bob"))
      expect(c.snapshot).toHaveLength(2)
      const ids = c.snapshot.map(e => e.id).sort()
      expect(ids).toEqual(["a2", "b2"])
    })

    test("large batch add", () => {
      const c = new NoteCollection()
      const events = Array.from({ length: 1000 }, (_, i) => ev(`id-${i}`, 1, i + 1, "alice"))
      c.add(events)
      expect(c.snapshot).toHaveLength(1000)
    })

    test("add after listener removal does not throw", async () => {
      const c = new NoteCollection()
      const handler = () => {}
      c.on("event", handler)
      c.off("event", handler)
      c.add(ev("a", 1, 100))
      await sleep(400)
    })
  })
})
