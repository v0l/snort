import { ProtocolError } from "../error"
import {
  EventId,
  Event,
  serializeId as serializeEventId,
  EventKind,
} from "../event"
import { PublicKey } from "../keypair"
import { Conn, IncomingKind, OutgoingKind } from "./conn"
import * as secp from "@noble/secp256k1"
import { RawEvent } from "../raw"

/**
 * A nostr client.
 */
export class Nostr {
  // TODO NIP-44 AUTH, leave this for later
  /**
   * Open connections to relays.
   */
  readonly #conns: Map<
    string,
    {
      conn: Conn
      /**
       * Has this connection been authenticated via NIP-44 AUTH?
       */
      auth: boolean
      /**
       * Should this connection be used for receiving messages?
       */
      read: boolean
      /**
       * Should this connection be used for publishing events?
       */
      write: boolean
    }
  >

  /**
   * Mapping of subscription IDs to corresponding filters.
   */
  readonly #subscriptions: Map<string, Filters[]> = new Map()

  readonly #eventCallbacks: EventCallback[] = []
  readonly #noticeCallbacks: NoticeCallback[] = []
  readonly #errorCallbacks: ErrorCallback[] = []

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
   * subscriptions on the new relay as well. If there is already an existing connection,
   * this method will only update it with the new options, and an exception will be thrown
   * if no options are specified.
   */
  connect(url: URL | string, opts?: { read?: boolean; write?: boolean }): void {
    // If the connection already exists, update the options.
    const existingConn = this.#conns.get(url.toString())
    if (existingConn !== undefined) {
      if (opts === undefined) {
        throw new Error(
          `called connect with existing connection ${url}, but options were not specified`
        )
      }
      if (opts.read !== undefined) {
        existingConn.read = opts.read
      }
      if (opts.write !== undefined) {
        existingConn.write = opts.write
      }
      return
    }

    // If there is no existing connection, open a new one.
    const conn = new Conn(url)

    // Handle messages on this connection.
    conn.onMessage(async (msg) => {
      if (msg.kind === IncomingKind.Event) {
        for (const cb of this.#eventCallbacks) {
          cb(
            {
              event: msg.event,
              eventId: await serializeEventId(msg.raw),
              subscriptionId: msg.subscriptionId,
              raw: msg.raw,
            },
            this
          )
        }
      } else if (msg.kind === IncomingKind.Notice) {
        for (const cb of this.#noticeCallbacks) {
          cb(msg.notice, this)
        }
      } else {
        const err = new ProtocolError(`invalid message ${msg}`)
        for (const cb of this.#errorCallbacks) {
          cb(err, this)
        }
      }
    })

    // Forward connection errors to the error callbacks.
    conn.onError((err) => {
      for (const cb of this.#errorCallbacks) {
        cb(err, this)
      }
    })

    // Resend existing subscriptions to this connection.
    for (const [key, filters] of this.#subscriptions.entries()) {
      const subscriptionId = new SubscriptionId(key)
      conn.send({
        kind: OutgoingKind.Subscription,
        id: subscriptionId,
        filters,
      })
    }

    this.#conns.set(url.toString(), {
      conn,
      auth: false,
      read: opts?.read ?? true,
      write: opts?.write ?? true,
    })
  }

  /**
   * Disconnect from a relay. If there is no open connection to this relay, an exception is thrown.
   *
   * TODO There needs to be a way to check connection state. isOpen(), isReady(), isClosing() maybe?
   * Because of how WebSocket states work this isn't as simple as it seems.
   */
  disconnect(url: URL | string): void {
    const c = this.#conns.get(url.toString())
    if (c === undefined) {
      throw new Error(`connection to ${url} doesn't exist`)
    }
    this.#conns.delete(url.toString())
    c.conn.close()
  }

  /**
   * Check if a subscription exists.
   */
  subscribed(subscriptionId: SubscriptionId): boolean {
    return this.#subscriptions.has(subscriptionId.toString())
  }

  /**
   * Create a new subscription. If the subscription already exists, it will be overwritten (as per NIP-01).
   *
   * @param filters The filters to apply to this message. If any filter passes, the message is let through.
   * @param subscriptionId An optional subscription ID, otherwise a random subscription ID will be used.
   * @returns The subscription ID.
   */
  subscribe(
    filters: Filters[],
    subscriptionId?: SubscriptionId
  ): SubscriptionId {
    subscriptionId ??= SubscriptionId.random()
    this.#subscriptions.set(subscriptionId.toString(), filters)
    for (const { conn, read } of this.#conns.values()) {
      if (!read) {
        continue
      }
      conn.send({
        kind: OutgoingKind.Subscription,
        id: subscriptionId,
        filters,
      })
    }
    return subscriptionId
  }

  /**
   * Remove a subscription. If the subscription does not exist, an exception is thrown.
   *
   * TODO Reference subscribed()
   */
  async unsubscribe(subscriptionId: SubscriptionId): Promise<void> {
    if (!this.#subscriptions.delete(subscriptionId.toString())) {
      throw new Error(`subscription ${subscriptionId} does not exist`)
    }
    for (const { conn, read } of this.#conns.values()) {
      if (!read) {
        continue
      }
      conn.send({
        kind: OutgoingKind.Unsubscription,
        id: subscriptionId,
      })
    }
  }

  /**
   * Publish an event.
   */
  async publish(event: Event): Promise<void> {
    for (const { conn, write } of this.#conns.values()) {
      if (!write) {
        continue
      }
      conn.send({
        kind: OutgoingKind.Event,
        event,
      })
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

  static random(): SubscriptionId {
    return new SubscriptionId(secp.utils.randomBytes(32).toString())
  }

  toString() {
    return this.#id
  }
}

/**
 * A prefix filter. These filters match events which have the appropriate prefix.
 * This also means that exact matches pass the filters. No special syntax is required.
 */
export class Prefix<T> {
  #prefix: T

  constructor(prefix: T) {
    this.#prefix = prefix
  }

  toString(): string {
    return this.#prefix.toString()
  }
}

/**
 * Subscription filters. All filters from the fields must pass for a message to get through.
 */
export interface Filters {
  // TODO Document the filters, document that for the arrays only one is enough for the message to pass
  ids?: Prefix<EventId>[]
  authors?: Prefix<string>[]
  kinds?: EventKind[]
  /**
   * Filters for the "#e" tags.
   */
  eventTags?: EventId[]
  /**
   * Filters for the "#p" tags.
   */
  pubkeyTags?: PublicKey[]
  since?: Date
  until?: Date
  limit?: number
}

export type EventCallback = (params: EventParams, nostr: Nostr) => unknown
export type NoticeCallback = (notice: string, nostr: Nostr) => unknown
export type ErrorCallback = (error: ProtocolError, nostr: Nostr) => unknown

export interface EventParams {
  event: Event
  eventId: EventId
  subscriptionId: SubscriptionId
  raw: RawEvent
}
