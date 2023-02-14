/**
 * Stats class for tracking metrics per connection
 */
export class ConnectionStats {
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

  constructor() {
    this.Latency = [];
    this.Subs = 0;
    this.SubsTimeout = 0;
    this.EventsReceived = 0;
    this.EventsSent = 0;
    this.Disconnects = 0;
  }
}
