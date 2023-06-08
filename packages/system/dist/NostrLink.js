"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNostrLink = exports.tryParseNostrLink = exports.validateNostrLink = void 0;
const Util_1 = require("./Util");
const _1 = require(".");
function validateNostrLink(link) {
    try {
        const parsedLink = parseNostrLink(link);
        if (!parsedLink) {
            return false;
        }
        if (parsedLink.type === _1.NostrPrefix.PublicKey || parsedLink.type === _1.NostrPrefix.Note) {
            return parsedLink.id.length === 64;
        }
        return true;
    }
    catch {
        return false;
    }
}
exports.validateNostrLink = validateNostrLink;
function tryParseNostrLink(link, prefixHint) {
    try {
        return parseNostrLink(link, prefixHint);
    }
    catch {
        return undefined;
    }
}
exports.tryParseNostrLink = tryParseNostrLink;
function parseNostrLink(link, prefixHint) {
    const entity = link.startsWith("web+nostr:") || link.startsWith("nostr:") ? link.split(":")[1] : link;
    const isPrefix = (prefix) => {
        return entity.startsWith(prefix);
    };
    if (isPrefix(_1.NostrPrefix.PublicKey)) {
        const id = (0, Util_1.bech32ToHex)(entity);
        if (id.length !== 64)
            throw new Error("Invalid nostr link, must contain 32 byte id");
        return {
            type: _1.NostrPrefix.PublicKey,
            id: id,
            encode: () => (0, Util_1.hexToBech32)(_1.NostrPrefix.PublicKey, id),
        };
    }
    else if (isPrefix(_1.NostrPrefix.Note)) {
        const id = (0, Util_1.bech32ToHex)(entity);
        if (id.length !== 64)
            throw new Error("Invalid nostr link, must contain 32 byte id");
        return {
            type: _1.NostrPrefix.Note,
            id: id,
            encode: () => (0, Util_1.hexToBech32)(_1.NostrPrefix.Note, id),
        };
    }
    else if (isPrefix(_1.NostrPrefix.Profile) || isPrefix(_1.NostrPrefix.Event) || isPrefix(_1.NostrPrefix.Address)) {
        const decoded = (0, _1.decodeTLV)(entity);
        const id = decoded.find(a => a.type === _1.TLVEntryType.Special)?.value;
        const relays = decoded.filter(a => a.type === _1.TLVEntryType.Relay).map(a => a.value);
        const author = decoded.find(a => a.type === _1.TLVEntryType.Author)?.value;
        const kind = decoded.find(a => a.type === _1.TLVEntryType.Kind)?.value;
        const encode = () => {
            return entity; // return original
        };
        if (isPrefix(_1.NostrPrefix.Profile)) {
            if (id.length !== 64)
                throw new Error("Invalid nostr link, must contain 32 byte id");
            return {
                type: _1.NostrPrefix.Profile,
                id,
                relays,
                kind,
                author,
                encode,
            };
        }
        else if (isPrefix(_1.NostrPrefix.Event)) {
            if (id.length !== 64)
                throw new Error("Invalid nostr link, must contain 32 byte id");
            return {
                type: _1.NostrPrefix.Event,
                id,
                relays,
                kind,
                author,
                encode,
            };
        }
        else if (isPrefix(_1.NostrPrefix.Address)) {
            return {
                type: _1.NostrPrefix.Address,
                id,
                relays,
                kind,
                author,
                encode,
            };
        }
    }
    else if (prefixHint) {
        return {
            type: prefixHint,
            id: link,
            encode: () => (0, Util_1.hexToBech32)(prefixHint, link),
        };
    }
    throw new Error("Invalid nostr link");
}
exports.parseNostrLink = parseNostrLink;
//# sourceMappingURL=NostrLink.js.map