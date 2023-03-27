/**
 * A UNIX timestamp.
 */
export type Timestamp = number

/**
 * Calculate the unix timestamp (seconds since epoch) of the `Date`. If no date is specified,
 * return the current unix timestamp.
 */
export function unixTimestamp(date?: Date): Timestamp {
  return Math.floor((date ?? new Date()).getTime() / 1000)
}

/**
 * Throw if the parameter is null or undefined. Return the parameter otherwise.
 */
export function defined<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new NostrError("bug: unexpected undefined")
  }
  return v
}

/**
 * The error thrown by this library.
 */
export class NostrError extends Error {
  constructor(message?: string) {
    super(message)
  }
}
