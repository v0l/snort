import { EventKind, HexKey, NostrEvent, Tag } from ".";
export interface Thread {
    root?: Tag;
    replyTo?: Tag;
    mentions: Array<Tag>;
    pubKeys: Array<HexKey>;
}
export declare abstract class EventExt {
    #private;
    /**
     * Get the pub key of the creator of this event NIP-26
     */
    static getRootPubKey(e: NostrEvent): HexKey;
    /**
     * Sign this message with a private key
     */
    static sign(e: NostrEvent, key: HexKey): void;
    /**
     * Check the signature of this message
     * @returns True if valid signature
     */
    static verify(e: NostrEvent): boolean;
    static createId(e: NostrEvent): string;
    /**
     * Create a new event for a specific pubkey
     */
    static forPubKey(pk: HexKey, kind: EventKind): NostrEvent;
    static extractThread(ev: NostrEvent): Thread | undefined;
    /**
     * Encrypt the given message content
     */
    static encryptData(content: string, pubkey: HexKey, privkey: HexKey): Promise<string>;
    /**
     * Decrypt the content of the message
     */
    static decryptData(cyphertext: string, privkey: HexKey, pubkey: HexKey): Promise<string>;
    /**
     * Decrypt the content of this message in place
     */
    static decryptDm(content: string, privkey: HexKey, pubkey: HexKey): Promise<string>;
}
//# sourceMappingURL=EventExt.d.ts.map