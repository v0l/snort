export default class Tag {
    constructor(tag, index) {
        this.Key = tag[0];
        this.Event = null;
        this.PubKey = null;
        this.Relay = null;
        this.Marker = null;
        this.Other = null;
        this.Index = index;

        switch (this.Key) {
            case "e": {
                // ["e", <event-id>, <relay-url>, <marker>]
                this.Event = tag[1];
                this.Relay = tag.length > 2 ? tag[2] : null;
                this.Marker = tag.length > 3 ? tag[3] : null;
                break;
            }
            case "p": {
                // ["p", <pubkey>]
                this.PubKey = tag[1];
                break;
            }
            default: {
                this.Other = tag;
                break;
            }
        }
    }

    ToObject() {
        switch (this.Key) {
            case "e": {
                return ["e", this.Event, this.Relay, this.Marker].filter(a => a !== null);
            }
            case "p": {
                return ["p", this.PubKey];
            }
            default: {
                return this.Other;
            }
        }
        return null;
    }
}