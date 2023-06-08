"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Connection_instances, _Connection_SendQueuedRequests, _Connection_ResetQueues, _Connection_SendJson, _Connection_sendPendingRaw, _Connection_sendOnWire, _Connection_maxSubscriptions_get;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = void 0;
const uuid_1 = require("uuid");
const Const_1 = require("./Const");
const ConnectionStats_1 = require("./ConnectionStats");
const Util_1 = require("./Util");
const ExternalStore_1 = __importDefault(require("./ExternalStore"));
class Connection extends ExternalStore_1.default {
    constructor(addr, options, auth, ephemeral = false) {
        super();
        _Connection_instances.add(this);
        this.Socket = null;
        this.PendingRaw = [];
        this.PendingRequests = [];
        this.ActiveRequests = new Set();
        this.ConnectTimeout = Const_1.DefaultConnectTimeout;
        this.Stats = new ConnectionStats_1.ConnectionStats();
        this.HasStateChange = true;
        this.Authed = false;
        this.Down = true;
        this.Id = (0, uuid_1.v4)();
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
            }, 30000);
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
        }
        catch (e) {
            console.warn("Could not load relay information", e);
        }
        if (this.Socket) {
            this.Id = (0, uuid_1.v4)();
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
        this.ConnectTimeout = Const_1.DefaultConnectTimeout;
        console.log(`[${this.Address}] Open!`);
        this.Down = false;
        if (this.Ephemeral) {
            this.ResetEphemeralTimeout();
        }
        this.OnConnected?.();
        __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_sendPendingRaw).call(this);
    }
    OnClose(e) {
        if (!this.IsClosed) {
            this.ConnectTimeout = this.ConnectTimeout * 2;
            console.log(`[${this.Address}] Closed (${e.reason}), trying again in ${(this.ConnectTimeout / 1000)
                .toFixed(0)
                .toLocaleString()} sec`);
            this.ReconnectTimer = setTimeout(() => {
                this.Connect();
            }, this.ConnectTimeout);
            this.Stats.Disconnects++;
        }
        else {
            console.log(`[${this.Address}] Closed!`);
            this.ReconnectTimer = null;
        }
        this.OnDisconnect?.(this.Id);
        __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_ResetQueues).call(this);
        // reset connection Id on disconnect, for query-tracking
        this.Id = (0, uuid_1.v4)();
        this.notifyChange();
    }
    OnMessage(e) {
        if (e.data.length > 0) {
            const msg = JSON.parse(e.data);
            const tag = msg[0];
            switch (tag) {
                case "AUTH": {
                    this._OnAuthAsync(msg[1])
                        .then(() => __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_sendPendingRaw).call(this))
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
                        const cb = (0, Util_1.unwrap)(this.EventsCallback.get(id));
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
    OnError(e) {
        console.error(e);
        this.notifyChange();
    }
    /**
     * Send event on this connection
     */
    SendEvent(e) {
        if (!this.Settings.write) {
            return;
        }
        const req = ["EVENT", e];
        __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_SendJson).call(this, req);
        this.Stats.EventsSent++;
        this.notifyChange();
    }
    /**
     * Send event on this connection and wait for OK response
     */
    async SendAsync(e, timeout = 5000) {
        return new Promise(resolve => {
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
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_SendJson).call(this, req);
            this.Stats.EventsSent++;
            this.notifyChange();
        });
    }
    /**
     * Using relay document to determine if this relay supports a feature
     */
    SupportsNip(n) {
        return this.Info?.supported_nips?.some(a => a === n) ?? false;
    }
    /**
     * Queue or send command to the relay
     * @param cmd The REQ to send to the server
     */
    QueueReq(cmd, cbSent) {
        if (this.ActiveRequests.size >= __classPrivateFieldGet(this, _Connection_instances, "a", _Connection_maxSubscriptions_get)) {
            this.PendingRequests.push({
                cmd,
                cb: cbSent,
            });
            console.debug("Queuing:", this.Address, cmd);
        }
        else {
            this.ActiveRequests.add(cmd[1]);
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_SendJson).call(this, cmd);
            cbSent();
        }
        this.notifyChange();
    }
    CloseReq(id) {
        if (this.ActiveRequests.delete(id)) {
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_SendJson).call(this, ["CLOSE", id]);
            this.OnEose?.(id);
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_SendQueuedRequests).call(this);
        }
        this.notifyChange();
    }
    takeSnapshot() {
        return {
            connected: this.Socket?.readyState === WebSocket.OPEN,
            events: {
                received: this.Stats.EventsReceived,
                send: this.Stats.EventsSent,
            },
            avgLatency: this.Stats.Latency.length > 0
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
    async _OnAuthAsync(challenge) {
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
            }, 10000);
            this.EventsCallback.set(authEvent.id, (msg) => {
                clearTimeout(t);
                authCleanup();
                if (msg.length > 3 && msg[2] === true) {
                    this.Authed = true;
                }
                resolve();
            });
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_sendOnWire).call(this, ["AUTH", authEvent]);
        });
    }
}
exports.Connection = Connection;
_Connection_instances = new WeakSet(), _Connection_SendQueuedRequests = function _Connection_SendQueuedRequests() {
    const canSend = __classPrivateFieldGet(this, _Connection_instances, "a", _Connection_maxSubscriptions_get) - this.ActiveRequests.size;
    if (canSend > 0) {
        for (let x = 0; x < canSend; x++) {
            const p = this.PendingRequests.shift();
            if (p) {
                this.ActiveRequests.add(p.cmd[1]);
                __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_SendJson).call(this, p.cmd);
                p.cb();
                console.debug("Sent pending REQ", this.Address, p.cmd);
            }
        }
    }
}, _Connection_ResetQueues = function _Connection_ResetQueues() {
    this.ActiveRequests.clear();
    this.PendingRequests = [];
    this.PendingRaw = [];
    this.notifyChange();
}, _Connection_SendJson = function _Connection_SendJson(obj) {
    const authPending = !this.Authed && (this.AwaitingAuth.size > 0 || this.Info?.limitation?.auth_required === true);
    if (this.Socket?.readyState !== WebSocket.OPEN || authPending) {
        this.PendingRaw.push(obj);
        if (this.Socket?.readyState === WebSocket.CLOSED && this.Ephemeral && this.IsClosed) {
            this.Connect();
        }
        return false;
    }
    __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_sendPendingRaw).call(this);
    __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_sendOnWire).call(this, obj);
}, _Connection_sendPendingRaw = function _Connection_sendPendingRaw() {
    while (this.PendingRaw.length > 0) {
        const next = this.PendingRaw.shift();
        if (next) {
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_sendOnWire).call(this, next);
        }
    }
}, _Connection_sendOnWire = function _Connection_sendOnWire(obj) {
    if (this.Socket?.readyState !== WebSocket.OPEN) {
        throw new Error(`Socket is not open, state is ${this.Socket?.readyState}`);
    }
    const json = JSON.stringify(obj);
    this.Socket.send(json);
    return true;
}, _Connection_maxSubscriptions_get = function _Connection_maxSubscriptions_get() {
    return this.Info?.limitation?.max_subscriptions ?? 25;
};
//# sourceMappingURL=Connection.js.map