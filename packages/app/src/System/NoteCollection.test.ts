import { TaggedRawEvent } from "@snort/nostr";
import { FlatNoteStore, ReplaceableNoteStore } from "./NoteCollection";

describe("NoteStore", () => {
  describe("flat", () => {
    test("one event", () => {
      const ev = { id: "one" } as TaggedRawEvent;
      const c = new FlatNoteStore();
      c.add(ev);
      expect(c.getSnapshotData()).toEqual([ev]);
    });
    test("still one event", () => {
      const ev = { id: "one" } as TaggedRawEvent;
      const c = new FlatNoteStore();
      c.add(ev);
      c.add(ev);
      expect(c.getSnapshotData()).toEqual([ev]);
    });
    test("clears", () => {
      const ev = { id: "one" } as TaggedRawEvent;
      const c = new FlatNoteStore();
      c.add(ev);
      expect(c.getSnapshotData()).toEqual([ev]);
      c.clear();
      expect(c.getSnapshotData()).toEqual([]);
    });
  });
  describe("replacable", () => {
    test("one event", () => {
      const ev = { id: "test", created_at: 69 } as TaggedRawEvent;
      const c = new ReplaceableNoteStore();
      c.add(ev);
      expect(c.getSnapshotData()).toEqual(ev);
    });
    test("dont replace with older", () => {
      const ev = { id: "test", created_at: 69 } as TaggedRawEvent;
      const evOlder = { id: "test2", created_at: 68 } as TaggedRawEvent;
      const c = new ReplaceableNoteStore();
      c.add(ev);
      c.add(evOlder);
      expect(c.getSnapshotData()).toEqual(ev);
    });
    test("replace with newer", () => {
      const ev = { id: "test", created_at: 69 } as TaggedRawEvent;
      const evNewer = { id: "test2", created_at: 70 } as TaggedRawEvent;
      const c = new ReplaceableNoteStore();
      c.add(ev);
      c.add(evNewer);
      expect(c.getSnapshotData()).toEqual(evNewer);
    });
  });
});
