import { ProtocolError } from "../error"
import { Filters, SubscriptionId } from "."
import { EventId, RawEvent } from "../event"
import WebSocket from "isomorphic-ws"
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
  /**
   * Callback for errors.
   */
  readonly #onError: (err: unknown) => void

  get url(): string {
    return this.#socket.url
  }

  constructor({
    url,
    onMessage,
    onOpen,
    onError,
  }: {
    url: URL
    onMessage: (msg: IncomingMessage) => void
    onOpen: () => void
    onError: (err: unknown) => void
  }) {
    this.#onError = onError
    this.#socket = new WebSocket(url)

    // Handle incoming messages.
    this.#socket.addEventListener("message", async (msgData) => {
      const value = msgData.data.valueOf()
      // Validate and parse the message.
      if (typeof value !== "string") {
        const err = new ProtocolError(`invalid message data: ${value}`)
        onError(err)
        return
      }
      try {
        const msg = await parseIncomingMessage(value)
        onMessage(msg)
      } catch (err) {
        onError(err)
      }
    })

    // When the connection is ready, send any outstanding messages.
    this.#socket.addEventListener("open", () => {
      for (const msg of this.#pending) {
        this.send(msg)
      }
      this.#pending = []
      onOpen()
    })

    this.#socket.addEventListener("error", (err) => {
      onError(err)
    })
  }

  send(msg: OutgoingMessage): void {
    if (this.#socket.readyState < WebSocket.OPEN) {
      this.#pending.push(msg)
      return
    }
    try {
      this.#socket.send(serializeOutgoingMessage(msg), (err) => {
        if (err !== undefined && err !== null) {
          this.#onError?.(err)
        }
      })
    } catch (err) {
      this.#onError?.(err)
    }
  }

  close(): void {
    try {
      this.#socket.close()
    } catch (err) {
      this.#onError?.(err)
    }
  }
}

/**
 * A message sent from a relay to the client.
 */
export type IncomingMessage =
  | IncomingEvent
  | IncomingNotice
  | IncomingOk
  | IncomingEose

export type IncomingKind = "event" | "notice" | "ok" | "eose"

/**
 * Incoming "EVENT" message.
 */
export interface IncomingEvent {
  kind: "event"
  subscriptionId: SubscriptionId
  event: RawEvent
}

/**
 * Incoming "NOTICE" message.
 */
export interface IncomingNotice {
  kind: "notice"
  notice: string
}

/**
 * Incoming "OK" message.
 */
export interface IncomingOk {
  kind: "ok"
  eventId: EventId
  ok: boolean
  message: string
}

/**
 * Incoming "EOSE" message.
 */
export interface IncomingEose {
  kind: "eose"
  subscriptionId: SubscriptionId
}

/**
 * A message sent from the client to a relay.
 */
export type OutgoingMessage =
  | OutgoingEvent
  | OutgoingOpenSubscription
  | OutgoingCloseSubscription

export type OutgoingKind = "event" | "openSubscription" | "closeSubscription"

/**
 * Outgoing "EVENT" message.
 */
export interface OutgoingEvent {
  kind: "event"
  event: RawEvent
}

/**
 * Outgoing "REQ" message, which opens a subscription.
 */
export interface OutgoingOpenSubscription {
  kind: "openSubscription"
  id: SubscriptionId
  filters: Filters[]
}

/**
 * Outgoing "CLOSE" message, which closes a subscription.
 */
export interface OutgoingCloseSubscription {
  kind: "closeSubscription"
  id: SubscriptionId
}

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

function serializeOutgoingMessage(msg: OutgoingMessage): string {
  if (msg.kind === "event") {
    return JSON.stringify(["EVENT", msg.event])
  } else if (msg.kind === "openSubscription") {
    return JSON.stringify([
      "REQ",
      msg.id.toString(),
      ...serializeFilters(msg.filters),
    ])
  } else if (msg.kind === "closeSubscription") {
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
    ids: filter.ids,
    authors: filter.authors,
    kinds: filter.kinds,
    ["#e"]: filter.eventTags,
    ["#p"]: filter.pubkeyTags,
    since:
      filter.since instanceof Date ? unixTimestamp(filter.since) : filter.since,
    until:
      filter.until instanceof Date ? unixTimestamp(filter.until) : filter.until,
    limit: filter.limit,
  }))
}

async function parseIncomingMessage(data: string): Promise<IncomingMessage> {
  // Parse the incoming data as a nonempty JSON array.
  const json = parseJson(data)
  if (!(json instanceof Array)) {
    throw new ProtocolError(`incoming message is not an array: ${data}`)
  }
  if (json.length === 0) {
    throw new ProtocolError(`incoming message is an empty array: ${data}`)
  }

  // Handle incoming events.
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
    const event = parseEventData(json[2])
    return {
      kind: "event",
      subscriptionId: json[1],
      event,
    }
  }

  // Handle incoming notices.
  if (json[0] === "NOTICE") {
    if (typeof json[1] !== "string") {
      throw new ProtocolError(
        `second element of "NOTICE" should be a string, but wasn't: ${data}`
      )
    }
    return {
      kind: "notice",
      notice: json[1],
    }
  }

  // Handle incoming "OK" messages.
  if (json[0] === "OK") {
    if (typeof json[1] !== "string") {
      throw new ProtocolError(
        `second element of "OK" should be a string, but wasn't: ${data}`
      )
    }
    if (typeof json[2] !== "boolean") {
      throw new ProtocolError(
        `third element of "OK" should be a boolean, but wasn't: ${data}`
      )
    }
    if (typeof json[3] !== "string") {
      throw new ProtocolError(
        `fourth element of "OK" should be a string, but wasn't: ${data}`
      )
    }
    return {
      kind: "ok",
      eventId: json[1],
      ok: json[2],
      message: json[3],
    }
  }

  // Handle incoming "EOSE" messages.
  if (json[0] === "EOSE") {
    if (typeof json[1] !== "string") {
      throw new ProtocolError(
        `second element of "EOSE" should be a string, but wasn't: ${data}`
      )
    }
    return {
      kind: "eose",
      subscriptionId: json[1],
    }
  }

  throw new ProtocolError(`unknown incoming message: ${data}`)
}

function parseEventData(json: { [key: string]: unknown }): RawEvent {
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
  return json as unknown as RawEvent
}

function parseJson(data: string) {
  try {
    return JSON.parse(data)
  } catch (e) {
    throw new ProtocolError(`invalid event json: ${data}`)
  }
}
