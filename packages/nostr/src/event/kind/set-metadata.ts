import {
  EventKind,
  EventProps,
  InputEventProps,
  signEvent,
  verifySignature,
} from ".."
import { DeepReadonly, NostrError, parseJson } from "../../common"
import { HexOrBechPrivateKey } from "../../crypto"
import { EventCommon } from "../common"
import { Delegation, delegationTag, verifyDelegation } from "../delegation"

export interface UserMetadata {
  name: string
  about: string
  picture: string
  nip05?: string
}

export interface InternetIdentifier {
  name: string
  relays?: string[]
}

export interface VerificationOptions {
  readonly https?: boolean
}

/**
 * Set metadata event. Used for disseminating use profile information.
 *
 * Related NIPs: NIP-01.
 */
export class SetMetadata extends EventCommon {
  override readonly kind: EventKind.SetMetadata

  constructor(event: EventProps) {
    super(event)
    if (event.kind !== EventKind.SetMetadata) {
      throw new NostrError("invalid event kind")
    }
    this.kind = event.kind
  }

  static async create(
    opts: DeepReadonly<{
      userMetadata: UserMetadata
      base?: InputEventProps
      priv?: HexOrBechPrivateKey
      delegation?: Delegation<string>
    }>
  ): Promise<SetMetadata> {
    const tags = structuredClone((opts.base?.tags as string[][]) ?? [])
    if (opts.delegation !== undefined) {
      tags.push(delegationTag(opts.delegation))
    }
    const event = await signEvent(
      {
        kind: EventKind.SetMetadata,
        tags,
        content: JSON.stringify(opts.userMetadata),
        created_at: opts.base?.created_at,
      },
      opts.priv
    )
    // Verify the delegation for correctness and verify the signature as a sanity check.
    await Promise.all([verifySignature(event), verifyDelegation(event)])
    return new SetMetadata(event)
  }

  /**
   * Get the user metadata specified in this event.
   */
  get userMetadata(): UserMetadata {
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

  /**
   * Verify the NIP-05 DNS-based internet identifier associated with the user metadata.
   * Throws if the internet identifier is invalid or fails verification.
   *
   * @param pubkey The public key to use if the event does not specify a pubkey. If the event
   * does specify a pubkey
   * @return The internet identifier. `undefined` if there is no internet identifier.
   *
   * Related NIPs: NIP-05.
   */
  async verifyInternetIdentifier(
    this: SetMetadata,
    opts?: VerificationOptions
  ): Promise<InternetIdentifier | undefined> {
    const metadata = this.userMetadata
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
    // TODO How does this interact with delegation? Instead of using the pubkey field,
    // should it use getAuthor()?
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
}
