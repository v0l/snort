import { v4 as uuid } from "uuid";

import { DefaultConnectTimeout } from "./Const";
import { ConnectionStats } from "./ConnectionStats";
import { RawEvent, ReqCommand, TaggedRawEvent, u256 } from "./index";
import { RelayInfo } from "./RelayInfo";
import { unwrap } from "./Util";

export type CustomHook = (state: Readonly<StateSnapshot>) => void;
export type AuthHandler = (
  challenge: string,
  relay: string
) => Promise<RawEvent | undefined>;

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
export interface StateSnapshot {
  connected: boolean;
  disconnects: number;
  avgLatency: number;
  events: {
    received: number;
    send: number;
  };
  info?: RelayInfo;
  pendingRequests: Array<string>;
  activeRequests: Array<string>;
  id: string;
}

export class Connection {
  Id: string;
  Address: string;
  Socket: WebSocket | null = null;

  PendingRaw: Array<object> = [];
  PendingRequests: Array<ReqCommand> = [];
  ActiveRequests: Set<string> = new Set();

  Settings: RelaySettings;
  Info?: RelayInfo;
  ConnectTimeout: number = DefaultConnectTimeout;
  Stats: ConnectionStats = new ConnectionStats();
  StateHooks: Map<string, CustomHook> = new Map();
  HasStateChange: boolean = true;
  CurrentState: StateSnapshot;
  LastState: Readonly<StateSnapshot>;
  IsClosed: boolean;
  ReconnectTimer: ReturnType<typeof setTimeout> | null;
  EventsCallback: Map<u256, (msg: boolean[]) => void>;
  OnConnected?: () => void;
  OnEvent?: (sub: string, e: TaggedRawEvent) => void;
  OnEose?: (sub: string) => void;
  Auth?: AuthHandler;
  AwaitingAuth: Map<string, boolean>;
  Authed: boolean;
  Ephemeral: boolean;
  EphemeralTimeout: ReturnType<typeof setTimeout> | undefined;
  Down = true;

  constructor(
    addr: string,
    options: RelaySettings,
    auth?: AuthHandler,
    ephemeral: boolean = false
  ) {
    this.Id = uuid();
    this.Address = addr;
    this.Settings = options;
    this.CurrentState = {
      connected: false,
      disconnects: 0,
      avgLatency: 0,
      events: {
        received: 0,
        send: 0,
      },
    } as StateSnapshot;
    this.LastState = Object.freeze({ ...this.CurrentState });
    this.IsClosed = false;
    this.ReconnectTimer = null;
    this.EventsCallback = new Map();
    this.AwaitingAuth = new Map();
    this.Authed = false;
    this.Auth = auth;
    this.Ephemeral = ephemeral;

    if (this.Ephemeral) {
      this.ResetEphemeralTimeout();
    }
  }

  ResetEphemeralTimeout() {
    if (this.EphemeralTimeout) {
      clearTimeout(this.EphemeralTimeout);
    }
    if (this.Ephemeral) {
      this.EphemeralTimeout = setTimeout(() => {
        this.Close();
      }, 10_000);
    }
  }

  async Connect() {
    try {
      if (this.Info === undefined) {
        const u = new URL(this.Address);
        const rsp = await fetch(
          `${u.protocol === "wss:" ? "https:" : "http:"}//${u.host}`,
          {
            headers: {
              accept: "application/nostr+json",
            },
          }
        );
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

    this.IsClosed = false;
    this.Socket = new WebSocket(this.Address);
    this.Socket.onopen = () => this.OnOpen();
    this.Socket.onmessage = (e) => this.OnMessage(e);
    this.Socket.onerror = (e) => this.OnError(e);
    this.Socket.onclose = (e) => this.OnClose(e);
  }

  Close() {
    this.IsClosed = true;
    if (this.ReconnectTimer !== null) {
      clearTimeout(this.ReconnectTimer);
      this.ReconnectTimer = null;
    }
    this.Socket?.close();
    this.#UpdateState();
  }

  OnOpen() {
    this.ConnectTimeout = DefaultConnectTimeout;
    console.log(`[${this.Address}] Open!`);
    this.Down = false;
    this.OnConnected?.();
  }

  OnClose(e: CloseEvent) {
    if (!this.IsClosed) {
      this.#ResetQueues();
      this.ConnectTimeout = this.ConnectTimeout * 2;
      console.log(
        `[${this.Address}] Closed (${e.reason}), trying again in ${(
          this.ConnectTimeout / 1000
        )
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
    this.#UpdateState();
  }

  OnMessage(e: MessageEvent) {
    if (e.data.length > 0) {
      const msg = JSON.parse(e.data);
      const tag = msg[0];
      switch (tag) {
        case "AUTH": {
          this._OnAuthAsync(msg[1]);
          this.Stats.EventsReceived++;
          this.#UpdateState();
          break;
        }
        case "EVENT": {
          this.OnEvent?.(msg[1], msg[2]);
          this.Stats.EventsReceived++;
          this.#UpdateState();
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
    this.#UpdateState();
  }

  /**
   * Send event on this connection
   */
  SendEvent(e: RawEvent) {
    if (!this.Settings.write) {
      return;
    }
    const req = ["EVENT", e];
    this.#SendJson(req);
    this.Stats.EventsSent++;
    this.#UpdateState();
  }

  /**
   * Send event on this connection and wait for OK response
   */
  async SendAsync(e: RawEvent, timeout = 5000) {
    return new Promise<void>((resolve) => {
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
      this.#UpdateState();
    });
  }

  /**
   * Hook status for connection
   */
  StatusHook(fnHook: CustomHook) {
    const id = uuid();
    this.StateHooks.set(id, fnHook);
    return () => {
      this.StateHooks.delete(id);
    };
  }

  /**
   * Returns the current state of this connection
   */
  GetState() {
    if (this.HasStateChange) {
      this.LastState = Object.freeze({ ...this.CurrentState });
      this.HasStateChange = false;
    }
    return this.LastState;
  }

  /**
   * Using relay document to determine if this relay supports a feature
   */
  SupportsNip(n: number) {
    return this.Info?.supported_nips?.some((a) => a === n) ?? false;
  }

  /**
   * Queue or send command to the relay
   * @param cmd The REQ to send to the server
   */
  QueueReq(cmd: ReqCommand) {
    if (this.ActiveRequests.size >= this.#maxSubscriptions) {
      this.PendingRequests.push(cmd);
      console.debug("Queuing:", this.Address, cmd);
    } else {
      this.ActiveRequests.add(cmd[1]);
      this.#SendJson(cmd);
    }
    this.#UpdateState();
  }

  CloseReq(id: string) {
    if (this.ActiveRequests.delete(id)) {
      this.#SendJson(["CLOSE", id]);
      this.OnEose?.(id);
      this.#SendQueuedRequests();
    }
    this.#UpdateState();
  }

  #SendQueuedRequests() {
    const canSend = this.#maxSubscriptions - this.ActiveRequests.size;
    if (canSend > 0) {
      for (let x = 0; x < canSend; x++) {
        const cmd = this.PendingRequests.shift();
        if (cmd) {
          this.ActiveRequests.add(cmd[1]);
          this.#SendJson(cmd);
          console.debug("Sent pending REQ", this.Address, cmd);
        }
      }
    }
  }

  #ResetQueues() {
    //send EOSE on disconnect for active subs
    this.ActiveRequests.forEach((v) => this.OnEose?.(v));
    this.PendingRequests.forEach((v) => this.OnEose?.(v[1]));

    this.ActiveRequests.clear();
    this.PendingRequests = [];
    this.PendingRaw = [];
    this.#UpdateState();
  }

  #UpdateState() {
    this.CurrentState.connected = this.Socket?.readyState === WebSocket.OPEN;
    this.CurrentState.events.received = this.Stats.EventsReceived;
    this.CurrentState.events.send = this.Stats.EventsSent;
    this.CurrentState.avgLatency =
      this.Stats.Latency.length > 0
        ? this.Stats.Latency.reduce((acc, v) => acc + v, 0) /
          this.Stats.Latency.length
        : 0;
    this.CurrentState.disconnects = this.Stats.Disconnects;
    this.CurrentState.info = this.Info;
    this.CurrentState.id = this.Id;
    this.CurrentState.pendingRequests = [
      ...this.PendingRequests.map((a) => a[1]),
    ];
    this.CurrentState.activeRequests = [...this.ActiveRequests];
    this.Stats.Latency = this.Stats.Latency.slice(-20); // trim
    this.HasStateChange = true;
    this.#NotifyState();
  }

  #NotifyState() {
    const state = this.GetState();
    for (const [, h] of this.StateHooks) {
      h(state);
    }
  }

  #SendJson(obj: object) {
    const authPending = !this.Authed && this.AwaitingAuth.size > 0;
    if (this.Socket?.readyState !== WebSocket.OPEN || authPending) {
      this.PendingRaw.push(obj);
      return;
    }
    const json = JSON.stringify(obj);
    this.Socket.send(json);
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
    return new Promise((resolve) => {
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

      const req = ["AUTH", authEvent];
      this.#SendJson(req);
      this.Stats.EventsSent++;
      this.#UpdateState();
    });
  }

  get #maxSubscriptions() {
    return this.Info?.limitation?.max_subscriptions ?? 25;
  }
}
