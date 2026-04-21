/**
 * Namecoin NIP-05 Resolution for Snort
 *
 * Resolves Namecoin blockchain names (.bit domains, d/ and id/ namespaces)
 * to Nostr public keys, enabling decentralised NIP-05-style identity
 * verification without relying on HTTP servers.
 *
 * Architecture:
 *   The browser connects directly to ElectrumX servers over WebSocket
 *   (ws:// or wss://) — no backend proxy or middleware needed.
 *   Works as a fully static web app.
 *
 * Ported from Amethyst's Kotlin implementation and Coracle's TypeScript port:
 *   https://github.com/vitorpamplona/amethyst
 *   https://github.com/coracle-social/coracle/pull/662
 *
 * WebSocket approach based on hzrd149/nostrudel#352
 *
 * Copyright (c) 2025 – MIT License
 */

import type { NamecoinNostrResult, ParsedIdentifier, NameShowResult } from "./types"
import { Namespace } from "./types"
import { nameShowWithFallback } from "./electrumx-ws"

// ── Constants ──────────────────────────────────────────────────────────

const HEX_PUBKEY_REGEX = /^[0-9a-fA-F]{64}$/

// ── Identifier Parsing ─────────────────────────────────────────────────

/**
 * Check whether an identifier should be routed to Namecoin
 * resolution rather than standard NIP-05.
 */
export function isNamecoinIdentifier(identifier: string): boolean {
  const normalized = identifier.trim().toLowerCase()
  return (
    normalized.endsWith(".bit") ||
    normalized.startsWith("d/") ||
    normalized.startsWith("id/")
  )
}

/**
 * Parse a user-supplied string into a structured lookup request.
 *
 * Accepted formats:
 *   "alice@example.bit"  → d/example, localPart=alice
 *   "_@example.bit"      → d/example, localPart=_
 *   "example.bit"        → d/example, localPart=_
 *   "d/example"          → d/example, localPart=_
 *   "id/alice"           → id/alice,  localPart=_
 */
export function parseNamecoinIdentifier(raw: string): ParsedIdentifier | null {
  const input = raw.trim()

  // Direct namespace references
  if (input.toLowerCase().startsWith("d/")) {
    return {
      namecoinName: input.toLowerCase(),
      localPart: "_",
      namespace: Namespace.DOMAIN,
    }
  }
  if (input.toLowerCase().startsWith("id/")) {
    return {
      namecoinName: input.toLowerCase(),
      localPart: "_",
      namespace: Namespace.IDENTITY,
    }
  }

  // NIP-05 style: user@domain.bit
  if (input.includes("@") && input.toLowerCase().endsWith(".bit")) {
    const parts = input.split("@", 2)
    if (parts.length !== 2) return null
    const localPart = parts[0].toLowerCase() || "_"
    const domain = parts[1].replace(/\.bit$/i, "").toLowerCase()
    if (!domain) return null
    return {
      namecoinName: `d/${domain}`,
      localPart,
      namespace: Namespace.DOMAIN,
    }
  }

  // Bare domain: example.bit
  if (input.toLowerCase().endsWith(".bit")) {
    const domain = input.replace(/\.bit$/i, "").toLowerCase()
    if (!domain) return null
    return {
      namecoinName: `d/${domain}`,
      localPart: "_",
      namespace: Namespace.DOMAIN,
    }
  }

  return null
}

// ── Value Extraction ───────────────────────────────────────────────────

function isValidPubkey(s: string): boolean {
  return HEX_PUBKEY_REGEX.test(s)
}

function extractRelays(nostrObj: Record<string, any>, pubkey: string): string[] {
  try {
    const relaysMap = nostrObj.relays
    if (!relaysMap || typeof relaysMap !== "object") return []
    const relayArray = relaysMap[pubkey.toLowerCase()] || relaysMap[pubkey]
    if (!Array.isArray(relayArray)) return []
    return relayArray.filter((r: any) => typeof r === "string")
  } catch {
    return []
  }
}

/**
 * Extract Nostr data from a `d/` domain value.
 */
function extractFromDomainValue(
  value: Record<string, any>,
  parsed: ParsedIdentifier,
): NamecoinNostrResult | null {
  const nostrField = value.nostr
  if (nostrField === undefined || nostrField === null) return null

  // Simple form: "nostr": "hex-pubkey"
  if (typeof nostrField === "string") {
    if (parsed.localPart === "_" && isValidPubkey(nostrField)) {
      return {
        pubkey: nostrField.toLowerCase(),
        relays: [],
        namecoinName: parsed.namecoinName,
        localPart: "_",
      }
    }
    if (parsed.localPart !== "_") return null
  }

  // Extended form: "nostr": { "names": {...}, "relays": {...} }
  if (typeof nostrField === "object" && !Array.isArray(nostrField)) {
    const names = nostrField.names
    if (!names || typeof names !== "object") return null

    let resolvedLocalPart: string
    let pubkey: string

    const exactMatch = names[parsed.localPart]
    const rootMatch = names["_"]
    const entries = Object.entries(names)
    const firstEntry = parsed.localPart === "_" && entries.length > 0 ? entries[0] : null

    if (typeof exactMatch === "string" && isValidPubkey(exactMatch)) {
      resolvedLocalPart = parsed.localPart
      pubkey = exactMatch
    } else if (typeof rootMatch === "string" && isValidPubkey(rootMatch)) {
      resolvedLocalPart = "_"
      pubkey = rootMatch
    } else if (firstEntry && typeof firstEntry[1] === "string" && isValidPubkey(firstEntry[1] as string)) {
      resolvedLocalPart = firstEntry[0]
      pubkey = firstEntry[1] as string
    } else {
      return null
    }

    const relays = extractRelays(nostrField, pubkey)
    return {
      pubkey: pubkey.toLowerCase(),
      relays,
      namecoinName: parsed.namecoinName,
      localPart: resolvedLocalPart,
    }
  }

  return null
}

/**
 * Extract Nostr data from an `id/` identity value.
 */
function extractFromIdentityValue(
  value: Record<string, any>,
  parsed: ParsedIdentifier,
): NamecoinNostrResult | null {
  const nostrField = value.nostr
  if (nostrField === undefined || nostrField === null) return null

  if (typeof nostrField === "string") {
    if (isValidPubkey(nostrField)) {
      return {
        pubkey: nostrField.toLowerCase(),
        relays: [],
        namecoinName: parsed.namecoinName,
        localPart: "_",
      }
    }
  }

  if (typeof nostrField === "object" && !Array.isArray(nostrField)) {
    const pubkey = nostrField.pubkey
    if (typeof pubkey === "string" && isValidPubkey(pubkey)) {
      const relays = Array.isArray(nostrField.relays)
        ? nostrField.relays.filter((r: any) => typeof r === "string")
        : []
      return {
        pubkey: pubkey.toLowerCase(),
        relays,
        namecoinName: parsed.namecoinName,
        localPart: "_",
      }
    }
  }

  return null
}

// ── Cache ──────────────────────────────────────────────────────────────

interface CachedResult {
  result: NamecoinNostrResult | null
  timestamp: number
}

const cache = new Map<string, CachedResult>()
const CACHE_TTL_MS = 3_600_000 // 1 hour
const MAX_CACHE_SIZE = 500

function cacheKey(identifier: string): string {
  return identifier.trim().toLowerCase()
}

function getCached(identifier: string): NamecoinNostrResult | null | undefined {
  const key = cacheKey(identifier)
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return undefined
  }
  return entry.result
}

function setCache(identifier: string, result: NamecoinNostrResult | null): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(cacheKey(identifier), { result, timestamp: Date.now() })
}

// ── Main Resolver ──────────────────────────────────────────────────────

async function performLookup(
  parsed: ParsedIdentifier,
): Promise<NamecoinNostrResult | null> {
  try {
    const nameResult = await nameShowWithFallback(parsed.namecoinName)
    if (!nameResult || nameResult.expired) return null

    let valueJson: Record<string, any>
    try {
      valueJson = JSON.parse(nameResult.value)
    } catch {
      return null
    }

    return parsed.namespace === Namespace.DOMAIN
      ? extractFromDomainValue(valueJson, parsed)
      : extractFromIdentityValue(valueJson, parsed)
  } catch {
    return null
  }
}

/**
 * Resolve a user-supplied identifier to a Nostr pubkey via Namecoin.
 *
 * Connects directly to ElectrumX via WebSocket from the browser.
 * No backend proxy or middleware required.
 *
 * @param identifier User input, e.g. "alice@example.bit", "id/alice", "example.bit"
 * @param _proxyUrl Deprecated — ignored. Kept for API compatibility.
 * @param timeoutMs Maximum time to wait
 */
export async function resolveNamecoin(
  identifier: string,
  _proxyUrl?: string,
  timeoutMs = 20_000,
): Promise<NamecoinNostrResult | null> {
  const parsed = parseNamecoinIdentifier(identifier)
  if (!parsed) return null

  return Promise.race([
    performLookup(parsed),
    new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

/**
 * Resolve a Namecoin identifier to a Nostr pubkey (with caching).
 */
export async function resolveNamecoinCached(
  identifier: string,
  _proxyUrl?: string,
): Promise<NamecoinNostrResult | null> {
  const cached = getCached(identifier)
  if (cached !== undefined) return cached

  const result = await resolveNamecoin(identifier)
  setCache(identifier, result)
  return result
}

/**
 * Verify that a Namecoin name maps to the expected pubkey.
 * Used as a drop-in alongside fetchNip05PubkeyWithThrow.
 */
export async function verifyNamecoinNip05(
  nip05Address: string,
  expectedPubkeyHex: string,
  _proxyUrl?: string,
): Promise<boolean> {
  if (!isNamecoinIdentifier(nip05Address)) return false
  const result = await resolveNamecoinCached(nip05Address)
  if (!result) return false
  return result.pubkey.toLowerCase() === expectedPubkeyHex.toLowerCase()
}

/**
 * Fetch a Namecoin NIP-05 pubkey, throwing on failure.
 * Compatible signature with fetchNip05PubkeyWithThrow.
 */
export async function fetchNamecoinNip05Pubkey(
  name: string,
  domain: string,
): Promise<string> {
  const identifier = name === "_" ? domain : `${name}@${domain}`
  const result = await resolveNamecoinCached(identifier)
  if (!result) {
    throw new Error(`Namecoin: name not found for ${identifier}`)
  }
  return result.pubkey
}

/**
 * Fetch Namecoin NIP-05 as a NostrJson-compatible object.
 */
export async function fetchNamecoinNostrAddress(
  name: string,
  domain: string,
): Promise<{ names: Record<string, string>; relays?: Record<string, string[]> } | null> {
  const identifier = name === "_" ? domain : `${name}@${domain}`
  const result = await resolveNamecoinCached(identifier)
  if (!result) return null

  const names: Record<string, string> = {}
  names[result.localPart === "_" ? name : result.localPart] = result.pubkey
  const relays: Record<string, string[]> = {}
  if (result.relays.length > 0) {
    relays[result.pubkey] = result.relays
  }

  return { names, relays: Object.keys(relays).length > 0 ? relays : undefined }
}
