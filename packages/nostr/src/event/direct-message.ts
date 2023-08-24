import { EventId, EventKind, RawEvent, signEvent } from "."
import { NostrError } from "../common"
import {
  aesDecryptBase64,
  aesEncryptBase64,
  getPublicKey,
  HexOrBechPrivateKey,
  parsePrivateKey,
  parsePublicKey,
  PrivateKey,
  PublicKey,
} from "../crypto"

/**
 * An encrypted direct message event.
 *
 * Related NIPs: NIP-04.
 */
export interface DirectMessage extends RawEvent {
  kind: EventKind.DirectMessage

  /**
   * Get the message plaintext, or undefined if you are not the recipient.
   */
  getMessage(priv?: HexOrBechPrivateKey): Promise<string | undefined>
  /**
   * Get the recipient pubkey.
   */
  getRecipient(): PublicKey
  /**
   * Get the event ID of the previous message.
   */
  getPrevious(): EventId | undefined
}

// TODO Since you already require the private key, maybe this should return the message already signed?
// With NIP-07 the parameter will be optional, then what?
/**
 * Create an encrypted direct message event.
 */
export async function createDirectMessage(
  {
    message,
    recipient,
  }: {
    message: string
    recipient: PublicKey
  },
  priv?: PrivateKey,
): Promise<DirectMessage> {
  recipient = parsePublicKey(recipient)
  if (priv === undefined) {
    if (
      typeof window === "undefined" ||
      window.nostr?.nip04?.encrypt === undefined
    ) {
      throw new NostrError("private key not specified")
    }
    const content = await window.nostr.nip04.encrypt(recipient, message)
    return await signEvent(
      {
        kind: EventKind.DirectMessage,
        tags: [["p", recipient]],
        content,
        getMessage,
        getRecipient,
        getPrevious,
      },
      priv,
    )
  } else {
    priv = parsePrivateKey(priv)
    const { data, iv } = await aesEncryptBase64(priv, recipient, message)
    return await signEvent(
      {
        kind: EventKind.DirectMessage,
        tags: [["p", recipient]],
        content: `${data}?iv=${iv}`,
        getMessage,
        getRecipient,
        getPrevious,
      },
      priv,
    )
  }
}

export async function getMessage(
  this: DirectMessage,
  priv?: HexOrBechPrivateKey,
): Promise<string | undefined> {
  if (priv !== undefined) {
    priv = parsePrivateKey(priv)
  }
  const [data, iv] = this.content.split("?iv=")
  if (data === undefined || iv === undefined) {
    throw new NostrError(`invalid direct message content ${this.content}`)
  }
  if (priv === undefined) {
    if (
      typeof window === "undefined" ||
      window.nostr?.nip04?.decrypt === undefined
    ) {
      throw new NostrError("private key not specified")
    }
    return await window.nostr.nip04.decrypt(this.pubkey, this.content)
  } else if (getPublicKey(priv) === this.getRecipient()) {
    return await aesDecryptBase64(this.pubkey, priv, { data, iv })
  }
  return undefined
}

export function getRecipient(this: DirectMessage): PublicKey {
  const recipientTag = this.tags.find((tag) => tag[0] === "p")
  if (typeof recipientTag?.[1] !== "string") {
    throw new NostrError(
      `expected "p" tag to be of type string, but got ${recipientTag?.[1]} in ${JSON.stringify(
        this,
      )}`,
    )
  }
  return recipientTag[1]
}

export function getPrevious(this: DirectMessage): EventId | undefined {
  const previousTag = this.tags.find((tag) => tag[0] === "e")
  if (previousTag === undefined) {
    return undefined
  }
  if (typeof previousTag[1] !== "string") {
    throw new NostrError(
      `expected "e" tag to be of type string, but got ${previousTag?.[1]} in ${JSON.stringify(
        this,
      )}`,
    )
  }
  return previousTag[1]
}
