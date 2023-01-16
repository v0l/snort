import { v4 as uuid } from "uuid";
import { TaggedRawEvent, RawReqFilter, u256 } from ".";
import Connection from "./Connection";
import EventKind from "./EventKind";

export type NEventHandler = (e: TaggedRawEvent) => void;
export type OnEndHandler = (c: Connection) => void;

export class Subscriptions {
    /**
     * A unique id for this subscription filter
     */
    Id: u256;

    /** 
     * a list of event ids or prefixes
     */
    Ids?: Set<u256>

    /**
     * a list of pubkeys or prefixes, the pubkey of an event must be one of these
     */
    Authors?: Set<u256>;

    /**
     * a list of a kind numbers
     */
    Kinds?: Set<EventKind>;

    /**
     * a list of event ids that are referenced in an "e" tag
     */
    ETags?: Set<u256>;

    /**
     * a list of pubkeys that are referenced in a "p" tag
     */
    PTags?: Set<u256>;

    /** 
     * a timestamp, events must be newer than this to pass
     */
    Since?: number;

    /** 
     * a timestamp, events must be older than this to pass
     */
    Until?: number;

    /**
     * maximum number of events to be returned in the initial query
     */
    Limit?: number;

    /**
     * Handler function for this event
     */
    OnEvent: NEventHandler;

    /**
     * End of data event
     */
    OnEnd: OnEndHandler;

    /**
     * Collection of OR sub scriptions linked to this
     */
    OrSubs: Array<Subscriptions>;

    /**
     * Start time for this subscription
     */
    Started: Map<string, number>;

    /**
     * End time for this subscription
     */
    Finished: Map<string, number>;

    constructor(sub?: RawReqFilter) {
        this.Id = uuid();
        this.Ids = sub?.ids ? new Set(sub.ids) : undefined;
        this.Authors = sub?.authors ? new Set(sub.authors) : undefined;
        this.Kinds = sub?.kinds ? new Set(sub.kinds) : undefined;
        this.ETags = sub?.["#e"] ? new Set(sub["#e"]) : undefined;
        this.PTags = sub?.["#p"] ? new Set(sub["#p"]) : undefined;
        this.Since = sub?.since ?? undefined;
        this.Until = sub?.until ?? undefined;
        this.Limit = sub?.limit ?? undefined;
        this.OnEvent = (e) => { console.warn(`No event handler was set on subscription: ${this.Id}`) };
        this.OnEnd = (c) => { };
        this.OrSubs = [];
        this.Started = new Map<string, number>();
        this.Finished = new Map<string, number>();
    }

    /**
     * Adds OR filter subscriptions
     */
    AddSubscription(sub: Subscriptions) {
        this.OrSubs.push(sub);
    }

    /**
     * If all relays have responded with EOSE
     */
    IsFinished() {
        return this.Started.size === this.Finished.size;
    }

    ToObject(): RawReqFilter {
        let ret: RawReqFilter = {};
        if (this.Ids) {
            ret.ids = Array.from(this.Ids);
        }
        if (this.Authors) {
            ret.authors = Array.from(this.Authors);
        }
        if (this.Kinds) {
            ret.kinds = Array.from(this.Kinds);
        }
        if (this.ETags) {
            ret["#e"] = Array.from(this.ETags);
        }
        if (this.PTags) {
            ret["#p"] = Array.from(this.PTags);
        }
        if (this.Since !== null) {
            ret.since = this.Since;
        }
        if (this.Until !== null) {
            ret.until = this.Until;
        }
        if (this.Limit !== null) {
            ret.limit = this.Limit;
        }
        return ret;
    }
}