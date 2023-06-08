import { NostrPrefix } from ".";
export interface NostrLink {
    type: NostrPrefix;
    id: string;
    kind?: number;
    author?: string;
    relays?: Array<string>;
    encode(): string;
}
export declare function validateNostrLink(link: string): boolean;
export declare function tryParseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink | undefined;
export declare function parseNostrLink(link: string, prefixHint?: NostrPrefix): NostrLink;
//# sourceMappingURL=NostrLink.d.ts.map