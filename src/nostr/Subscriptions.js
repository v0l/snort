import { v4 as uuid } from "uuid";
import Connection from "./Connection";

export class Subscriptions {
    constructor() {
        /**
         * A unique id for this subscription filter
         */
        this.Id = uuid();

        /** 
         * a list of event ids or prefixes
         */
        this.Ids = new Set();

        /**
         * a list of pubkeys or prefixes, the pubkey of an event must be one of these
         */
        this.Authors = new Set();

        /**
         * a list of a kind numbers
         */
        this.Kinds = new Set();

        /**
         * a list of event ids that are referenced in an "e" tag
         */
        this.ETags = new Set();

        /**
         * a list of pubkeys that are referenced in a "p" tag
         */
        this.PTags = new Set();

        /** 
         * a timestamp, events must be newer than this to pass
         */
        this.Since = NaN;

        /** 
         * a timestamp, events must be older than this to pass
         */
        this.Until = NaN;

        /**
         * maximum number of events to be returned in the initial query
         */
        this.Limit = NaN;

        /**
         * Handler function for this event
         */
        this.OnEvent = (e) => { console.warn(`No event handler was set on subscription: ${this.Id}`) };

        /**
         * End of data event
         * @param {Connection} c 
         */
        this.OnEnd = (c) => {};

        /**
         * Collection of OR sub scriptions linked to this
         */
        this.OrSubs = [];

        /**
         * Start time for this subscription
         */
        this.Started = {};

        /**
         * End time for this subscription
         */
        this.Finished = {};
    }

    /**
     * Adds OR filter subscriptions
     * @param {Subscriptions} sub Extra filters
     */
    AddSubscription(sub) {
        this.OrSubs.push(sub);
    }

    /**
     * If all relays have responded with EOSE
     * @returns {boolean}
     */
    IsFinished() { 
        return Object.keys(this.Started).length === Object.keys(this.Finished).length;
    }

    static FromObject(obj) {
        let ret = new Subscriptions();
        ret.Ids = new Set(obj.ids);
        ret.Authors = new Set(obj.authors);
        ret.Kinds = new Set(obj.kinds);
        ret.ETags = new Set(obj["#e"]);
        ret.PTags = new Set(obj["#p"]);
        ret.Since = parseInt(obj.since);
        ret.Until = parseInt(obj.until);
        ret.Limit = parseInt(obj.limit);
        return ret;
    }

    ToObject() {
        let ret = {};
        if (this.Ids.size > 0) {
            ret.ids = Array.from(this.Ids);
        }
        if (this.Authors.size > 0) {
            ret.authors = Array.from(this.Authors);
        }
        if (this.Kinds.size > 0) {
            ret.kinds = Array.from(this.Kinds);
        }
        if (this.ETags.size > 0) {
            ret["#e"] = Array.from(this.ETags);
        }
        if (this.PTags.size > 0) {
            ret["#p"] = Array.from(this.PTags);
        }
        if (!isNaN(this.Since)) {
            ret.since = this.Since;
        }
        if (!isNaN(this.Until)) {
            ret.until = this.Until;
        }
        if (!isNaN(this.Limit)) {
            ret.limit = this.Limit;
        }
        return ret;
    }
}