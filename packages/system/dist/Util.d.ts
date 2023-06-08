import { NostrEvent, u256 } from "./Nostr";
export declare function unwrap<T>(v: T | undefined | null): T;
/**
 * Convert hex to bech32
 */
export declare function hexToBech32(hrp: string, hex?: string): string;
export declare function sanitizeRelayUrl(url: string): string | undefined;
export declare function unixNow(): number;
export declare function unixNowMs(): number;
export declare function deepEqual(x: any, y: any): boolean;
/**
 * Compute the "distance" between two objects by comparing their difference in properties
 * Missing/Added keys result in +10 distance
 * This is not recursive
 */
export declare function distance(a: any, b: any): number;
export declare function dedupe<T>(v: Array<T>): T[];
export declare function appendDedupe<T>(a?: Array<T>, b?: Array<T>): T[];
export declare function findTag(e: NostrEvent, tag: string): string | undefined;
export declare const sha256: (str: string | Uint8Array) => u256;
export declare function getPublicKey(privKey: string): string;
export declare function bech32ToHex(str: string): string;
//# sourceMappingURL=Util.d.ts.map