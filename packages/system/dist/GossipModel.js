"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitByWriteRelays = exports.splitAllByWriteRelays = void 0;
const Util_1 = require("./Util");
const debug_1 = __importDefault(require("debug"));
const PickNRelays = 2;
function splitAllByWriteRelays(cache, filters) {
    const allSplit = filters
        .map(a => splitByWriteRelays(cache, a))
        .reduce((acc, v) => {
        for (const vn of v) {
            const existing = acc.get(vn.relay);
            if (existing) {
                existing.push(vn.filter);
            }
            else {
                acc.set(vn.relay, [vn.filter]);
            }
        }
        return acc;
    }, new Map());
    return [...allSplit.entries()].map(([k, v]) => {
        return {
            relay: k,
            filters: v,
        };
    });
}
exports.splitAllByWriteRelays = splitAllByWriteRelays;
/**
 * Split filters by authors
 * @param filter
 * @returns
 */
function splitByWriteRelays(cache, filter) {
    if ((filter.authors?.length ?? 0) === 0)
        return [
            {
                relay: "",
                filter,
            },
        ];
    const allRelays = (0, Util_1.unwrap)(filter.authors).map(a => {
        return {
            key: a,
            relays: cache.get(a)?.filter(a => a.settings.write),
        };
    });
    const missing = allRelays.filter(a => a.relays === undefined);
    const hasRelays = allRelays.filter(a => a.relays !== undefined);
    const relayUserMap = hasRelays.reduce((acc, v) => {
        for (const r of (0, Util_1.unwrap)(v.relays)) {
            if (!acc.has(r.url)) {
                acc.set(r.url, new Set([v.key]));
            }
            else {
                (0, Util_1.unwrap)(acc.get(r.url)).add(v.key);
            }
        }
        return acc;
    }, new Map());
    // selection algo will just pick relays with the most users
    const topRelays = [...relayUserMap.entries()].sort(([, v], [, v1]) => v1.size - v.size);
    // <relay, key[]> - count keys per relay
    // <key, relay[]> - pick n top relays
    // <relay, key[]> - map keys per relay (for subscription filter)
    const userPickedRelays = (0, Util_1.unwrap)(filter.authors).map(k => {
        // pick top 3 relays for this key
        const relaysForKey = topRelays
            .filter(([, v]) => v.has(k))
            .slice(0, PickNRelays)
            .map(([k]) => k);
        return { k, relaysForKey };
    });
    const pickedRelays = new Set(userPickedRelays.map(a => a.relaysForKey).flat());
    const picked = [...pickedRelays].map(a => {
        const keysOnPickedRelay = new Set(userPickedRelays.filter(b => b.relaysForKey.includes(a)).map(b => b.k));
        return {
            relay: a,
            filter: {
                ...filter,
                authors: [...keysOnPickedRelay],
            },
        };
    });
    if (missing.length > 0) {
        picked.push({
            relay: "",
            filter: {
                ...filter,
                authors: missing.map(a => a.key),
            },
        });
    }
    (0, debug_1.default)("GOSSIP")("Picked %o", picked);
    return picked;
}
exports.splitByWriteRelays = splitByWriteRelays;
//# sourceMappingURL=GossipModel.js.map