import { FullRelaySettings, HexKey, Lists, NostrEvent, RelaySettings, SystemInterface, TaggedRawEvent, u256, UserMetadata } from ".";
import { EventBuilder } from "./EventBuilder";
export type EventBuilderHook = (ev: EventBuilder) => EventBuilder;
declare global {
    interface Window {
        nostr?: {
            getPublicKey: () => Promise<HexKey>;
            signEvent: <T extends NostrEvent>(event: T) => Promise<T>;
            getRelays?: () => Promise<Record<string, {
                read: boolean;
                write: boolean;
            }>>;
            nip04?: {
                encrypt?: (pubkey: HexKey, plaintext: string) => Promise<string>;
                decrypt?: (pubkey: HexKey, ciphertext: string) => Promise<string>;
            };
        };
    }
}
export declare class EventPublisher {
    #private;
    constructor(system: SystemInterface, pubKey: string, privKey?: string);
    nip4Encrypt(content: string, key: HexKey): Promise<string>;
    nip4Decrypt(content: string, otherKey: HexKey): Promise<string>;
    nip42Auth(challenge: string, relay: string): Promise<NostrEvent>;
    broadcast(ev: NostrEvent): void;
    /**
     * Write event to all given relays.
     */
    broadcastAll(ev: NostrEvent, relays: string[]): void;
    muted(keys: HexKey[], priv: HexKey[]): Promise<NostrEvent>;
    noteList(notes: u256[], list: Lists): Promise<NostrEvent>;
    tags(tags: string[]): Promise<NostrEvent>;
    metadata(obj: UserMetadata): Promise<NostrEvent>;
    /**
     * Create a basic text note
     */
    note(msg: string, fnExtra?: EventBuilderHook): Promise<NostrEvent>;
    /**
     * Create a zap request event for a given target event/profile
     * @param amount Millisats amout!
     * @param author Author pubkey to tag in the zap
     * @param note Note Id to tag in the zap
     * @param msg Custom message to be included in the zap
     */
    zap(amount: number, author: HexKey, relays: Array<string>, note?: HexKey, msg?: string, fnExtra?: EventBuilderHook): Promise<NostrEvent>;
    /**
     * Reply to a note
     */
    reply(replyTo: TaggedRawEvent, msg: string, fnExtra?: EventBuilderHook): Promise<NostrEvent>;
    react(evRef: NostrEvent, content?: string): Promise<NostrEvent>;
    relayList(relays: Array<FullRelaySettings> | Record<string, RelaySettings>): Promise<NostrEvent>;
    contactList(follows: Array<HexKey>, relays: Record<string, RelaySettings>): Promise<NostrEvent>;
    /**
     * Delete an event (NIP-09)
     */
    delete(id: u256): Promise<NostrEvent>;
    /**
     * Repost a note (NIP-18)
     */
    repost(note: NostrEvent): Promise<NostrEvent>;
    decryptDm(note: NostrEvent): Promise<string>;
    sendDm(content: string, to: HexKey): Promise<NostrEvent>;
    generic(fnHook: EventBuilderHook): Promise<NostrEvent>;
}
//# sourceMappingURL=EventPublisher.d.ts.map