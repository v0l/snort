import { EventKind, RawEvent, signEvent } from "."
import { NostrError, parseJson } from "../common"
import { HexOrBechPrivateKey } from "../crypto"

/**
 * Set metadata event. Used for disseminating use profile information.
 *
 * Related NIPs: NIP-01.
 */
export interface SetMetadata extends RawEvent {
  kind: EventKind.SetMetadata

  /**
   * Get the user metadata specified in this event.
   */
  getUserMetadata(): UserMetadata
  /**
   * Verify the NIP-05 DNS-based internet identifier associated with the user metadata.
   * Throws if the internet identifier is invalid or fails verification.
   * @param pubkey The public key to use if the event does not specify a pubkey. If the event
   * does specify a pubkey
   * @return The internet identifier. `undefined` if there is no internet identifier.
   */
  verifyInternetIdentifier(
    opts?: VerificationOptions
  ): Promise<InternetIdentifier | undefined>
}

export interface UserMetadata {
  name: string
  about: string
  picture: string
  nip05?: string
}

/**
 * Create a set metadata event.
 */
export function createSetMetadata(
  content: UserMetadata,
  priv?: HexOrBechPrivateKey
): Promise<SetMetadata> {
  return signEvent(
    {
      kind: EventKind.SetMetadata,
      tags: [],
      content: JSON.stringify(content),
      getUserMetadata,
      verifyInternetIdentifier,
    },
    priv
  )
}

export function getUserMetadata(this: SetMetadata): UserMetadata {
  const userMetadata = parseJson(this.content)
  if (
    typeof userMetadata.name !== "string" ||
    typeof userMetadata.about !== "string" ||
    typeof userMetadata.picture !== "string"
  ) {
    throw new NostrError(
      `invalid user metadata ${userMetadata} in ${JSON.stringify(this)}`
    )
  }
  return userMetadata
}

export async function verifyInternetIdentifier(
  this: SetMetadata,
  opts?: VerificationOptions
): Promise<InternetIdentifier | undefined> {
  const metadata = this.getUserMetadata()
  if (metadata.nip05 === undefined) {
    return undefined
  }
  const [name, domain] = metadata.nip05.split("@")
  if (
    name === undefined ||
    domain === undefined ||
    !/^[a-zA-Z0-9-_]+$/.test(name)
  ) {
    throw new NostrError(
      `invalid NIP-05 internet identifier: ${metadata.nip05}`
    )
  }
  const res = await fetch(
    `${
      opts?.https === false ? "http" : "https"
    }://${domain}/.well-known/nostr.json?name=${name}`,
    { redirect: "error" }
  )
  const wellKnown = await res.json()
  const pubkey = wellKnown.names?.[name]
  if (pubkey !== this.pubkey) {
    throw new NostrError(
      `invalid NIP-05 internet identifier: ${
        metadata.nip05
      } pubkey does not match, ${JSON.stringify(wellKnown)}`
    )
  }
  const relays = wellKnown.relays?.[pubkey]
  if (
    relays !== undefined &&
    (!(relays instanceof Array) ||
      relays.some((relay) => typeof relay !== "string"))
  ) {
    throw new NostrError(`invalid NIP-05 relays: ${wellKnown}`)
  }
  return {
    name,
    relays,
  }
}

export interface InternetIdentifier {
  name: string
  relays?: string[]
}

export interface VerificationOptions {
  https?: boolean
}
