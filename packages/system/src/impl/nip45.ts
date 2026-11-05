import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js"
import type { RelayCount, ReqFilter } from "../nostr"

const Registers = 256
const HexId = /^[0-9a-f]{64}$/i

export function hllOffset(filter: ReqFilter): number | undefined {
  const key = Object.keys(filter).find(k => k.startsWith("#"))
  if (!key) return undefined
  const first = (filter[key] as Array<string> | undefined)?.[0]
  if (typeof first !== "string") return undefined
  let hex: string
  if (HexId.test(first)) {
    hex = first
  } else {
    const parts = first.split(":")
    if (parts.length >= 3 && HexId.test(parts[1])) {
      hex = parts[1]
    } else {
      hex = bytesToHex(sha256(new TextEncoder().encode(first)))
    }
  }
  return Number.parseInt(hex[32], 16) + 8
}

export class Hll {
  readonly registers: Uint8Array

  constructor(registers?: Uint8Array) {
    if (registers && registers.length !== Registers) {
      throw new Error("HLL must have 256 registers")
    }
    this.registers = registers ? Uint8Array.from(registers) : new Uint8Array(Registers)
  }

  static fromHex(hex: string) {
    return new Hll(hexToBytes(hex))
  }

  static isValidHex(hex: unknown): hex is string {
    return typeof hex === "string" && /^[0-9a-f]{512}$/i.test(hex)
  }

  toHex() {
    return bytesToHex(this.registers)
  }

  /**
   * Apply an event pubkey to the registers, `offset` from {@link hllOffset}
   */
  add(pubkey: string, offset: number) {
    const bytes = hexToBytes(pubkey)
    const ri = bytes[offset]
    let zeros = 0
    for (let i = offset + 1; i < bytes.length; i++) {
      if (bytes[i] === 0) {
        zeros += 8
        continue
      }
      zeros += Math.clz32(bytes[i]) - 24
      break
    }
    const rank = zeros + 1
    if (rank > this.registers[ri]) {
      this.registers[ri] = rank
    }
  }

  merge(other: Hll) {
    for (let i = 0; i < Registers; i++) {
      if (other.registers[i] > this.registers[i]) {
        this.registers[i] = other.registers[i]
      }
    }
    return this
  }

  estimate() {
    const m = Registers
    let sum = 0
    let zeros = 0
    for (const r of this.registers) {
      sum += 2 ** -r
      if (r === 0) zeros++
    }
    const alpha = 0.7213 / (1 + 1.079 / m)
    const raw = (alpha * m * m) / sum
    if (raw <= 2.5 * m && zeros > 0) {
      return Math.round(m * Math.log(m / zeros))
    }
    return Math.round(raw)
  }
}

/**
 * Merge the hll values of per-relay results into one estimate. Relays without a valid hll are ignored.
 * Returns undefined when no relay supplied one.
 */
export function mergeHll(results: Array<Pick<RelayCount, "hll">>): Hll | undefined {
  let merged: Hll | undefined
  for (const r of results) {
    if (!Hll.isValidHex(r.hll)) continue
    const h = Hll.fromHex(r.hll)
    merged = merged ? merged.merge(h) : h
  }
  return merged
}

export interface MergedCount {
  count: number
  approximate: boolean
  hll?: string
  relays: Array<RelayCount>
}

/**
 * Forgiving merge of per-relay counts. HLL values are merged and estimated, exact counts (and the
 * count each HLL relay reported) act as lower bounds, so the result never undercounts a relay.
 */
export function mergeCounts(relays: Array<RelayCount>): MergedCount {
  const merged = mergeHll(relays)
  const lowerBound = relays.reduce((max, r) => Math.max(max, Number.isFinite(r.count) ? r.count : 0), 0)
  if (!merged) {
    return { count: lowerBound, approximate: relays.some(r => r.approximate === true), relays }
  }
  return { count: Math.max(merged.estimate(), lowerBound), approximate: true, hll: merged.toHex(), relays }
}
