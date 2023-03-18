import { PublicKey } from "../crypto"
import { ProtocolError } from "../error"

export type Relay =
  | {
      url: URL
      readyState: ReadyState.CONNECTING
    }
  | {
      url: URL
      readyState: ReadyState.OPEN
      info: RelayInfo
    }
  | {
      url: URL
      readyState: ReadyState.CLOSED
      /**
       * If the relay is closed before the opening process is fully finished,
       * the relay info may be undefined.
       */
      info?: RelayInfo
    }

/**
 * The information that a relay broadcasts about itself as defined in NIP-11.
 */
export interface RelayInfo {
  name?: string
  description?: string
  pubkey?: PublicKey
  contact?: string
  supported_nips?: number[]
  software?: string
  version?: string
  [key: string]: unknown
}

/**
 * The state of a relay connection.
 */
export enum ReadyState {
  /**
   * The connection has not been established yet.
   */
  CONNECTING = 0,
  /**
   * The connection has been established.
   */
  OPEN = 1,
  /**
   * The connection has been closed, forcefully or gracefully, by either party.
   */
  CLOSED = 2,
}

// TODO Keep in mind this should be part of the public API of the lib
/**
 * Fetch the NIP-11 relay info with some reasonable timeout. Throw an error if
 * the info is invalid.
 */
export async function fetchRelayInfo(url: URL | string): Promise<RelayInfo> {
  url = new URL(url.toString().trim().replace(/^ws/, "http"))
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), 15_000)
  const res = await fetch(url, {
    signal: abort.signal,
    headers: {
      Accept: "application/nostr+json",
    },
  })
  clearTimeout(timeout)
  const info = await res.json()
  // Validate the known fields in the JSON.
  if (info.name !== undefined && typeof info.name !== "string") {
    info.name = undefined
    throw new ProtocolError(
      `invalid relay info, expected "name" to be a string: ${JSON.stringify(
        info
      )}`
    )
  }
  if (info.description !== undefined && typeof info.description !== "string") {
    info.description = undefined
    throw new ProtocolError(
      `invalid relay info, expected "description" to be a string: ${JSON.stringify(
        info
      )}`
    )
  }
  if (info.pubkey !== undefined && typeof info.pubkey !== "string") {
    info.pubkey = undefined
    throw new ProtocolError(
      `invalid relay info, expected "pubkey" to be a string: ${JSON.stringify(
        info
      )}`
    )
  }
  if (info.contact !== undefined && typeof info.contact !== "string") {
    info.contact = undefined
    throw new ProtocolError(
      `invalid relay info, expected "contact" to be a string: ${JSON.stringify(
        info
      )}`
    )
  }
  if (info.supported_nips !== undefined) {
    if (info.supported_nips instanceof Array) {
      if (info.supported_nips.some((e: unknown) => typeof e !== "number")) {
        info.supported_nips = undefined
        throw new ProtocolError(
          `invalid relay info, expected "supported_nips" elements to be numbers: ${JSON.stringify(
            info
          )}`
        )
      }
    } else {
      info.supported_nips = undefined
      throw new ProtocolError(
        `invalid relay info, expected "supported_nips" to be an array: ${JSON.stringify(
          info
        )}`
      )
    }
  }
  if (info.software !== undefined && typeof info.software !== "string") {
    info.software = undefined
    throw new ProtocolError(
      `invalid relay info, expected "software" to be a string: ${JSON.stringify(
        info
      )}`
    )
  }
  if (info.version !== undefined && typeof info.version !== "string") {
    info.version = undefined
    throw new ProtocolError(
      `invalid relay info, expected "version" to be a string: ${JSON.stringify(
        info
      )}`
    )
  }
  return info
}
