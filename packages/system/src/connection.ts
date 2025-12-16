import { v4 as uuid } from "uuid";
import debug from "debug";
import WebSocket from "isomorphic-ws";
import { unixNowMs } from "@snort/shared";
import { EventEmitter } from "eventemitter3";

import { DefaultConnectTimeout } from "./const";
import type { NostrEvent, OkResponse, ReqCommand, ReqFilter, TaggedNostrEvent } from "./nostr";
import EventKind from "./event-kind";
import { EventExt } from "./event-ext";
import type { ConnectionType, ConnectionTypeEvents } from "./connection-pool";
import { Nip11, type RelayInfoDocument } from "./impl/nip11";

/**
 * Relay settings
 */
export interface RelaySettings {
  read: boolean;
  write: boolean;
}

export class Connection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  #log: debug.Debugger;
  #ephemeralCheck?: ReturnType<typeof setInterval>;
  #activity: number = unixNowMs();
  #expectAuth = false;
  #ephemeral: boolean;
  #closing = false;
  #downCount = 0;
  #activeRequests = new Map<string, ReqCommand>();
  #connectStarted = false;
  #wasUp = false;

  id: string;
  readonly address: string;
  Socket: WebSocket | null = null;

  PendingRaw: Array<object> = [];

  settings: RelaySettings;
  info: RelayInfoDocument | undefined;
  ConnectTimeout: number = DefaultConnectTimeout;
  HasStateChange: boolean = true;
  ReconnectTimer?: ReturnType<typeof setTimeout>;
  EventsCallback: Map<string, (msg: Array<string | boolean>) => void>;

  AwaitingAuth: Map<string, boolean>;
  Authed = false;

  constructor(addr: string, options: RelaySettings, ephemeral: boolean = false) {
    super();
    this.id = uuid();
    this.address = addr;
    this.settings = options;
    this.EventsCallback = new Map();
    this.AwaitingAuth = new Map();
    this.#ephemeral = ephemeral;
    this.#log = debug("Connection").extend(addr);
  }

  get ephemeral() {
    return this.#ephemeral;
  }

  set ephemeral(v: boolean) {
    this.#ephemeral = v;
    this.#setupEphemeral();
  }

  get isOpen() {
    return this.Socket?.readyState === WebSocket.OPEN;
  }

  get isConnecting() {
    return this.Socket?.readyState === WebSocket.CONNECTING;
  }

  get isDown() {
    return this.#downCount > 0;
  }

  get ActiveRequests() {
    return [...this.#activeRequests.keys()];
  }

  async connect(awaitOpen = false) {
    // already connected
    if (this.isOpen || this.isConnecting) return;
    // wait for re-connect timer
    if (this.ReconnectTimer) return;
    // prevent race condition
    if (this.#connectStarted) return;
    this.#connectStarted = true;

    try {
      if (this.info === undefined) {
        this.info = await Nip11.loadRelayDocument(this.address);
      }
    } catch {
      // ignored
    }

    try {
      const wasReconnect = this.Socket !== null;
      if (this.Socket) {
        this.id = uuid();
        if (this.isOpen) {
          this.Socket.close();
        }
        this.Socket.onopen = null;
        this.Socket.onmessage = null;
        this.Socket.onerror = null;
        this.Socket.onclose = null;
        this.Socket = null;
      }
      this.Socket = new WebSocket(this.address);
      this.Socket.onopen = () => this.#onOpen(wasReconnect);
      this.Socket.onmessage = e => this.#onMessage(e);
      this.Socket.onerror = e => this.#onError(e);
      this.Socket.onclose = e => this.#onClose(e);
      if (awaitOpen) {
        await new Promise((resolve, reject) => {
          this.once("connected", resolve);
          this.once("disconnect", reject);
        });
      }
    } catch (e) {
      this.#connectStarted = false;
      throw e;
    }
  }

  close() {
    this.#closing = true;
    this.Socket?.close();
  }

  #onOpen(wasReconnect: boolean) {
    this.#downCount = 0;
    this.#connectStarted = false;
    this.#wasUp = true;
    this.#log(`Open!`);
    this.#setupEphemeral();
    this.emit("connected", wasReconnect);
    this.#sendPendingRaw();
  }

  #onClose(e: WebSocket.CloseEvent) {
    // Log close event details to console for debugging
    const closeMsg = `[${this.address}] WebSocket closed - Code: ${e.code}${e.reason ? `, Reason: ${e.reason}` : ""} (wasUp=${this.#wasUp}, connecting=${this.#connectStarted}, closing=${this.#closing})`;
    if (e.code !== 1000 && e.code !== 1001) {
      // Abnormal closure codes
      console.warn(closeMsg);
    } else {
      this.#log(closeMsg);
    }

    // if not explicity closed or closed after, start re-connect timer
    if (this.#wasUp && !this.#closing) {
      this.#downCount++;
      this.#reconnectTimer(e);
    } else {
      this.#downCount = 0;
      if (this.ReconnectTimer) {
        clearTimeout(this.ReconnectTimer);
        this.ReconnectTimer = undefined;
      }
    }

    this.emit("disconnect", e.code);
    this.#reset();
  }

  #reconnectTimer(e: WebSocket.CloseEvent) {
    if (this.ReconnectTimer) {
      clearTimeout(this.ReconnectTimer);
      this.ReconnectTimer = undefined;
    }
    this.ConnectTimeout = this.ConnectTimeout * 2;
    this.#log(
      `Closed (code=${e.code}), trying again in ${(this.ConnectTimeout / 1000).toFixed(0).toLocaleString()} sec`,
    );
    this.ReconnectTimer = setTimeout(() => {
      this.ReconnectTimer = undefined;
      try {
        this.connect();
      } catch {}
    }, this.ConnectTimeout);
  }

  #onMessage(e: WebSocket.MessageEvent) {
    this.#activity = unixNowMs();
    if ((e.data as string).length > 0) {
      const msg = JSON.parse(e.data as string) as Array<string | NostrEvent | boolean>;
      const tag = msg[0] as string;
      switch (tag) {
        case "AUTH": {
          if (this.#expectAuth) {
            this.#onAuthAsync(msg[1] as string)
              .then(() => this.#sendPendingRaw())
              .catch(this.#log);
            // todo: stats events received
          } else {
            this.#log("Ignoring unexpected AUTH request");
          }
          break;
        }
        case "EVENT": {
          const ev = {
            ...(msg[2] as NostrEvent),
            relays: [this.address],
          } as TaggedNostrEvent;

          if (!EventExt.isValid(ev)) {
            this.#log("Rejecting invalid event %O", ev);
            return;
          }
          this.emit("unverifiedEvent", msg[1] as string, ev);
          break;
        }
        case "EOSE": {
          this.emit("eose", msg[1] as string);
          break;
        }
        case "OK": {
          // feedback to broadcast call
          this.#log(`OK: %O`, msg);
          const id = msg[1] as string;
          const cb = this.EventsCallback.get(id);
          if (cb) {
            this.EventsCallback.delete(id);
            cb(msg as Array<string | boolean>);
          }
          break;
        }
        case "NOTICE": {
          this.emit("notice", msg[1] as string);
          this.#log(`NOTICE: ${msg[1]}`);
          break;
        }
        case "CLOSED": {
          this.emit("closed", msg[1] as string, msg[2] as string);
          this.#log(`CLOSED: ${msg.slice(1)}`);
          break;
        }
        default: {
          this.emit("unknownMessage", msg);
          break;
        }
      }
    }
  }

  #onError(e: WebSocket.ErrorEvent) {
    // WebSocket errors in browsers typically don't contain useful information
    // The close event will have more details (code and reason)
    if (e.error instanceof Error) {
      console.error(`[${this.address}] WebSocket error:`, e.error.message);
      this.#log("Error with details: %O", e.error);
    } else {
      console.warn(
        `[${this.address}] WebSocket error occurred (close event will contain more details). ReadyState: ${this.Socket?.readyState}`,
      );
      this.#log("Error event: %O", e);
    }
    this.emit("change");
    this.emit("error");
  }

  /**
   * Send event on this connection
   */
  sendEvent(e: NostrEvent) {
    if (!this.settings.write) {
      return;
    }
    this.#send(["EVENT", e]);
    // todo: stats events send
    this.emit("change");
  }

  /**
   * Send event on this connection and wait for OK response
   */
  async publish(e: NostrEvent, timeout = 5000) {
    return await new Promise<OkResponse>((resolve, reject) => {
      if (!this.settings.write) {
        reject(new Error("Not a write relay"));
        return;
      }

      if (this.EventsCallback.has(e.id)) {
        resolve({
          ok: false,
          id: e.id,
          relay: this.address,
          message: "Duplicate request",
          event: e,
        });
        return;
      }
      const t = setTimeout(() => {
        this.EventsCallback.delete(e.id);
        resolve({
          ok: false,
          id: e.id,
          relay: this.address,
          message: "Timeout waiting for OK response",
          event: e,
        });
      }, timeout);

      this.EventsCallback.set(e.id, msg => {
        clearTimeout(t);
        const [_, id, accepted, message] = msg;
        resolve({
          ok: accepted as boolean,
          id: id as string,
          relay: this.address,
          message: message as string | undefined,
          event: e,
        });
      });

      this.#send(["EVENT", e]);
      // todo: stats events send
      this.emit("change");
    });
  }

  /**
   * Using relay document to determine if this relay supports a feature
   */
  supportsNip(n: number) {
    return this.info?.supported_nips?.some(a => a === n) ?? false;
  }

  /**
   * Send command to the relay
   * @param cmd The REQ to send to the server
   * @param cbSent Callback when sent to relay
   */
  request(cmd: ReqCommand, cbSent?: () => void): void {
    const filters = cmd.slice(2) as Array<ReqFilter>;
    const requestKinds = new Set(filters.flatMap(a => a.kinds ?? []));
    const ExpectAuth = [EventKind.DirectMessage, EventKind.GiftWrap, 7000 as EventKind];
    if (ExpectAuth.some(a => requestKinds.has(a)) && !this.#expectAuth) {
      this.#expectAuth = true;
      this.#log("Setting expectAuth flag %o", requestKinds);
    }

    this.#sendRequestCommand(cmd);
    cbSent?.();
    this.emit("change");
  }

  closeRequest(id: string) {
    if (this.#activeRequests.has(id)) {
      this.#activeRequests.delete(id);
      this.#send(["CLOSE", id]);
      this.emit("eose", id);
      this.emit("change");
    }
  }

  get activeSubscriptions() {
    return this.#activeRequests.size;
  }

  get maxSubscriptions() {
    return this.info?.limitation?.max_subscriptions ?? 20;
  }

  #sendRequestCommand(cmd: ReqCommand) {
    try {
      this.#activeRequests.set(cmd[1], cmd);
      this.#send(cmd);
    } catch (e) {
      console.error(e);
    }
  }

  #reset() {
    // reset connection Id on disconnect, for query-tracking
    this.id = uuid();
    this.#expectAuth = false;
    this.#log("Reset active=%O, raw=%O", [...this.#activeRequests.keys()], [...this.PendingRaw]);
    for (const [id] of this.#activeRequests) {
      this.emit("closed", id, "connection closed");
    }
    for (const raw of this.PendingRaw) {
      if (Array.isArray(raw) && raw[0] === "REQ") {
        this.emit("closed", raw[1], "connection closed");
      }
    }
    this.#activeRequests.clear();
    this.PendingRaw = [];

    this.emit("change");
  }

  /**
   * Send raw json object on wire
   */
  sendRaw(obj: object) {
    this.#send(obj);
  }

  #send(obj: object) {
    const authPending = !this.Authed && (this.AwaitingAuth.size > 0 || this.info?.limitation?.auth_required === true);
    if (!this.isOpen || authPending) {
      this.PendingRaw.push(obj);
      return false;
    }

    this.#sendPendingRaw();
    this.#sendOnWire(obj);
  }

  #sendPendingRaw() {
    while (this.PendingRaw.length > 0) {
      const next = this.PendingRaw.shift();
      if (next) {
        this.#sendOnWire(next);
      }
    }
  }

  #sendOnWire(obj: unknown) {
    if (this.Socket?.readyState !== WebSocket.OPEN) {
      throw new Error(`Socket is not open, state is ${this.Socket?.readyState}`);
    }
    const json = JSON.stringify(obj);
    this.#activity = unixNowMs();
    this.Socket.send(json);
    return true;
  }

  async #onAuthAsync(challenge: string): Promise<void> {
    const authCleanup = () => {
      this.AwaitingAuth.delete(challenge);
    };
    this.AwaitingAuth.set(challenge, true);
    const authEvent = await new Promise<NostrEvent>((resolve, reject) =>
      this.emit("auth", challenge, this.address, resolve),
    );
    this.#log("Auth result: %o", authEvent);
    if (!authEvent) {
      authCleanup();
      throw new Error("No auth event");
    }

    return await new Promise(resolve => {
      const t = setTimeout(() => {
        authCleanup();
        resolve();
      }, 10_000);

      this.EventsCallback.set(authEvent.id, msg => {
        clearTimeout(t);
        authCleanup();
        if (msg.length > 3 && msg[2] === true) {
          this.Authed = true;
          // Resend all active requests after successful auth
          this.#log("Auth successful, resending %d active requests", this.#activeRequests.size);
          for (const [, cmd] of this.#activeRequests) {
            this.#sendOnWire(cmd);
          }
        }
        resolve();
      });

      this.#sendOnWire(["AUTH", authEvent]);
    });
  }

  #setupEphemeral() {
    if (this.#ephemeralCheck) {
      clearInterval(this.#ephemeralCheck);
      this.#ephemeralCheck = undefined;
    }
    if (this.ephemeral) {
      this.#ephemeralCheck = setInterval(() => {
        const lastActivity = unixNowMs() - this.#activity;
        if (lastActivity > 10_000 && !this.#closing) {
          if (this.#activeRequests.size > 0) {
            this.#log(
              "Inactive connection has %d active requests! %O",
              this.#activeRequests.size,
              this.#activeRequests,
            );
          } else {
            this.close();
          }
        }
      }, 5_000);
    }
  }
}
