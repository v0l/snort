import { describe, expect, test } from 'bun:test'
import { InvalidPinError, PinEncrypted } from '../src/encryption/pin-encrypted'

// A valid 32-byte private key (64 hex chars)
const TEST_KEY = '0000000000000000000000000000000000000000000000000000000000000001'
const TEST_PIN = 'correct-pin'
const WRONG_PIN = 'wrong-pin'

describe('PinEncrypted', () => {
  test('roundtrip: create with correct PIN then unlock', async () => {
    const enc = await PinEncrypted.create(TEST_KEY, TEST_PIN)

    // Should be unlocked immediately after create
    expect(enc.shouldUnlock()).toBe(false)
    expect(enc.value).toBe(TEST_KEY)

    // Serialize and restore, then unlock
    const payload = enc.toPayload() as any
    expect(payload.v).toBe(2)

    const restored = new PinEncrypted(payload)
    expect(restored.shouldUnlock()).toBe(true)
    await restored.unlock(TEST_PIN)
    expect(restored.value).toBe(TEST_KEY)
  })

  test('rejects wrong PIN', async () => {
    const enc = await PinEncrypted.create(TEST_KEY, TEST_PIN)
    const payload = enc.toPayload()
    const restored = new PinEncrypted(payload)

    await expect(restored.unlock(WRONG_PIN)).rejects.toBeInstanceOf(InvalidPinError)
  })

  test('rejects tampered ciphertext', async () => {
    const enc = await PinEncrypted.create(TEST_KEY, TEST_PIN)
    const payload = enc.toPayload() as any

    // Flip a byte in the ciphertext
    const ctBytes = Buffer.from(payload.ciphertext, 'base64')
    ctBytes[0] ^= 0xff
    payload.ciphertext = ctBytes.toString('base64')

    const tampered = new PinEncrypted(payload)
    await expect(tampered.unlock(TEST_PIN)).rejects.toBeInstanceOf(InvalidPinError)
  })

  test('rejects tampered nonce (iv)', async () => {
    const enc = await PinEncrypted.create(TEST_KEY, TEST_PIN)
    const payload = enc.toPayload() as any

    const nonceBytes = Buffer.from(payload.iv, 'base64')
    nonceBytes[0] ^= 0xff
    payload.iv = nonceBytes.toString('base64')

    const tampered = new PinEncrypted(payload)
    await expect(tampered.unlock(TEST_PIN)).rejects.toBeInstanceOf(InvalidPinError)
  })

  test('rejects tampered MAC', async () => {
    const enc = await PinEncrypted.create(TEST_KEY, TEST_PIN)
    const payload = enc.toPayload() as any

    const macBytes = Buffer.from(payload.mac, 'base64')
    macBytes[0] ^= 0xff
    payload.mac = macBytes.toString('base64')

    const tampered = new PinEncrypted(payload)
    await expect(tampered.unlock(TEST_PIN)).rejects.toBeInstanceOf(InvalidPinError)
  })

  test('rejects legacy v1 payload (no v field)', async () => {
    const enc = await PinEncrypted.create(TEST_KEY, TEST_PIN)
    const payload = enc.toPayload() as any
    delete payload.v

    const legacy = new PinEncrypted(payload)
    await expect(legacy.unlock(TEST_PIN)).rejects.toBeInstanceOf(InvalidPinError)
  })

  test('create() rejects content that is not 32 bytes', async () => {
    await expect(PinEncrypted.create('deadbeef', TEST_PIN)).rejects.toThrow('32 bytes')
  })

  test('value throws before unlock', () => {
    const enc = new PinEncrypted({ v: 2, salt: '', ciphertext: '', iv: '', mac: '' })
    expect(() => enc.value).toThrow('not been decrypted')
  })
})
