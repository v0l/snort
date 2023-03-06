import { ProtocolError } from "./error"

/**
 * Calculate the unix timestamp (seconds since epoch) of the `Date`.
 */
export function unixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

/**
 * Throw if the parameter is null or undefined. Return the parameter otherwise.
 */
export function defined<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new ProtocolError("bug: unexpected undefined")
  }
  return v
}
