import { afterEach, describe, expect, test } from "bun:test"
import { Connection } from "../src/connection"
import type { NostrEvent } from "../src/nostr"

describe("Connection AUTH", () => {
  let server: ReturnType<typeof Bun.serve> | undefined
  let conn: Connection | undefined

  afterEach(() => {
    conn?.close()
    server?.stop(true)
  })

  test("answers AUTH for a kind 23195 subscription when an auth listener exists", async () => {
    const received = new Promise<Array<any>>(resolve => {
      server = Bun.serve({
        port: 0,
        fetch(req, srv) {
          if (srv.upgrade(req)) return
          return new Response("not found", { status: 404 })
        },
        websocket: {
          open(ws) {
            ws.send(JSON.stringify(["AUTH", "challenge-123"]))
          },
          message(ws, data) {
            const msg = JSON.parse(String(data))
            if (msg[0] === "AUTH") {
              ws.send(JSON.stringify(["OK", msg[1].id, true, ""]))
              resolve(msg)
            }
          },
        },
      })
    })

    conn = new Connection(`ws://localhost:${server!.port}`, { read: true, write: true })
    conn.on("auth", (challenge, relay, cb) => {
      cb({
        id: "a".repeat(64),
        pubkey: "b".repeat(64),
        created_at: Math.floor(Date.now() / 1000),
        kind: 22242,
        tags: [
          ["relay", relay],
          ["challenge", challenge],
        ],
        content: "",
        sig: "c".repeat(128),
      } as NostrEvent)
    })
    await conn.connect()
    conn.request(["REQ", "wallet", { kinds: [23195], limit: 1 }])

    const msg = await Promise.race([
      received,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
    ])
    expect(msg).not.toBeNull()
    expect(msg![0]).toBe("AUTH")
    expect(msg![1].kind).toBe(22242)
    expect(msg![1].tags).toContainEqual(["challenge", "challenge-123"])
  })
})
