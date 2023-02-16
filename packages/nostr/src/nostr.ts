import { ProtocolError } from "./error"
import { EventId, Event } from "./event"
import { RawEvent } from "./raw"

/**
 * A nostr client.
 */
export class Nostr {
  /**
   * Open connections to relays.
   */
  #conns: Conn[] = []
  /**
   * Is this client closed?
   */
  #closed: boolean = false
  /**
   * Mapping of subscription IDs to corresponding filters.
   */
  #subscriptions: Map<string, Filters> = new Map()

  #eventCallbacks: EventCallback[] = []
  #noticeCallbacks: NoticeCallback[] = []
  #errorCallbacks: ErrorCallback[] = []

  /**
   * Add a new callback for received events.
   */
  onEvent(cb: EventCallback): void {
    this.#eventCallbacks.push(cb)
  }

  /**
   * Add a new callback for received notices.
   */
  onNotice(cb: NoticeCallback): void {
    this.#noticeCallbacks.push(cb)
  }

  /**
   * Add a new callback for errors.
   */
  onError(cb: ErrorCallback): void {
    this.#errorCallbacks.push(cb)
  }

  /**
   * Connect and start communicating with a relay. This method recreates all existing
   * subscriptions on the new relay as well.
   */
  async connect(relay: URL | string): Promise<void> {
    this.#checkClosed()
    throw new Error("todo try to connect and send subscriptions")
  }

  /**
   * Create a new subscription.
   *
   * @param subscriptionId An optional subscription ID, otherwise a random subscription ID will be used.
   * @returns The subscription ID.
   */
  async subscribe(
    filters: Filters,
    subscriptionId?: SubscriptionId | string
  ): Promise<SubscriptionId> {
    this.#checkClosed()
    throw new Error("todo subscribe to the relays and add the subscription")
  }

  /**
   * Remove a subscription.
   */
  async unsubscribe(subscriptionId: SubscriptionId): Promise<SubscriptionId> {
    this.#checkClosed()
    throw new Error(
      "todo unsubscribe from the relays and remove the subscription"
    )
  }

  /**
   * Publish an event.
   */
  async publish(event: Event): Promise<void> {
    this.#checkClosed()
    throw new Error("todo")
  }

  /**
   * Close connections to all relays. This method can only be called once. After the
   * connections have been closed, no other methods can be called.
   */
  async close(): Promise<void> {}

  #checkClosed() {
    if (this.#closed) {
      throw new Error("the client has been closed")
    }
  }
}

/**
 * A string uniquely identifying a client subscription.
 */
export class SubscriptionId {
  #id: string

  constructor(subscriptionId: string) {
    this.#id = subscriptionId
  }

  toString() {
    return this.#id
  }
}

/**
 * Subscription filters.
 */
export interface Filters {}

export type EventCallback = (params: EventParams, nostr: Nostr) => unknown
export type NoticeCallback = (notice: string, nostr: Nostr) => unknown
export type ErrorCallback = (error: ProtocolError, nostr: Nostr) => unknown

export interface EventParams {
  event: Event
  id: EventId
  raw: RawEvent
}

/**
 * The connection to a relay.
 */
class Conn {}
