import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { EventKind } from "../src"
import { Nip46Signer } from "../src/impl/nip46"
import { PrivateKeySigner } from "../src/signer"

Object.assign(globalThis, { window: globalThis })

const nak = Bun.which("nak")
const port = 18_000 + Math.floor(Math.random() * 2000)
const relay = `ws://localhost:${port}`
const secret = "integration-secret"
const bunkerSec = "0000000000000000000000000000000000000000000000000000000000000002"

const procs: Array<ReturnType<typeof Bun.spawn>> = []

async function waitForPort() {
  for (let i = 0; i < 50; i++) {
    try {
      const ws = new WebSocket(relay)
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error("no relay"))
      })
      ws.close()
      return
    } catch {
      await Bun.sleep(100)
    }
  }
  throw new Error("nak relay did not start")
}

describe.skipIf(!nak)("Nip46Signer against a nak bunker on a local relay", () => {
  let bunkerPubkey: string
  let url: string

  beforeAll(async () => {
    procs.push(
      Bun.spawn([nak as string, "serve", "--port", String(port)], {
        stdout: Bun.file("/tmp/nt-relay.log"),
        stderr: Bun.file("/tmp/nt-relay.log"),
      }),
    )
    await waitForPort()
    procs.push(
      Bun.spawn([nak as string, "bunker", "--sec", bunkerSec, "-s", secret, relay], {
        stdout: Bun.file("/tmp/nt-bunker.log"),
        stderr: Bun.file("/tmp/nt-bunker.log"),
      }),
    )
    bunkerPubkey = await new PrivateKeySigner(bunkerSec).getPubKey()
    await Bun.sleep(1000)
    url = `bunker://${bunkerPubkey}?relay=${encodeURIComponent(relay)}&secret=${secret}`
  })

  afterAll(() => {
    for (const p of procs) p.kill()
  })

  test("connects, reads the user key and signs", async () => {
    const signer = new Nip46Signer(url)
    await signer.init()
    expect(signer.remotePubkey).toBe(bunkerPubkey)
    expect(await signer.getPubKey()).toBe(bunkerPubkey)

    const ev = await signer.sign({
      id: "",
      sig: "",
      pubkey: bunkerPubkey,
      kind: EventKind.TextNote,
      created_at: Math.floor(Date.now() / 1000),
      content: "hello from snort",
      tags: [],
    })
    expect(ev.pubkey).toBe(bunkerPubkey)
    expect(ev.content).toBe("hello from snort")
    expect(ev.sig).toMatch(/^[0-9a-f]{128}$/)
    await signer.close()
  })

  test("nip04 and nip44 round trip through the bunker", async () => {
    const signer = new Nip46Signer(url)
    await signer.init()
    const other = PrivateKeySigner.random()
    const otherPubkey = await other.getPubKey()

    const c04 = await signer.nip4Encrypt("secret 04", otherPubkey)
    expect(await other.nip4Decrypt(c04, bunkerPubkey)).toBe("secret 04")
    expect(await signer.nip4Decrypt(await other.nip4Encrypt("reply 04", bunkerPubkey), otherPubkey)).toBe("reply 04")

    const c44 = await signer.nip44Encrypt("secret 44", otherPubkey)
    expect(await other.nip44Decrypt(c44, bunkerPubkey)).toBe("secret 44")
    expect(await signer.nip44Decrypt(await other.nip44Encrypt("reply 44", bunkerPubkey), otherPubkey)).toBe("reply 44")
    await signer.close()
  })

  test("a saved client key and remote key restore the session", async () => {
    const first = new Nip46Signer(url)
    await first.init()
    const clientKey = first.privateKey as string
    const remote = first.remotePubkey as string
    await first.close()

    const restored = new Nip46Signer(
      `bunker://${remote}?relay=${encodeURIComponent(relay)}`,
      new PrivateKeySigner(clientKey),
    )
    expect(await restored.getPubKey()).toBe(bunkerPubkey)
    await restored.close()
  })
})
