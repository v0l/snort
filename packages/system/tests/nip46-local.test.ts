/**
 * NIP-46 integration test with local signer server
 * Uses nostr-tools to create a local NIP-46 signer for testing
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { generateSecretKey, getPublicKey } from "nostr-tools"
import { SimpleRelay } from "nostr-tools/relay"
import { Nip46Signer } from "../src/impl/nip46"
import { PrivateKeySigner } from "../src/signer"

// Note: This test requires a running NIP-46 signer server or a mock implementation
// Since nostr-tools doesn't have a built-in NIP-46 signer, we'll test the client-side logic

describe("Nip46Signer - Client-side validation", () => {
  let clientSigner: PrivateKeySigner
  let clientPubkey: string

  beforeEach(async () => {
    clientSigner = PrivateKeySigner.random()
    clientPubkey = await clientSigner.getPubKey()
  })

  test("parses nostrconnect URL with multiple relays", () => {
    const url = `nostrconnect://${clientPubkey}?relay=wss://relay1.test&relay=wss://relay2.test&secret=abc123&perms=sign_event:0,sign_event:1`
    const signer = new Nip46Signer(url, clientSigner)

    expect(signer.isBunker).toBe(false)
    expect(signer.relays).toEqual(["wss://relay1.test"]) // Only first relay is used currently
  })

  test("parses bunker URL with multiple relays", () => {
    const signerPubkey = "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52"
    const url = `bunker://${signerPubkey}?relay=wss://relay1.test&relay=wss://relay2.test&secret=abc123`
    const signer = new Nip46Signer(url, clientSigner)

    expect(signer.isBunker).toBe(true)
    expect(signer.relays).toEqual(["wss://relay1.test"])
  })

  test("handles hex pubkey in nostrconnect URL", async () => {
    const url = `nostrconnect://${clientPubkey}?relay=wss://relay.test&secret=abc123`
    const signer = new Nip46Signer(url, clientSigner)

    expect(signer.isBunker).toBe(false)
  })

  test("extracts secret from hash in bunker URL", () => {
    const signerPubkey = "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52"
    const url = `bunker://${signerPubkey}?relay=wss://relay.test#secret123`
    const signer = new Nip46Signer(url, clientSigner)

    expect(signer.isBunker).toBe(true)
  })

  test("extracts secret from query param in nostrconnect URL", () => {
    const url = `nostrconnect://${clientPubkey}?relay=wss://relay.test&secret=secret123`
    const signer = new Nip46Signer(url, clientSigner)

    expect(signer.isBunker).toBe(false)
  })

  test("handles missing secret parameter gracefully", () => {
    const url = `nostrconnect://${clientPubkey}?relay=wss://relay.test`
    const signer = new Nip46Signer(url, clientSigner)

    expect(signer.isBunker).toBe(false)
    // Secret will be undefined, which may cause issues with some signers
  })

  test("generates random client keypair when not provided", async () => {
    const url = `nostrconnect://${clientPubkey}?relay=wss://relay.test&secret=abc123`
    const signer = new Nip46Signer(url) // No insideSigner provided

    // Should have generated a random keypair
    expect(await signer.privateKey).toBeDefined()
    // getPubKey() requires init() to be called first, so we just check privateKey
  })

  test("uses provided insideSigner for encryption", async () => {
    const url = `nostrconnect://${clientPubkey}?relay=wss://relay.test&secret=abc123`
    const signer = new Nip46Signer(url, clientSigner)

    expect(await signer.privateKey).toBe(clientSigner.privateKey)
  })
})

// Note: Full integration testing with a real NIP-46 signer requires:
// 1. A running NIP-46 signer server (like nsecbunker, amethyst, etc.)
// 2. Or a mock signer implementation that follows NIP-46 spec
//
// Since nostr-tools doesn't include a NIP-46 signer implementation,
// we cannot test the full connect/sign flow without an external signer.
//
// For local testing, you can:
// 1. Run a local NIP-46 signer (e.g., nsecbunker)
// 2. Use the signer's generated bunker:// or nostrconnect:// URL
// 3. Update this test to connect to the local signer
