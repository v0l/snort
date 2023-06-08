"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapEventToProfile = void 0;
const Util_1 = require("../Util");
function mapEventToProfile(ev) {
    try {
        const data = JSON.parse(ev.content);
        return {
            ...data,
            pubkey: ev.pubkey,
            npub: (0, Util_1.hexToBech32)("npub", ev.pubkey),
            created: ev.created_at,
            loaded: (0, Util_1.unixNowMs)(),
        };
    }
    catch (e) {
        console.error("Failed to parse JSON", ev, e);
    }
}
exports.mapEventToProfile = mapEventToProfile;
//# sourceMappingURL=index.js.map