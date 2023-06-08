import { v4 as uuid } from "uuid";

import { DefaultConnectTimeout } from "./Const";
import { ConnectionStats } from "./ConnectionStats";
import { NostrEvent, ReqCommand, TaggedRawEvent, u256 } from "./Nostr";
import { RelayInfo } from "./RelayInfo";
import { unwrap } from "./Util";
import ExternalStore from "./ExternalStore";

export type AuthHandler = (challenge: string, relay: string) => Promise<NostrEvent | undefined>;

/**
 * Relay settings
 */
export interface RelaySettings {
  read: boolean;
  write: boolean;
}

/**
 * Snapshot of connection stats
 */
export interface ConnectionStateSnapshot {
  connected: boolean;
  disconnects: number;
  avgLatency: number;
  events: {
    received: number;
    send: number;
  };
  settings?: RelaySettings;
  info?: RelayInfo;
  pendingRequests: Array<string>;
  activeRequests: Array<string>;
  id: string;
  ephemeral: boolean;
  address: string;
}

export class Connection extends ExternalStore<ConnectionStateSnapshot> {
  Id: string;
  Address: string;
  Socket: WebSocket | null = null;

  PendingRaw: Array<object> = [];
  PendingRequests: Array<{
    cmd: ReqCommand;
    cb: () => void;
  }> = [];
  ActiveRequests = new Set<string>();

  Settings: RelaySettings;
  Info?: RelayInfo;
  ConnectTimeout: number = DefaultConnectTimeout;
  Stats: ConnectionStats = new ConnectionStats();
  HasStateChange: boolean = true;
  IsClosed: boolean;
  ReconnectTimer: ReturnType<typeof setTimeout> | null;
  EventsCallback: Map<u256, (msg: boolean[]) => void>;
  OnConnected?: () => void;
  OnEvent?: (sub: string, e: TaggedRawEvent) => void;
  OnEose?: (sub: string) => void;
  OnDisconnect?: (id: string) => void;
  Auth?: AuthHandler;
  AwaitingAuth: Map<string, boolean>;
  Authed = false;
  Ephemeral: boolean;
  EphemeralTimeout: ReturnType<typeof setTimeout> | undefined;
  Down = true;

  constructor(addr: string, options: RelaySettings, auth?: AuthHandler, ephemeral: boolean = false) {
    super();
    this.Id = uuid();
    this.Address = addr;
    this.Settings = options;
    this.IsClosed = false;
    this.ReconnectTimer = null;
    this.EventsCallback = new Map();
    this.AwaitingAuth = new Map();
    this.Auth = auth;
    this.Ephemeral = ephemeral;
  }

  ResetEphemeralTimeout() {
    if (this.EphemeralTimeout) {
      clearTimeout(this.EphemeralTimeout);
    }
    if (this.Ephemeral) {
      this.EphemeralTimeout = setTimeout(() => {
        this.Close();
      }, 30_000);
    }
  }

  async Connect() {
    try {
      if (this.Info === undefined) {
        const u = new URL(this.Address);
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
          this.Info = data;
        }
      }
    } catch (e) {
      console.warn("Could not load relay information", e);
    }

    if (this.Socket) {
      this.Id = uuid();
      this.Socket.onopen = null;
      this.Socket.onmessage = null;
      this.Socket.onerror = null;
      this.Socket.onclose = null;
    }
    this.IsClosed = false;
    this.Socket = new WebSocket(this.Address);
    this.Socket.onopen = () => this.OnOpen();
    this.Socket.onmessage = e => this.OnMessage(e);
    this.Socket.onerror = e => this.OnError(e);
    this.Socket.onclose = e => this.OnClose(e);
  }

  Close() {
    this.IsClosed = true;
    if (this.ReconnectTimer !== null) {
      clearTimeout(this.ReconnectTimer);
      this.ReconnectTimer = null;
    }
    this.Socket?.close();
    this.notifyChange();
  }

  OnOpen() {
    this.ConnectTimeout = DefaultConnectTimeout;
    console.log(`[${this.Address}] Open!`);
    this.Down = false;
    if (this.Ephemeral) {
      this.ResetEphemeralTimeout();
    }
    this.OnConnected?.();
    this.#sendPendingRaw();
  }

  OnClose(e: CloseEvent) {
    if (!this.IsClosed) {
      this.ConnectTimeout = this.ConnectTimeout * 2;
      console.log(
        `[${this.Address}] Closed (${e.reason}), trying again in ${(this.ConnectTimeout / 1000)
          .toFixed(0)
          .toLocaleString()} sec`
      );
      this.ReconnectTimer = setTimeout(() => {
        this.Connect();
      }, this.ConnectTimeout);
      this.Stats.Disconnects++;
    } else {
      console.log(`[${this.Address}] Closed!`);
      this.ReconnectTimer = null;
    }

    this.OnDisconnect?.(this.Id);
    this.#ResetQueues();
    // reset connection Id on disconnect, for query-tracking
    this.Id = uuid();
    this.notifyChange();
  }

  OnMessage(e: MessageEvent) {
    if (e.data.length > 0) {
      const msg = JSON.parse(e.data);
      const tag = msg[0];
      switch (tag) {
        case "AUTH": {
          this._OnAuthAsync(msg[1])
            .then(() => this.#sendPendingRaw())
            .catch(console.error);
          this.Stats.EventsReceived++;
          this.notifyChange();
          break;
        }
        case "EVENT": {
          this.OnEvent?.(msg[1], {
            ...msg[2],
            relays: [this.Address],
          });
          this.Stats.EventsReceived++;
          this.notifyChange();
          break;
        }
        case "EOSE": {
          this.OnEose?.(msg[1]);
          break;
        }
        case "OK": {
          // feedback to broadcast call
          console.debug(`${this.Address} OK: `, msg);
          const id = msg[1];
          if (this.EventsCallback.has(id)) {
            const cb = unwrap(this.EventsCallback.get(id));
            this.EventsCallback.delete(id);
            cb(msg);
          }
          break;
        }
        case "NOTICE": {
          console.warn(`[${this.Address}] NOTICE: ${msg[1]}`);
          break;
        }
        default: {
          console.warn(`Unknown tag: ${tag}`);
          break;
        }
      }
    }
  }

  OnError(e: Event) {
    console.error(e);
    this.notifyChange();
  }

  /**
   * Send event on this connection
   */
  SendEvent(e: NostrEvent) {
    if (!this.Settings.write) {
      return;
    }
    const req = ["EVENT", e];
    this.#SendJson(req);
    this.Stats.EventsSent++;
    this.notifyChange();
  }

  /**
   * Send event on this connection and wait for OK response
   */
  async SendAsync(e: NostrEvent, timeout = 5000) {
    return new Promise<void>(resolve => {
      if (!this.Settings.write) {
        resolve();
        return;
      }
      const t = setTimeout(() => {
        resolve();
      }, timeout);
      this.EventsCallback.set(e.id, () => {
        clearTimeout(t);
        resolve();
      });

      const req = ["EVENT", e];
      this.#SendJson(req);
      this.Stats.EventsSent++;
      this.notifyChange();
    });
  }

  /**
   * Using relay document to determine if this relay supports a feature
   */
  SupportsNip(n: number) {
    return this.Info?.supported_nips?.some(a => a === n) ?? false;
  }

  /**
   * Queue or send command to the relay
   * @param cmd The REQ to send to the server
   */
  QueueReq(cmd: ReqCommand, cbSent: () => void) {
    if (this.ActiveRequests.size >= this.#maxSubscriptions) {
      this.PendingRequests.push({
        cmd,
        cb: cbSent,
      });
      console.debug("Queuing:", this.Address, cmd);
    } else {
      this.ActiveRequests.add(cmd[1]);
      this.#SendJson(cmd);
      cbSent();
    }
    this.notifyChange();
  }

  CloseReq(id: string) {
    if (this.ActiveRequests.delete(id)) {
      this.#SendJson(["CLOSE", id]);
      this.OnEose?.(id);
      this.#SendQueuedRequests();
    }
    this.notifyChange();
  }

  takeSnapshot(): ConnectionStateSnapshot {
    return {
      connected: this.Socket?.readyState === WebSocket.OPEN,
      events: {
        received: this.Stats.EventsReceived,
        send: this.Stats.EventsSent,
      },
      avgLatency:
        this.Stats.Latency.length > 0
          ? this.Stats.Latency.reduce((acc, v) => acc + v, 0) / this.Stats.Latency.length
          : 0,
      disconnects: this.Stats.Disconnects,
      info: this.Info,
      id: this.Id,
      pendingRequests: [...this.PendingRequests.map(a => a.cmd[1])],
      activeRequests: [...this.ActiveRequests],
      ephemeral: this.Ephemeral,
      address: this.Address,
    };
  }

  #SendQueuedRequests() {
    const canSend = this.#maxSubscriptions - this.ActiveRequests.size;
    if (canSend > 0) {
      for (let x = 0; x < canSend; x++) {
        const p = this.PendingRequests.shift();
        if (p) {
          this.ActiveRequests.add(p.cmd[1]);
          this.#SendJson(p.cmd);
          p.cb();
          console.debug("Sent pending REQ", this.Address, p.cmd);
        }
      }
    }
  }

  #ResetQueues() {
    this.ActiveRequests.clear();
    this.PendingRequests = [];
    this.PendingRaw = [];
    this.notifyChange();
  }

  #SendJson(obj: object) {
    const authPending = !this.Authed && (this.AwaitingAuth.size > 0 || this.Info?.limitation?.auth_required === true);
    if (this.Socket?.readyState !== WebSocket.OPEN || authPending) {
      this.PendingRaw.push(obj);
      if (this.Socket?.readyState === WebSocket.CLOSED && this.Ephemeral && this.IsClosed) {
        this.Connect();
      }
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
    this.Socket.send(json);
    return true;
  }

  async _OnAuthAsync(challenge: string): Promise<void> {
    const authCleanup = () => {
      this.AwaitingAuth.delete(challenge);
    };
    if (!this.Auth) {
      throw new Error("Auth hook not registered");
    }
    this.AwaitingAuth.set(challenge, true);
    const authEvent = await this.Auth(challenge, this.Address);
    return new Promise(resolve => {
      if (!authEvent) {
        authCleanup();
        return Promise.reject("no event");
      }

      const t = setTimeout(() => {
        authCleanup();
        resolve();
      }, 10_000);

      this.EventsCallback.set(authEvent.id, (msg: boolean[]) => {
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
    return this.Info?.limitation?.max_subscriptions ?? 25;
  }
}
