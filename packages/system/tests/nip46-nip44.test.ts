import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { EventBuilder } from "../src/event-builder"
import type EventKind from "../src/event-kind"
import { Nip46Signer } from "../src/impl/nip46"
import type { NostrEvent } from "../src/nostr"
import { PrivateKeySigner } from "../src/signer"

describe("Nip46Signer - NIP-44 RPCs", () => {
  let server: ReturnType<typeof Bun.serve>
  let remote: PrivateKeySigner
  let remotePubkey: string
  let methods: Array<{ method: string; params: Array<string> }>

  beforeEach(async () => {
    remote = PrivateKeySigner.random()
    remotePubkey = await remote.getPubKey()
    methods = []
    server = Bun.serve({
      port: 0,
      fetch(req, srv) {
        return srv.upgrade(req) ? undefined : new Response("ws only", { status: 400 })
      },
      websocket: {
        async message(ws, raw) {
          const msg = JSON.parse(String(raw))
          if (msg[0] !== "EVENT") return
          const ev = msg[1] as NostrEvent
          ws.send(JSON.stringify(["OK", ev.id, true, ""]))
          const req = JSON.parse(await remote.nip44Decrypt(ev.content, ev.pubkey))
          methods.push({ method: req.method, params: req.params })
          const result =
            req.method === "nip44_encrypt"
              ? `enc:${req.params[1]}`
              : req.method === "nip44_decrypt"
                ? `dec:${req.params[1]}`
                : "ack"
          const eb = new EventBuilder()
          eb.kind(24_133 as EventKind)
            .tag(["p", ev.pubkey])
            .content(await remote.nip44Encrypt(JSON.stringify({ id: req.id, result, error: "" }), ev.pubkey))
          const rsp = await eb.buildAndSign(remote)
          ws.send(JSON.stringify(["EVENT", "reply", rsp]))
        },
      },
    })
  })

  afterEach(() => {
    server.stop(true)
  })

  test("nip44 encrypt and decrypt go over the remote signer", async () => {
    const signer = new Nip46Signer(`bunker://${remotePubkey}?relay=ws://localhost:${server.port}`)
    await signer.init()
    const other = "ab".repeat(32)

    expect(await signer.nip44Encrypt("hello", other)).toBe("enc:hello")
    expect(await signer.nip44Decrypt("cipher", other)).toBe("dec:cipher")
    expect(methods.filter(m => m.method.startsWith("nip44"))).toEqual([
      { method: "nip44_encrypt", params: [other, "hello"] },
      { method: "nip44_decrypt", params: [other, "cipher"] },
    ])
    signer.close()
  })
})
