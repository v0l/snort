import Base from "events"
import { Nostr, SubscriptionId } from "."
import { EventId, Event } from "../event"

/**
 * Overrides providing better types for EventEmitter methods.
 */
export class EventEmitter extends Base {
  constructor() {
    super({ captureRejections: true })
  }

  override addListener(eventName: "newListener", listener: NewListener): this
  override addListener(
    eventName: "removeListener",
    listener: RemoveListener
  ): this
  override addListener(eventName: "open", listener: OpenListener): this
  override addListener(eventName: "close", listener: CloseListener): this
  override addListener(eventName: "event", listener: EventListener): this
  override addListener(eventName: "notice", listener: NoticeListener): this
  override addListener(eventName: "ok", listener: OkListener): this
  override addListener(eventName: "eose", listener: EoseListener): this
  override addListener(eventName: "error", listener: ErrorListener): this
  override addListener(eventName: EventName, listener: Listener): this {
    return super.addListener(eventName, listener)
  }

  override emit(eventName: "newListener", listener: NewListener): boolean
  override emit(eventName: "removeListener", listener: RemoveListener): boolean
  override emit(eventName: "open", relay: URL, nostr: Nostr): boolean
  override emit(eventName: "close", relay: URL, nostr: Nostr): boolean
  override emit(eventName: "event", params: EventParams, nostr: Nostr): boolean
  override emit(eventName: "notice", notice: string, nostr: Nostr): boolean
  override emit(eventName: "ok", params: OkParams, nostr: Nostr): boolean
  override emit(
    eventName: "eose",
    subscriptionId: SubscriptionId,
    nostr: Nostr
  ): boolean
  override emit(eventName: "error", err: unknown, nostr: Nostr): boolean
  override emit(eventName: EventName, ...args: unknown[]): boolean {
    return super.emit(eventName, ...args)
  }

  override eventNames(): EventName[] {
    return super.eventNames() as EventName[]
  }

  override listeners(eventName: "newListener"): EventListener[]
  override listeners(eventName: "removeListener"): EventListener[]
  override listeners(eventName: "open"): OpenListener[]
  override listeners(eventName: "close"): CloseListener[]
  override listeners(eventName: "event"): EventListener[]
  override listeners(eventName: "notice"): NoticeListener[]
  override listeners(eventName: "ok"): OkListener[]
  override listeners(eventName: "eose"): EoseListener[]
  override listeners(eventName: "error"): ErrorListener[]
  override listeners(eventName: EventName): Listener[] {
    return super.listeners(eventName) as Listener[]
  }

  override off(eventName: "newListener", listener: NewListener): this
  override off(eventName: "removeListener", listener: RemoveListener): this
  override off(eventName: "open", listener: OpenListener): this
  override off(eventName: "close", listener: CloseListener): this
  override off(eventName: "event", listener: EventListener): this
  override off(eventName: "notice", listener: NoticeListener): this
  override off(eventName: "ok", listener: OkListener): this
  override off(eventName: "eose", listener: EoseListener): this
  override off(eventName: "error", listener: ErrorListener): this
  override off(eventName: EventName, listener: Listener): this {
    return super.off(eventName, listener)
  }

  override on(eventName: "newListener", listener: NewListener): this
  override on(eventName: "removeListener", listener: RemoveListener): this
  override on(eventName: "open", listener: OpenListener): this
  override on(eventName: "close", listener: CloseListener): this
  override on(eventName: "event", listener: EventListener): this
  override on(eventName: "notice", listener: NoticeListener): this
  override on(eventName: "ok", listener: OkListener): this
  override on(eventName: "eose", listener: EoseListener): this
  override on(eventName: "error", listener: ErrorListener): this
  override on(eventName: EventName, listener: Listener): this {
    return super.on(eventName, listener)
  }

  override once(eventName: "newListener", listener: NewListener): this
  override once(eventName: "removeListener", listener: RemoveListener): this
  override once(eventName: "open", listener: OpenListener): this
  override once(eventName: "close", listener: CloseListener): this
  override once(eventName: "event", listener: EventListener): this
  override once(eventName: "notice", listener: NoticeListener): this
  override once(eventName: "ok", listener: OkListener): this
  override once(eventName: "eose", listener: EoseListener): this
  override once(eventName: "error", listener: ErrorListener): this
  override once(eventName: EventName, listener: Listener): this {
    return super.once(eventName, listener)
  }

  override prependListener(
    eventName: "newListener",
    listener: NewListener
  ): this
  override prependListener(
    eventName: "removeListener",
    listener: RemoveListener
  ): this
  override prependListener(eventName: "open", listener: OpenListener): this
  override prependListener(eventName: "close", listener: CloseListener): this
  override prependListener(eventName: "event", listener: EventListener): this
  override prependListener(eventName: "notice", listener: NoticeListener): this
  override prependListener(eventName: "ok", listener: OkListener): this
  override prependListener(eventName: "eose", listener: EoseListener): this
  override prependListener(eventName: "error", listener: ErrorListener): this
  override prependListener(eventName: EventName, listener: Listener): this {
    return super.prependListener(eventName, listener)
  }

  override prependOnceListener(
    eventName: "newListener",
    listener: NewListener
  ): this
  override prependOnceListener(
    eventName: "removeListener",
    listener: RemoveListener
  ): this
  override prependOnceListener(eventName: "open", listener: OpenListener): this
  override prependOnceListener(
    eventName: "close",
    listener: CloseListener
  ): this
  override prependOnceListener(
    eventName: "event",
    listener: EventListener
  ): this
  override prependOnceListener(
    eventName: "notice",
    listener: NoticeListener
  ): this
  override prependOnceListener(eventName: "ok", listener: OkListener): this
  override prependOnceListener(eventName: "eose", listener: EoseListener): this
  override prependOnceListener(
    eventName: "error",
    listener: ErrorListener
  ): this
  override prependOnceListener(eventName: EventName, listener: Listener): this {
    return super.prependOnceListener(eventName, listener)
  }

  override removeAllListeners(event?: EventName): this {
    return super.removeAllListeners(event)
  }

  override removeListener(eventName: "newListener", listener: NewListener): this
  override removeListener(
    eventName: "removeListener",
    listener: RemoveListener
  ): this
  override removeListener(eventName: "open", listener: OpenListener): this
  override removeListener(eventName: "close", listener: CloseListener): this
  override removeListener(eventName: "event", listener: EventListener): this
  override removeListener(eventName: "notice", listener: NoticeListener): this
  override removeListener(eventName: "ok", listener: OkListener): this
  override removeListener(eventName: "eose", listener: EoseListener): this
  override removeListener(eventName: "error", listener: ErrorListener): this
  override removeListener(eventName: EventName, listener: Listener): this {
    return super.removeListener(eventName, listener)
  }

  override rawListeners(eventName: EventName): Listener[] {
    return super.rawListeners(eventName) as Listener[]
  }
}

// TODO Refactor the params to always be a single interface
// TODO Params should always include relay as well
// TODO Params should not include Nostr, `this` should be Nostr
// TODO Ideas for events: "auth" for NIP-42 AUTH, "message" for the raw incoming messages,
// "publish" for published events, "send" for sent messages
type EventName =
  | "newListener"
  | "removeListener"
  | "open"
  | "close"
  | "event"
  | "notice"
  | "ok"
  | "eose"
  | "error"

type NewListener = (eventName: EventName, listener: Listener) => void
type RemoveListener = (eventName: EventName, listener: Listener) => void
type OpenListener = (relay: URL, nostr: Nostr) => void
type CloseListener = (relay: URL, nostr: Nostr) => void
type EventListener = (params: EventParams, nostr: Nostr) => void
type NoticeListener = (notice: string, nostr: Nostr) => void
type OkListener = (params: OkParams, nostr: Nostr) => void
type EoseListener = (subscriptionId: SubscriptionId, nostr: Nostr) => void
type ErrorListener = (error: unknown, nostr: Nostr) => void

type Listener =
  | NewListener
  | RemoveListener
  | OpenListener
  | CloseListener
  | EventListener
  | NoticeListener
  | OkListener
  | EoseListener
  | ErrorListener

// TODO Document this
export interface EventParams {
  event: Event
  subscriptionId: SubscriptionId
}

// TODO Document this
export interface OkParams {
  eventId: EventId
  relay: URL
  ok: boolean
  message: string
}
