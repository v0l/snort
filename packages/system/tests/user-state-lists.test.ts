import { describe, expect, test } from "bun:test"
import { unixNow } from "@snort/shared"
import {
  EventKind,
  type NostrEvent,
  PrivateKeySigner,
  type RequestBuilder,
  type SystemInterface,
  UnknownTag,
  UserState,
} from "../src"

const KEY = "0000000000000000000000000000000000000000000000000000000000000001"

async function setup(servers: Array<string>) {
  const signer = new PrivateKeySigner(KEY)
  const pubkey = await signer.getPubKey()
  const existing = await signer.sign({
    id: "",
    sig: "",
    pubkey,
    kind: EventKind.BlossomServerList,
    created_at: unixNow(),
    content: "",
    tags: servers.map(s => ["server", s]),
  })
  const published: Array<NostrEvent> = []
  const fetched: Array<RequestBuilder> = []
  const system = {
    Fetch: async (rb: RequestBuilder) => {
      fetched.push(rb)
      return [existing]
    },
    BroadcastEvent: async (ev: NostrEvent) => {
      published.push(ev)
      return []
    },
  } as unknown as SystemInterface

  const state = new UserState(pubkey)
  state.checkIsStandardList(EventKind.BlossomServerList)
  await state.init(signer, system)
  return { state, published, fetched }
}

const servers = (state: UserState<never>) => state.getList(EventKind.BlossomServerList).map(a => a.toEventTag()?.[1])

describe("UserState standard lists", () => {
  test("removing a public list entry publishes the list without it", async () => {
    const { state, published } = await setup(["https://a.example/", "https://b.example/"])

    state.removeFromList(EventKind.BlossomServerList, new UnknownTag(["server", "https://a.example/"]))
    await state.saveList(EventKind.BlossomServerList)

    expect(servers(state)).toEqual(["https://b.example/"])
    expect(published.at(-1)?.tags).toEqual([["server", "https://b.example/"]])
    expect(published.at(-1)?.content).toBe("")
  })

  test("two saves within the same second both publish", async () => {
    const { state, published } = await setup(["https://a.example/", "https://b.example/"])

    state.removeFromList(EventKind.BlossomServerList, new UnknownTag(["server", "https://a.example/"]))
    await state.saveList(EventKind.BlossomServerList)
    state.removeFromList(EventKind.BlossomServerList, new UnknownTag(["server", "https://b.example/"]))
    await state.saveList(EventKind.BlossomServerList)

    expect(published).toHaveLength(2)
    expect(published[1].created_at).toBeGreaterThan(published[0].created_at)
    expect(servers(state)).toEqual([])
  })

  test("list sync bypasses the local cache", async () => {
    const { fetched } = await setup(["https://a.example/"])
    expect(fetched.length).toBeGreaterThan(0)
    expect(fetched.every(rb => rb.options?.skipCache === true)).toBe(true)
  })
})
