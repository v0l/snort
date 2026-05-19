/**
 * Tests for the Namecoin NIP-05 resolver.
 *
 * Pure unit tests for identifier parsing and value extraction logic
 * — no network access required. Mirrors test cases from Amethyst's
 * NamecoinNameResolverTest.kt and the Coracle PR #662.
 */
import { describe, it, expect } from "vitest"
import { isNamecoinIdentifier, parseNamecoinIdentifier } from "./index"

// ── isNamecoinIdentifier ───────────────────────────────────────────────

describe("isNamecoinIdentifier", () => {
  it("recognizes dot-bit domains", () => {
    expect(isNamecoinIdentifier("example.bit")).toBe(true)
    expect(isNamecoinIdentifier("alice@example.bit")).toBe(true)
    expect(isNamecoinIdentifier("_@example.bit")).toBe(true)
    expect(isNamecoinIdentifier("EXAMPLE.BIT")).toBe(true)
  })

  it("recognizes d/ names", () => {
    expect(isNamecoinIdentifier("d/example")).toBe(true)
    expect(isNamecoinIdentifier("D/Example")).toBe(true)
  })

  it("recognizes id/ names", () => {
    expect(isNamecoinIdentifier("id/alice")).toBe(true)
    expect(isNamecoinIdentifier("ID/Alice")).toBe(true)
  })

  it("rejects non-namecoin identifiers", () => {
    expect(isNamecoinIdentifier("alice@example.com")).toBe(false)
    expect(isNamecoinIdentifier("npub1abc")).toBe(false)
    expect(isNamecoinIdentifier("some random text")).toBe(false)
    expect(isNamecoinIdentifier("")).toBe(false)
  })
})

// ── parseNamecoinIdentifier ────────────────────────────────────────────

describe("parseNamecoinIdentifier", () => {
  it("parses alice@example.bit", () => {
    const result = parseNamecoinIdentifier("alice@example.bit")
    expect(result).not.toBeNull()
    expect(result!.namecoinName).toBe("d/example")
    expect(result!.localPart).toBe("alice")
  })

  it("parses _@example.bit as root", () => {
    const result = parseNamecoinIdentifier("_@example.bit")
    expect(result).not.toBeNull()
    expect(result!.namecoinName).toBe("d/example")
    expect(result!.localPart).toBe("_")
  })

  it("parses bare example.bit as root", () => {
    const result = parseNamecoinIdentifier("example.bit")
    expect(result).not.toBeNull()
    expect(result!.namecoinName).toBe("d/example")
    expect(result!.localPart).toBe("_")
  })

  it("parses d/example", () => {
    const result = parseNamecoinIdentifier("d/example")
    expect(result).not.toBeNull()
    expect(result!.namecoinName).toBe("d/example")
    expect(result!.localPart).toBe("_")
  })

  it("parses id/alice", () => {
    const result = parseNamecoinIdentifier("id/alice")
    expect(result).not.toBeNull()
    expect(result!.namecoinName).toBe("id/alice")
    expect(result!.localPart).toBe("_")
  })

  it("returns null for non-namecoin identifiers", () => {
    expect(parseNamecoinIdentifier("alice@example.com")).toBeNull()
    expect(parseNamecoinIdentifier("npub1abc")).toBeNull()
    expect(parseNamecoinIdentifier("")).toBeNull()
  })

  it("handles case-insensitivity", () => {
    const result = parseNamecoinIdentifier("Alice@EXAMPLE.BIT")
    expect(result).not.toBeNull()
    expect(result!.namecoinName).toBe("d/example")
    expect(result!.localPart).toBe("alice")
  })
})

// ── Value extraction (internal logic tested via helper) ─────────────────

/**
 * Helper: directly test value parsing without network access.
 */
function extractNostrFromValue(
  jsonValue: string,
  localPart: string,
): { pubkey: string; relays: string[]; localPart: string } | null {
  let obj: Record<string, any>
  try {
    obj = JSON.parse(jsonValue)
  } catch {
    return null
  }

  const nostrField = obj.nostr
  if (nostrField === undefined || nostrField === null) return null

  const HEX_PUBKEY_REGEX = /^[0-9a-fA-F]{64}$/

  // Simple form
  if (typeof nostrField === "string") {
    if (localPart === "_" && HEX_PUBKEY_REGEX.test(nostrField)) {
      return { pubkey: nostrField.toLowerCase(), relays: [], localPart: "_" }
    }
    return null
  }

  // Extended form
  if (typeof nostrField === "object" && !Array.isArray(nostrField)) {
    const names = nostrField.names
    if (!names || typeof names !== "object") return null

    let resolvedLocalPart: string
    let pubkey: string

    const exactMatch = names[localPart]
    const rootMatch = names["_"]
    const entries = Object.entries(names)
    const firstEntry = localPart === "_" && entries.length > 0 ? entries[0] : null

    if (typeof exactMatch === "string" && HEX_PUBKEY_REGEX.test(exactMatch)) {
      resolvedLocalPart = localPart
      pubkey = exactMatch
    } else if (typeof rootMatch === "string" && HEX_PUBKEY_REGEX.test(rootMatch)) {
      resolvedLocalPart = "_"
      pubkey = rootMatch
    } else if (firstEntry && typeof firstEntry[1] === "string" && HEX_PUBKEY_REGEX.test(firstEntry[1])) {
      resolvedLocalPart = firstEntry[0]
      pubkey = firstEntry[1] as string
    } else {
      return null
    }

    let relays: string[] = []
    try {
      const relaysMap = nostrField.relays
      if (relaysMap && typeof relaysMap === "object") {
        const relayArray = relaysMap[pubkey.toLowerCase()] || relaysMap[pubkey]
        if (Array.isArray(relayArray)) {
          relays = relayArray.filter((r: any) => typeof r === "string")
        }
      }
    } catch {
      // ignore
    }

    return { pubkey: pubkey.toLowerCase(), relays, localPart: resolvedLocalPart }
  }

  return null
}

function extractNostrFromIdentityValue(
  jsonValue: string,
): { pubkey: string; relays: string[] } | null {
  let obj: Record<string, any>
  try {
    obj = JSON.parse(jsonValue)
  } catch {
    return null
  }

  const nostrField = obj.nostr
  if (nostrField === undefined || nostrField === null) return null

  const HEX_PUBKEY_REGEX = /^[0-9a-fA-F]{64}$/

  if (typeof nostrField === "string") {
    if (HEX_PUBKEY_REGEX.test(nostrField)) {
      return { pubkey: nostrField.toLowerCase(), relays: [] }
    }
  }

  if (typeof nostrField === "object" && !Array.isArray(nostrField)) {
    const pubkey = nostrField.pubkey
    if (typeof pubkey === "string" && HEX_PUBKEY_REGEX.test(pubkey)) {
      const relays = Array.isArray(nostrField.relays)
        ? nostrField.relays.filter((r: any) => typeof r === "string")
        : []
      return { pubkey: pubkey.toLowerCase(), relays }
    }
  }

  return null
}

// ── Value format: simple pubkey in d/ ──────────────────────────────────

describe("Domain value parsing (d/ namespace)", () => {
  it("parses simple nostr field from domain value", () => {
    const value = `{"nostr":"b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"}`
    const result = extractNostrFromValue(value, "_")
    expect(result).not.toBeNull()
    expect(result!.pubkey).toBe(
      "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    )
  })

  it("parses extended nostr names from domain value", () => {
    const value = JSON.stringify({
      nostr: {
        names: {
          _: "aaaa000000000000000000000000000000000000000000000000000000000001",
          alice: "bbbb000000000000000000000000000000000000000000000000000000000002",
        },
        relays: {
          bbbb000000000000000000000000000000000000000000000000000000000002: [
            "wss://relay.example.com",
          ],
        },
      },
    })

    // Root lookup
    const rootResult = extractNostrFromValue(value, "_")
    expect(rootResult).not.toBeNull()
    expect(rootResult!.pubkey).toBe(
      "aaaa000000000000000000000000000000000000000000000000000000000001",
    )

    // Named lookup
    const aliceResult = extractNostrFromValue(value, "alice")
    expect(aliceResult).not.toBeNull()
    expect(aliceResult!.pubkey).toBe(
      "bbbb000000000000000000000000000000000000000000000000000000000002",
    )
    expect(aliceResult!.relays).toEqual(["wss://relay.example.com"])
  })

  it("rejects missing nostr field", () => {
    expect(extractNostrFromValue(`{"ip": "1.2.3.4"}`, "_")).toBeNull()
  })

  it("rejects invalid pubkey", () => {
    expect(extractNostrFromValue(`{"nostr": "not-a-pubkey"}`, "_")).toBeNull()
  })

  it("rejects non-root localPart with simple string form", () => {
    const value = `{"nostr":"b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"}`
    expect(extractNostrFromValue(value, "alice")).toBeNull()
  })
})

// ── Value format: id/ namespace ────────────────────────────────────────

describe("Identity value parsing (id/ namespace)", () => {
  it("parses simple nostr pubkey", () => {
    const value = `{"nostr":"b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"}`
    const result = extractNostrFromIdentityValue(value)
    expect(result).not.toBeNull()
    expect(result!.pubkey).toBe(
      "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    )
  })

  it("parses object form with pubkey and relays", () => {
    const value = JSON.stringify({
      nostr: {
        pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
        relays: ["wss://relay1.example.com", "wss://relay2.example.com"],
      },
    })
    const result = extractNostrFromIdentityValue(value)
    expect(result).not.toBeNull()
    expect(result!.pubkey).toBe(
      "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    )
    expect(result!.relays).toEqual(["wss://relay1.example.com", "wss://relay2.example.com"])
  })

  it("rejects invalid JSON", () => {
    expect(extractNostrFromIdentityValue("not json")).toBeNull()
  })

  it("rejects missing nostr field", () => {
    expect(extractNostrFromIdentityValue(`{"name": "alice"}`)).toBeNull()
  })
})
