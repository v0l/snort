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
var _RequestBuilder_instances, _RequestBuilder_builders, _RequestBuilder_options, _RequestBuilder_groupByRelay, _RequestFilterBuilder_filter, _RequestFilterBuilder_relayHints;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestFilterBuilder = exports.RequestBuilder = exports.RequestStrategy = void 0;
const Util_1 = require("./Util");
const RequestSplitter_1 = require("./RequestSplitter");
const GossipModel_1 = require("./GossipModel");
const RequestMerger_1 = require("./RequestMerger");
/**
 * Which strategy is used when building REQ filters
 */
var RequestStrategy;
(function (RequestStrategy) {
    /**
     * Use the users default relays to fetch events,
     * this is the fallback option when there is no better way to query a given filter set
     */
    RequestStrategy[RequestStrategy["DefaultRelays"] = 1] = "DefaultRelays";
    /**
     * Using a cached copy of the authors relay lists NIP-65, split a given set of request filters by pubkey
     */
    RequestStrategy[RequestStrategy["AuthorsRelays"] = 2] = "AuthorsRelays";
    /**
     * Relay hints are usually provided when using replies
     */
    RequestStrategy[RequestStrategy["RelayHintedEventIds"] = 3] = "RelayHintedEventIds";
})(RequestStrategy = exports.RequestStrategy || (exports.RequestStrategy = {}));
/**
 * Nostr REQ builder
 */
class RequestBuilder {
    constructor(id) {
        _RequestBuilder_instances.add(this);
        _RequestBuilder_builders.set(this, void 0);
        _RequestBuilder_options.set(this, void 0);
        this.id = id;
        __classPrivateFieldSet(this, _RequestBuilder_builders, [], "f");
    }
    get numFilters() {
        return __classPrivateFieldGet(this, _RequestBuilder_builders, "f").length;
    }
    get options() {
        return __classPrivateFieldGet(this, _RequestBuilder_options, "f");
    }
    withFilter() {
        const ret = new RequestFilterBuilder();
        __classPrivateFieldGet(this, _RequestBuilder_builders, "f").push(ret);
        return ret;
    }
    withOptions(opt) {
        __classPrivateFieldSet(this, _RequestBuilder_options, {
            ...__classPrivateFieldGet(this, _RequestBuilder_options, "f"),
            ...opt,
        }, "f");
        return this;
    }
    buildRaw() {
        return __classPrivateFieldGet(this, _RequestBuilder_builders, "f").map(f => f.filter);
    }
    build(relays) {
        const expanded = __classPrivateFieldGet(this, _RequestBuilder_builders, "f").flatMap(a => a.build(relays, this.id));
        return __classPrivateFieldGet(this, _RequestBuilder_instances, "m", _RequestBuilder_groupByRelay).call(this, expanded);
    }
    /**
     * Detects a change in request from a previous set of filters
     * @param q All previous filters merged
     * @returns
     */
    buildDiff(relays, filters) {
        const next = this.buildRaw();
        const diff = (0, RequestSplitter_1.diffFilters)(filters, next);
        if (diff.changed) {
            return (0, GossipModel_1.splitAllByWriteRelays)(relays, diff.added).map(a => {
                return {
                    strategy: RequestStrategy.AuthorsRelays,
                    filters: a.filters,
                    relay: a.relay,
                };
            });
        }
        return [];
    }
}
exports.RequestBuilder = RequestBuilder;
_RequestBuilder_builders = new WeakMap(), _RequestBuilder_options = new WeakMap(), _RequestBuilder_instances = new WeakSet(), _RequestBuilder_groupByRelay = function _RequestBuilder_groupByRelay(expanded) {
    const relayMerged = expanded.reduce((acc, v) => {
        const existing = acc.get(v.relay);
        if (existing) {
            existing.push(v);
        }
        else {
            acc.set(v.relay, [v]);
        }
        return acc;
    }, new Map());
    const filtersSquashed = [...relayMerged.values()].map(a => {
        return {
            filters: (0, RequestMerger_1.mergeSimilar)(a.flatMap(b => b.filters)),
            relay: a[0].relay,
            strategy: a[0].strategy,
        };
    });
    return filtersSquashed;
};
/**
 * Builder class for a single request filter
 */
class RequestFilterBuilder {
    constructor() {
        _RequestFilterBuilder_filter.set(this, {});
        _RequestFilterBuilder_relayHints.set(this, new Map());
    }
    get filter() {
        return { ...__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f") };
    }
    get relayHints() {
        return new Map(__classPrivateFieldGet(this, _RequestFilterBuilder_relayHints, "f"));
    }
    ids(ids) {
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").ids = (0, Util_1.appendDedupe)(__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").ids, ids);
        return this;
    }
    id(id, relay) {
        if (relay) {
            __classPrivateFieldGet(this, _RequestFilterBuilder_relayHints, "f").set(id, (0, Util_1.appendDedupe)(__classPrivateFieldGet(this, _RequestFilterBuilder_relayHints, "f").get(id), [relay]));
        }
        return this.ids([id]);
    }
    authors(authors) {
        if (!authors)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").authors = (0, Util_1.appendDedupe)(__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").authors, authors);
        return this;
    }
    kinds(kinds) {
        if (!kinds)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").kinds = (0, Util_1.appendDedupe)(__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").kinds, kinds);
        return this;
    }
    since(since) {
        if (!since)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").since = since;
        return this;
    }
    until(until) {
        if (!until)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").until = until;
        return this;
    }
    limit(limit) {
        if (!limit)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").limit = limit;
        return this;
    }
    tag(key, value) {
        if (!value)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f")[`#${key}`] = value;
        return this;
    }
    search(keyword) {
        if (!keyword)
            return this;
        __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").search = keyword;
        return this;
    }
    /**
     * Build/expand this filter into a set of relay specific queries
     */
    build(relays, id) {
        // when querying for specific event ids with relay hints
        // take the first approach which is to split the filter by relay
        if (__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").ids && __classPrivateFieldGet(this, _RequestFilterBuilder_relayHints, "f").size > 0) {
            const relays = (0, Util_1.dedupe)([...__classPrivateFieldGet(this, _RequestFilterBuilder_relayHints, "f").values()].flat());
            return relays.map(r => {
                return {
                    filters: [
                        {
                            ...__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f"),
                            ids: [...__classPrivateFieldGet(this, _RequestFilterBuilder_relayHints, "f").entries()].filter(([, v]) => v.includes(r)).map(([k]) => k),
                        },
                    ],
                    relay: r,
                    strategy: RequestStrategy.RelayHintedEventIds,
                };
            });
        }
        // If any authors are set use the gossip model to fetch data for each author
        if (__classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f").authors) {
            const split = (0, GossipModel_1.splitByWriteRelays)(relays, __classPrivateFieldGet(this, _RequestFilterBuilder_filter, "f"));
            return split.map(a => {
                return {
                    filters: [a.filter],
                    relay: a.relay,
                    strategy: RequestStrategy.AuthorsRelays,
                };
            });
        }
        return [
            {
                filters: [this.filter],
                relay: "",
                strategy: RequestStrategy.DefaultRelays,
            },
        ];
    }
}
exports.RequestFilterBuilder = RequestFilterBuilder;
_RequestFilterBuilder_filter = new WeakMap(), _RequestFilterBuilder_relayHints = new WeakMap();
//# sourceMappingURL=RequestBuilder.js.map