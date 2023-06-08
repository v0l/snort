"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _NostrSystem_instances, _NostrSystem_sockets, _NostrSystem_log, _NostrSystem_relayCache, _NostrSystem_cleanup;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NostrSystem = void 0;
const debug_1 = __importDefault(require("debug"));
const ExternalStore_1 = __importDefault(require("./ExternalStore"));
const Connection_1 = require("./Connection");
const Query_1 = require("./Query");
const Util_1 = require("./Util");
/**
 * Manages nostr content retrieval system
 */
class NostrSystem extends ExternalStore_1.default {
    constructor(relayCache) {
        super();
        _NostrSystem_instances.add(this);
        /**
         * All currently connected websockets
         */
        _NostrSystem_sockets.set(this, new Map());
        /**
         * All active queries
         */
        this.Queries = new Map();
        _NostrSystem_log.set(this, (0, debug_1.default)("System"));
        _NostrSystem_relayCache.set(this, void 0);
        __classPrivateFieldSet(this, _NostrSystem_relayCache, relayCache, "f");
        __classPrivateFieldGet(this, _NostrSystem_instances, "m", _NostrSystem_cleanup).call(this);
    }
    get Sockets() {
        return [...__classPrivateFieldGet(this, _NostrSystem_sockets, "f").values()].map(a => a.snapshot());
    }
    /**
     * Connect to a NOSTR relay if not already connected
     */
    async ConnectToRelay(address, options) {
        try {
            const addr = (0, Util_1.unwrap)((0, Util_1.sanitizeRelayUrl)(address));
            if (!__classPrivateFieldGet(this, _NostrSystem_sockets, "f").has(addr)) {
                const c = new Connection_1.Connection(addr, options, this.HandleAuth?.bind(this));
                __classPrivateFieldGet(this, _NostrSystem_sockets, "f").set(addr, c);
                c.OnEvent = (s, e) => this.OnEvent(s, e);
                c.OnEose = s => this.OnEndOfStoredEvents(c, s);
                c.OnDisconnect = id => this.OnRelayDisconnect(id);
                await c.Connect();
            }
            else {
                // update settings if already connected
                (0, Util_1.unwrap)(__classPrivateFieldGet(this, _NostrSystem_sockets, "f").get(addr)).Settings = options;
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    OnRelayDisconnect(id) {
        for (const [, q] of this.Queries) {
            q.connectionLost(id);
        }
    }
    OnEndOfStoredEvents(c, sub) {
        for (const [, v] of this.Queries) {
            v.eose(sub, c);
        }
    }
    OnEvent(sub, ev) {
        for (const [, v] of this.Queries) {
            v.onEvent(sub, ev);
        }
    }
    /**
     *
     * @param address Relay address URL
     */
    async ConnectEphemeralRelay(address) {
        try {
            const addr = (0, Util_1.unwrap)((0, Util_1.sanitizeRelayUrl)(address));
            if (!__classPrivateFieldGet(this, _NostrSystem_sockets, "f").has(addr)) {
                const c = new Connection_1.Connection(addr, { read: true, write: false }, this.HandleAuth?.bind(this), true);
                __classPrivateFieldGet(this, _NostrSystem_sockets, "f").set(addr, c);
                c.OnEvent = (s, e) => this.OnEvent(s, e);
                c.OnEose = s => this.OnEndOfStoredEvents(c, s);
                c.OnDisconnect = id => this.OnRelayDisconnect(id);
                await c.Connect();
                return c;
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    /**
     * Disconnect from a relay
     */
    DisconnectRelay(address) {
        const c = __classPrivateFieldGet(this, _NostrSystem_sockets, "f").get(address);
        if (c) {
            __classPrivateFieldGet(this, _NostrSystem_sockets, "f").delete(address);
            c.Close();
        }
    }
    GetQuery(id) {
        return this.Queries.get(id);
    }
    Query(type, req) {
        const existing = this.Queries.get(req.id);
        if (existing) {
            const filters = !req.options?.skipDiff
                ? req.buildDiff(__classPrivateFieldGet(this, _NostrSystem_relayCache, "f"), existing.filters)
                : req.build(__classPrivateFieldGet(this, _NostrSystem_relayCache, "f"));
            if (filters.length === 0 && !!req.options?.skipDiff) {
                return existing;
            }
            else {
                for (const subQ of filters) {
                    this.SendQuery(existing, subQ).then(qta => qta.forEach(v => __classPrivateFieldGet(this, _NostrSystem_log, "f").call(this, "New QT from diff %s %s %O from: %O", req.id, v.id, v.filters, existing.filters)));
                }
                this.notifyChange();
                return existing;
            }
        }
        else {
            const store = new type();
            const filters = req.build(__classPrivateFieldGet(this, _NostrSystem_relayCache, "f"));
            const q = new Query_1.Query(req.id, store, req.options?.leaveOpen);
            this.Queries.set(req.id, q);
            for (const subQ of filters) {
                this.SendQuery(q, subQ).then(qta => qta.forEach(v => __classPrivateFieldGet(this, _NostrSystem_log, "f").call(this, "New QT from diff %s %s %O", req.id, v.id, v.filters)));
            }
            this.notifyChange();
            return q;
        }
    }
    async SendQuery(q, qSend) {
        if (qSend.relay) {
            __classPrivateFieldGet(this, _NostrSystem_log, "f").call(this, "Sending query to %s %O", qSend.relay, qSend);
            const s = __classPrivateFieldGet(this, _NostrSystem_sockets, "f").get(qSend.relay);
            if (s) {
                const qt = q.sendToRelay(s, qSend);
                if (qt) {
                    return [qt];
                }
            }
            else {
                const nc = await this.ConnectEphemeralRelay(qSend.relay);
                if (nc) {
                    const qt = q.sendToRelay(nc, qSend);
                    if (qt) {
                        return [qt];
                    }
                }
                else {
                    console.warn("Failed to connect to new relay for:", qSend.relay, q);
                }
            }
        }
        else {
            const ret = [];
            for (const [, s] of __classPrivateFieldGet(this, _NostrSystem_sockets, "f")) {
                if (!s.Ephemeral) {
                    const qt = q.sendToRelay(s, qSend);
                    if (qt) {
                        ret.push(qt);
                    }
                }
            }
            return ret;
        }
        return [];
    }
    /**
     * Send events to writable relays
     */
    BroadcastEvent(ev) {
        for (const [, s] of __classPrivateFieldGet(this, _NostrSystem_sockets, "f")) {
            s.SendEvent(ev);
        }
    }
    /**
     * Write an event to a relay then disconnect
     */
    async WriteOnceToRelay(address, ev) {
        return new Promise((resolve, reject) => {
            const c = new Connection_1.Connection(address, { write: true, read: false }, this.HandleAuth, true);
            const t = setTimeout(reject, 5000);
            c.OnConnected = async () => {
                clearTimeout(t);
                await c.SendAsync(ev);
                c.Close();
                resolve();
            };
            c.Connect();
        });
    }
    takeSnapshot() {
        return {
            queries: [...this.Queries.values()].map(a => {
                return {
                    id: a.id,
                    filters: a.filters,
                    subFilters: [],
                };
            }),
        };
    }
}
exports.NostrSystem = NostrSystem;
_NostrSystem_sockets = new WeakMap(), _NostrSystem_log = new WeakMap(), _NostrSystem_relayCache = new WeakMap(), _NostrSystem_instances = new WeakSet(), _NostrSystem_cleanup = function _NostrSystem_cleanup() {
    let changed = false;
    for (const [k, v] of this.Queries) {
        if (v.canRemove()) {
            v.sendClose();
            this.Queries.delete(k);
            __classPrivateFieldGet(this, _NostrSystem_log, "f").call(this, "Deleted query %s", k);
            changed = true;
        }
    }
    if (changed) {
        this.notifyChange();
    }
    setTimeout(() => __classPrivateFieldGet(this, _NostrSystem_instances, "m", _NostrSystem_cleanup).call(this), 1000);
};
//# sourceMappingURL=NostrSystem.js.map