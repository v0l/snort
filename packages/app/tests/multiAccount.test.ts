import { beforeEach, describe, expect, test } from "bun:test"
import { NotEncrypted } from "@snort/system"

import "../src/Utils/Login"
import { MultiAccountStore } from "../src/Utils/Login/MultiAccountStore"

function newKey() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")
}

describe("multi account store", () => {
  beforeEach(() => localStorage.clear())

  test("active account survives reload", () => {
    const store = new MultiAccountStore()
    const a = store.loginWithPrivateKey(new NotEncrypted(newKey()))
    const b = store.loginWithPrivateKey(new NotEncrypted(newKey()))
    expect(store.snapshot().id).toBe(b.id)
    store.switchAccount(a.id)
    const reloaded = new MultiAccountStore()
    expect(reloaded.snapshot().id).toBe(a.id)
    expect(reloaded.getSessions().length).toBe(2)
  })

  test("removing the active account falls back to another and keeps the rest", () => {
    const store = new MultiAccountStore()
    const a = store.loginWithPrivateKey(new NotEncrypted(newKey()))
    const b = store.loginWithPrivateKey(new NotEncrypted(newKey()))
    store.removeSession(b.id)
    expect(store.snapshot().id).toBe(a.id)
    expect(store.getPublisher(b.id)).toBeUndefined()
    const reloaded = new MultiAccountStore()
    expect(reloaded.getSessions().map(s => s.id)).toEqual([a.id])
  })

  test("same pubkey cannot be added twice", () => {
    const key = newKey()
    const store = new MultiAccountStore()
    store.loginWithPrivateKey(new NotEncrypted(key))
    expect(() => store.loginWithPrivateKey(new NotEncrypted(key))).toThrow()
  })
})
