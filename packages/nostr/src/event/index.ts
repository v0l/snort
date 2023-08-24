import {
  PublicKey,
  sha256,
  schnorrSign,
  schnorrVerify,
  getPublicKey,
  HexOrBechPrivateKey,
  parsePrivateKey,
} from "../crypto"
import { Timestamp, unixTimestamp, NostrError } from "../common"
import { TextNote } from "./text"
import {
  getUserMetadata,
  SetMetadata,
  verifyInternetIdentifier,
} from "./set-metadata"
import {
  DirectMessage,
  getMessage,
  getPrevious,
  getRecipient,
} from "./direct-message"
import { ContactList, getContacts } from "./contact-list"
import { Deletion, getEvents } from "./deletion"
import "../nostr-object"

// TODO Add remaining event types

// TODO
// Think about this more
// Perhaps the best option is for all these factory methods to have an overload which also accept a private
// key as last parameter and return the event already signed
// Or maybe opts: { sign?: boolean | HexOrBechPrivateKey } setting sign to true should use nip07, setting
// it to a string will use that string as the private key

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

export interface Unknown extends RawEvent {
  kind: Exclude<
    EventKind,
    | EventKind.SetMetadata
    | EventKind.TextNote
    | EventKind.ContactList
    | EventKind.DirectMessage
    | EventKind.Deletion
  >
}

export type Event =
  | SetMetadata
  | TextNote
  | ContactList
  | DirectMessage
  | Deletion
  | Unknown

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
export async function signEvent<T extends RawEvent>(
  event: Unsigned<T>,
  priv?: HexOrBechPrivateKey,
): Promise<T> {
  event.created_at ??= unixTimestamp()
  if (priv !== undefined) {
    priv = parsePrivateKey(priv)
    event.pubkey = getPublicKey(priv)
    const id = serializeEventId(
      // This conversion is safe because the pubkey field is set above.
      event as unknown as UnsignedWithPubkey<T>,
    )
    event.id = id
    event.sig = schnorrSign(id, priv)
    return event as T
  } else {
    if (typeof window === "undefined" || window.nostr === undefined) {
      throw new NostrError("no private key provided")
    }
    // Extensions like nos2x expect to receive only the event data, without any of the methods.
    const methods: { [key: string]: unknown } = {}
    for (const [key, value] of Object.entries(event)) {
      if (typeof value === "function") {
        methods[key] = value
        delete event[key]
      }
    }
    const signed = await window.nostr.signEvent(event)
    return {
      ...signed,
      ...methods,
    }
  }
}

/**
 * Parse an event from its raw format.
 */
export function parseEvent(event: RawEvent): Event {
  if (event.id !== serializeEventId(event)) {
    throw new NostrError(
      `invalid id ${event.id} for event ${JSON.stringify(
        event,
      )}, expected ${serializeEventId(event)}`,
    )
  }
  if (!schnorrVerify(event.sig, event.id, event.pubkey)) {
    throw new NostrError(`invalid signature for event ${JSON.stringify(event)}`)
  }

  // TODO Validate all the fields. Lowercase hex fields, etc. Make sure everything is correct.
  // TODO Also validate that tags have at least one element

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
      verifyInternetIdentifier,
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

  if (event.kind === EventKind.ContactList) {
    return {
      ...event,
      kind: EventKind.ContactList,
      getContacts,
    }
  }

  if (event.kind === EventKind.Deletion) {
    return {
      ...event,
      kind: EventKind.Deletion,
      getEvents,
    }
  }

  return {
    ...event,
    kind: event.kind,
  }
}

function serializeEventId(event: UnsignedWithPubkey<RawEvent>): EventId {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ])
  return sha256(Uint8Array.from(charCodes(serialized)))
}

function* charCodes(data: string): Iterable<number> {
  for (let i = 0; i < data.length; i++) {
    yield data.charCodeAt(i)
  }
}
