import { SystemSnapshot, SystemInterface } from ".";
import { AuthHandler, ConnectionStateSnapshot, RelaySettings } from "./Connection";
import ExternalStore from "./ExternalStore";
import { NostrEvent } from "./Nostr";
import { NoteStore } from "./NoteCollection";
import { Query } from "./Query";
import { RequestBuilder } from "./RequestBuilder";
export declare class SystemWorker extends ExternalStore<SystemSnapshot> implements SystemInterface {
    #private;
    constructor();
    HandleAuth?: AuthHandler;
    get Sockets(): ConnectionStateSnapshot[];
    Query<T extends NoteStore>(type: new () => T, req: RequestBuilder | null): Query | undefined;
    CancelQuery(sub: string): void;
    GetQuery(sub: string): Query | undefined;
    ConnectToRelay(address: string, options: RelaySettings): Promise<void>;
    DisconnectRelay(address: string): void;
    BroadcastEvent(ev: NostrEvent): void;
    WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<void>;
    takeSnapshot(): SystemSnapshot;
}
//# sourceMappingURL=SystemWorker.d.ts.map