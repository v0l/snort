import ExternalStore from "./ExternalStore";
import { NostrEvent, TaggedRawEvent } from "./Nostr";
import { AuthHandler, Connection, RelaySettings, ConnectionStateSnapshot } from "./Connection";
import { Query } from "./Query";
import { RelayCache } from "./GossipModel";
import { NoteStore } from "./NoteCollection";
import { BuiltRawReqFilter, RequestBuilder } from "./RequestBuilder";
import { SystemInterface, SystemSnapshot } from ".";
/**
 * Manages nostr content retrieval system
 */
export declare class NostrSystem extends ExternalStore<SystemSnapshot> implements SystemInterface {
    #private;
    /**
     * All active queries
     */
    Queries: Map<string, Query>;
    /**
     * Handler function for NIP-42
     */
    HandleAuth?: AuthHandler;
    constructor(relayCache: RelayCache);
    get Sockets(): ConnectionStateSnapshot[];
    /**
     * Connect to a NOSTR relay if not already connected
     */
    ConnectToRelay(address: string, options: RelaySettings): Promise<void>;
    OnRelayDisconnect(id: string): void;
    OnEndOfStoredEvents(c: Readonly<Connection>, sub: string): void;
    OnEvent(sub: string, ev: TaggedRawEvent): void;
    /**
     *
     * @param address Relay address URL
     */
    ConnectEphemeralRelay(address: string): Promise<Connection | undefined>;
    /**
     * Disconnect from a relay
     */
    DisconnectRelay(address: string): void;
    GetQuery(id: string): Query | undefined;
    Query<T extends NoteStore>(type: {
        new (): T;
    }, req: RequestBuilder): Query;
    SendQuery(q: Query, qSend: BuiltRawReqFilter): Promise<{
        readonly id: string;
        readonly start: number;
        sent?: number | undefined;
        eose?: number | undefined;
        close?: number | undefined;
        "__#9@#wasForceClosed": boolean;
        readonly "__#9@#fnClose": (id: string) => void;
        readonly "__#9@#fnProgress": () => void;
        readonly relay: string;
        readonly filters: import("./Nostr").ReqFilter[];
        readonly connId: string;
        sentToRelay(): void;
        gotEose(): void;
        forceEose(): void;
        sendClose(): void;
        readonly queued: number;
        readonly runtime: number;
        readonly responseTime: number;
        readonly finished: boolean;
    }[]>;
    /**
     * Send events to writable relays
     */
    BroadcastEvent(ev: NostrEvent): void;
    /**
     * Write an event to a relay then disconnect
     */
    WriteOnceToRelay(address: string, ev: NostrEvent): Promise<void>;
    takeSnapshot(): SystemSnapshot;
}
//# sourceMappingURL=NostrSystem.d.ts.map