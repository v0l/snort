import { Connection, ReqFilter, TaggedRawEvent } from ".";
import { NoteStore } from "./NoteCollection";
import { BuiltRawReqFilter } from "./RequestBuilder";
/**
 * Tracing for relay query status
 */
declare class QueryTrace {
    #private;
    readonly relay: string;
    readonly filters: Array<ReqFilter>;
    readonly connId: string;
    readonly id: string;
    readonly start: number;
    sent?: number;
    eose?: number;
    close?: number;
    constructor(relay: string, filters: Array<ReqFilter>, connId: string, fnClose: (id: string) => void, fnProgress: () => void);
    sentToRelay(): void;
    gotEose(): void;
    forceEose(): void;
    sendClose(): void;
    /**
     * Time spent in queue
     */
    get queued(): number;
    /**
     * Total query runtime
     */
    get runtime(): number;
    /**
     * Total time spent waiting for relay to respond
     */
    get responseTime(): number;
    /**
     * If tracing is finished, we got EOSE or timeout
     */
    get finished(): boolean;
}
export interface QueryBase {
    /**
     * Uniquie ID of this query
     */
    id: string;
    /**
     * The query payload (REQ filters)
     */
    filters: Array<ReqFilter>;
    /**
     * List of relays to send this query to
     */
    relays?: Array<string>;
}
/**
 * Active or queued query on the system
 */
export declare class Query implements QueryBase {
    #private;
    /**
     * Uniquie ID of this query
     */
    id: string;
    constructor(id: string, feed: NoteStore, leaveOpen?: boolean);
    canRemove(): boolean;
    /**
     * Recompute the complete set of compressed filters from all query traces
     */
    get filters(): ReqFilter[];
    get feed(): NoteStore;
    onEvent(sub: string, e: TaggedRawEvent): void;
    /**
     * This function should be called when this Query object and FeedStore is no longer needed
     */
    cancel(): void;
    uncancel(): void;
    cleanup(): void;
    sendToRelay(c: Connection, subq: BuiltRawReqFilter): QueryTrace | undefined;
    connectionLost(id: string): void;
    sendClose(): void;
    eose(sub: string, conn: Readonly<Connection>): void;
    /**
     * Get the progress to EOSE, can be used to determine when we should load more content
     */
    get progress(): number;
}
export {};
//# sourceMappingURL=Query.d.ts.map