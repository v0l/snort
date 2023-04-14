import {
  EventKind,
  EventProps,
  signEvent,
  InputEventProps,
  verifySignature,
} from ".."
import { DeepReadonly, NostrError } from "../../common"
import { HexOrBechPrivateKey, PublicKey } from "../../crypto"
import { EventCommon } from "../common"
import { Delegation, delegationTag, verifyDelegation } from "../delegation"

/**
 * A contact from the contact list.
 */
export interface Contact {
  pubkey: PublicKey
  relay?: URL
  petname?: string
}

/**
 * Contact list event.
 *
 * Related NIPs: NIP-02.
 */
export class ContactList extends EventCommon {
  override readonly kind: EventKind.ContactList

  constructor(props: EventProps) {
    super(props)
    if (props.kind !== EventKind.ContactList) {
      throw new NostrError("invalid event kind")
    }
    this.kind = props.kind
  }

  /**
   * Create a contact list event.
   */
  static async create(
    opts: DeepReadonly<{
      contacts: Contact[]
      base?: InputEventProps
      priv?: HexOrBechPrivateKey
      delegation?: Delegation<string>
    }>
  ): Promise<ContactList> {
    const tags = structuredClone((opts.base?.tags as string[][]) ?? [])
    if (opts.delegation !== undefined) {
      tags.push(delegationTag(opts.delegation))
    }
    tags.push(
      ...opts.contacts.map((contact) => [
        "p",
        contact.pubkey,
        contact.relay?.toString() ?? "",
        contact.petname ?? "",
      ])
    )
    const base = {
      kind: EventKind.ContactList,
      tags,
      content: opts.base?.content ?? "",
      created_at: opts.base?.created_at,
    }
    const event = new ContactList(await signEvent(base, opts.priv))
    // Verify the delegation for correctness and verify the signature as a sanity check.
    await Promise.all([verifySignature(event), verifyDelegation(event)])
    return event
  }

  /**
   * Get the contacts from the contact list.
   */
  get contacts(): Contact[] {
    return this.tags
      .filter((tags) => tags[0] === "p")
      .map((tags) => {
        // The first element is the pubkey.
        const pubkey = tags[1]
        if (pubkey === undefined) {
          throw new NostrError(
            `missing contact pubkey for contact list event: ${JSON.stringify(
              this
            )}`
          )
        }

        // The second element is the optional relay URL.
        let relay: URL | undefined
        try {
          if (tags[2] !== undefined && tags[2] !== "") {
            relay = new URL(tags[2])
          }
        } catch (e) {
          throw new NostrError(
            `invalid relay URL for contact list event: ${JSON.stringify(this)}`
          )
        }

        // The third element is the optional petname.
        let petname: string | undefined
        if (tags[3] !== undefined && tags[3] !== "") {
          petname = tags[3]
        }

        return {
          pubkey,
          relay,
          petname,
        }
      })
  }
}
