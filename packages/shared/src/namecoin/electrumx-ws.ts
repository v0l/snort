/**
 * Browser-native ElectrumX WebSocket client for Namecoin name resolution.
 *
 * Connects directly from the browser to ElectrumX servers over WebSocket
 * (ws:// or wss://) — no backend proxy or server-side code needed.
 *
 * Protocol: JSON-RPC 1.0 over WebSocket text frames (newline-delimited).
 * ElectrumX 1.16.0+ with websockets support required on the server side.
 *
 * Resolution strategy:
 * 1. Build a canonical name index script for the identifier
 * 2. Compute the Electrum-style scripthash (reversed SHA-256)
 * 3. Query blockchain.scripthash.get_history to find the latest tx
 * 4. Fetch the verbose transaction and parse the name value from the script
 * 5. Check current block height for name expiry
 *
 * Based on the approach from hzrd149/nostrudel#352
 */

import {
  OP_NAME_UPDATE,
  OP_2DROP,
  OP_DROP,
  OP_RETURN,
  NAME_EXPIRE_DEPTH,
  DEFAULT_ELECTRUMX_SERVERS,
  type ElectrumxWsServer,
} from "./constants"

import type { NameShowResult } from "./types"

// ── Crypto helpers (Web Crypto API) ─────────────────────────────────

/** SHA-256 hash using the browser's Web Crypto API */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hash)
}

/** Convert Uint8Array to hex string */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Convert hex string to Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const len = hex.length
  const arr = new Uint8Array(len / 2)
  for (let i = 0; i < len; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return arr
}

// ── Script building ─────────────────────────────────────────────────

/** Bitcoin-style push data encoding */
function pushData(data: Uint8Array): Uint8Array {
  const len = data.length
  if (len === 0) {
    return new Uint8Array([0x00])
  }
  if (len < 0x4c) {
    const result = new Uint8Array(1 + len)
    result[0] = len
    result.set(data, 1)
    return result
  }
  if (len <= 0xff) {
    const result = new Uint8Array(2 + len)
    result[0] = 0x4c
    result[1] = len
    result.set(data, 2)
    return result
  }
  const result = new Uint8Array(3 + len)
  result[0] = 0x4d
  result[1] = len & 0xff
  result[2] = (len >> 8) & 0xff
  result.set(data, 3)
  return result
}

/**
 * Build the canonical name index script for ElectrumX lookup.
 *
 * Format: OP_NAME_UPDATE <push(name)> <push(empty)> OP_2DROP OP_DROP OP_RETURN
 */
function buildNameIndexScript(nameBytes: Uint8Array): Uint8Array {
  const namePush = pushData(nameBytes)
  const emptyPush = pushData(new Uint8Array(0))

  const result = new Uint8Array(1 + namePush.length + emptyPush.length + 3)
  let offset = 0
  result[offset++] = OP_NAME_UPDATE
  result.set(namePush, offset)
  offset += namePush.length
  result.set(emptyPush, offset)
  offset += emptyPush.length
  result[offset++] = OP_2DROP
  result[offset++] = OP_DROP
  result[offset++] = OP_RETURN

  return result
}

/**
 * Compute the Electrum-style scripthash: SHA-256 of the script, byte-reversed, hex-encoded.
 */
async function electrumScripthash(script: Uint8Array): Promise<string> {
  const hash = await sha256(script)
  hash.reverse()
  return toHex(hash)
}

// ── Transaction parsing ─────────────────────────────────────────────

/** Read a push-data encoded byte sequence from script at pos */
function readPushData(script: Uint8Array, pos: number): { data: Uint8Array; next: number } | null {
  if (pos >= script.length) return null
  const opcode = script[pos]

  if (opcode === 0x00) {
    return { data: new Uint8Array(0), next: pos + 1 }
  }
  if (opcode >= 0x01 && opcode <= 0x4b) {
    const end = pos + 1 + opcode
    if (end > script.length) return null
    return { data: script.slice(pos + 1, end), next: end }
  }
  if (opcode === 0x4c) {
    if (pos + 2 > script.length) return null
    const len = script[pos + 1]
    const end = pos + 2 + len
    if (end > script.length) return null
    return { data: script.slice(pos + 2, end), next: end }
  }
  if (opcode === 0x4d) {
    if (pos + 3 > script.length) return null
    const len = script[pos + 1] | (script[pos + 2] << 8)
    const end = pos + 3 + len
    if (end > script.length) return null
    return { data: script.slice(pos + 3, end), next: end }
  }
  return null
}

// ── Verbose tx types ────────────────────────────────────────────────

interface HistoryEntry {
  tx_hash: string
  height: number
}

interface VerboseTxVout {
  scriptPubKey?: { hex?: string; asm?: string }
}

interface VerboseTxResult {
  vout?: VerboseTxVout[]
}

interface RpcResponse {
  jsonrpc?: string
  id: number
  result?: unknown
  error?: { code: number; message: string }
}

/** Parse NAME_UPDATE name and value from a verbose transaction response */
function parseNameFromVerboseTx(
  txResult: VerboseTxResult,
  expectedName: string,
): { name: string; value: string } | null {
  const nameBytes = new TextEncoder().encode(expectedName)

  for (const vout of txResult.vout || []) {
    const hex = vout.scriptPubKey?.hex
    if (!hex || !hex.startsWith("53")) continue

    const script = hexToBytes(hex)
    if (script[0] !== OP_NAME_UPDATE) continue

    const nameParsed = readPushData(script, 1)
    if (!nameParsed) continue

    if (nameParsed.data.length !== nameBytes.length) continue
    let match = true
    for (let i = 0; i < nameBytes.length; i++) {
      if (nameParsed.data[i] !== nameBytes[i]) {
        match = false
        break
      }
    }
    if (!match) continue

    const valueParsed = readPushData(script, nameParsed.next)
    if (!valueParsed) continue

    const name = new TextDecoder("ascii").decode(nameParsed.data)
    const value = new TextDecoder("utf-8").decode(valueParsed.data)
    return { name, value }
  }
  return null
}

// ── WebSocket JSON-RPC client ───────────────────────────────────────

/**
 * Batch multiple JSON-RPC calls over a single WebSocket connection.
 * Sends requests sequentially, keeps the socket open until all are done.
 */
function wsRpcBatch(
  url: string,
  calls: Array<{ method: string; params: unknown[] }>,
  timeoutMs = 20_000,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    let settled = false
    const results: unknown[] = []
    let callIndex = 0
    const ws = new WebSocket(url)
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.close()
        reject(new Error(`WebSocket batch timeout after ${timeoutMs}ms`))
      }
    }, timeoutMs)

    ws.addEventListener("open", () => {
      sendNext()
    })

    function sendNext() {
      if (callIndex >= calls.length) return
      const { method, params } = calls[callIndex]
      ws.send(JSON.stringify({ jsonrpc: "2.0", method, params, id: callIndex + 1 }) + "\n")
    }

    ws.addEventListener("message", ev => {
      if (settled) return
      try {
        const data = typeof ev.data === "string" ? ev.data : String(ev.data)
        const msg: RpcResponse = JSON.parse(data.trim())
        if (msg.error) {
          settled = true
          clearTimeout(timer)
          ws.close()
          reject(new Error(msg.error.message || `RPC error ${msg.error.code}`))
          return
        }
        results.push(msg.result)
        callIndex++
        if (callIndex >= calls.length) {
          settled = true
          clearTimeout(timer)
          ws.close()
          resolve(results)
        } else {
          sendNext()
        }
      } catch (err) {
        settled = true
        clearTimeout(timer)
        ws.close()
        reject(err)
      }
    })

    ws.addEventListener("error", () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(new Error(`WebSocket connection failed: ${url}`))
      }
    })

    ws.addEventListener("close", ev => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(new Error(`WebSocket closed unexpectedly: code=${ev.code}`))
      }
    })
  })
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Resolve a Namecoin name via WebSocket to an ElectrumX server.
 *
 * Connects directly from the browser — no proxy needed.
 * Uses a single WebSocket connection for all RPCs in the lookup sequence.
 *
 * @param fullName  The Namecoin name, e.g. "d/example" or "id/alice"
 * @param serverUrl WebSocket URL of the ElectrumX server
 * @returns NameShowResult if found, null if the name doesn't exist
 */
export async function nameShowWs(
  fullName: string,
  serverUrl?: string,
): Promise<NameShowResult | null> {
  const url = serverUrl || DEFAULT_ELECTRUMX_SERVERS[0].url

  // 1. Compute scripthash
  const nameBytes = new TextEncoder().encode(fullName)
  const script = buildNameIndexScript(nameBytes)
  const scripthash = await electrumScripthash(script)

  // 2. Negotiate version + get history in one connection
  const batch1Results = (await wsRpcBatch(url, [
    { method: "server.version", params: ["Snort/0.1", "1.4"] },
    { method: "blockchain.scripthash.get_history", params: [scripthash] },
  ])) as [unknown, HistoryEntry[]]

  const history = batch1Results[1]
  if (!history || !history.length) return null

  // 3. Get latest transaction + current block height
  const latest = history.reduce((a, b) => (a.height > b.height ? a : b))

  const batch2Results = (await wsRpcBatch(url, [
    { method: "blockchain.transaction.get", params: [latest.tx_hash, true] },
    { method: "blockchain.headers.subscribe", params: [] },
  ])) as [VerboseTxResult, { height?: number; block_height?: number }]

  const txResult = batch2Results[0]
  const headersResult = batch2Results[1]
  const currentHeight = headersResult?.height || headersResult?.block_height || 0

  // 4. Check expiry
  const expired =
    currentHeight > 0 && latest.height > 0 && currentHeight - latest.height >= NAME_EXPIRE_DEPTH
  if (expired) {
    return {
      name: fullName,
      value: "",
      txid: latest.tx_hash,
      height: latest.height,
      expired: true,
      expiresIn: 0,
    }
  }

  // 5. Parse name value from transaction
  const parsed = parseNameFromVerboseTx(txResult, fullName)
  if (!parsed) return null

  const expiresIn =
    currentHeight > 0 && latest.height > 0
      ? NAME_EXPIRE_DEPTH - (currentHeight - latest.height)
      : undefined

  return {
    name: parsed.name,
    value: parsed.value,
    txid: latest.tx_hash,
    height: latest.height,
    expired: false,
    expiresIn,
  }
}

/**
 * Try multiple servers in order until one succeeds.
 */
export async function nameShowWithFallback(
  fullName: string,
  servers?: ElectrumxWsServer[],
): Promise<NameShowResult | null> {
  const serverList = servers || DEFAULT_ELECTRUMX_SERVERS
  let lastError: Error | null = null

  for (const server of serverList) {
    try {
      return await nameShowWs(fullName, server.url)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[Namecoin] Server ${server.label} failed:`, lastError.message)
    }
  }

  throw lastError || new Error("All ElectrumX servers unreachable")
}
