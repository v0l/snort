import { describe, expect, test } from "bun:test"
import { EventBuilder, EventKind, PrivateKeySigner, type TaggedNostrEvent } from "@snort/system"

import { BunSqliteRelay } from "../src"

const author = PrivateKeySigner.random()
const other = PrivateKeySigner.random()

async function note(signer: PrivateKeySigner, content: string) {
  const ev = await new EventBuilder().kind(EventKind.TextNote).content(content).buildAndSign(signer)
  return { ...ev, relays: [] } as TaggedNostrEvent
}

async function deletion(signer: PrivateKeySigner, ids: Array<string>) {
  const eb = new EventBuilder().kind(EventKind.Deletion)
  for (const id of ids) eb.tag(["e", id])
  return { ...(await eb.buildAndSign(signer)), relays: [] } as TaggedNostrEvent
}

describe("deletion requests", () => {
  test("remove the referenced event and keep it from coming back", async () => {
    const relay = new BunSqliteRelay(":memory:")
    const ev = await note(author, "to be deleted")
    await relay.event(ev)
    await relay.event(await deletion(author, [ev.id]))
    expect(await relay.query(["REQ", "q", { ids: [ev.id] }])).toHaveLength(0)

    await relay.event(ev)
    expect(await relay.query(["REQ", "q", { ids: [ev.id] }])).toHaveLength(0)
    expect(await relay.query(["REQ", "q", { kinds: [EventKind.Deletion] }])).toHaveLength(1)
  })

  test("ignore deletions from other authors", async () => {
    const relay = new BunSqliteRelay(":memory:")
    const ev = await note(author, "not yours")
    await relay.event(ev)
    await relay.event(await deletion(other, [ev.id]))
    await relay.event(ev)
    expect(await relay.query(["REQ", "q", { ids: [ev.id] }])).toHaveLength(1)
  })

  test("delete by filter returns the removed ids", async () => {
    const relay = new BunSqliteRelay(":memory:")
    const a = await note(author, "a")
    const b = await note(other, "b")
    await relay.event(a)
    await relay.event(b)
    expect(await relay.delete(["REQ", "d", { authors: [author.getPubKey()] }])).toEqual([a.id])
    expect(await relay.query(["REQ", "q", { kinds: [EventKind.TextNote] }])).toHaveLength(1)
  })
})
