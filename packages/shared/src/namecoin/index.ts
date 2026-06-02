/**
 * Namecoin NIP-05 identity resolution — barrel exports.
 *
 * Re-exports everything that was previously exported from the
 * flat `namecoin.ts` module, so existing imports continue to work.
 */

// Types
export type { NamecoinNostrResult, NameShowResult, NamecoinSettings, ParsedIdentifier } from "./types"
export { Namespace } from "./types"

// Constants
export {
  DEFAULT_ELECTRUMX_SERVERS,
  NAME_EXPIRE_DEPTH,
  DEFAULT_CACHE_TTL,
  OP_NAME_UPDATE,
  OP_2DROP,
  OP_DROP,
  OP_RETURN,
  type ElectrumxWsServer,
} from "./constants"

// Resolver (main public API)
export {
  isNamecoinIdentifier,
  parseNamecoinIdentifier,
  resolveNamecoin,
  resolveNamecoinCached,
  verifyNamecoinNip05,
  fetchNamecoinNip05Pubkey,
  fetchNamecoinNostrAddress,
} from "./resolver"

// WebSocket client
export { nameShowWs, nameShowWithFallback } from "./electrumx-ws"
