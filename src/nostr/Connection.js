import { Subscriptions } from "./Subscriptions";
import Event from "./Event";

const DefaultConnectTimeout = 1000;

export default class Connection {
    constructor(addr, options) {
        this.Address = addr;
        this.Socket = null;
        this.Pending = [];
        this.Subscriptions = {};
        this.Read = options?.read || true;
        this.Write = options?.write || true;
        this.ConnectTimeout = DefaultConnectTimeout;
        this.Connect();
    }

    Connect() {
        try {
            this.Socket = new WebSocket(this.Address);
            this.Socket.onopen = (e) => this.OnOpen(e);
            this.Socket.onmessage = (e) => this.OnMessage(e);
            this.Socket.onerror = (e) => this.OnError(e);
            this.Socket.onclose = (e) => this.OnClose(e);
        } catch (e) {
            console.warn(`[${this.Address}] Connect failed!`);
        }
    }

    OnOpen(e) {
        this.ConnectTimeout = DefaultConnectTimeout;
        console.log(`[${this.Address}] Open!`);

        // send pending
        for (let p of this.Pending) {
            this._SendJson(p);
        }
    }

    OnClose(e) {
        this.ConnectTimeout = this.ConnectTimeout * 2;
        console.log(`[${this.Address}] Closed (${e.reason}), trying again in ${(this.ConnectTimeout / 1000).toFixed(0).toLocaleString()} sec`);
        setTimeout(() => {
            this.Connect();
        }, this.ConnectTimeout);
    }

    OnMessage(e) {
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

    OnError(e) {
        console.log(e);
    }

    /**
     * Send event on this connection
     * @param {Event} e 
     */
    SendEvent(e) {
        let req = ["EVENT", e.ToObject()];
        this._SendJson(req);
    }

    /**
     * Subscribe to data from this connection
     * @param {Subscriptions | Array<Subscriptions>} sub Subscriptions object
     */
    AddSubscription(sub) {
        let subObj = sub.ToObject();
        if (Object.keys(subObj).length === 0) {
            debugger;
            throw "CANNOT SEND EMPTY SUB - FIX ME";
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

    _SendJson(obj) {
        if (this.Socket?.readyState !== WebSocket.OPEN) {
            this.Pending.push(obj);
            return;
        }
        let json = JSON.stringify(obj);
        console.debug(`[${this.Address}] >> ${json}`);
        this.Socket.send(json);
    }

    _OnEvent(subId, ev) {
        if (this.Subscriptions[subId]) {
            this.Subscriptions[subId].OnEvent(ev);
        } else {
            console.warn(`No subscription for event! ${subId}`);
        }
    }

    _OnEnd(subId) {
        let sub = this.Subscriptions[subId];
        if (sub) {
            sub.Finished[this.Address] = new Date().getTime();
            sub.OnEnd(this);
        } else {
            console.warn(`No subscription for end! ${subId}`);
        }
    }
}