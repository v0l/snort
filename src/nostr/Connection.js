import { Subscriptions } from "./Subscriptions";
import Event from "./Event";

export default class Connection {
    constructor(addr) {
        this.Address = addr;
        this.Socket = null;
        this.Pending = [];
        this.Subscriptions = {};
        this.Connect();
    }

    Connect() {
        this.Socket = new WebSocket(this.Address);
        this.Socket.onopen = (e) => this.OnOpen(e);
        this.Socket.onmessage = (e) => this.OnMessage(e);
        this.Socket.onerror = (e) => this.OnError(e);
        this.Socket.onclose = (e) => this.OnClose(e);
    }

    OnOpen(e) {
        console.log(`Opened connection to: ${this.Address}`);
        console.log(e);

        // send pending
        for (let p of this.Pending) {
            this._SendJson(p);
        }
    }

    OnClose(e) {
        console.log(`[${this.Address}] Closed: `, e);
        setTimeout(() => {
            this.Connect();
        }, 500);
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
        if(Object.keys(subObj).length === 0) {
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
        if (this.Socket.readyState !== this.Socket.OPEN) {
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