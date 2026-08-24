import { v4 as uuid } from "uuid"
import { debugLog } from "./debug"
import type { WorkerMessage } from "./types"

const log = (msg: string, ...args: Array<any>) => debugLog("RelayChannel", msg, ...args)

/** Default time a follower waits for the leader to answer before giving up */
export const DEFAULT_CALL_TIMEOUT_MS = 2_000

/** Thrown when no leader answered a proxied command in time */
export class NoLeaderError extends Error {
  constructor(cmd: string) {
    super(`No leader answered "${cmd}" in time`)
    this.name = "NoLeaderError"
  }
}

type ChannelMessage =
  | { type: "rpc"; rpcId: string; msg: WorkerMessage<unknown>; expectReply: boolean }
  | { type: "reply"; rpcId: string; ok: true; args: unknown }
  | { type: "reply"; rpcId: string; ok: false; error: string }

/**
 * The subset of BroadcastChannel this module needs.
 * A port must never deliver a message back to the context that posted it.
 */
export interface ChannelPort {
  postMessage(msg: unknown): void
  onmessage: ((ev: { data: unknown }) => void) | null
  close(): void
}

export type ChannelPortFactory = (name: string) => ChannelPort

const defaultPortFactory: ChannelPortFactory = name => new BroadcastChannel(name) as unknown as ChannelPort

/**
 * Cross-tab command transport between the leader (which owns the database) and
 * followers (which own nothing and forward everything).
 *
 * Only the leader calls {@link serve}, so a follower's broadcast is answered exactly once.
 */
export class RelayChannel {
  #port: ChannelPort
  #pending = new Map<
    string,
    { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >()
  #handler?: (msg: WorkerMessage<unknown>) => Promise<unknown>

  constructor(name: string, portFactory: ChannelPortFactory = defaultPortFactory) {
    this.#port = portFactory(name)
    this.#port.onmessage = ev => this.#onMessage(ev.data as ChannelMessage)
  }

  /** Answer commands broadcast by followers. Called by the leader only. */
  serve(handler: (msg: WorkerMessage<unknown>) => Promise<unknown>) {
    this.#handler = handler
  }

  /** Stop answering commands, e.g. after losing/releasing ownership */
  stopServing() {
    this.#handler = undefined
  }

  /** Forward a command to the leader and wait for its result */
  call<T>(msg: WorkerMessage<unknown>, timeoutMs = DEFAULT_CALL_TIMEOUT_MS): Promise<T> {
    const rpcId = uuid()
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(rpcId)
        reject(new NoLeaderError(msg.cmd))
      }, timeoutMs)
      this.#pending.set(rpcId, { resolve, reject, timer })
      this.#port.postMessage({ type: "rpc", rpcId, msg, expectReply: true } satisfies ChannelMessage)
    })
  }

  /** Forward a command to the leader without waiting for a result */
  notify(msg: WorkerMessage<unknown>) {
    this.#port.postMessage({ type: "rpc", rpcId: uuid(), msg, expectReply: false } satisfies ChannelMessage)
  }

  close() {
    for (const [, p] of this.#pending) {
      clearTimeout(p.timer)
      p.reject(new Error("Channel closed"))
    }
    this.#pending.clear()
    this.#handler = undefined
    this.#port.onmessage = null
    this.#port.close()
  }

  async #onMessage(data: ChannelMessage) {
    if (data.type === "reply") {
      const pending = this.#pending.get(data.rpcId)
      if (!pending) return
      clearTimeout(pending.timer)
      this.#pending.delete(data.rpcId)
      if (data.ok) {
        pending.resolve(data.args)
      } else {
        pending.reject(new Error(data.error))
      }
      return
    }

    // An rpc from a follower; ignored unless we are the leader
    const handler = this.#handler
    if (!handler) return
    try {
      const args = await handler(data.msg)
      if (data.expectReply) {
        this.#port.postMessage({ type: "reply", rpcId: data.rpcId, ok: true, args } satisfies ChannelMessage)
      }
    } catch (e) {
      log(`Failed to serve ${data.msg.cmd}`, e)
      if (data.expectReply) {
        const error = e instanceof Error ? e.message : String(e)
        this.#port.postMessage({ type: "reply", rpcId: data.rpcId, ok: false, error } satisfies ChannelMessage)
      }
    }
  }
}

/** Channel name for the database at `path` */
export function relayChannelName(path: string) {
  return `snort:worker-relay:${path}`
}
