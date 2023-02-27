import { ProtocolError } from "./error"
import * as secp from "@noble/secp256k1"
import { PublicKey, PrivateKey } from "./keypair"
import { unixTimestamp } from "./util"

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

export type Event = SetMetadataEvent | TextNoteEvent | UnknownEvent

interface EventCommon {
  pubkey: PublicKey
  createdAt: Date
}

export interface SetMetadataEvent extends EventCommon {
  kind: EventKind.SetMetadata
  userMetadata: UserMetadata
}

export interface UserMetadata {
  name: string
  about: string
  picture: string
}

export interface TextNoteEvent extends EventCommon {
  kind: EventKind.TextNote
  note: string
}

export interface UnknownEvent extends EventCommon {
  kind: Exclude<EventKind, EventKind.SetMetadata | EventKind.TextNote>
}

// TODO Doc comment
export class EventId {
  #hex: string

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
      const hash = await secp.utils.sha256(
        Uint8Array.from(charCodes(serialized))
      )
      return new EventId(secp.utils.bytesToHex(hash).toLowerCase())
    } else {
      // Not a raw event.
      const tags = serializeEventTags(event)
      const content = serializeEventContent(event)
      const serializedTags = `[${tags
        .map((tag) => `[${tag.map((v) => `"${v}"`).join(",")}]`)
        .join(",")}]`
      const serialized = `[0,"${event.pubkey}",${unixTimestamp(
        event.createdAt
      )},${event.kind},${serializedTags},"${content}"]`
      const hash = await secp.utils.sha256(
        Uint8Array.from(charCodes(serialized))
      )
      return new EventId(secp.utils.bytesToHex(hash).toLowerCase())
    }
  }

  private constructor(hex: string) {
    this.#hex = hex
  }

  toString(): string {
    return this.#hex
  }
}

// TODO Document
export class SignedEvent {
  #event: Readonly<Event>
  #eventId: EventId
  #signature: string

  static async sign(event: Event, key: PrivateKey): Promise<SignedEvent> {
    const id = await EventId.create(event)
    const sig = secp.utils
      .bytesToHex(await secp.schnorr.sign(id.toString(), key.leak()))
      .toLowerCase()
    return new SignedEvent(event, id, sig)
  }

  static async verify(raw: RawEvent): Promise<SignedEvent> {
    const id = await EventId.create(raw)
    if (id.toString() !== raw.id) {
      throw new ProtocolError(`invalid event id: ${raw.id}, expected ${id}`)
    }
    if (!(await secp.schnorr.verify(raw.sig, id.toString(), raw.pubkey))) {
      throw new ProtocolError(`invalid signature: ${raw.sig}`)
    }
    return new SignedEvent(parseEvent(raw), id, raw.sig)
  }

  private constructor(event: Event, eventId: EventId, signature: string) {
    // TODO Copy the event data and document that it's being copied
    this.#event = event
    this.#eventId = eventId
    this.#signature = signature
  }

  // TODO Document this
  get eventId(): EventId {
    return this.#eventId
  }

  // TODO Document this
  get event(): Event {
    // TODO Copy the event data and document that it's being copied
    return this.#event
  }

  // TODO Document this
  get signature(): string {
    return this.#signature
  }

  /**
   * Serialize the event into its raw format.
   */
  serialize(): RawEvent {
    const { event, eventId: id, signature } = this
    const tags = serializeEventTags(event)
    const content = serializeEventContent(event)
    return {
      id: id.toString(),
      pubkey: event.pubkey.toString(),
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
function parseEvent(raw: RawEvent): Event {
  const pubkey = new PublicKey(raw.pubkey)
  const createdAt = new Date(raw.created_at * 1000)
  const event = {
    pubkey,
    createdAt,
  }
  return (
    parseSetMetadataEvent(raw, event) ??
    parseTextNodeEvent(raw, event) ??
    parseUnknownEvent(raw, event)
  )
}

function parseSetMetadataEvent(
  raw: RawEvent,
  event: EventCommon
): SetMetadataEvent | undefined {
  if (raw.kind !== EventKind.SetMetadata) {
    return undefined
  }
  const userMetadata = parseJson(raw.content)
  if (
    typeof userMetadata["name"] !== "string" ||
    typeof userMetadata["about"] !== "string" ||
    typeof userMetadata["picture"] !== "string"
  ) {
    throw new ProtocolError(`invalid user metadata: ${userMetadata}`)
  }
  return {
    ...event,
    kind: EventKind.SetMetadata,
    userMetadata,
  }
}

function parseTextNodeEvent(
  raw: RawEvent,
  event: EventCommon
): TextNoteEvent | undefined {
  if (raw.kind !== EventKind.TextNote) {
    return undefined
  }
  return {
    ...event,
    kind: EventKind.TextNote,
    note: raw.content,
  }
}

function parseUnknownEvent(raw: RawEvent, event: EventCommon): UnknownEvent {
  return {
    ...event,
    kind: raw.kind,
  }
}

function serializeEventTags(_event: Event): string[][] {
  // TODO As I add different event kinds, this will change
  return []
}

function serializeEventContent(event: Event): string {
  if (event.kind === EventKind.SetMetadata) {
    // TODO Maybe rename userMetadata to content?
    return JSON.stringify(event.userMetadata)
  } else if (event.kind === EventKind.TextNote) {
    // TODO Maybe rename note to content?
    return event.note
  } else {
    return ""
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
