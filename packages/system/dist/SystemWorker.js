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
var _SystemWorker_instances, _SystemWorker_port, _SystemWorker_onMessage;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemWorker = void 0;
const ExternalStore_1 = __importDefault(require("./ExternalStore"));
class SystemWorker extends ExternalStore_1.default {
    constructor() {
        super();
        _SystemWorker_instances.add(this);
        _SystemWorker_port.set(this, void 0);
        if ("SharedWorker" in window) {
            const worker = new SharedWorker("/system.js");
            __classPrivateFieldSet(this, _SystemWorker_port, worker.port, "f");
            __classPrivateFieldGet(this, _SystemWorker_port, "f").onmessage = m => __classPrivateFieldGet(this, _SystemWorker_instances, "m", _SystemWorker_onMessage).call(this, m);
        }
        else {
            throw new Error("SharedWorker is not supported");
        }
    }
    get Sockets() {
        throw new Error("Method not implemented.");
    }
    Query(type, req) {
        throw new Error("Method not implemented.");
    }
    CancelQuery(sub) {
        throw new Error("Method not implemented.");
    }
    GetQuery(sub) {
        throw new Error("Method not implemented.");
    }
    ConnectToRelay(address, options) {
        throw new Error("Method not implemented.");
    }
    DisconnectRelay(address) {
        throw new Error("Method not implemented.");
    }
    BroadcastEvent(ev) {
        throw new Error("Method not implemented.");
    }
    WriteOnceToRelay(relay, ev) {
        throw new Error("Method not implemented.");
    }
    takeSnapshot() {
        throw new Error("Method not implemented.");
    }
}
exports.SystemWorker = SystemWorker;
_SystemWorker_port = new WeakMap(), _SystemWorker_instances = new WeakSet(), _SystemWorker_onMessage = function _SystemWorker_onMessage(e) {
    console.debug(e);
};
//# sourceMappingURL=SystemWorker.js.map