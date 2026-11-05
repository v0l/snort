import { describe, expect, test } from "bun:test"
import { bytesToHex } from "@noble/hashes/utils.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { Hll, hllOffset, mergeCounts, mergeHll } from "../src/impl/nip45"

const hex32 = (f: (i: number) => number) => bytesToHex(Uint8Array.from({ length: 32 }, (_, i) => f(i)))
const randomKey = () => bytesToHex(crypto.getRandomValues(new Uint8Array(32)))

describe("NIP-45 HLL", () => {
  test("offset from event id uses char 32 plus 8", () => {
    const id = `${"0".repeat(32)}a${"0".repeat(31)}`
    expect(hllOffset({ kinds: [7], "#e": [id] })).toBe(18)
  })

  test("offset from address uses the pubkey part", () => {
    const pk = `${"0".repeat(32)}3${"0".repeat(31)}`
    expect(hllOffset({ "#a": [`30023:${pk}:slug`] })).toBe(11)
  })

  test("offset from arbitrary string hashes it", () => {
    const h = bytesToHex(sha256(new TextEncoder().encode("hello")))
    expect(hllOffset({ "#t": ["hello"] })).toBe(Number.parseInt(h[32], 16) + 8)
  })

  test("offset undefined without a tag filter", () => {
    expect(hllOffset({ kinds: [1] })).toBeUndefined()
  })

  test("add picks register by offset byte and rank by leading zeros", () => {
    const h = new Hll()
    h.add(hex32(i => (i === 8 ? 5 : i === 9 ? 0x10 : 0xff)), 8)
    expect(h.registers[5]).toBe(4)
    h.add(hex32(i => (i === 8 ? 5 : i === 9 ? 0x80 : 0)), 8)
    expect(h.registers[5]).toBe(4)
    h.add(hex32(i => (i === 8 ? 5 : 0)), 8)
    expect(h.registers[5]).toBe(23 * 8 + 1)
  })

  test("hex round trip is 512 chars and rejects bad length", () => {
    const h = new Hll()
    h.registers[3] = 9
    expect(h.toHex()).toHaveLength(512)
    expect(Hll.fromHex(h.toHex()).registers[3]).toBe(9)
    expect(() => Hll.fromHex("00")).toThrow()
  })

  test("merge takes per-register maximum", () => {
    const a = new Hll()
    const b = new Hll()
    a.registers[0] = 3
    b.registers[0] = 5
    b.registers[1] = 2
    a.merge(b)
    expect([a.registers[0], a.registers[1]]).toEqual([5, 2])
  })

  test("estimate is within 15% for 5000 distinct pubkeys, and merging halves matches the whole", () => {
    const whole = new Hll()
    const a = new Hll()
    const b = new Hll()
    for (let i = 0; i < 5000; i++) {
      const k = randomKey()
      whole.add(k, 10)
      ;(i % 2 ? a : b).add(k, 10)
    }
    const est = whole.estimate()
    expect(Math.abs(est - 5000) / 5000).toBeLessThan(0.15)
    expect(a.merge(b).estimate()).toBe(est)
  })

  test("small cardinalities use linear counting", () => {
    const h = new Hll()
    for (let i = 0; i < 20; i++) h.add(randomKey(), 8)
    expect(Math.abs(h.estimate() - 20)).toBeLessThanOrEqual(3)
    expect(new Hll().estimate()).toBe(0)
  })

  test("mergeHll skips relays without a valid hll", () => {
    const a = new Hll()
    a.registers[7] = 4
    const merged = mergeHll([{ hll: a.toHex() }, {}, { hll: "zz" }])
    expect(merged?.registers[7]).toBe(4)
    expect(mergeHll([{}])).toBeUndefined()
  })
})

describe("mergeCounts", () => {
  const withKeys = (n: number) => {
    const h = new Hll()
    for (let i = 0; i < n; i++) h.add(randomKey(), 10)
    return h
  }

  test("no relays gives zero", () => {
    expect(mergeCounts([])).toEqual({ count: 0, approximate: false, relays: [] })
  })

  test("exact only takes the highest count", () => {
    const m = mergeCounts([
      { relay: "a", count: 10 },
      { relay: "b", count: 14 },
    ])
    expect(m.count).toBe(14)
    expect(m.approximate).toBe(false)
    expect(m.hll).toBeUndefined()
  })

  test("hll relays are merged and estimated", () => {
    const a = withKeys(3000)
    const b = withKeys(3000)
    const m = mergeCounts([
      { relay: "a", count: 3000, hll: a.toHex() },
      { relay: "b", count: 3000, hll: b.toHex() },
    ])
    expect(m.approximate).toBe(true)
    expect(Math.abs(m.count - 6000) / 6000).toBeLessThan(0.15)
    expect(m.hll).toBe(new Hll(a.registers).merge(b).toHex())
  })

  test("mixed exact and hll never undercounts the exact relay", () => {
    const m = mergeCounts([
      { relay: "a", count: 50, hll: withKeys(50).toHex() },
      { relay: "b", count: 9000 },
    ])
    expect(m.count).toBeGreaterThanOrEqual(9000)
    expect(m.approximate).toBe(true)
  })

  test("invalid hll is ignored and its count still used", () => {
    const m = mergeCounts([{ relay: "a", count: 7, hll: "zz" }])
    expect(m.count).toBe(7)
    expect(m.hll).toBeUndefined()
  })
})
