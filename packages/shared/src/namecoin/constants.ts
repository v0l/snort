/** Namecoin protocol constants */

/**
 * Default ElectrumX WebSocket servers for Namecoin.
 *
 * These are public servers that advertise ws:// and wss:// services.
 * The browser connects directly — no backend proxy needed.
 */
export const DEFAULT_ELECTRUMX_SERVERS: ElectrumxWsServer[] = [
  { url: "wss://electrumx.testls.space:50004", label: "testls.space" },
  { url: "ws://electrumx.testls.space:50003", label: "testls.space (plain)" },
]

export interface ElectrumxWsServer {
  /** WebSocket URL (ws:// or wss://) */
  url: string
  /** Human-readable label */
  label: string
}

/** Namecoin names expire after this many blocks without renewal (~250 days) */
export const NAME_EXPIRE_DEPTH = 36_000

/** Cache TTL in ms (5 minutes) */
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000

/** OP codes for Namecoin name scripts */
export const OP_NAME_UPDATE = 0x53
export const OP_2DROP = 0x6d
export const OP_DROP = 0x75
export const OP_RETURN = 0x6a
