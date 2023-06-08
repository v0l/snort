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
var _ProfileLoaderService_instances, _ProfileLoaderService_system, _ProfileLoaderService_cache, _ProfileLoaderService_log, _ProfileLoaderService_FetchMetadata;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileLoaderService = void 0;
const _1 = require(".");
const Const_1 = require("./Const");
const cache_1 = require("./cache");
const Util_1 = require("./Util");
const debug_1 = __importDefault(require("debug"));
class ProfileLoaderService {
    constructor(system, cache) {
        _ProfileLoaderService_instances.add(this);
        _ProfileLoaderService_system.set(this, void 0);
        _ProfileLoaderService_cache.set(this, void 0);
        /**
         * List of pubkeys to fetch metadata for
         */
        this.WantsMetadata = new Set();
        _ProfileLoaderService_log.set(this, (0, debug_1.default)("ProfileCache"));
        __classPrivateFieldSet(this, _ProfileLoaderService_system, system, "f");
        __classPrivateFieldSet(this, _ProfileLoaderService_cache, cache, "f");
        __classPrivateFieldGet(this, _ProfileLoaderService_instances, "m", _ProfileLoaderService_FetchMetadata).call(this);
    }
    /**
     * Request profile metadata for a set of pubkeys
     */
    TrackMetadata(pk) {
        const bufferNow = [];
        for (const p of Array.isArray(pk) ? pk : [pk]) {
            if (p.length > 0 && this.WantsMetadata.add(p)) {
                bufferNow.push(p);
            }
        }
        __classPrivateFieldGet(this, _ProfileLoaderService_cache, "f").buffer(bufferNow);
    }
    /**
     * Stop tracking metadata for a set of pubkeys
     */
    UntrackMetadata(pk) {
        for (const p of Array.isArray(pk) ? pk : [pk]) {
            if (p.length > 0) {
                this.WantsMetadata.delete(p);
            }
        }
    }
    async onProfileEvent(e) {
        const profile = (0, cache_1.mapEventToProfile)(e);
        if (profile) {
            await __classPrivateFieldGet(this, _ProfileLoaderService_cache, "f").update(profile);
        }
    }
}
exports.ProfileLoaderService = ProfileLoaderService;
_ProfileLoaderService_system = new WeakMap(), _ProfileLoaderService_cache = new WeakMap(), _ProfileLoaderService_log = new WeakMap(), _ProfileLoaderService_instances = new WeakSet(), _ProfileLoaderService_FetchMetadata = async function _ProfileLoaderService_FetchMetadata() {
    const missingFromCache = await __classPrivateFieldGet(this, _ProfileLoaderService_cache, "f").buffer([...this.WantsMetadata]);
    const expire = (0, Util_1.unixNowMs)() - Const_1.ProfileCacheExpire;
    const expired = [...this.WantsMetadata]
        .filter(a => !missingFromCache.includes(a))
        .filter(a => (__classPrivateFieldGet(this, _ProfileLoaderService_cache, "f").getFromCache(a)?.loaded ?? 0) < expire);
    const missing = new Set([...missingFromCache, ...expired]);
    if (missing.size > 0) {
        __classPrivateFieldGet(this, _ProfileLoaderService_log, "f").call(this, "Wants profiles: %d missing, %d expired", missingFromCache.length, expired.length);
        const sub = new _1.RequestBuilder("profiles");
        sub
            .withOptions({
            skipDiff: true,
        })
            .withFilter()
            .kinds([_1.EventKind.SetMetadata])
            .authors([...missing]);
        const newProfiles = new Set();
        const q = __classPrivateFieldGet(this, _ProfileLoaderService_system, "f").Query(_1.PubkeyReplaceableNoteStore, sub);
        const feed = q?.feed ?? new _1.PubkeyReplaceableNoteStore();
        // never release this callback, it will stop firing anyway after eose
        const releaseOnEvent = feed.onEvent(async (e) => {
            for (const pe of e) {
                newProfiles.add(pe.id);
                await this.onProfileEvent(pe);
            }
        });
        const results = await new Promise(resolve => {
            let timeout = undefined;
            const release = feed.hook(() => {
                if (!feed.loading) {
                    clearTimeout(timeout);
                    resolve(feed.getSnapshotData() ?? []);
                    __classPrivateFieldGet(this, _ProfileLoaderService_log, "f").call(this, "Profiles finished: %s", sub.id);
                    release();
                }
            });
            timeout = setTimeout(() => {
                release();
                resolve(feed.getSnapshotData() ?? []);
                __classPrivateFieldGet(this, _ProfileLoaderService_log, "f").call(this, "Profiles timeout: %s", sub.id);
            }, 5000);
        });
        releaseOnEvent();
        const couldNotFetch = [...missing].filter(a => !results.some(b => b.pubkey === a));
        if (couldNotFetch.length > 0) {
            __classPrivateFieldGet(this, _ProfileLoaderService_log, "f").call(this, "No profiles: %o", couldNotFetch);
            const empty = couldNotFetch.map(a => __classPrivateFieldGet(this, _ProfileLoaderService_cache, "f").update({
                pubkey: a,
                loaded: (0, Util_1.unixNowMs)() - Const_1.ProfileCacheExpire + 5000,
                created: 69,
            }));
            await Promise.all(empty);
        }
        // When we fetch an expired profile and its the same as what we already have
        // onEvent is not fired and the loaded timestamp never gets updated
        const expiredSame = results.filter(a => !newProfiles.has(a.id) && expired.includes(a.pubkey));
        await Promise.all(expiredSame.map(v => this.onProfileEvent(v)));
    }
    setTimeout(() => __classPrivateFieldGet(this, _ProfileLoaderService_instances, "m", _ProfileLoaderService_FetchMetadata).call(this), 500);
};
//# sourceMappingURL=ProfileCache.js.map