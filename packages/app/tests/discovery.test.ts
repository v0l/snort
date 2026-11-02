import { describe, expect, test } from "bun:test"
import { EventKind, type NostrEvent } from "@snort/system"

import { HighlightKind, rankDiscovery, suggestPeople } from "../src/Components/WorthALook/discovery"

const hex = (c: string) => c.repeat(64)
const me = hex("0")
const alice = hex("a")
const bob = hex("b")
const carol = hex("c")
const stranger = hex("d")
const strangerNote = hex("e")
const followedNote = hex("f")

let n = 0
function ev(pubkey: string, kind: EventKind, tags: Array<Array<string>>): NostrEvent {
  n++
  return { id: n.toString(16).padStart(64, "0"), pubkey, kind, tags, content: "", created_at: n, sig: "" }
}
const reply = (who: string, root: string, author: string) =>
  ev(who, EventKind.TextNote, [
    ["e", root, "", "root"],
    ["p", author],
  ])
const repost = (who: string, target: string, author: string) =>
  ev(who, EventKind.Repost, [
    ["e", target],
    ["p", author],
  ])

describe("rankDiscovery", () => {
  test("a thread two follows replied in is surfaced with who is in it", () => {
    const out = rankDiscovery(
      [reply(alice, strangerNote, stranger), reply(bob, strangerNote, stranger)],
      [alice, bob],
      me,
    )
    expect(out).toHaveLength(1)
    expect(out[0].reason).toBe("thread")
    expect(out[0].link.id).toBe(strangerNote)
    expect(out[0].by.sort()).toEqual([alice, bob].sort())
    expect(out[0].author).toBe(stranger)
  })

  test("one follow replying is not enough to call it a thread worth reading", () => {
    expect(rankDiscovery([reply(alice, strangerNote, stranger)], [alice, bob], me)).toHaveLength(0)
  })

  test("notes by people you already follow stay in the feed, not discovery", () => {
    const out = rankDiscovery(
      [reply(alice, followedNote, carol), reply(bob, followedNote, carol), repost(alice, followedNote, carol)],
      [alice, bob, carol],
      me,
    )
    expect(out).toHaveLength(0)
  })

  test("your own notes are not suggested back to you", () => {
    expect(
      rankDiscovery([repost(alice, strangerNote, me), repost(bob, strangerNote, me)], [alice, bob], me),
    ).toHaveLength(0)
  })

  test("actions by people you do not follow are ignored", () => {
    expect(
      rankDiscovery([repost(stranger, strangerNote, carol), repost(carol, strangerNote, carol)], [alice], me),
    ).toHaveLength(0)
  })

  test("a single highlight by a follow is enough", () => {
    const article = `30023:${stranger}:relay-lists`
    const out = rankDiscovery([ev(alice, HighlightKind, [["a", article]])], [alice], me)
    expect(out[0].reason).toBe("highlighted")
    expect(out[0].link.id).toBe("relay-lists")
  })

  test("busier items rank first", () => {
    const other = hex("9")
    const out = rankDiscovery(
      [
        repost(alice, other, stranger),
        repost(bob, other, stranger),
        reply(alice, strangerNote, stranger),
        reply(bob, strangerNote, stranger),
        reply(carol, strangerNote, stranger),
      ],
      [alice, bob, carol],
      me,
    )
    expect(out.map(i => i.link.id)).toEqual([strangerNote, other])
  })
})

describe("suggestPeople", () => {
  test("people several follows reply to are suggested", () => {
    const out = suggestPeople([reply(alice, strangerNote, stranger), reply(bob, hex("8"), stranger)], [alice, bob], me)
    expect(out).toEqual([{ pubkey: stranger, by: [alice, bob] }])
  })

  test("people you already follow and yourself are left out", () => {
    const out = suggestPeople(
      [reply(alice, strangerNote, bob), reply(carol, strangerNote, me)],
      [alice, bob, carol],
      me,
    )
    expect(out).toHaveLength(0)
  })
})
