/**
 * Stats class for tracking metrics per connection
 */
export declare class ConnectionStats {
    /**
     * Last n records of how long between REQ->EOSE
     */
    Latency: number[];
    /**
     * Total number of REQ's sent on this connection
     */
    Subs: number;
    /**
     * Count of REQ which took too long and where abandoned
     */
    SubsTimeout: number;
    /**
     * Total number of EVENT messages received
     */
    EventsReceived: number;
    /**
     * Total number of EVENT messages sent
     */
    EventsSent: number;
    /**
     * Total number of times this connection was lost
     */
    Disconnects: number;
}
//# sourceMappingURL=ConnectionStats.d.ts.map