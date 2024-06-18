import { v4 as uuid } from "uuid";
import debug from "debug";
import WebSocket from "isomorphic-ws";
import { unixNowMs } from "@snort/shared";
import { EventEmitter } from "eventemitter3";

import { DefaultConnectTimeout } from "./const";
import { NostrEvent, OkResponse, ReqCommand, ReqFilter, TaggedNostrEvent, u256 } from "./nostr";
import { RelayInfo } from "./relay-info";
import EventKind from "./event-kind";
import { EventExt } from "./event-ext";
import { ConnectionType, ConnectionTypeEvents } from "./connection-pool";
import { ConnectionSyncModule } from "./sync/connection";

/**
 * Relay settings
 */
export interface RelaySettings {
  read: boolean;
  write: boolean;
}

/**
 * SYNC command is an internal command that requests the connection to devise a strategy
 * to synchronize based on a set of existing cached events and a filter set.
 */
export type SyncCommand = ["SYNC", id: string, fromSet: Array<TaggedNostrEvent>, ...filters: Array<ReqFilter>];

/**
 * Pending REQ queue
 */
interface ConnectionQueueItem {
  obj: ReqCommand | SyncCommand;
  cb?: () => void;
}

export class Connection extends EventEmitter<ConnectionTypeEvents> implements ConnectionType {
  #log: debug.Debugger;
  #ephemeralCheck?: ReturnType<typeof setInterval>;
  #activity: number = unixNowMs();
  #expectAuth = false;
  #ephemeral: boolean;
  #closing = false;
  #downCount = 0;
  #activeRequests = new Set<string>();
  #connectStarted = false;
  #syncModule?: ConnectionSyncModule;

  id: string;
  readonly address: string;
  Socket: WebSocket | null = null;

  PendingRaw: Array<object> = [];
  PendingRequests: Array<ConnectionQueueItem> = [];

  settings: RelaySettings;
  info: RelayInfo | undefined;
  ConnectTimeout: number = DefaultConnectTimeout;
  HasStateChange: boolean = true;
  ReconnectTimer?: ReturnType<typeof setTimeout>;
  EventsCallback: Map<u256, (msg: Array<string | boolean>) => void>;

  AwaitingAuth: Map<string, boolean>;
  Authed = false;

  constructor(addr: string, options: RelaySettings, ephemeral: boolean = false, syncModule?: ConnectionSyncModule) {
    super();
    this.id = uuid();
    this.address = addr;
    this.settings = options;
    this.EventsCallback = new Map();
    this.AwaitingAuth = new Map();
    this.#ephemeral = ephemeral;
    this.#syncModule = syncModule;
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
    return [...this.#activeRequests];
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
        const u = new URL(this.address);
        const rsp = await fetch(`${u.protocol === "wss:" ? "https:" : "http:"}//${u.host}`, {
          headers: {
            accept: "application/nostr+json",
          },
        });
        if (rsp.ok) {
          const data = await rsp.json();
          for (const [k, v] of Object.entries(data)) {
            if (v === "unset" || v === "" || v === "~") {
              data[k] = undefined;
            }
          }
          this.info = data;
        }
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
        await new Promise(resolve => this.once("connected", resolve));
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
    this.#log(`Open!`);
    this.#setupEphemeral();
    this.emit("connected", wasReconnect);
    this.#sendPendingRaw();
  }

  #onClose(e: WebSocket.CloseEvent) {
    // remote server closed the connection, dont re-connect
    if (!this.#closing) {
      this.#downCount++;
      this.#reconnectTimer(e);
    } else {
      this.#log(`Closed!`);
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
      } catch {
        this.emit("disconnect", -1);
      }
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
          this.emit("event", msg[1] as string, ev);
          // todo: stats events received
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

  #onError(e: WebSocket.Event) {
    this.#log("Error: %O", e);
    this.emit("change");
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
   * Queue or send command to the relay
   * @param cmd The REQ to send to the server
   */
  request(cmd: ReqCommand | SyncCommand, cbSent?: () => void) {
    const filters = (cmd[0] === "REQ" ? cmd.slice(2) : cmd.slice(3)) as Array<ReqFilter>;
    const requestKinds = new Set(filters.flatMap(a => a.kinds ?? []));
    const ExpectAuth = [EventKind.DirectMessage, EventKind.GiftWrap];
    if (ExpectAuth.some(a => requestKinds.has(a)) && !this.#expectAuth) {
      this.#expectAuth = true;
      this.#log("Setting expectAuth flag %o", requestKinds);
    }
    if (this.#activeRequests.size >= this.#maxSubscriptions) {
      this.PendingRequests.push({
        obj: cmd,
        cb: cbSent,
      });
      this.#log("Queuing: %O", cmd);
    } else {
      this.#sendRequestCommand({
        obj: cmd,
        cb: cbSent,
      });
      cbSent?.();
    }
    this.emit("change");
  }

  closeRequest(id: string) {
    if (this.#activeRequests.delete(id)) {
      this.#send(["CLOSE", id]);
      this.emit("eose", id);
      this.#sendQueuedRequests();
      this.emit("change");
    }
  }

  #sendQueuedRequests() {
    const canSend = this.#maxSubscriptions - this.#activeRequests.size;
    if (canSend > 0) {
      for (let x = 0; x < canSend; x++) {
        const p = this.PendingRequests.shift();
        if (p) {
          this.#sendRequestCommand(p);
          this.#log("Sent pending REQ %O", p.obj);
        }
      }
    }
  }

  #sendRequestCommand(item: ConnectionQueueItem) {
    try {
      const cmd = item.obj;
      if (cmd[0] === "REQ") {
        this.#activeRequests.add(cmd[1]);
        this.#send(cmd);
      } else if (cmd[0] === "SYNC") {
        if (!this.#syncModule) {
          throw new Error("no sync module");
        }
        this.#syncModule.sync(this, cmd, item.cb);
      }
    } catch (e) {
      console.error(e);
    }
  }

  #reset() {
    // reset connection Id on disconnect, for query-tracking
    this.id = uuid();
    this.#expectAuth = false;
    this.#log(
      "Reset active=%O, pending=%O, raw=%O",
      [...this.#activeRequests],
      [...this.PendingRequests],
      [...this.PendingRaw],
    );
    for (const active of this.#activeRequests) {
      this.emit("closed", active, "connection closed");
    }
    for (const pending of this.PendingRequests) {
      this.emit("closed", pending.obj[1], "connection closed");
    }
    for (const raw of this.PendingRaw) {
      if (Array.isArray(raw) && raw[0] === "REQ") {
        this.emit("closed", raw[1], "connection closed");
      }
    }
    this.#activeRequests.clear();
    this.PendingRequests = [];
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
        }
        resolve();
      });

      this.#sendOnWire(["AUTH", authEvent]);
    });
  }

  get #maxSubscriptions() {
    return this.info?.limitation?.max_subscriptions ?? 20;
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
