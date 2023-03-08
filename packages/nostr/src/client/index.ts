import { ProtocolError } from "../error"
import { EventId, EventKind, RawEvent, parseEvent } from "../event"
import { PublicKey } from "../crypto"
import { Conn } from "./conn"
import * as secp from "@noble/secp256k1"
import { EventEmitter } from "./emitter"

/**
 * A nostr client.
 *
 * TODO Document the events here
 */
export class Nostr extends EventEmitter {
  // TODO NIP-44 AUTH, leave this for later
  /**
   * Open connections to relays.
   */
  readonly #conns: Map<string, ConnState> = new Map()

  /**
   * Mapping of subscription IDs to corresponding filters.
   */
  readonly #subscriptions: Map<SubscriptionId, Filters[]> = new Map()

  /**
   * Open a connection and start communicating with a relay. This method recreates all existing
   * subscriptions on the new relay as well. If there is already an existing connection,
   * this method will only update it with the new options, and an exception will be thrown
   * if no options are specified.
   */
  open(url: URL | string, opts?: { read?: boolean; write?: boolean }): void {
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

    const connUrl = new URL(url)

    // If there is no existing connection, open a new one.
    const conn = new Conn({
      url: connUrl,
      // Handle messages on this connection.
      onMessage: async (msg) => {
        try {
          if (msg.kind === "event") {
            this.emit(
              "event",
              {
                event: await parseEvent(msg.event),
                subscriptionId: msg.subscriptionId,
              },
              this
            )
          } else if (msg.kind === "notice") {
            this.emit("notice", msg.notice, this)
          } else if (msg.kind === "ok") {
            this.emit(
              "ok",
              {
                eventId: msg.eventId,
                relay: connUrl,
                ok: msg.ok,
                message: msg.message,
              },
              this
            )
          } else {
            throw new ProtocolError(`invalid message ${msg}`)
          }
        } catch (err) {
          this.emit("error", err, this)
        }
      },
      // Forward errors on this connection.
      onError: (err) => this.emit("error", err, this),
    })

    // Resend existing subscriptions to this connection.
    for (const [key, filters] of this.#subscriptions.entries()) {
      conn.send({
        kind: "openSubscription",
        id: key,
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
   * Close connections to relays.
   *
   * @param url If specified, only close the connection to this relay. If the connection does
   * not exist, an exception will be thrown. If this parameter is not specified, all connections
   * will be closed.
   *
   * TODO There needs to be a way to check connection state. isOpen(), isReady(), isClosing() maybe?
   * Because of how WebSocket states work this isn't as simple as it seems.
   */
  close(url?: URL | string): void {
    if (url === undefined) {
      for (const { conn } of this.#conns.values()) {
        conn.close()
      }
      this.#conns.clear()
      return
    }
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
    subscriptionId: SubscriptionId = randomSubscriptionId()
  ): SubscriptionId {
    this.#subscriptions.set(subscriptionId, filters)
    for (const { conn, read } of this.#conns.values()) {
      if (!read) {
        continue
      }
      conn.send({
        kind: "openSubscription",
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
    if (!this.#subscriptions.delete(subscriptionId)) {
      throw new Error(`subscription ${subscriptionId} does not exist`)
    }
    for (const { conn, read } of this.#conns.values()) {
      if (!read) {
        continue
      }
      conn.send({
        kind: "closeSubscription",
        id: subscriptionId,
      })
    }
  }

  /**
   * Publish an event.
   */
  async publish(event: RawEvent): Promise<void> {
    for (const { conn, write } of this.#conns.values()) {
      if (!write) {
        continue
      }
      conn.send({
        kind: "event",
        event,
      })
    }
  }
}

interface ConnState {
  conn: Conn
  /**
   * Has this connection been authenticated via NIP-44 AUTH?
   */
  auth: boolean
  /**
   * Should this connection be used for receiving events?
   */
  read: boolean
  /**
   * Should this connection be used for publishing events?
   */
  write: boolean
}

/**
 * A string uniquely identifying a client subscription.
 */
export type SubscriptionId = string

/**
 * Subscription filters. All filters from the fields must pass for a message to get through.
 */
export interface Filters {
  // TODO Document the filters, document that for the arrays only one is enough for the message to pass
  ids?: EventId[]
  authors?: string[]
  kinds?: EventKind[]
  /**
   * Filters for the "e" tags.
   */
  eventTags?: EventId[]
  /**
   * Filters for the "p" tags.
   */
  pubkeyTags?: PublicKey[]
  since?: Date | number
  until?: Date | number
  limit?: number
}

function randomSubscriptionId(): SubscriptionId {
  return secp.utils.bytesToHex(secp.utils.randomBytes(32))
}
