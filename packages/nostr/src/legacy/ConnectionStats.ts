/**
 * Stats class for tracking metrics per connection
 */
export class ConnectionStats {
  /**
   * Last n records of how long between REQ->EOSE
   */
  Latency: number[] = [];

  /**
   * Total number of REQ's sent on this connection
   */
  Subs: number = 0;

  /**
   * Count of REQ which took too long and where abandoned
   */
  SubsTimeout: number = 0;

  /**
   * Total number of EVENT messages received
   */
  EventsReceived: number = 0;

  /**
   * Total number of EVENT messages sent
   */
  EventsSent: number = 0;

  /**
   * Total number of times this connection was lost
   */
  Disconnects: number = 0;
}
