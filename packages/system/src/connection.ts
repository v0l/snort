import { v4 as uuid } from "uuid";
import debug from "debug";
import WebSocket from "isomorphic-ws";
import { unwrap, ExternalStore, unixNowMs } from "@snort/shared";

import { DefaultConnectTimeout } from "./const";
import { ConnectionStats } from "./connection-stats";
import { NostrEvent, ReqCommand, TaggedNostrEvent, u256 } from "./nostr";
import { RelayInfo } from "./relay-info";

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
  #log = debug("Connection");
  #ephemeralCheck?: ReturnType<typeof setInterval>;
  #activity: number = unixNowMs();

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
  ReconnectTimer?: ReturnType<typeof setTimeout>;
  EventsCallback: Map<u256, (msg: boolean[]) => void>;
  OnConnected?: (wasReconnect: boolean) => void;
  OnEvent?: (sub: string, e: TaggedNostrEvent) => void;
  OnEose?: (sub: string) => void;
  OnDisconnect?: (code: number) => void;
  Auth?: AuthHandler;
  AwaitingAuth: Map<string, boolean>;
  Authed = false;
  Ephemeral: boolean;
  Down = true;

  constructor(addr: string, options: RelaySettings, auth?: AuthHandler, ephemeral: boolean = false) {
    super();
    this.Id = uuid();
    this.Address = addr;
    this.Settings = options;
    this.IsClosed = false;
    this.EventsCallback = new Map();
    this.AwaitingAuth = new Map();
    this.Auth = auth;
    this.Ephemeral = ephemeral;
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
    } catch {
      // ignored
    }

    const wasReconnect = this.Socket !== null && !this.IsClosed;
    if (this.Socket) {
      this.Id = uuid();
      this.Socket.onopen = null;
      this.Socket.onmessage = null;
      this.Socket.onerror = null;
      this.Socket.onclose = null;
      this.Socket = null;
    }
    this.IsClosed = false;
    this.Socket = new WebSocket(this.Address);
    this.Socket.onopen = () => this.OnOpen(wasReconnect);
    this.Socket.onmessage = e => this.OnMessage(e);
    this.Socket.onerror = e => this.OnError(e);
    this.Socket.onclose = e => this.OnClose(e);
  }

  Close() {
    this.IsClosed = true;
    this.Socket?.close();
    this.notifyChange();
  }

  OnOpen(wasReconnect: boolean) {
    this.ConnectTimeout = DefaultConnectTimeout;
    this.#log(`[${this.Address}] Open!`);
    this.Down = false;
    this.#setupEphemeral();
    this.OnConnected?.(wasReconnect);
    this.#sendPendingRaw();
  }

  OnClose(e: WebSocket.CloseEvent) {
    if (this.ReconnectTimer) {
      clearTimeout(this.ReconnectTimer);
      this.ReconnectTimer = undefined;
    }

    // remote server closed the connection, dont re-connect
    if (e.code === 4000) {
      this.IsClosed = true;
      this.#log(`[${this.Address}] Closed! (Remote)`);
    } else if (!this.IsClosed) {
      this.ConnectTimeout = this.ConnectTimeout * 2;
      this.#log(
        `[${this.Address}] Closed (code=${e.code}), trying again in ${(this.ConnectTimeout / 1000)
          .toFixed(0)
          .toLocaleString()} sec`,
      );
      this.ReconnectTimer = setTimeout(() => {
        this.Connect();
      }, this.ConnectTimeout);
      this.Stats.Disconnects++;
    } else {
      this.#log(`[${this.Address}] Closed!`);
      this.ReconnectTimer = undefined;
    }

    this.OnDisconnect?.(e.code);
    this.#resetQueues();
    // reset connection Id on disconnect, for query-tracking
    this.Id = uuid();
    this.notifyChange();
  }

  OnMessage(e: WebSocket.MessageEvent) {
    this.#activity = unixNowMs();
    if ((e.data as string).length > 0) {
      const msg = JSON.parse(e.data as string);
      const tag = msg[0];
      switch (tag) {
        case "AUTH": {
          this.#onAuthAsync(msg[1])
            .then(() => this.#sendPendingRaw())
            .catch(this.#log);
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
          this.#log(`${this.Address} OK: %O`, msg);
          const id = msg[1];
          if (this.EventsCallback.has(id)) {
            const cb = unwrap(this.EventsCallback.get(id));
            this.EventsCallback.delete(id);
            cb(msg);
          }
          break;
        }
        case "NOTICE": {
          this.#log(`[${this.Address}] NOTICE: ${msg[1]}`);
          break;
        }
        default: {
          this.#log(`Unknown tag: ${tag}`);
          break;
        }
      }
    }
  }

  OnError(e: WebSocket.Event) {
    this.#log("Error: %O", e);
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
    this.#sendJson(req);
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
      this.#sendJson(req);
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
      this.#log("Queuing: %s %O", this.Address, cmd);
    } else {
      this.ActiveRequests.add(cmd[1]);
      this.#sendJson(cmd);
      cbSent();
    }
    this.notifyChange();
  }

  CloseReq(id: string) {
    if (this.ActiveRequests.delete(id)) {
      this.#sendJson(["CLOSE", id]);
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
          this.#sendJson(p.cmd);
          p.cb();
          this.#log("Sent pending REQ %s %O", this.Address, p.cmd);
        }
      }
    }
  }

  #resetQueues() {
    this.ActiveRequests.clear();
    this.PendingRequests = [];
    this.PendingRaw = [];
    this.notifyChange();
  }

  #sendJson(obj: object) {
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
    this.#activity = unixNowMs();
    this.Socket.send(json);
    return true;
  }

  async #onAuthAsync(challenge: string): Promise<void> {
    const authCleanup = () => {
      this.AwaitingAuth.delete(challenge);
    };
    if (!this.Auth) {
      throw new Error("Auth hook not registered");
    }
    this.AwaitingAuth.set(challenge, true);
    const authEvent = await this.Auth(challenge, this.Address);
    if (!authEvent) {
      authCleanup();
      throw new Error("No auth event");
    }

    return await new Promise(resolve => {
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

  #setupEphemeral() {
    if (this.Ephemeral) {
      if (this.#ephemeralCheck) {
        clearInterval(this.#ephemeralCheck);
        this.#ephemeralCheck = undefined;
      }
      this.#ephemeralCheck = setInterval(() => {
        const lastActivity = unixNowMs() - this.#activity;
        if (lastActivity > 30_000 && !this.IsClosed) {
          if (this.ActiveRequests.size > 0) {
            this.#log(
              "%s Inactive connection has %d active requests! %O",
              this.Address,
              this.ActiveRequests.size,
              this.ActiveRequests,
            );
          } else {
            this.Close();
          }
        }
      }, 5_000);
    }
  }
}
