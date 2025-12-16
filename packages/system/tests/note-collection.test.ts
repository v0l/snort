import type { TaggedNostrEvent } from "../src/nostr";
import { describe, expect, test } from "bun:test";
import { NoteCollection, KeyedReplaceableNoteStore } from "../src/note-collection";

describe("NoteStore", () => {
  describe("note collection", () => {
    test("one event", () => {
      const ev = { id: "one", kind: 1, created_at: 69 } as TaggedNostrEvent;
      const c = new NoteCollection();
      c.add(ev);
      expect(c.snapshot).toEqual([ev]);
    });
    test("still one event", () => {
      const ev = { id: "one", kind: 1, created_at: 69 } as TaggedNostrEvent;
      const c = new NoteCollection();
      c.add(ev);
      c.add(ev);
      expect(c.snapshot).toEqual([ev]);
    });
    test("clears", () => {
      const ev = { id: "one", kind: 1, created_at: 69 } as TaggedNostrEvent;
      const c = new NoteCollection();
      c.add(ev);
      expect(c.snapshot).toEqual([ev]);
      c.clear();
      expect(c.snapshot).toEqual([]);
    });
  });
  describe("replaceable", () => {
    test("one event", () => {
      const ev = { id: "test", created_at: 69 } as TaggedNostrEvent;
      const c = new KeyedReplaceableNoteStore(() => "test");
      c.add(ev);
      expect(c.snapshot).toEqual([ev]);
    });
    test("dont replace with older", () => {
      const ev = { id: "test", created_at: 69 } as TaggedNostrEvent;
      const evOlder = { id: "test2", created_at: 68 } as TaggedNostrEvent;
      const c = new KeyedReplaceableNoteStore(() => "test");
      c.add(ev);
      c.add(evOlder);
      expect(c.snapshot).toEqual([ev]);
    });
    test("replace with newer", () => {
      const ev = { id: "test", created_at: 69 } as TaggedNostrEvent;
      const evNewer = { id: "test2", created_at: 70 } as TaggedNostrEvent;
      const c = new KeyedReplaceableNoteStore(() => "test");
      c.add(ev);
      c.add(evNewer);
      expect(c.snapshot).toEqual([evNewer]);
    });
  });
});
