import { ProtocolError } from "../error"
import { Filters, SubscriptionId } from "."
import { formatOutgoingMessage, parseIncomingMessage, RawEvent } from "../raw"
import { Event } from "../event"

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

  readonly #msgCallbacks: IncomingMessageCallback[] = []
  readonly #errorCallbacks: ConnErrorCallback[] = []

  get url(): string {
    return this.#socket.url
  }

  constructor(endpoint: string | URL) {
    this.#socket = new WebSocket(endpoint)

    // Handle incoming messages.
    this.#socket.addEventListener("message", (msgData) => {
      const value = msgData.data.valueOf()
      // Validate and parse the message.
      if (typeof value !== "string") {
        const err = new ProtocolError(`invalid message data: ${value}`)
        for (const cb of this.#errorCallbacks) {
          cb(err)
        }
        return
      }
      try {
        const msg = parseIncomingMessage(value)
        for (const cb of this.#msgCallbacks) {
          cb(msg)
        }
      } catch (err) {
        if (err instanceof ProtocolError) {
          for (const cb of this.#errorCallbacks) {
            cb(err)
          }
        } else {
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

  onMessage(cb: IncomingMessageCallback): void {
    this.#msgCallbacks.push(cb)
  }

  onError(cb: ConnErrorCallback): void {
    this.#errorCallbacks.push(cb)
  }

  send(msg: OutgoingMessage): void {
    if (this.#socket.readyState < WebSocket.OPEN) {
      this.#pending.push(msg)
      return
    }
    this.#socket.send(formatOutgoingMessage(msg))
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
  event: Event
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
  | OutgoingSubscription
  | OutgoingUnsubscription

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
  event: Event
}

/**
 * Outgoing "REQ" message, representing a subscription.
 */
export interface OutgoingSubscription {
  kind: OutgoingKind.Subscription
  id: SubscriptionId
  filters: Filters[]
}

/**
 * Outgoing "CLOSE" message, representing an unsubscription.
 */
export interface OutgoingUnsubscription {
  kind: OutgoingKind.Unsubscription
  id: SubscriptionId
}

type IncomingMessageCallback = (message: IncomingMessage) => unknown
type ConnErrorCallback = (error: ProtocolError) => unknown
