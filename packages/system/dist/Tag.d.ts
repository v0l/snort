import { HexKey, u256 } from "./Nostr";
export default class Tag {
    Original: string[];
    Key: string;
    Event?: u256;
    PubKey?: HexKey;
    Relay?: string;
    Marker?: string;
    Hashtag?: string;
    DTag?: string;
    ATag?: string;
    Index: number;
    Invalid: boolean;
    LNURL?: string;
    constructor(tag: string[], index: number);
    ToObject(): string[] | null;
}
//# sourceMappingURL=Tag.d.ts.map