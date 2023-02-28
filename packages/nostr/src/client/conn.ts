import { ProtocolError } from "../error"
import { Filters, SubscriptionId } from "."
import { RawEvent, SignedEvent } from "../event"
import WebSocket from "ws"
import { unixTimestamp } from "../util"

/**
 * The connection to a relay. This is the lowest layer of the nostr protocol.
 * The only responsibility of this type is to send and receive
 * well-formatted nostr messages on the underlying websocket. All other details of the protocol
 * are handled by `Nostr`.
 *
 * @see Nostr
 */
export class Conn {
  readonly #socket: WebSocket

  /**
   * Messages which were requested to be sent before the websocket was ready.
   * Once the websocket becomes ready, these messages will be sent and cleared.
   */
  // TODO Another reason why pending messages might be required is when the user tries to send a message
  // before NIP-44 auth. The legacy code reuses the same array for these two but I think they should be
  // different, and the NIP-44 stuff should be handled by Nostr.
  #pending: OutgoingMessage[] = []

  #msgCallback?: IncomingMessageCallback
  #errorCallback?: ErrorCallback

  get url(): string {
    return this.#socket.url
  }

  constructor(endpoint: string | URL) {
    this.#socket = new WebSocket(endpoint)

    // Handle incoming messages.
    this.#socket.addEventListener("message", async (msgData) => {
      const value = msgData.data.valueOf()
      // Validate and parse the message.
      if (typeof value !== "string") {
        const err = new ProtocolError(`invalid message data: ${value}`)
        this.#errorCallback?.(err)
        return
      }
      try {
        const msg = await parseIncomingMessage(value)
        this.#msgCallback?.(msg)
      } catch (err) {
        if (err instanceof ProtocolError) {
          this.#errorCallback?.(err)
        } else {
          // TODO Not sure if this is the best idea.
          // Investigate what WebSocket does if the callback throws?
          // Either way it seems like the best idea is to have `onError` called on all types of errors
          throw err
        }
      }
    })

    // When the connection is ready, send any outstanding messages.
    this.#socket.addEventListener("open", () => {
      for (const msg of this.#pending) {
        this.send(msg)
      }
      this.#pending = []
    })
  }

  on(on: "message", cb: IncomingMessageCallback): void
  on(on: "error", cb: ErrorCallback): void
  on(on: "message" | "error", cb: IncomingMessageCallback | ErrorCallback) {
    if (on === "message") {
      this.#msgCallback = cb as IncomingMessageCallback
    } else if (on === "error") {
      this.#errorCallback = cb as ErrorCallback
    } else {
      throw new Error(`unexpected input: ${on}`)
    }
  }

  send(msg: OutgoingMessage): void {
    if (this.#socket.readyState < WebSocket.OPEN) {
      this.#pending.push(msg)
      return
    }
    this.#socket.send(serializeOutgoingMessage(msg))
  }

  close(): void {
    this.#socket.close()
  }
}

/**
 * A message sent from a relay to the client.
 */
export type IncomingMessage = IncomingEvent | IncomingNotice

export const enum IncomingKind {
  Event,
  Notice,
}

/**
 * Incoming "EVENT" message.
 */
export interface IncomingEvent {
  kind: IncomingKind.Event
  subscriptionId: SubscriptionId
  signed: SignedEvent
  raw: RawEvent
}

/**
 * Incoming "NOTICE" message.
 */
export interface IncomingNotice {
  kind: IncomingKind.Notice
  notice: string
}

/**
 * A message sent from the client to a relay.
 */
export type OutgoingMessage =
  | OutgoingEvent
  | OutgoingOpenSubscription
  | OutgoingCloseSubscription

export const enum OutgoingKind {
  Event,
  Subscription,
  Unsubscription,
}

/**
 * Outgoing "EVENT" message.
 */
export interface OutgoingEvent {
  kind: OutgoingKind.Event
  event: SignedEvent | RawEvent
}

/**
 * Outgoing "REQ" message, which opens a subscription.
 */
export interface OutgoingOpenSubscription {
  kind: OutgoingKind.Subscription
  id: SubscriptionId
  filters: Filters[]
}

/**
 * Outgoing "CLOSE" message, which closes a subscription.
 */
export interface OutgoingCloseSubscription {
  kind: OutgoingKind.Unsubscription
  id: SubscriptionId
}

type IncomingMessageCallback = (message: IncomingMessage) => unknown
type ErrorCallback = (error: ProtocolError) => unknown

interface RawFilters {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  ["#e"]?: string[]
  ["#p"]?: string[]
  since?: number
  until?: number
  limit?: number
}

async function parseIncomingMessage(data: string): Promise<IncomingMessage> {
  const json = parseJson(data)
  if (!(json instanceof Array)) {
    throw new ProtocolError(`incoming message is not an array: ${data}`)
  }
  if (json.length === 0) {
    throw new ProtocolError(`incoming message is an empty array: ${data}`)
  }
  if (json[0] === "EVENT") {
    if (typeof json[1] !== "string") {
      throw new ProtocolError(
        `second element of "EVENT" should be a string, but wasn't: ${data}`
      )
    }
    if (typeof json[2] !== "object") {
      throw new ProtocolError(
        `second element of "EVENT" should be an object, but wasn't: ${data}`
      )
    }
    const raw = parseEventData(json[2])
    return {
      kind: IncomingKind.Event,
      subscriptionId: new SubscriptionId(json[1]),
      signed: await SignedEvent.verify(raw),
      raw,
    }
  }
  if (json[0] === "NOTICE") {
    if (typeof json[1] !== "string") {
      throw new ProtocolError(
        `second element of "NOTICE" should be a string, but wasn't: ${data}`
      )
    }
    return {
      kind: IncomingKind.Notice,
      notice: json[1],
    }
  }
  throw new ProtocolError(`unknown incoming message: ${data}`)
}

function serializeOutgoingMessage(msg: OutgoingMessage): string {
  if (msg.kind === OutgoingKind.Event) {
    const raw =
      msg.event instanceof SignedEvent ? msg.event.serialize() : msg.event
    return JSON.stringify(["EVENT", raw])
  } else if (msg.kind === OutgoingKind.Subscription) {
    return JSON.stringify([
      "REQ",
      msg.id.toString(),
      ...serializeFilters(msg.filters),
    ])
  } else if (msg.kind === OutgoingKind.Unsubscription) {
    return JSON.stringify(["CLOSE", msg.id.toString()])
  } else {
    throw new Error(`invalid message: ${JSON.stringify(msg)}`)
  }
}

function serializeFilters(filters: Filters[]): RawFilters[] {
  if (filters.length === 0) {
    return [{}]
  }
  return filters.map((filter) => ({
    ids: filter.ids?.map((id) => id.toString()),
    authors: filter.authors?.map((author) => author.toString()),
    kinds: filter.kinds?.map((kind) => kind),
    ["#e"]: filter.eventTags?.map((e) => e.toString()),
    ["#p"]: filter.pubkeyTags?.map((p) => p.toString()),
    since: filter.since !== undefined ? unixTimestamp(filter.since) : undefined,
    until: filter.until !== undefined ? unixTimestamp(filter.until) : undefined,
    limit: filter.limit,
  }))
}

function parseEventData(json: object): RawEvent {
  if (
    typeof json["id"] !== "string" ||
    typeof json["pubkey"] !== "string" ||
    typeof json["created_at"] !== "number" ||
    typeof json["kind"] !== "number" ||
    !(json["tags"] instanceof Array) ||
    !json["tags"].every(
      (x) => x instanceof Array && x.every((y) => typeof y === "string")
    ) ||
    typeof json["content"] !== "string" ||
    typeof json["sig"] !== "string"
  ) {
    throw new ProtocolError(`invalid event: ${JSON.stringify(json)}`)
  }
  return json as RawEvent
}

function parseJson(data: string) {
  try {
    return JSON.parse(data)
  } catch (e) {
    throw new ProtocolError(`invalid event json: ${data}`)
  }
}
