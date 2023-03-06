import { ProtocolError } from "./error"
import {
  PublicKey,
  PrivateKey,
  sha256,
  Hex,
  schnorrSign,
  schnorrVerify,
  aesDecryptBase64,
} from "./crypto"
import { defined, unixTimestamp } from "./util"

// TODO This file is missing proper documentation
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

export type Event =
  | SetMetadataEvent
  | TextNoteEvent
  | DirectMessageEvent
  | UnknownEvent

interface EventCommon {
  pubkey: PublicKey
  createdAt: Date
}

// TODO Refactor: the event names don't need to all end with *Event

export interface SetMetadataEvent extends EventCommon {
  kind: EventKind.SetMetadata
  content: UserMetadata
}

export interface UserMetadata {
  name: string
  about: string
  picture: string
}

export interface TextNoteEvent extends EventCommon {
  kind: EventKind.TextNote
  content: string
}

export interface DirectMessageEvent extends EventCommon {
  kind: EventKind.DirectMessage
  /**
   * The plaintext message, or undefined if this client is not the recipient.
   */
  message?: string
  recipient: PublicKey
  previous?: EventId
}

export interface UnknownEvent extends EventCommon {
  kind: Exclude<EventKind, EventKind.SetMetadata | EventKind.TextNote>
}

// TODO Doc comment
export class EventId {
  #hex: Hex

  static async create(event: Event | RawEvent): Promise<EventId> {
    // It's not defined whether JSON.stringify produces a string with whitespace stripped.
    // Building the JSON string manually as follows ensures that there's no whitespace.
    // In hindsight using JSON as a data format for hashing and signing is not the best
    // design decision.
    if ("id" in event) {
      // Raw event.
      const serializedTags = `[${event.tags
        .map((tag) => `[${tag.map((v) => `"${v}"`).join(",")}]`)
        .join(",")}]`
      const serialized = `[0,"${event.pubkey}",${event.created_at},${event.kind},${serializedTags},"${event.content}"]`
      const hash = await sha256(Uint8Array.from(charCodes(serialized)))
      return new EventId(hash)
    } else {
      // Not a raw event.
      const tags = serializeTags(event)
      const content = serializeContent(event)
      const serializedTags = `[${tags
        .map((tag) => `[${tag.map((v) => `"${v}"`).join(",")}]`)
        .join(",")}]`
      const serialized = `[0,"${event.pubkey}",${unixTimestamp(
        event.createdAt
      )},${event.kind},${serializedTags},"${content}"]`
      const hash = await sha256(Uint8Array.from(charCodes(serialized)))
      return new EventId(hash)
    }
  }

  constructor(hex: string | Uint8Array) {
    this.#hex = new Hex(hex)
  }

  toHex(): string {
    return this.#hex.toString()
  }

  toString(): string {
    return this.toHex()
  }
}

/**
 * A signed event. Provides access to the event data, ID, and signature.
 */
export class SignedEvent {
  #event: Readonly<Event>
  #eventId: EventId
  #signature: Hex

  /**
   * Sign an event using the specified private key. The private key must match the
   * public key from the event.
   */
  static async sign(event: Event, key: PrivateKey): Promise<SignedEvent> {
    const id = await EventId.create(event)
    const sig = await schnorrSign(new Hex(id.toHex()), key)
    return new SignedEvent(event, id, new Hex(sig))
  }

  /**
   * Verify the signature of a raw event. Throw a `ProtocolError` if the signature
   * is invalid.
   */
  static async verify(raw: RawEvent, key?: PrivateKey): Promise<SignedEvent> {
    const id = await EventId.create(raw)
    if (id.toHex() !== raw.id) {
      throw new ProtocolError(`invalid event id: ${raw.id}, expected ${id}`)
    }
    const sig = new Hex(raw.sig)
    if (
      !(await schnorrVerify(
        sig,
        new Hex(id.toHex()),
        new PublicKey(raw.pubkey)
      ))
    ) {
      throw new ProtocolError(`invalid signature: ${sig}`)
    }
    return new SignedEvent(await parseEvent(raw, key), id, sig)
  }

  private constructor(event: Event, eventId: EventId, signature: Hex) {
    this.#event = deepCopy(event)
    this.#eventId = eventId
    this.#signature = signature
  }

  /**
   * Event ID.
   */
  get eventId(): EventId {
    return this.#eventId
  }

  /**
   * Event data.
   */
  get event(): Event {
    return deepCopy(this.#event)
  }

  /**
   * Event signature in hex format.
   */
  get signature(): string {
    return this.#signature.toString()
  }

  /**
   * Serialize the event into its raw format.
   */
  serialize(): RawEvent {
    const { event, eventId: id, signature } = this
    const tags = serializeTags(event)
    const content = serializeContent(event)
    return {
      id: id.toHex(),
      pubkey: event.pubkey.toHex(),
      created_at: unixTimestamp(event.createdAt),
      kind: event.kind,
      tags,
      content,
      sig: signature,
    }
  }
}

export interface RawEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

/**
 * Parse an event from its raw format.
 */
async function parseEvent(
  raw: RawEvent,
  key: PrivateKey | undefined
): Promise<Event> {
  const pubkey = new PublicKey(raw.pubkey)
  const createdAt = new Date(raw.created_at * 1000)
  const event = {
    pubkey,
    createdAt,
  }

  if (raw.kind === EventKind.SetMetadata) {
    const userMetadata = parseJson(raw.content)
    if (
      typeof userMetadata["name"] !== "string" ||
      typeof userMetadata["about"] !== "string" ||
      typeof userMetadata["picture"] !== "string"
    ) {
      throw new ProtocolError(
        `invalid user metadata ${userMetadata} in ${JSON.stringify(raw)}`
      )
    }
    return {
      ...event,
      kind: EventKind.SetMetadata,
      content: userMetadata,
    }
  }

  if (raw.kind === EventKind.TextNote) {
    return {
      ...event,
      kind: EventKind.TextNote,
      content: raw.content,
    }
  }

  if (raw.kind === EventKind.DirectMessage) {
    // Parse the tag identifying the recipient.
    const recipientTag = raw.tags.find((tag) => tag[0] === "p")
    if (typeof recipientTag?.[1] !== "string") {
      throw new ProtocolError(
        `expected "p" tag to be of type string, but got ${
          recipientTag?.[1]
        } in ${JSON.stringify(raw)}`
      )
    }
    const recipient = new PublicKey(recipientTag[1])

    // Parse the tag identifying the optional previous message.
    const previousTag = raw.tags.find((tag) => tag[0] === "e")
    if (typeof recipientTag[1] !== "string") {
      throw new ProtocolError(
        `expected "e" tag to be of type string, but got ${
          previousTag?.[1]
        } in ${JSON.stringify(raw)}`
      )
    }
    const previous = new EventId(defined(previousTag?.[1]))

    // Decrypt the message content.
    const [data, iv] = raw.content.split("?iv=")
    if (data === undefined || iv === undefined) {
      throw new ProtocolError(`invalid direct message content ${raw.content}`)
    }
    let message: string | undefined
    if (key?.pubkey?.toHex() === recipient.toHex()) {
      message = await aesDecryptBase64(event.pubkey, key, { data, iv })
    }
    return {
      ...event,
      kind: EventKind.DirectMessage,
      message,
      recipient,
      previous,
    }
  }

  return {
    ...event,
    kind: raw.kind,
  }
}

function serializeTags(_event: Event): string[][] {
  // TODO As I add different event kinds, this will change
  return []
}

function serializeContent(event: Event): string {
  if (event.kind === EventKind.SetMetadata) {
    return JSON.stringify(event.content)
  } else if (event.kind === EventKind.TextNote) {
    return event.content
  } else {
    return ""
  }
}

/**
 * Create a deep copy of the event.
 */
function deepCopy(event: Event): Event {
  const common = {
    createdAt: structuredClone(event.createdAt),
    pubkey: event.pubkey,
  }
  if (event.kind === EventKind.SetMetadata) {
    return {
      kind: EventKind.SetMetadata,
      content: {
        about: event.content.about,
        name: event.content.name,
        picture: event.content.picture,
      },
      ...common,
    }
  } else if (event.kind === EventKind.TextNote) {
    return {
      kind: EventKind.TextNote,
      content: event.content,
      ...common,
    }
  } else if (event.kind === EventKind.DirectMessage) {
    throw new Error("todo")
  } else {
    return {
      kind: event.kind,
      ...common,
    }
  }
}

function parseJson(data: string) {
  try {
    return JSON.parse(data)
  } catch (e) {
    throw new ProtocolError(`invalid json: ${data}`)
  }
}

function* charCodes(data: string): Iterable<number> {
  for (let i = 0; i < data.length; i++) {
    yield data.charCodeAt(i)
  }
}
