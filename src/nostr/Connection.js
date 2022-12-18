import { Subscriptions } from "./Subscriptions";
import Event from "./Event";

export default class Connection {
    constructor(addr) {
        this.Address = addr;
        this.Socket = new WebSocket(addr);
        this.Socket.onopen = (e) => this.OnOpen(e);
        this.Socket.onmessage = (e) => this.OnMessage(e);
        this.Socket.onerror = (e) => this.OnError(e);
        this.Pending = [];
        this.Subscriptions = {};
    }

    OnOpen(e) {
        console.log(`Opened connection to: ${this.Address}`);
        console.log(e);

        // send pending
        for (let p of this.Pending) {
            this._SendJson(p);
        }
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
                // ignored for now
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

    SendEvent(e) {
        let req = ["EVENT", e];
        this._SendJson(req);
    }

    /**
     * Subscribe to data from this connection
     * @param {Subscriptions | Array<Subscriptions>} sub Subscriptions object
     */
    AddSubscription(sub) {
        let req = ["REQ", sub.Id, sub.ToObject()];
        if(sub.OrSubs.length > 0) {
            req = [
                ...req,
                ...sub.OrSubs.map(o => o.ToObject())
            ];
        }
        this._SendJson(req);
        this.Subscriptions[sub.Id] = sub;
    }

    /**
     * Remove a subscription
     * @param {any} subId Subscription id to remove
     */
    RemoveSubscription(subId) {
        let req = ["CLOSE", subId];
        this._SendJson(req);
        delete this.Subscriptions[subId];
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
            console.warn("No subscription for event!");
        }
    }
}