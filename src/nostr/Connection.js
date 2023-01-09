import * as secp from "@noble/secp256k1";
import { v4 as uuid } from "uuid";

import { Subscriptions } from "./Subscriptions";
import Event from "./Event";
import { DefaultConnectTimeout } from "../Const";

export class ConnectionStats {
    constructor() {
        this.Latency = [];
        this.Subs = 0;
        this.SubsTimeout = 0;
        this.EventsReceived = 0;
        this.EventsSent = 0;
    }
}

export default class Connection {
    constructor(addr, options) {
        this.Address = addr;
        this.Socket = null;
        this.Pending = [];
        this.Subscriptions = {};
        this.Read = options?.read || true;
        this.Write = options?.write || true;
        this.ConnectTimeout = DefaultConnectTimeout;
        this.Stats = new ConnectionStats();
        this.StateHooks = {};
        this.HasStateChange = true;
        this.CurrentState = {
            connected: false
        };
        this.LastState = Object.freeze({ ...this.CurrentState });
        this.IsClosed = false;
        this.ReconnectTimer = null;
        this.Connect();
    }

    Connect() {
        this.IsClosed = false;
        this.Socket = new WebSocket(this.Address);
        this.Socket.onopen = (e) => this.OnOpen(e);
        this.Socket.onmessage = (e) => this.OnMessage(e);
        this.Socket.onerror = (e) => this.OnError(e);
        this.Socket.onclose = (e) => this.OnClose(e);
    }

    Close() {
        this.IsClosed = true;
        if(this.ReconnectTimer !== null) {
            clearTimeout(this.ReconnectTimer);
            this.ReconnectTimer = null;
        }
        this.Socket.close();
        this._UpdateState();
    }

    OnOpen(e) {
        this.ConnectTimeout = DefaultConnectTimeout;
        console.log(`[${this.Address}] Open!`);

        // send pending
        for (let p of this.Pending) {
            this._SendJson(p);
        }

        this._UpdateState();
    }

    OnClose(e) {
        if (!this.IsClosed) {
            this.ConnectTimeout = this.ConnectTimeout * 2;
            console.log(`[${this.Address}] Closed (${e.reason}), trying again in ${(this.ConnectTimeout / 1000).toFixed(0).toLocaleString()} sec`);
            this.ReconnectTimer = setTimeout(() => {
                this.Connect();
            }, this.ConnectTimeout);
        } else {
            console.log(`[${this.Address}] Closed!`);
            this.ReconnectTimer = null;
        }
        this._UpdateState();
    }

    OnMessage(e) {
        if (e.data.length > 0) {
            let msg = JSON.parse(e.data);
            let tag = msg[0];
            switch (tag) {
                case "EVENT": {
                    this._OnEvent(msg[1], msg[2]);
                    break;
                }
                case "EOSE": {
                    this._OnEnd(msg[1]);
                    break;
                }
                case "OK": {
                    // feedback to broadcast call
                    console.debug("OK: ", msg[1]);
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
        this._UpdateState();
    }

    /**
     * Send event on this connection
     * @param {Event} e 
     */
    SendEvent(e) {
        if (!this.Write) {
            return;
        }
        let req = ["EVENT", e.ToObject()];
        this._SendJson(req);
    }

    /**
     * Subscribe to data from this connection
     * @param {Subscriptions | Array<Subscriptions>} sub Subscriptions object
     */
    AddSubscription(sub) {
        if (!this.Read) {
            return;
        }

        let subObj = sub.ToObject();
        if (Object.keys(subObj).length === 0) {
            debugger;
            throw "CANNOT SEND EMPTY SUB - FIX ME";
        }

        if (this.Subscriptions[sub.Id]) {
            return;
        }

        let req = ["REQ", sub.Id, subObj];
        if (sub.OrSubs.length > 0) {
            req = [
                ...req,
                ...sub.OrSubs.map(o => o.ToObject())
            ];
        }
        sub.Started[this.Address] = new Date().getTime();
        this._SendJson(req);
        this.Subscriptions[sub.Id] = sub;
    }

    /**
     * Remove a subscription
     * @param {any} subId Subscription id to remove
     */
    RemoveSubscription(subId) {
        if (this.Subscriptions[subId]) {
            let req = ["CLOSE", subId];
            this._SendJson(req);
            delete this.Subscriptions[subId];
            return true;
        }
        return false;
    }

    /**
     * Hook status for connection
     * @param {function} fnHook Subscription hook
     */
    StatusHook(fnHook) {
        let id = uuid();
        this.StateHooks[id] = fnHook;
        return () => {
            delete this.StateHooks[id];
        };
    }

    /**
     * Returns the current state of this connection
     * @returns {any}
     */
    GetState() {
        if (this.HasStateChange) {
            this.LastState = Object.freeze({ ...this.CurrentState });
            this.HasStateChange = false;
        }
        return this.LastState;
    }

    _UpdateState() {
        this.CurrentState.connected = this.Socket?.readyState === WebSocket.OPEN;
        this.HasStateChange = true;
        this._NotifyState();
    }

    _NotifyState() {
        let state = this.GetState();
        for (let h of Object.values(this.StateHooks)) {
            h(state);
        }
    }

    _SendJson(obj) {
        if (this.Socket?.readyState !== WebSocket.OPEN) {
            this.Pending.push(obj);
            return;
        }
        let json = JSON.stringify(obj);
        this.Socket.send(json);
    }

    _OnEvent(subId, ev) {
        if (this.Subscriptions[subId]) {
            //this._VerifySig(ev);
            ev.relay = this.Address; // tag event with relay
            this.Subscriptions[subId].OnEvent(ev);
        } else {
            // console.warn(`No subscription for event! ${subId}`);
            // ignored for now, track as "dropped event" with connection stats
        }
    }

    _OnEnd(subId) {
        let sub = this.Subscriptions[subId];
        if (sub) {
            sub.Finished[this.Address] = new Date().getTime();
            let responseTime = sub.Finished[this.Address] - sub.Started[this.Address];
            if (responseTime > 10_000) {
                console.warn(`[${this.Address}][${subId}] Slow response time ${(responseTime / 1000).toFixed(1)} seconds`);
            }
            sub.OnEnd(this);
        } else {
            // console.warn(`No subscription for end! ${subId}`);
            // ignored for now, track as "dropped event" with connection stats
        }
    }

    _VerifySig(ev) {
        let payload = [
            0,
            ev.pubkey,
            ev.created_at,
            ev.kind,
            ev.tags,
            ev.content
        ];

        let payloadData = new TextEncoder().encode(JSON.stringify(payload));
        let data = secp.utils.sha256Sync(payloadData);
        let hash = secp.utils.bytesToHex(data);
        if (!secp.schnorr.verifySync(ev.sig, hash, ev.pubkey)) {
            throw "Sig verify failed";
        }
        return ev;
    }
}