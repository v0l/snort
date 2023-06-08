"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("./Util");
class Tag {
    constructor(tag, index) {
        this.Original = tag;
        this.Key = tag[0];
        this.Index = index;
        this.Invalid = false;
        switch (this.Key) {
            case "e": {
                // ["e", <event-id>, <relay-url>, <marker>]
                this.Event = tag[1];
                this.Relay = tag.length > 2 ? tag[2] : undefined;
                this.Marker = tag.length > 3 ? tag[3] : undefined;
                if (!this.Event) {
                    this.Invalid = true;
                }
                break;
            }
            case "p": {
                // ["p", <pubkey>]
                this.PubKey = tag[1];
                if (!this.PubKey) {
                    this.Invalid = true;
                }
                break;
            }
            case "d": {
                this.DTag = tag[1];
                break;
            }
            case "a": {
                this.ATag = tag[1];
                break;
            }
            case "t": {
                this.Hashtag = tag[1];
                break;
            }
            case "delegation": {
                this.PubKey = tag[1];
                break;
            }
            case "zap": {
                this.LNURL = tag[1];
                break;
            }
        }
    }
    ToObject() {
        switch (this.Key) {
            case "e": {
                let ret = ["e", this.Event, this.Relay, this.Marker];
                const trimEnd = ret.reverse().findIndex(a => a !== undefined);
                ret = ret.reverse().slice(0, ret.length - trimEnd);
                return ret;
            }
            case "p": {
                return this.PubKey ? ["p", this.PubKey] : null;
            }
            case "t": {
                return ["t", (0, Util_1.unwrap)(this.Hashtag)];
            }
            case "d": {
                return ["d", (0, Util_1.unwrap)(this.DTag)];
            }
            default: {
                return this.Original;
            }
        }
    }
}
exports.default = Tag;
//# sourceMappingURL=Tag.js.map