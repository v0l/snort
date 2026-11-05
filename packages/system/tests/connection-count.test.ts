import { afterEach, describe, expect, test } from "bun:test"
import { Connection } from "../src/connection"
import { NostrSystem } from "../src/nostr-system"

type Handler = (ws: any, msg: Array<any>) => void

function relay(handler: Handler) {
  return Bun.serve({
    port: 0,
    fetch(req, srv) {
      if (srv.upgrade(req)) return
      return new Response("not found", { status: 404 })
    },
    websocket: {
      message(ws, data) {
        handler(ws, JSON.parse(String(data)))
      },
    },
  })
}

describe("NIP-45 COUNT", () => {
  const servers: Array<ReturnType<typeof Bun.serve>> = []
  const conns: Array<Connection> = []
  const serve = (h: Handler) => {
    const s = relay(h)
    servers.push(s)
    return `ws://localhost:${s.port}`
  }

  afterEach(() => {
    for (const c of conns.splice(0)) c.close()
    for (const s of servers.splice(0)) s.stop(true)
  })

  const open = async (url: string) => {
    const c = new Connection(url, { read: true, write: true })
    conns.push(c)
    await c.connect(true)
    return c
  }

  test("resolves with the full reply payload including hll", async () => {
    const hll = "ab".repeat(256)
    let sent: Array<any> = []
    const url = serve((ws, msg) => {
      sent = msg
      ws.send(JSON.stringify(["COUNT", msg[1], { count: 42, approximate: true, hll }]))
    })
    const c = await open(url)
    const rsp = await c.count([{ kinds: [7], "#e": ["x"] }])
    expect(rsp).toEqual({ count: 42, approximate: true, hll })
    expect(sent[0]).toBe("COUNT")
    expect(sent[2]).toEqual({ kinds: [7], "#e": ["x"] })
  })

  test("ignores replies for other ids", async () => {
    const url = serve((ws, msg) => {
      ws.send(JSON.stringify(["COUNT", "other", { count: 1 }]))
      ws.send(JSON.stringify(["COUNT", msg[1], { count: 2 }]))
    })
    const c = await open(url)
    expect(await c.count([{ kinds: [1] }])).toEqual({ count: 2 })
  })

  test("CLOSED resolves undefined", async () => {
    const url = serve((ws, msg) => ws.send(JSON.stringify(["CLOSED", msg[1], "unsupported: COUNT"])))
    const c = await open(url)
    expect(await c.count([{ kinds: [1] }])).toBeUndefined()
  })

  test("times out with undefined when relay is silent", async () => {
    const url = serve(() => {})
    const c = await open(url)
    const start = Date.now()
    expect(await c.count([{ kinds: [1] }], 150)).toBeUndefined()
    expect(Date.now() - start).toBeLessThan(2000)
  })

  test("resolves undefined when the connection drops", async () => {
    const url = serve((ws, _msg) => ws.close())
    const c = await open(url)
    expect(await c.count([{ kinds: [1] }], 3000)).toBeUndefined()
  })

  test("auth-required CLOSED waits for the retry after AUTH", async () => {
    let n = 0
    const url = serve((ws, msg) => {
      if (msg[0] === "AUTH") {
        ws.send(JSON.stringify(["OK", msg[1].id, true, ""]))
      } else if (msg[0] === "COUNT") {
        n++
        if (n === 1) {
          ws.send(JSON.stringify(["CLOSED", msg[1], "auth-required: sign in"]))
          ws.send(JSON.stringify(["AUTH", "chal"]))
        } else {
          ws.send(JSON.stringify(["COUNT", msg[1], { count: 9 }]))
        }
      }
    })
    const c = new Connection(url, { read: true, write: true })
    conns.push(c)
    c.on("auth", (challenge, relay, cb) =>
      cb({
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        created_at: 1,
        kind: 22242,
        tags: [
          ["relay", relay],
          ["challenge", challenge],
        ],
        content: "",
        sig: "c".repeat(128),
      }),
    )
    await c.connect(true)
    expect(await c.count([{ kinds: [1] }], 3000)).toEqual({ count: 9 })
  })

  test("NostrSystem.Count returns per-relay results and omits unsupported relays", async () => {
    const good = serve((ws, msg) => ws.send(JSON.stringify(["COUNT", msg[1], { count: 5, hll: "00".repeat(256) }])))
    const closed = serve((ws, msg) => ws.send(JSON.stringify(["CLOSED", msg[1], "unsupported"])))
    const silent = serve(() => {})
    const system = new NostrSystem({})
    const res = await system.Count([{ kinds: [1] }], [good, closed, silent], 300)
    expect(res.relays).toEqual([{ relay: `${good}/`, count: 5, hll: "00".repeat(256) }])
    expect(res.count).toBe(5)
    for (const [, c] of system.pool) c.close()
  })
})
