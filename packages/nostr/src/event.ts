import {
  PublicKey,
  PrivateKey,
  sha256,
  schnorrSign,
  schnorrVerify,
  parsePublicKey,
  aesDecryptBase64,
  getPublicKey,
  HexOrBechPrivateKey,
  parsePrivateKey,
  aesEncryptBase64,
} from "./crypto"
import { defined, Timestamp, unixTimestamp, NostrError } from "./common"

// TODO Add remaining event types

export enum EventKind {
  SetMetadata = 0, // NIP-01
  TextNote = 1, // NIP-01
  RecommendServer = 2, // NIP-01
  ContactList = 3, // NIP-02
  DirectMessage = 4, // NIP-04
  Deletion = 5, // NIP-09
  Repost = 6, // NIP-18
  Reaction = 7, // NIP-25
  Relays = 10002, // NIP-65
  Auth = 22242, // NIP-42
  PubkeyLists = 30000, // NIP-51a
  NoteLists = 30001, // NIP-51b
  TagLists = 30002, // NIP-51c
  ZapRequest = 9734, // NIP 57
  ZapReceipt = 9735, // NIP 57
}

/**
 * A nostr event in the format that's sent across the wire.
 */
export interface RawEvent {
  id: string
  pubkey: PublicKey
  created_at: Timestamp
  kind: EventKind
  tags: string[][]
  content: string
  sig: string

  [key: string]: unknown
}

interface SetMetadata extends RawEvent {
  kind: EventKind.SetMetadata

  /**
   * Get the user metadata specified in this event.
   */
  getUserMetadata(): UserMetadata
}

export interface TextNote extends RawEvent {
  kind: EventKind.TextNote
}

interface DirectMessage extends RawEvent {
  kind: EventKind.DirectMessage

  /**
   * Get the message plaintext, or undefined if this client is not the recipient.
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

export interface Unknown extends RawEvent {
  kind: Exclude<
    EventKind,
    EventKind.SetMetadata | EventKind.TextNote | EventKind.DirectMessage
  >
}

export type Event = SetMetadata | TextNote | DirectMessage | Unknown

export interface UserMetadata {
  name: string
  about: string
  picture: string
}

/**
 * Event ID encoded as hex.
 */
export type EventId = string

/**
 * An unsigned event.
 */
export type Unsigned<T extends Event | RawEvent> = {
  [Property in keyof UnsignedWithPubkey<T> as Exclude<
    Property,
    "pubkey"
  >]: T[Property]
} & {
  pubkey?: PublicKey
}

/**
 * Same as @see {@link Unsigned}, but with the pubkey field.
 */
type UnsignedWithPubkey<T extends Event | RawEvent> = {
  [Property in keyof T as Exclude<
    Property,
    "id" | "sig" | "created_at"
  >]: T[Property]
} & {
  id?: EventId
  sig?: string
  created_at?: number
}

/**
 * Add the "id," "sig," and "pubkey" fields to the event. Set "created_at" to the current timestamp
 * if missing. Return the event.
 */
export async function signEvent<T extends Event | RawEvent>(
  event: Unsigned<T>,
  priv?: HexOrBechPrivateKey
): Promise<T> {
  event.created_at ??= unixTimestamp()
  if (priv !== undefined) {
    priv = parsePrivateKey(priv)
    event.pubkey = getPublicKey(priv)
    const id = await serializeEventId(
      // This conversion is safe because the pubkey field is set above.
      event as unknown as UnsignedWithPubkey<T>
    )
    event.id = id
    event.sig = await schnorrSign(id, priv)
    return event as T
  } else {
    // TODO Try to use NIP-07, otherwise throw
    throw new NostrError("todo")
  }
}

export function createTextNote(content: string): Unsigned<TextNote> {
  return {
    kind: EventKind.TextNote,
    tags: [],
    content,
  }
}

export function createSetMetadata(
  content: UserMetadata
): Unsigned<SetMetadata> {
  return {
    kind: EventKind.SetMetadata,
    tags: [],
    content: JSON.stringify(content),
    getUserMetadata,
  }
}

// TODO This is incomplete
// TODO Since you already have the private key, maybe this should return the message already signed?
// Think about this more
// Perhaps the best option is for all these factory methods to have an overload which also accept a private
// key as last parameter and return the event already signed, whereas for this method that would be
// mandatory
// E.g. opts: { sign?: boolean | HexOrBechPrivateKey } setting sign to true should use nip07
export async function createDirectMessage({
  message,
  recipient,
  priv,
}: {
  message: string
  recipient: PublicKey
  priv: PrivateKey
}): Promise<Unsigned<DirectMessage>> {
  recipient = parsePublicKey(recipient)
  priv = parsePrivateKey(priv)
  const { data, iv } = await aesEncryptBase64(priv, recipient, message)
  return {
    kind: EventKind.DirectMessage,
    tags: [["p", recipient]],
    content: `${data}?iv=${iv}`,
    getMessage,
    getRecipient,
    getPrevious,
  }
}

/**
 * Parse an event from its raw format.
 */
export async function parseEvent(event: RawEvent): Promise<Event> {
  // TODO Validate all the fields. Lowercase hex fields, etc. Make sure everything is correct.
  if (event.id !== (await serializeEventId(event))) {
    throw new NostrError(
      `invalid id ${event.id} for event ${JSON.stringify(
        event
      )}, expected ${await serializeEventId(event)}`
    )
  }
  if (!(await schnorrVerify(event.sig, event.id, event.pubkey))) {
    throw new NostrError(`invalid signature for event ${JSON.stringify(event)}`)
  }

  if (event.kind === EventKind.TextNote) {
    return {
      ...event,
      kind: EventKind.TextNote,
    }
  }

  if (event.kind === EventKind.SetMetadata) {
    return {
      ...event,
      kind: EventKind.SetMetadata,
      getUserMetadata,
    }
  }

  if (event.kind === EventKind.DirectMessage) {
    return {
      ...event,
      kind: EventKind.DirectMessage,
      getMessage,
      getRecipient,
      getPrevious,
    }
  }

  return {
    ...event,
    kind: event.kind,
  }
}

async function serializeEventId(
  event: UnsignedWithPubkey<RawEvent>
): Promise<EventId> {
  // It's not defined whether JSON.stringify produces a string with whitespace stripped.
  // Building the JSON string manually as follows ensures that there's no whitespace.
  // In hindsight using JSON as a data format for hashing and signing is not the best
  // design decision.
  const serializedTags = `[${event.tags
    .map((tag) => `[${tag.map((v) => `"${v}"`).join(",")}]`)
    .join(",")}]`
  const serialized = `[0,"${event.pubkey}",${event.created_at},${event.kind},${serializedTags},"${event.content}"]`
  return await sha256(Uint8Array.from(charCodes(serialized)))
}

function getUserMetadata(this: Unsigned<RawEvent>): UserMetadata {
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

async function getMessage(
  this: UnsignedWithPubkey<DirectMessage>,
  priv?: HexOrBechPrivateKey
): Promise<string | undefined> {
  if (priv !== undefined) {
    priv = parsePrivateKey(priv)
  }
  const [data, iv] = this.content.split("?iv=")
  if (data === undefined || iv === undefined) {
    throw new NostrError(`invalid direct message content ${this.content}`)
  }
  if (priv === undefined) {
    // TODO Try to use NIP-07
    throw new NostrError("todo")
  } else if (getPublicKey(priv) === this.getRecipient()) {
    return await aesDecryptBase64(this.pubkey, priv, { data, iv })
  }
  return undefined
}

function getRecipient(this: Unsigned<RawEvent>): PublicKey {
  const recipientTag = this.tags.find((tag) => tag[0] === "p")
  if (typeof recipientTag?.[1] !== "string") {
    throw new NostrError(
      `expected "p" tag to be of type string, but got ${
        recipientTag?.[1]
      } in ${JSON.stringify(this)}`
    )
  }
  return recipientTag[1]
}

function getPrevious(this: Unsigned<RawEvent>): EventId | undefined {
  const previousTag = this.tags.find((tag) => tag[0] === "e")
  if (typeof previousTag?.[1] !== "string") {
    throw new NostrError(
      `expected "e" tag to be of type string, but got ${
        previousTag?.[1]
      } in ${JSON.stringify(this)}`
    )
  }
  return defined(previousTag?.[1])
}

function parseJson(data: string) {
  try {
    return JSON.parse(data)
  } catch (e) {
    throw new NostrError(`invalid json: ${e}: ${data}`)
  }
}

function* charCodes(data: string): Iterable<number> {
  for (let i = 0; i < data.length; i++) {
    yield data.charCodeAt(i)
  }
}
