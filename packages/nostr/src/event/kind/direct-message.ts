import {
  EventKind,
  EventProps,
  EventId,
  InputEventProps,
  signEvent,
  verifySignature,
} from ".."
import { DeepReadonly, NostrError } from "../../common"
import {
  PublicKey,
  PrivateKey,
  parsePublicKey,
  parsePrivateKey,
  aesEncryptBase64,
  HexOrBechPrivateKey,
  aesDecryptBase64,
  getPublicKey,
} from "../../crypto"
import { EventCommon } from "../common"
import { Delegation, delegationTag, verifyDelegation } from "../delegation"

/**
 * An encrypted direct message event.
 *
 * Related NIPs: NIP-04.
 */
export class DirectMessage extends EventCommon {
  override readonly kind: EventKind.DirectMessage

  constructor(props: EventProps) {
    super(props)
    if (props.kind !== EventKind.DirectMessage) {
      throw new NostrError("invalid event kind")
    }
    this.kind = props.kind
  }

  /**
   * Create an encrypted direct message event.
   */
  static async create(
    opts: DeepReadonly<{
      message: string
      recipient: PublicKey
      previous?: EventId
      base?: InputEventProps
      priv?: PrivateKey
      delegation?: Delegation<string>
    }>
  ): Promise<DirectMessage> {
    const recipient = parsePublicKey(opts.recipient)
    const tags = structuredClone((opts.base?.tags as string[][]) ?? [])

    // The user may not specify any "p" or "e" tags in the base event, since those are
    // reserved for the recipient pubkey and previous event ID.
    if (tags.some((tag) => tag[0] === "p")) {
      throw new NostrError("cannot specify recipient pubkey in base tags")
    }
    if (tags.some((tag) => tag[0] === "e")) {
      throw new NostrError("cannot specify previous event ID in base tags")
    }

    // Build the tags.
    if (opts.delegation !== undefined) {
      tags.push(delegationTag(opts.delegation))
    }
    tags.push(["p", recipient])
    if (opts.previous !== undefined) {
      tags.push(["e", opts.previous])
    }

    let event: EventProps
    if (opts.priv === undefined) {
      // Encrypt the message using window.nostr.nip04.
      if (
        typeof window === "undefined" ||
        window.nostr?.nip04?.encrypt === undefined
      ) {
        throw new NostrError("private key not specified")
      }
      const content = await window.nostr.nip04.encrypt(recipient, opts.message)
      event = await signEvent({
        kind: EventKind.DirectMessage,
        tags,
        content,
        created_at: opts.base?.created_at,
      })
    } else {
      // Encrypt the message using the provided private key.
      const priv = parsePrivateKey(opts.priv)
      const { data, iv } = await aesEncryptBase64(priv, recipient, opts.message)
      event = await signEvent(
        {
          kind: EventKind.DirectMessage,
          tags,
          content: `${data}?iv=${iv}`,
          created_at: opts.base?.created_at,
        },
        priv
      )
    }
    // Verify the delegation for correctness and verify the signature as a sanity check.
    await Promise.all([verifySignature(event), verifyDelegation(event)])
    return new DirectMessage(event)
  }

  /**
   * Get the message plaintext, or undefined if you are not the recipient.
   */
  async getMessage(priv?: HexOrBechPrivateKey): Promise<string | undefined> {
    if (priv !== undefined) {
      priv = parsePrivateKey(priv)
    }
    const [data, iv] = this.content.split("?iv=")
    if (data === undefined || iv === undefined) {
      throw new NostrError(`invalid direct message content ${this.content}`)
    }
    if (priv === undefined) {
      // Decrypt the message using window.nostr.nip04.
      if (
        typeof window === "undefined" ||
        window.nostr?.nip04?.decrypt === undefined
      ) {
        throw new NostrError("private key not specified")
      }
      if ((await window.nostr.getPublicKey()) !== this.recipient) {
        // The message is not intended for this user.
        return undefined
      }
      return await window.nostr.nip04.decrypt(this.pubkey, this.content)
    } else {
      if (getPublicKey(priv) !== this.recipient) {
        // The message is not intended for this user.
        return undefined
      }
      return await aesDecryptBase64(this.pubkey, priv, { data, iv })
    }
  }

  /**
   * Get the recipient pubkey.
   */
  get recipient(): PublicKey {
    const recipientTag = this.tags.find((tag) => tag[0] === "p")
    if (recipientTag?.[1] === undefined) {
      throw new NostrError(
        `expected "p" tag to be present with two elements in event ${JSON.stringify(
          this
        )}`
      )
    }
    return recipientTag[1]
  }

  /**
   * Get the event ID of the previous message.
   */
  get previous(): EventId | undefined {
    const previousTag = this.tags.find((tag) => tag[0] === "e")
    if (previousTag?.[1] === undefined) {
      throw new NostrError(
        `expected "e" tag to be present with two elements in event ${JSON.stringify(
          this
        )}`
      )
    }
    return previousTag[1]
  }
}
