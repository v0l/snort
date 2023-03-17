import { ProtocolError } from "../error"
import { EventId, EventKind, RawEvent, parseEvent } from "../event"
import { PublicKey } from "../crypto"
import { Conn } from "./conn"
import * as secp from "@noble/secp256k1"
import { EventEmitter } from "./emitter"

// TODO The EventEmitter will call "error" by default if errors are thrown,
// but if there is no error listener it actually rethrows the error. Revisit
// the try/catch stuff to be consistent with this.

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
  async open(
    url: URL | string,
    opts?: { read?: boolean; write?: boolean; fetchInfo?: boolean }
  ): Promise<void> {
    const connUrl = new URL(url)

    // If the connection already exists, update the options.
    const existingConn = this.#conns.get(connUrl.toString())
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

    // Fetch the relay info in parallel to opening the WebSocket connection.
    const fetchInfo =
      opts?.fetchInfo === false
        ? Promise.resolve({})
        : this.#fetchRelayInfo(connUrl)

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
          } else if (msg.kind === "eose") {
            this.emit("eose", msg.subscriptionId, this)
          } else if (msg.kind === "auth") {
            // TODO This is incomplete
          } else {
            throw new ProtocolError(`invalid message ${JSON.stringify(msg)}`)
          }
        } catch (err) {
          this.emit("error", err, this)
        }
      },
      // Handle "open" events.
      onOpen: async () => {
        // Update the connection readyState.
        const conn = this.#conns.get(connUrl.toString())
        if (conn === undefined) {
          this.emit(
            "error",
            new Error(
              `bug: expected connection to ${connUrl.toString()} to be in the map`
            ),
            this
          )
        } else {
          if (conn.readyState !== ReadyState.CONNECTING) {
            this.emit(
              "error",
              new Error(
                `bug: expected connection to ${connUrl.toString()} to have readyState CONNECTING, got ${
                  conn.readyState
                }`
              ),
              this
            )
          }
          this.#conns.set(connUrl.toString(), {
            ...conn,
            readyState: ReadyState.OPEN,
            info: await fetchInfo,
          })
        }
        // Forward the event to the user.
        this.emit("open", connUrl, this)
      },
      // Handle "close" events.
      onClose: () => {
        // Update the connection readyState.
        const conn = this.#conns.get(connUrl.toString())
        if (conn === undefined) {
          this.emit(
            "error",
            new Error(
              `bug: expected connection to ${connUrl.toString()} to be in the map`
            ),
            this
          )
        } else {
          this.#conns.set(connUrl.toString(), {
            ...conn,
            readyState: ReadyState.CLOSED,
            info:
              conn.readyState === ReadyState.CONNECTING ? undefined : conn.info,
          })
        }
        // Forward the event to the user.
        this.emit("close", connUrl, this)
      },
      // Forward errors on this connection.
      onError: (err) => this.emit("error", err, this),
    })

    this.#conns.set(connUrl.toString(), {
      conn,
      auth: false,
      read: opts?.read ?? true,
      write: opts?.write ?? true,
      readyState: ReadyState.CONNECTING,
    })

    // Resend existing subscriptions to this connection.
    for (const [key, filters] of this.#subscriptions.entries()) {
      conn.send({
        kind: "openSubscription",
        id: key,
        filters,
      })
    }
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
    const connUrl = new URL(url)
    const c = this.#conns.get(connUrl.toString())
    if (c === undefined) {
      throw new Error(`connection to ${url} doesn't exist`)
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

  // TODO Test the readyState stuff
  /**
   * Get the relays which this client has tried to open connections to.
   */
  get relays(): Relay[] {
    return [...this.#conns.entries()].map(([url, c]) => {
      if (c.readyState === ReadyState.CONNECTING) {
        return {
          url: new URL(url),
          readyState: ReadyState.CONNECTING,
        }
      } else if (c.readyState === ReadyState.OPEN) {
        return {
          url: new URL(url),
          readyState: ReadyState.OPEN,
          info: c.info,
        }
      } else if (c.readyState === ReadyState.CLOSED) {
        return {
          url: new URL(url),
          readyState: ReadyState.CLOSED,
          info: c.info,
        }
      } else {
        throw new Error("bug: unknown readyState")
      }
    })
  }

  /**
   * Fetch the NIP-11 relay info with some reasonable timeout.
   */
  async #fetchRelayInfo(url: URL): Promise<RelayInfo> {
    url = new URL(url.toString().replace(/^ws/, "http"))
    try {
      const abort = new AbortController()
      const timeout = setTimeout(() => abort.abort(), 15_000)
      const res = await fetch(url, {
        signal: abort.signal,
        headers: {
          Accept: "application/nostr+json",
        },
      })
      clearTimeout(timeout)
      const info = await res.json()
      // Validate the known fields in the JSON.
      if (info.name !== undefined && typeof info.name !== "string") {
        info.name = undefined
        this.emit(
          "error",
          new ProtocolError(
            `invalid relay info, expected "name" to be a string: ${JSON.stringify(
              info
            )}`
          ),
          this
        )
      }
      if (
        info.description !== undefined &&
        typeof info.description !== "string"
      ) {
        info.description = undefined
        this.emit(
          "error",
          new ProtocolError(
            `invalid relay info, expected "description" to be a string: ${JSON.stringify(
              info
            )}`
          ),
          this
        )
      }
      if (info.pubkey !== undefined && typeof info.pubkey !== "string") {
        info.pubkey = undefined
        this.emit(
          "error",
          new ProtocolError(
            `invalid relay info, expected "pubkey" to be a string: ${JSON.stringify(
              info
            )}`
          ),
          this
        )
      }
      if (info.contact !== undefined && typeof info.contact !== "string") {
        info.contact = undefined
        this.emit(
          "error",
          new ProtocolError(
            `invalid relay info, expected "contact" to be a string: ${JSON.stringify(
              info
            )}`
          ),
          this
        )
      }
      if (info.supported_nips !== undefined) {
        if (info.supported_nips instanceof Array) {
          if (info.supported_nips.some((e: unknown) => typeof e !== "number")) {
            info.supported_nips = undefined
            this.emit(
              "error",
              new ProtocolError(
                `invalid relay info, expected "supported_nips" elements to be numbers: ${JSON.stringify(
                  info
                )}`
              ),
              this
            )
          }
        } else {
          info.supported_nips = undefined
          this.emit(
            "error",
            new ProtocolError(
              `invalid relay info, expected "supported_nips" to be an array: ${JSON.stringify(
                info
              )}`
            ),
            this
          )
        }
      }
      if (info.software !== undefined && typeof info.software !== "string") {
        info.software = undefined
        this.emit(
          "error",
          new ProtocolError(
            `invalid relay info, expected "software" to be a string: ${JSON.stringify(
              info
            )}`
          ),
          this
        )
      }
      if (info.version !== undefined && typeof info.version !== "string") {
        info.version = undefined
        this.emit(
          "error",
          new ProtocolError(
            `invalid relay info, expected "version" to be a string: ${JSON.stringify(
              info
            )}`
          ),
          this
        )
      }
      return info
    } catch (e) {
      this.emit("error", e, this)
      return {}
    }
  }
}

/**
 * The state of a relay connection.
 */
export enum ReadyState {
  /**
   * The connection has not been established yet.
   */
  CONNECTING = 0,
  /**
   * The connection has been established.
   */
  OPEN = 1,
  /**
   * The connection has been closed, forcefully or gracefully, by either party.
   */
  CLOSED = 2,
}

interface RelayCommon {
  url: URL
}

export type Relay = RelayCommon &
  (
    | {
        readyState: ReadyState.CONNECTING
      }
    | {
        readyState: ReadyState.OPEN
        info: RelayInfo
      }
    | {
        readyState: ReadyState.CLOSED
        /**
         * If the relay is closed before the opening process is fully finished,
         * the relay info may be undefined.
         */
        info?: RelayInfo
      }
  )

/**
 * The information that a relay broadcasts about itself.
 */
export interface RelayInfo {
  name?: string
  description?: string
  pubkey?: PublicKey
  contact?: string
  supported_nips?: number[]
  software?: string
  version?: string
  [key: string]: unknown
}

interface ConnStateCommon {
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

type ConnState = ConnStateCommon &
  (
    | {
        readyState: ReadyState.CONNECTING
      }
    | {
        readyState: ReadyState.OPEN
        info: RelayInfo
      }
    | {
        readyState: ReadyState.CLOSED
        info?: RelayInfo
      }
  )

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
