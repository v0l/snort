import { NostrError } from "../common"
import { RawEvent, parseEvent } from "../event"
import { Conn } from "./conn"
import * as utils from "@noble/curves/abstract/utils"
import { EventEmitter } from "./emitter"
import { fetchRelayInfo, ReadyState, Relay } from "./relay"
import { Filters } from "../filters"

/**
 * A nostr client.
 *
 * TODO Document the events here
 * TODO When document this type, remember to explicitly say that promise rejections will also be routed to "error"!
 */
export class Nostr extends EventEmitter {
  static get CONNECTING(): ReadyState.CONNECTING {
    return ReadyState.CONNECTING
  }

  static get OPEN(): ReadyState.OPEN {
    return ReadyState.OPEN
  }

  static get CLOSED(): ReadyState.CLOSED {
    return ReadyState.CLOSED
  }

  /**
   * Open connections to relays.
   */
  readonly #conns: ConnState[] = []

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
  open(
    url: URL | string,
    opts?: { read?: boolean; write?: boolean; fetchInfo?: boolean },
  ): void {
    const relayUrl = new URL(url)

    // If the connection already exists, update the options.
    const existingConn = this.#conns.find(
      (c) => c.relay.url.toString() === relayUrl.toString(),
    )
    if (existingConn !== undefined) {
      if (opts === undefined) {
        throw new NostrError(
          `called connect with existing connection ${url}, but options were not specified`,
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

    // Fetch the relay info in parallel to opening the WebSocket connection.
    const fetchInfo =
      opts?.fetchInfo === false
        ? Promise.resolve({})
        : fetchRelayInfo(relayUrl).catch((e) => {
            this.#error(e)
            return {}
          })

    // If there is no existing connection, open a new one.
    const conn = new Conn({
      url: relayUrl,

      // Handle messages on this connection.
      onMessage: (msg) => {
        if (msg.kind === "event") {
          this.emit(
            "event",
            {
              event: parseEvent(msg.event),
              subscriptionId: msg.subscriptionId,
            },
            this,
          )
        } else if (msg.kind === "notice") {
          this.emit("notice", msg.notice, this)
        } else if (msg.kind === "ok") {
          this.emit(
            "ok",
            {
              eventId: msg.eventId,
              relay: relayUrl,
              ok: msg.ok,
              message: msg.message,
            },
            this,
          )
        } else if (msg.kind === "eose") {
          this.emit("eose", msg.subscriptionId, this)
        } else if (msg.kind === "auth") {
          // TODO This is incomplete
        } else {
          this.#error(new NostrError(`invalid message ${JSON.stringify(msg)}`))
        }
      },

      // Handle "open" events.
      onOpen: async () => {
        // Update the connection readyState.
        const conn = this.#conns.find(
          (c) => c.relay.url.toString() === relayUrl.toString(),
        )
        if (conn === undefined) {
          this.#error(
            new NostrError(
              `bug: expected connection to ${relayUrl.toString()} to be in the map`,
            ),
          )
        } else {
          if (conn.relay.readyState !== ReadyState.CONNECTING) {
            this.#error(
              new NostrError(
                `bug: expected connection to ${relayUrl.toString()} to have readyState CONNECTING, got ${
                  conn.relay.readyState
                }`,
              ),
            )
          }
          conn.relay = {
            ...conn.relay,
            readyState: ReadyState.OPEN,
            info: await fetchInfo,
          }
        }
        // Forward the event to the user.
        this.emit("open", relayUrl, this)
      },

      // Handle "close" events.
      onClose: () => {
        // Update the connection readyState.
        const conn = this.#conns.find(
          (c) => c.relay.url.toString() === relayUrl.toString(),
        )
        if (conn === undefined) {
          this.#error(
            new NostrError(
              `bug: expected connection to ${relayUrl.toString()} to be in the map`,
            ),
          )
        } else {
          conn.relay.readyState = ReadyState.CLOSED
        }
        // Forward the event to the user.
        this.emit("close", relayUrl, this)
      },

      // TODO If there is no error handler, this will silently swallow the error. Maybe have an
      // #onError method which re-throws if emit() returns false? This should at least make
      // some noise.
      // Forward errors on this connection.
      onError: (err) => this.#error(err),
    })

    // Resend existing subscriptions to this connection.
    for (const [key, filters] of this.#subscriptions.entries()) {
      conn.send({
        kind: "openSubscription",
        id: key,
        filters,
      })
    }

    this.#conns.push({
      relay: {
        url: relayUrl,
        readyState: ReadyState.CONNECTING,
      },
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
   */
  close(url?: URL | string): void {
    if (url === undefined) {
      for (const { conn } of this.#conns.values()) {
        conn.close()
      }
      return
    }
    const relayUrl = new URL(url)
    const c = this.#conns.find(
      (c) => c.relay.url.toString() === relayUrl.toString(),
    )
    if (c === undefined) {
      throw new NostrError(`connection to ${url} doesn't exist`)
    }
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
    subscriptionId: SubscriptionId = randomSubscriptionId(),
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
  unsubscribe(subscriptionId: SubscriptionId): void {
    if (!this.#subscriptions.delete(subscriptionId)) {
      throw new NostrError(`subscription ${subscriptionId} does not exist`)
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
  publish(event: RawEvent): void {
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

  /**
   * Get the relays which this client has tried to open connections to.
   */
  get relays(): Relay[] {
    return this.#conns.map(({ relay }) => {
      if (relay.readyState === ReadyState.CONNECTING) {
        return { ...relay }
      } else {
        const info =
          relay.info === undefined
            ? undefined
            : // Deep copy of the info.
              JSON.parse(JSON.stringify(relay.info))
        return { ...relay, info }
      }
    })
  }

  #error(e: unknown) {
    if (!this.emit("error", e, this)) {
      throw e
    }
  }
}

interface ConnState {
  relay: Relay
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

function randomSubscriptionId(): SubscriptionId {
  return utils.bytesToHex(globalThis.crypto.getRandomValues(new Uint8Array(32)))
}
