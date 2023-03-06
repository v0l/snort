// TODO Rename to NostrError and move to util.ts, always throw NostrError and never throw Error
/**
 * An error in the protocol. This error is thrown when a relay sends invalid or
 * unexpected data, or otherwise behaves in an unexpected way.
 */
export class ProtocolError extends Error {
  constructor(message?: string) {
    super(message)
  }
}
