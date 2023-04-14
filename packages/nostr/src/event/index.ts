import { DeepReadonly, NostrError, Timestamp, unixTimestamp } from "../common"
import {
  getPublicKey,
  HexOrBechPrivateKey,
  parsePrivateKey,
  PublicKey,
  schnorrSign,
  schnorrVerify,
  sha256,
} from "../crypto"
import { ContactList } from "./kind/contact-list"
import { Deletion } from "./kind/deletion"
import { DirectMessage } from "./kind/direct-message"
import { SetMetadata } from "./kind/set-metadata"
import { TextNote } from "./kind/text-note"
import { Unknown } from "./kind/unknown"
import "../nostr-object"

/**
 * The enumeration of all known event kinds. Used to discriminate between different
 * event types.
 */
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
 * For an explanation of the fields, see @see EventProps.
 */
export interface InputEventProps {
  tags?: string[][]
  content?: string
  created_at?: Timestamp
}

/**
 * The fields of an unsigned event. These can be used when building a nonstandard
 * event.
 *
 * TODO Document the fields
 */
export interface UnsignedEventProps {
  kind: EventKind
  tags: string[][]
  content: string
  created_at?: Timestamp
}

/**
 * The fields of a signed event.
 *
 * This type is strictly readonly because it's signed. Changing any of the fields would
 * invalidate the signature.
 *
 * TODO Document the fields
 */
export interface EventProps extends DeepReadonly<UnsignedEventProps> {
  readonly id: string
  readonly pubkey: PublicKey
  readonly sig: string
  readonly created_at: Timestamp
}

/**
 * An event. The `kind` field can be used to determine the event type at compile
 * time. The event signature and delegation token are verified when the event is
 * received or published. The event format is verified at construction time.
 *
 * Events are immutable because they're signed. Changing them after singing would
 * invalidate the signature.
 *
 * TODO Document how to work with unsigned events and why one would want to do that.
 */
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
 * Calculate the id, sig, and pubkey fields of the event. Set created_at to the current timestamp,
 * if missing. Return a signed clone of the event.
 */
export async function signEvent(
  event: DeepReadonly<UnsignedEventProps>,
  priv?: HexOrBechPrivateKey
): Promise<EventProps> {
  const createdAt = event.created_at ?? unixTimestamp()
  if (priv !== undefined) {
    priv = parsePrivateKey(priv)
    const pubkey = getPublicKey(priv)
    const id = await serializeEventId(event, pubkey, createdAt)
    const sig = await schnorrSign(id, priv)
    return {
      ...structuredClone(event),
      id,
      sig,
      pubkey,
      created_at: createdAt,
    }
  } else {
    if (typeof window === "undefined" || window.nostr === undefined) {
      throw new NostrError(
        "no private key provided and window.nostr is not available"
      )
    }
    const signed = await window.nostr.signEvent(event)
    return structuredClone(signed)
  }
}

// TODO Shouldn't be exposed to the user
/**
 * Parse an event from its raw fields.
 */
export function parseEvent(event: EventProps): Event {
  if (event.kind === EventKind.TextNote) {
    return new TextNote(event)
  }
  if (event.kind === EventKind.SetMetadata) {
    return new SetMetadata(event)
  }
  if (event.kind === EventKind.DirectMessage) {
    return new DirectMessage(event)
  }
  if (event.kind === EventKind.ContactList) {
    return new ContactList(event)
  }
  if (event.kind === EventKind.Deletion) {
    return new Deletion(event)
  }
  return new Unknown(event)
}

// TODO Probably shouldn't be exposed to the user
/**
 * Verify the signature of the event. If the signature is invalid, throw @see NostrError.
 */
export async function verifySignature(event: EventProps): Promise<void> {
  if (
    event.id !== (await serializeEventId(event, event.pubkey, event.created_at))
  ) {
    throw new NostrError(
      `invalid id ${event.id} for event ${JSON.stringify(
        event
      )}, expected ${await serializeEventId(
        event,
        event.pubkey,
        event.created_at
      )}`
    )
  }
  if (!(await schnorrVerify(event.sig, event.id, event.pubkey))) {
    throw new NostrError(`invalid signature for event ${JSON.stringify(event)}`)
  }
}

async function serializeEventId(
  event: DeepReadonly<UnsignedEventProps>,
  pubkey: PublicKey,
  createdAt: Timestamp
): Promise<EventId> {
  const serialized = JSON.stringify([
    0,
    pubkey,
    createdAt,
    event.kind,
    event.tags,
    event.content,
  ])
  return await sha256(Uint8Array.from(charCodes(serialized)))
}

function* charCodes(data: string): Iterable<number> {
  for (let i = 0; i < data.length; i++) {
    yield data.charCodeAt(i)
  }
}
