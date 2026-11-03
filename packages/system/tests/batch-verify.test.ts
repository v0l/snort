import { describe, expect, test } from "bun:test"
import { EventBuilder } from "../src/event-builder"
import { PrivateKeySigner } from "../src/signer"
import { DefaultOptimizer } from "../src/query-optimizer"
import type { NostrEvent } from "../src/nostr"
import { bytesToHex } from "@noble/hashes/utils.js"
import { schnorr } from "@noble/curves/secp256k1.js"

async function validEvent(): Promise<NostrEvent> {
  const signer = new PrivateKeySigner(bytesToHex(schnorr.utils.randomSecretKey()))
  const eb = new EventBuilder().kind(1).content("hi")
  return await eb.buildAndSign(signer)
}

describe("batchVerify", () => {
  test("malformed sig does not throw and valid events survive", async () => {
    const good = await validEvent()
    const clone = () => JSON.parse(JSON.stringify(good)) as NostrEvent
    const bad = [
      { ...clone(), sig: "" },
      { ...clone(), sig: "zz".repeat(32) },
      { ...clone(), sig: "ab" },
      { ...clone(), pubkey: "xyz" },
    ]
    const fresh = await validEvent()
    const res = DefaultOptimizer.batchVerify([...bad, fresh])
    expect(res).toEqual([false, false, false, false, true])
    expect(DefaultOptimizer.schnorrVerify({ ...clone(), sig: "" })).toBe(false)
  })
})
