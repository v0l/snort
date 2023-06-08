import { HexKey } from "./Nostr";
export declare enum NostrPrefix {
    PublicKey = "npub",
    PrivateKey = "nsec",
    Note = "note",
    Profile = "nprofile",
    Event = "nevent",
    Relay = "nrelay",
    Address = "naddr"
}
export declare enum TLVEntryType {
    Special = 0,
    Relay = 1,
    Author = 2,
    Kind = 3
}
export interface TLVEntry {
    type: TLVEntryType;
    length: number;
    value: string | HexKey | number;
}
export declare function encodeTLV(prefix: NostrPrefix, id: string, relays?: string[], kind?: number, author?: string): string;
export declare function decodeTLV(str: string): TLVEntry[];
//# sourceMappingURL=Links.d.ts.map