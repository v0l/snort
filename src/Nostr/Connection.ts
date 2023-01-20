import * as secp from "@noble/secp256k1";
import { v4 as uuid } from "uuid";

import { Subscriptions } from "Nostr/Subscriptions";
import { default as NEvent } from "Nostr/Event";
import { DefaultConnectTimeout } from "Const";
import { ConnectionStats } from "Nostr/ConnectionStats";
import { RawEvent, TaggedRawEvent } from "Nostr";

export type CustomHook = (state: Readonly<StateSnapshot>) => void;

/**
 * Relay settings
 */
export type RelaySettings = {
    read: boolean,
    write: boolean
};

/**
 * Snapshot of connection stats
 */
export type StateSnapshot = {
    connected: boolean,
    disconnects: number,
    avgLatency: number,
    events: {
        received: number,
        send: number
    }
};

export default class Connection {
    Address: string;
    Socket: WebSocket | null;
    Pending: Subscriptions[];
    Subscriptions: Map<string, Subscriptions>;
    Settings: RelaySettings;
    ConnectTimeout: number;
    Stats: ConnectionStats;
    StateHooks: Map<string, CustomHook>;
    HasStateChange: boolean;
    CurrentState: StateSnapshot;
    LastState: Readonly<StateSnapshot>;
    IsClosed: boolean;
    ReconnectTimer: ReturnType<typeof setTimeout> | null;

    constructor(addr: string, options: RelaySettings) {
        this.Address = addr;
        this.Socket = null;
        this.Pending = [];
        this.Subscriptions = new Map();
        this.Settings = options;
        this.ConnectTimeout = DefaultConnectTimeout;
        this.Stats = new ConnectionStats();
        this.StateHooks = new Map();
        this.HasStateChange = true;
        this.CurrentState = <StateSnapshot>{
            connected: false,
            disconnects: 0,
            avgLatency: 0,
            events: {
                received: 0,
                send: 0
            }
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
        if (this.ReconnectTimer !== null) {
            clearTimeout(this.ReconnectTimer);
            this.ReconnectTimer = null;
        }
        this.Socket?.close();
        this._UpdateState();
    }

    OnOpen(e: Event) {
        this.ConnectTimeout = DefaultConnectTimeout;
        console.log(`[${this.Address}] Open!`);

        // send pending
        for (let p of this.Pending) {
            this._SendJson(p);
        }
        this.Pending = [];

        for (let [_, s] of this.Subscriptions) {
            this._SendSubscription(s);
        }
        this._UpdateState();
    }

    OnClose(e: CloseEvent) {
        if (!this.IsClosed) {
            this.ConnectTimeout = this.ConnectTimeout * 2;
            console.log(`[${this.Address}] Closed (${e.reason}), trying again in ${(this.ConnectTimeout / 1000).toFixed(0).toLocaleString()} sec`);
            this.ReconnectTimer = setTimeout(() => {
                this.Connect();
            }, this.ConnectTimeout);
            this.Stats.Disconnects++;
        } else {
            console.log(`[${this.Address}] Closed!`);
            this.ReconnectTimer = null;
        }
        this._UpdateState();
    }

    OnMessage(e: MessageEvent<any>) {
        if (e.data.length > 0) {
            let msg = JSON.parse(e.data);
            let tag = msg[0];
            switch (tag) {
                case "EVENT": {
                    this._OnEvent(msg[1], msg[2]);
                    this.Stats.EventsReceived++;
                    this._UpdateState();
                    break;
                }
                case "EOSE": {
                    this._OnEnd(msg[1]);
                    break;
                }
                case "OK": {
                    // feedback to broadcast call
                    console.debug("OK: ", msg);
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
        this._UpdateState();
    }

    /**
     * Send event on this connection
     */
    SendEvent(e: NEvent) {
        if (!this.Settings.write) {
            return;
        }
        let req = ["EVENT", e.ToObject()];
        this._SendJson(req);
        this.Stats.EventsSent++;
        this._UpdateState();
    }

    /**
     * Subscribe to data from this connection
     */
    AddSubscription(sub: Subscriptions) {
        if (!this.Settings.read) {
            return;
        }

        if (this.Subscriptions.has(sub.Id)) {
            return;
        }

        this._SendSubscription(sub);
        this.Subscriptions.set(sub.Id, sub);
    }

    /**
     * Remove a subscription
     */
    RemoveSubscription(subId: string) {
        if (this.Subscriptions.has(subId)) {
            let req = ["CLOSE", subId];
            this._SendJson(req);
            this.Subscriptions.delete(subId);
            return true;
        }
        return false;
    }

    /**
     * Hook status for connection
     */
    StatusHook(fnHook: CustomHook) {
        let id = uuid();
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

    _UpdateState() {
        this.CurrentState.connected = this.Socket?.readyState === WebSocket.OPEN;
        this.CurrentState.events.received = this.Stats.EventsReceived;
        this.CurrentState.events.send = this.Stats.EventsSent;
        this.CurrentState.avgLatency = this.Stats.Latency.length > 0 ? (this.Stats.Latency.reduce((acc, v) => acc + v, 0) / this.Stats.Latency.length) : 0;
        this.CurrentState.disconnects = this.Stats.Disconnects;
        this.Stats.Latency = this.Stats.Latency.slice(-20); // trim
        this.HasStateChange = true;
        this._NotifyState();
    }

    _NotifyState() {
        let state = this.GetState();
        for (let [_, h] of this.StateHooks) {
            h(state);
        }
    }

    _SendSubscription(sub: Subscriptions) {
        let req = ["REQ", sub.Id, sub.ToObject()];
        if (sub.OrSubs.length > 0) {
            req = [
                ...req,
                ...sub.OrSubs.map(o => o.ToObject())
            ];
        }
        sub.Started.set(this.Address, new Date().getTime());
        this._SendJson(req);
    }

    _SendJson(obj: any) {
        if (this.Socket?.readyState !== WebSocket.OPEN) {
            this.Pending.push(obj);
            return;
        }
        let json = JSON.stringify(obj);
        this.Socket.send(json);
    }

    _OnEvent(subId: string, ev: RawEvent) {
        if (this.Subscriptions.has(subId)) {
            //this._VerifySig(ev);
            let tagged: TaggedRawEvent = {
                ...ev,
                relays: [this.Address]
            };
            this.Subscriptions.get(subId)?.OnEvent(tagged);
        } else {
            // console.warn(`No subscription for event! ${subId}`);
            // ignored for now, track as "dropped event" with connection stats
        }
    }

    _OnEnd(subId: string) {
        let sub = this.Subscriptions.get(subId);
        if (sub) {
            let now = new Date().getTime();
            let started = sub.Started.get(this.Address);
            sub.Finished.set(this.Address, now);
            if (started) {
                let responseTime = now - started;
                if (responseTime > 10_000) {
                    console.warn(`[${this.Address}][${subId}] Slow response time ${(responseTime / 1000).toFixed(1)} seconds`);
                }
                this.Stats.Latency.push(responseTime);
            } else {
                console.warn("No started timestamp!");
            }
            sub.OnEnd(this);
            this._UpdateState();
        } else {
            console.warn(`No subscription for end! ${subId}`);
        }
    }

    _VerifySig(ev: RawEvent) {
        let payload = [
            0,
            ev.pubkey,
            ev.created_at,
            ev.kind,
            ev.tags,
            ev.content
        ];

        let payloadData = new TextEncoder().encode(JSON.stringify(payload));
        if (secp.utils.sha256Sync === undefined) {
            throw "Cannot verify event, no sync sha256 method";
        }
        let data = secp.utils.sha256Sync(payloadData);
        let hash = secp.utils.bytesToHex(data);
        if (!secp.schnorr.verifySync(ev.sig, hash, ev.pubkey)) {
            throw "Sig verify failed";
        }
        return ev;
    }
}