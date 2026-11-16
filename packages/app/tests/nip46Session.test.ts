import { beforeEach, describe, expect, test } from "bun:test"
import { NotEncrypted } from "@snort/system"

import "../src/Utils/Login"
import { nip46RestoreUrl } from "../src/Utils/Login/Functions"
import { LoginSessionType } from "../src/Utils/Login/LoginSession"
import { MultiAccountStore } from "../src/Utils/Login/MultiAccountStore"

const userKey = "aa".repeat(32)
const signerKey = "bb".repeat(32)
const clientKey = "cc".repeat(32)

describe("nip46 session", () => {
  beforeEach(() => localStorage.clear())

  test("restore url targets the saved remote signer key, not the user key", () => {
    const store = new MultiAccountStore()
    const session = store.loginWithPubkey(
      userKey,
      LoginSessionType.Nip46,
      undefined,
      ["wss://signer.test"],
      new NotEncrypted(clientKey),
      false,
      signerKey,
    )
    const url = new URL(nip46RestoreUrl(session))
    expect(url.protocol).toBe("bunker:")
    expect(url.hostname).toBe(signerKey)
    expect(url.searchParams.getAll("relay")).toEqual(["wss://signer.test"])
  })

  test("remote signer key survives reload", () => {
    const store = new MultiAccountStore()
    store.loginWithPubkey(
      userKey,
      LoginSessionType.Nip46,
      undefined,
      ["wss://signer.test"],
      new NotEncrypted(clientKey),
      false,
      signerKey,
    )
    window.dispatchEvent(new Event("pagehide"))
    const reloaded = new MultiAccountStore()
    const id = reloaded.getSessions()[0].id
    expect(reloaded.get(id)?.remoteSignerPubkey).toBe(signerKey)
  })

  test("sessions saved before the remote key existed fall back to the user key", () => {
    const store = new MultiAccountStore()
    const session = store.loginWithPubkey(
      userKey,
      LoginSessionType.Nip46,
      undefined,
      ["wss://signer.test"],
      new NotEncrypted(clientKey),
    )
    expect(new URL(nip46RestoreUrl(session)).hostname).toBe(userKey)
  })
})
