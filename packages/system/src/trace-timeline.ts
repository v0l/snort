import { ExternalStore } from "@snort/shared"
import { type QueryTraceEvent, QueryTraceState } from "./query"

export interface TimelineEntry {
  event: QueryTraceEvent
  queryName?: string
  runtime?: number // Duration spent in this state in ms
}

export interface TraceTimelineSnapshot {
  entries: ReadonlyArray<TimelineEntry>
  enabled: boolean
}

/**
 * Collects and manages trace reports in a timeline
 */
export class TraceTimeline extends ExternalStore<TraceTimelineSnapshot> {
  #entries: Array<TimelineEntry> = []
  #enabled: boolean = true
  // Track last entry index for each trace ID to update runtime
  #lastEntryIndex: Map<string, number> = new Map()
  // Track start timestamp for each trace ID to compute total elapsed time
  #startTimestamp: Map<string, number> = new Map()

  constructor() {
    super()
  }

  /**
   * Enable/disable timeline collection
   */
  setEnabled(enabled: boolean) {
    this.#enabled = enabled
    if (!enabled) {
      this.clear()
    } else {
      this.notifyChange()
    }
  }

  get enabled() {
    return this.#enabled
  }

  takeSnapshot(): TraceTimelineSnapshot {
    return {
      entries: [...this.#entries],
      enabled: this.#enabled,
    }
  }

  /**
   * Add a trace event to the timeline
   */
  addTrace(event: QueryTraceEvent, queryName?: string) {
    if (!this.#enabled) return

    // Record start timestamp on first state for this trace
    if (!this.#startTimestamp.has(event.id)) {
      this.#startTimestamp.set(event.id, event.timestamp)
    }

    // Update runtime of previous entry for this trace
    const lastIndex = this.#lastEntryIndex.get(event.id)
    if (lastIndex !== undefined && lastIndex < this.#entries.length) {
      const lastEntry = this.#entries[lastIndex]
      lastEntry.runtime = event.timestamp - lastEntry.event.timestamp
    }

    // For terminal/EOSE states, set runtime to total elapsed time from start
    const isTerminal = [
      QueryTraceState.EOSE,
      QueryTraceState.LOCAL_CLOSE,
      QueryTraceState.REMOTE_CLOSE,
      QueryTraceState.TIMEOUT,
      QueryTraceState.DROP,
    ].includes(event.state)
    const totalRuntime = isTerminal
      ? event.timestamp - (this.#startTimestamp.get(event.id) ?? event.timestamp)
      : undefined

    // Create new entry
    const entry: TimelineEntry = {
      event,
      queryName,
      runtime: totalRuntime, // Will be set when next state change occurs (non-terminal), or total elapsed (terminal)
    }

    // Add entry and update index tracking
    const newIndex = this.#entries.length
    this.#entries.push(entry)
    this.#lastEntryIndex.set(event.id, newIndex)
    this.notifyChange()
  }

  /**
   * Get all timeline entries
   */
  getEntries(): ReadonlyArray<TimelineEntry> {
    return this.#entries
  }

  /**
   * Get entries within a time range
   */
  getEntriesInRange(startTime: number, endTime: number): Array<TimelineEntry> {
    return this.#entries.filter(e => e.event.timestamp >= startTime && e.event.timestamp <= endTime)
  }

  /**
   * Get entries for a specific relay
   */
  getEntriesForRelay(relayAddress: string): Array<TimelineEntry> {
    return this.#entries.filter(e => e.event.relay === relayAddress)
  }

  /**
   * Get entries for a specific query
   */
  getEntriesForQuery(queryId: string): Array<TimelineEntry> {
    return this.#entries.filter(e => e.event.id === queryId)
  }

  /**
   * Clear all timeline entries
   */
  clear() {
    this.#entries = []
    this.#lastEntryIndex.clear()
    this.#startTimestamp.clear()
    this.notifyChange()
  }

  /**
   * Export timeline to Google Trace Event Format (for Chrome tracing / Perfetto)
   * https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview
   */
  exportGoogleTrace() {
    const traceEvents: Array<Record<string, unknown>> = []

    // Add trace events - use duration events if runtime is available, instant events otherwise
    this.#entries.forEach(entry => {
      const timestamp = entry.event.timestamp * 1000 // Convert to microseconds

      const pid = entry.event.relay // Process ID = relay name
      const tid = entry.event.id // Thread ID = query trace ID
      const queryName = entry.queryName || "Query"

      const isTerminal = [
        QueryTraceState.EOSE,
        QueryTraceState.LOCAL_CLOSE,
        QueryTraceState.REMOTE_CLOSE,
        QueryTraceState.TIMEOUT,
        QueryTraceState.DROP,
      ].includes(entry.event.state)

      if (entry.runtime !== undefined && !isTerminal) {
        // Duration event - shows as a bar (non-terminal states only)
        const duration = entry.runtime * 1000 // Convert to microseconds
        traceEvents.push({
          name: `${queryName} (${entry.event.state})`,
          cat: [QueryTraceState.TIMEOUT, QueryTraceState.DROP].includes(entry.event.state) ? "timeout" : "complete",
          ph: "X", // Complete/duration event
          ts: timestamp,
          dur: duration,
          pid: pid,
          tid: tid,
          args: {
            queryName: entry.queryName,
            relay: entry.event.relay,
            subscriptionId: entry.event.id,
            connectionId: entry.event.connId,
            state: entry.event.state,
            runtime: entry.runtime,
            filters: entry.event.filters,
          },
        })
      } else {
        // Instant event - shows as a point (terminal states, or states without a runtime yet)
        traceEvents.push({
          name: `${queryName} (${entry.event.state})`,
          cat: [QueryTraceState.TIMEOUT, QueryTraceState.DROP].includes(entry.event.state) ? "timeout" : "complete",
          ph: "i", // Instant event
          ts: timestamp,
          pid: pid,
          tid: tid,
          s: "t", // Thread scope
          args: {
            queryName: entry.queryName,
            relay: entry.event.relay,
            subscriptionId: entry.event.id,
            connectionId: entry.event.connId,
            state: entry.event.state,
            runtime: entry.runtime, // Total elapsed ms from QUEUED to this terminal state
            filters: entry.event.filters,
          },
        })
      }
    })

    return {
      traceEvents,
      displayTimeUnit: "ms",
      metadata: {
        "trace-type": "Nostr Relay Query Traces",
      },
    }
  }
}
