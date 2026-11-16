import { expect, test } from "bun:test"
import { decrypt, encrypt, getConversationKey } from "nostr-tools/nip44"
import { generateSecretKey, getPublicKey, verifyEvent } from "nostr-tools/pure"
import { Nip46Signer } from "../src/impl/nip46"
import { PrivateKeySigner } from "../src/signer"
import { Nip46Fixture } from "./nip46-fixture"

test("bunker signing uses the user key and delegates NIP-44 to the remote signer", async () => {
  using fixture = new Nip46Fixture()
  const signer = new Nip46Signer(fixture.bunkerUri)
  try {
    await signer.init()
    expect(await signer.getPubKey()).toBe(fixture.pubkey)
    expect(signer.remotePubkey).toBe(fixture.transportPubkey)
    for (const kind of [1311, 27235]) {
      const event = { id: "", pubkey: fixture.pubkey, kind, created_at: 1_800_000_000, tags: [], content: "hello" }
      expect(verifyEvent(await signer.sign(event))).toBe(true)
      fixture.changeEvent = true
      await expect(signer.sign(event)).rejects.toThrow("different identity or event")
      fixture.changeEvent = false
    }
    const peer = generateSecretKey()
    const peerPubkey = getPublicKey(peer)
    const conversation = getConversationKey(peer, fixture.pubkey)
    expect(decrypt(await signer.nip44Encrypt("outgoing", peerPubkey), conversation)).toBe("outgoing")
    expect(await signer.nip44Decrypt(encrypt("incoming", conversation), peerPubkey)).toBe("incoming")
  } finally {
    await signer.close()
  }
})

test("QR pairing ignores wrong secrets and recipients before discovering the transport key", async () => {
  using fixture = new Nip46Fixture()
  const client = PrivateKeySigner.random()
  const uri = `nostrconnect://${client.getPubKey()}?${new URLSearchParams({ relay: fixture.relayUrl, secret: "pair-once" })}`
  const signer = new Nip46Signer(uri, client)
  const connected = signer.init()
  try {
    await fixture.waitForSubscription(client.getPubKey())
    fixture.acceptPairing(uri, { secret: "wrong", authorise: false })
    fixture.acceptPairing(uri, { recipient: getPublicKey(generateSecretKey()), authorise: false })
    fixture.acceptPairing(uri)
    await connected
    expect(await signer.getPubKey()).toBe(fixture.pubkey)
  } finally {
    await signer.close()
  }
})

test("resuming keeps the authorised client without replaying the one-time connect secret", async () => {
  using fixture = new Nip46Fixture({ secret: "one-time" })
  const client = PrivateKeySigner.random()
  const initial = new Nip46Signer(fixture.bunkerUri, client)
  await initial.init()
  await initial.close()
  const url = new URL(fixture.bunkerUri)
  url.searchParams.delete("secret")
  const restored = new Nip46Signer(url.href, new PrivateKeySigner(client.privateKey))
  try {
    await restored.init(false)
    expect(await restored.getPubKey()).toBe(fixture.pubkey)
    expect(fixture.requests.filter(r => r.method === "connect")).toHaveLength(1)
    expect(new Set(fixture.requests.map(r => r.client)).size).toBe(1)
  } finally {
    await restored.close()
  }
})

test("close promptly rejects pending connect and signing without a disconnect round trip", async () => {
  using fixture = new Nip46Fixture()
  const signer = new Nip46Signer(fixture.bunkerUri)
  await signer.init()
  await signer.getPubKey()
  fixture.silent = true
  const pending = signer.sign({
    id: "",
    pubkey: fixture.pubkey,
    kind: 1311,
    created_at: 1_800_000_000,
    tags: [],
    content: "pending",
  })
  const result = pending.then(
    () => "signed",
    (error: Error) => error.message,
  )
  await signer.close()
  expect(await result).toContain("closed")
  expect(fixture.requests.some(r => r.method === "disconnect")).toBe(false)

  const client = PrivateKeySigner.random()
  const pairing = new Nip46Signer(
    `nostrconnect://${client.getPubKey()}?${new URLSearchParams({ relay: fixture.relayUrl, secret: "pending" })}`,
    client,
  )
  const connecting = pairing.init().then(
    () => "connected",
    (error: Error) => error.message,
  )
  await pairing.close()
  expect(await connecting).toContain("closed")
})

test("offline connections have a bounded handshake timeout", async () => {
  using fixture = new Nip46Fixture()
  fixture.silent = true
  const signer = new Nip46Signer(fixture.bunkerUri, undefined, { timeoutMs: 100 })
  try {
    await expect(signer.init()).rejects.toThrow("timed out")
  } finally {
    await signer.close()
  }
})

test("Nostr Connect requires a pairing secret", () => {
  const client = PrivateKeySigner.random()
  expect(() => new Nip46Signer(`nostrconnect://${client.getPubKey()}?relay=wss://relay.test`, client)).toThrow("secret")
})
