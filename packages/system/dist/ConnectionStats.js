"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStats = void 0;
/**
 * Stats class for tracking metrics per connection
 */
class ConnectionStats {
    constructor() {
        /**
         * Last n records of how long between REQ->EOSE
         */
        this.Latency = [];
        /**
         * Total number of REQ's sent on this connection
         */
        this.Subs = 0;
        /**
         * Count of REQ which took too long and where abandoned
         */
        this.SubsTimeout = 0;
        /**
         * Total number of EVENT messages received
         */
        this.EventsReceived = 0;
        /**
         * Total number of EVENT messages sent
         */
        this.EventsSent = 0;
        /**
         * Total number of times this connection was lost
         */
        this.Disconnects = 0;
    }
}
exports.ConnectionStats = ConnectionStats;
//# sourceMappingURL=ConnectionStats.js.map