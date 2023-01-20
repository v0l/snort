import { HexKey, u256 } from "Nostr";

export default class Tag {
    Original: string[];
    Key: string;
    Event?: u256;
    PubKey?: HexKey;
    Relay?: string;
    Marker?: string;
    Hashtag?: string;
    Index: number;
    Invalid: boolean;

    constructor(tag: string[], index: number) {
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
            case "t": {
                this.Hashtag = tag[1];
                break;
            }
            case "delegation": {
                this.PubKey = tag[1];
                break;
            }
        }
    }

    ToObject(): string[] | null {
        switch (this.Key) {
            case "e": {
                let ret = ["e", this.Event, this.Relay, this.Marker];
                let trimEnd = ret.reverse().findIndex(a => a !== undefined);
                ret = ret.reverse().slice(0, ret.length - trimEnd);
                return <string[]>ret;
            }
            case "p": {
                return this.PubKey ? ["p", this.PubKey] : null;
            }
            case "t": {
                return ["t", this.Hashtag!];
            }
            default: {
                return this.Original;
            }
        }
    }
}