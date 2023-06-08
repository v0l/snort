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
var _QueryTrace_wasForceClosed, _QueryTrace_fnClose, _QueryTrace_fnProgress, _Query_instances, _Query_tracing, _Query_leaveOpen, _Query_cancelAt, _Query_checkTrace, _Query_feed, _Query_log, _Query_allFilters, _Query_onProgress, _Query_stopCheckTraces, _Query_checkTraces, _Query_canSendQuery, _Query_sendQueryInternal, _Query_reComputeFilters;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
const uuid_1 = require("uuid");
const debug_1 = __importDefault(require("debug"));
const _1 = require(".");
const Util_1 = require("./Util");
const RequestMerger_1 = require("./RequestMerger");
const RequestExpander_1 = require("./RequestExpander");
/**
 * Tracing for relay query status
 */
class QueryTrace {
    constructor(relay, filters, connId, fnClose, fnProgress) {
        this.relay = relay;
        this.filters = filters;
        this.connId = connId;
        _QueryTrace_wasForceClosed.set(this, false);
        _QueryTrace_fnClose.set(this, void 0);
        _QueryTrace_fnProgress.set(this, void 0);
        this.id = (0, uuid_1.v4)();
        this.start = (0, Util_1.unixNowMs)();
        __classPrivateFieldSet(this, _QueryTrace_fnClose, fnClose, "f");
        __classPrivateFieldSet(this, _QueryTrace_fnProgress, fnProgress, "f");
    }
    sentToRelay() {
        this.sent = (0, Util_1.unixNowMs)();
        __classPrivateFieldGet(this, _QueryTrace_fnProgress, "f").call(this);
    }
    gotEose() {
        this.eose = (0, Util_1.unixNowMs)();
        __classPrivateFieldGet(this, _QueryTrace_fnProgress, "f").call(this);
    }
    forceEose() {
        this.eose = (0, Util_1.unixNowMs)();
        __classPrivateFieldSet(this, _QueryTrace_wasForceClosed, true, "f");
        __classPrivateFieldGet(this, _QueryTrace_fnProgress, "f").call(this);
        this.sendClose();
    }
    sendClose() {
        this.close = (0, Util_1.unixNowMs)();
        __classPrivateFieldGet(this, _QueryTrace_fnClose, "f").call(this, this.id);
        __classPrivateFieldGet(this, _QueryTrace_fnProgress, "f").call(this);
    }
    /**
     * Time spent in queue
     */
    get queued() {
        return (this.sent === undefined ? (0, Util_1.unixNowMs)() : __classPrivateFieldGet(this, _QueryTrace_wasForceClosed, "f") ? (0, Util_1.unwrap)(this.eose) : this.sent) - this.start;
    }
    /**
     * Total query runtime
     */
    get runtime() {
        return (this.eose === undefined ? (0, Util_1.unixNowMs)() : this.eose) - this.start;
    }
    /**
     * Total time spent waiting for relay to respond
     */
    get responseTime() {
        return this.finished ? (0, Util_1.unwrap)(this.eose) - (0, Util_1.unwrap)(this.sent) : 0;
    }
    /**
     * If tracing is finished, we got EOSE or timeout
     */
    get finished() {
        return this.eose !== undefined;
    }
}
_QueryTrace_wasForceClosed = new WeakMap(), _QueryTrace_fnClose = new WeakMap(), _QueryTrace_fnProgress = new WeakMap();
/**
 * Active or queued query on the system
 */
class Query {
    constructor(id, feed, leaveOpen) {
        _Query_instances.add(this);
        /**
         * Which relays this query has already been executed on
         */
        _Query_tracing.set(this, []);
        /**
         * Leave the query open until its removed
         */
        _Query_leaveOpen.set(this, false);
        /**
         * Time when this query can be removed
         */
        _Query_cancelAt.set(this, void 0);
        /**
         * Timer used to track tracing status
         */
        _Query_checkTrace.set(this, void 0);
        /**
         * Feed object which collects events
         */
        _Query_feed.set(this, void 0);
        _Query_log.set(this, (0, debug_1.default)("Query"));
        _Query_allFilters.set(this, []);
        this.id = id;
        __classPrivateFieldSet(this, _Query_feed, feed, "f");
        __classPrivateFieldSet(this, _Query_leaveOpen, leaveOpen ?? false, "f");
        __classPrivateFieldGet(this, _Query_instances, "m", _Query_checkTraces).call(this);
    }
    canRemove() {
        return __classPrivateFieldGet(this, _Query_cancelAt, "f") !== undefined && __classPrivateFieldGet(this, _Query_cancelAt, "f") < (0, Util_1.unixNowMs)();
    }
    /**
     * Recompute the complete set of compressed filters from all query traces
     */
    get filters() {
        return __classPrivateFieldGet(this, _Query_allFilters, "f");
    }
    get feed() {
        return __classPrivateFieldGet(this, _Query_feed, "f");
    }
    onEvent(sub, e) {
        for (const t of __classPrivateFieldGet(this, _Query_tracing, "f")) {
            if (t.id === sub) {
                this.feed.add(e);
                break;
            }
        }
    }
    /**
     * This function should be called when this Query object and FeedStore is no longer needed
     */
    cancel() {
        __classPrivateFieldSet(this, _Query_cancelAt, (0, Util_1.unixNowMs)() + 5000, "f");
    }
    uncancel() {
        __classPrivateFieldSet(this, _Query_cancelAt, undefined, "f");
    }
    cleanup() {
        __classPrivateFieldGet(this, _Query_instances, "m", _Query_stopCheckTraces).call(this);
    }
    sendToRelay(c, subq) {
        if (!__classPrivateFieldGet(this, _Query_instances, "m", _Query_canSendQuery).call(this, c, subq)) {
            return;
        }
        return __classPrivateFieldGet(this, _Query_instances, "m", _Query_sendQueryInternal).call(this, c, subq);
    }
    connectionLost(id) {
        __classPrivateFieldGet(this, _Query_tracing, "f").filter(a => a.connId == id).forEach(a => a.forceEose());
    }
    sendClose() {
        for (const qt of __classPrivateFieldGet(this, _Query_tracing, "f")) {
            qt.sendClose();
        }
        this.cleanup();
    }
    eose(sub, conn) {
        const qt = __classPrivateFieldGet(this, _Query_tracing, "f").find(a => a.id === sub && a.connId === conn.Id);
        qt?.gotEose();
        if (!__classPrivateFieldGet(this, _Query_leaveOpen, "f")) {
            qt?.sendClose();
        }
    }
    /**
     * Get the progress to EOSE, can be used to determine when we should load more content
     */
    get progress() {
        const thisProgress = __classPrivateFieldGet(this, _Query_tracing, "f").reduce((acc, v) => (acc += v.finished ? 1 : 0), 0) / __classPrivateFieldGet(this, _Query_tracing, "f").length;
        if (isNaN(thisProgress)) {
            return 0;
        }
        return thisProgress;
    }
}
exports.Query = Query;
_Query_tracing = new WeakMap(), _Query_leaveOpen = new WeakMap(), _Query_cancelAt = new WeakMap(), _Query_checkTrace = new WeakMap(), _Query_feed = new WeakMap(), _Query_log = new WeakMap(), _Query_allFilters = new WeakMap(), _Query_instances = new WeakSet(), _Query_onProgress = function _Query_onProgress() {
    const isFinished = this.progress === 1;
    if (this.feed.loading !== isFinished) {
        __classPrivateFieldGet(this, _Query_log, "f").call(this, "%s loading=%s, progress=%d", this.id, this.feed.loading, this.progress);
        this.feed.loading = isFinished;
    }
}, _Query_stopCheckTraces = function _Query_stopCheckTraces() {
    if (__classPrivateFieldGet(this, _Query_checkTrace, "f")) {
        clearInterval(__classPrivateFieldGet(this, _Query_checkTrace, "f"));
    }
}, _Query_checkTraces = function _Query_checkTraces() {
    __classPrivateFieldGet(this, _Query_instances, "m", _Query_stopCheckTraces).call(this);
    __classPrivateFieldSet(this, _Query_checkTrace, setInterval(() => {
        for (const v of __classPrivateFieldGet(this, _Query_tracing, "f")) {
            if (v.runtime > 5000 && !v.finished) {
                v.forceEose();
            }
        }
    }, 500), "f");
}, _Query_canSendQuery = function _Query_canSendQuery(c, q) {
    if (q.relay && q.relay !== c.Address) {
        return false;
    }
    if (!q.relay && c.Ephemeral) {
        __classPrivateFieldGet(this, _Query_log, "f").call(this, "Cant send non-specific REQ to ephemeral connection %O %O %O", q, q.relay, c);
        return false;
    }
    if (q.filters.some(a => a.search) && !c.SupportsNip(_1.Nips.Search)) {
        __classPrivateFieldGet(this, _Query_log, "f").call(this, "Cant send REQ to non-search relay", c.Address);
        return false;
    }
    return true;
}, _Query_sendQueryInternal = function _Query_sendQueryInternal(c, q) {
    const qt = new QueryTrace(c.Address, q.filters, c.Id, x => c.CloseReq(x), () => __classPrivateFieldGet(this, _Query_instances, "m", _Query_onProgress).call(this));
    __classPrivateFieldGet(this, _Query_tracing, "f").push(qt);
    __classPrivateFieldGet(this, _Query_instances, "m", _Query_reComputeFilters).call(this);
    c.QueueReq(["REQ", qt.id, ...q.filters], () => qt.sentToRelay());
    return qt;
}, _Query_reComputeFilters = function _Query_reComputeFilters() {
    console.time("reComputeFilters");
    __classPrivateFieldSet(this, _Query_allFilters, (0, RequestMerger_1.flatMerge)(__classPrivateFieldGet(this, _Query_tracing, "f").flatMap(a => a.filters).flatMap(RequestExpander_1.expandFilter)), "f");
    console.timeEnd("reComputeFilters");
};
//# sourceMappingURL=Query.js.map