import { ConnectionStats } from "./ConnectionStats";
import { NostrEvent, ReqCommand, TaggedRawEvent, u256 } from "./Nostr";
import { RelayInfo } from "./RelayInfo";
import ExternalStore from "./ExternalStore";
export type AuthHandler = (challenge: string, relay: string) => Promise<NostrEvent | undefined>;
/**
 * Relay settings
 */
export interface RelaySettings {
    read: boolean;
    write: boolean;
}
/**
 * Snapshot of connection stats
 */
export interface ConnectionStateSnapshot {
    connected: boolean;
    disconnects: number;
    avgLatency: number;
    events: {
        received: number;
        send: number;
    };
    settings?: RelaySettings;
    info?: RelayInfo;
    pendingRequests: Array<string>;
    activeRequests: Array<string>;
    id: string;
    ephemeral: boolean;
    address: string;
}
export declare class Connection extends ExternalStore<ConnectionStateSnapshot> {
    #private;
    Id: string;
    Address: string;
    Socket: WebSocket | null;
    PendingRaw: Array<object>;
    PendingRequests: Array<{
        cmd: ReqCommand;
        cb: () => void;
    }>;
    ActiveRequests: Set<string>;
    Settings: RelaySettings;
    Info?: RelayInfo;
    ConnectTimeout: number;
    Stats: ConnectionStats;
    HasStateChange: boolean;
    IsClosed: boolean;
    ReconnectTimer: ReturnType<typeof setTimeout> | null;
    EventsCallback: Map<u256, (msg: boolean[]) => void>;
    OnConnected?: () => void;
    OnEvent?: (sub: string, e: TaggedRawEvent) => void;
    OnEose?: (sub: string) => void;
    OnDisconnect?: (id: string) => void;
    Auth?: AuthHandler;
    AwaitingAuth: Map<string, boolean>;
    Authed: boolean;
    Ephemeral: boolean;
    EphemeralTimeout: ReturnType<typeof setTimeout> | undefined;
    Down: boolean;
    constructor(addr: string, options: RelaySettings, auth?: AuthHandler, ephemeral?: boolean);
    ResetEphemeralTimeout(): void;
    Connect(): Promise<void>;
    Close(): void;
    OnOpen(): void;
    OnClose(e: CloseEvent): void;
    OnMessage(e: MessageEvent): void;
    OnError(e: Event): void;
    /**
     * Send event on this connection
     */
    SendEvent(e: NostrEvent): void;
    /**
     * Send event on this connection and wait for OK response
     */
    SendAsync(e: NostrEvent, timeout?: number): Promise<void>;
    /**
     * Using relay document to determine if this relay supports a feature
     */
    SupportsNip(n: number): boolean;
    /**
     * Queue or send command to the relay
     * @param cmd The REQ to send to the server
     */
    QueueReq(cmd: ReqCommand, cbSent: () => void): void;
    CloseReq(id: string): void;
    takeSnapshot(): ConnectionStateSnapshot;
    _OnAuthAsync(challenge: string): Promise<void>;
}
//# sourceMappingURL=Connection.d.ts.map