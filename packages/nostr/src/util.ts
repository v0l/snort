/**
 * Calculate the unix timestamp (seconds since epoch) of the `Date`.
 */
export function unixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}
