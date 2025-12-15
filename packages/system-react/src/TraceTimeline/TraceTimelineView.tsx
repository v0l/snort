/* eslint-disable max-lines */
import { QueryTraceState, TimelineEntry } from "@snort/system";
import { SnortContext } from "../context";
import { use, useMemo, useState, useSyncExternalStore } from "react";
import "./TraceTimeline.css";
import { TraceTimelineDetailPopup } from "./TraceTimelineDetailPopup";

export function TraceTimelineView() {
  const system = use(SnortContext);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [timeScale, setTimeScale] = useState<number | null>(null); // null = auto (full range)

  // Available time scales in ms
  const timeScales = [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000];
  const timeScaleLabels: Record<number, string> = {
    10: "10ms",
    50: "50ms",
    100: "100ms",
    500: "500ms",
    1000: "1s",
    5000: "5s",
    10000: "10s",
    30000: "30s",
    60000: "1m",
  };

  const timeline = useSyncExternalStore(
    c => system.traceTimeline!.hook(c),
    () => system.traceTimeline!.snapshot(),
  );

  const entries = timeline.entries;

  const filteredEntries = useMemo(() => {
    if (!filter) return [...entries];
    const lowerFilter = filter.toLowerCase();
    return entries.filter(
      e => e.event.relay.toLowerCase().includes(lowerFilter) || e.event.id?.toLowerCase().includes(lowerFilter),
    );
  }, [entries, filter]);

  const baseTimeRange = useMemo(() => {
    if (filteredEntries.length === 0) return { min: 0, max: 0, range: 1 };
    const timestamps = filteredEntries.map(e => e.event.timestamp);
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return { min, max, range: max - min || 1000 };
  }, [filteredEntries]);

  const timeRange = useMemo(() => {
    const effectiveRange = timeScale ?? baseTimeRange.range;
    return {
      min: baseTimeRange.min,
      max: baseTimeRange.min + effectiveRange,
      range: effectiveRange,
    };
  }, [baseTimeRange, timeScale]);

  // Group entries by relay for swimlanes
  const swimlanes = useMemo(() => {
    const lanes = new Map<string, TimelineEntry[]>();
    for (const entry of filteredEntries) {
      const relay = entry.event.relay;
      if (!lanes.has(relay)) {
        lanes.set(relay, []);
      }
      lanes.get(relay)!.push(entry);
    }

    return Array.from(lanes.entries()).map(([relay, entries]) => {
      // Sort streaming queries first, then by timestamp
      const sorted = entries.sort((a, b) => {
        const aStreaming = a.event.state === QueryTraceState.WAITING_STREAM;
        const bStreaming = b.event.state === QueryTraceState.WAITING_STREAM;

        // Streaming queries always come first
        if (aStreaming && !bStreaming) return -1;
        if (!aStreaming && bStreaming) return 1;

        // Otherwise sort by timestamp
        return a.event.timestamp - b.event.timestamp;
      });

      // Group entries by trace ID to ensure each trace stays on one level
      const traceGroups = new Map<string, Array<TimelineEntry>>();
      for (const entry of sorted) {
        const traceId = entry.event.id;
        if (!traceGroups.has(traceId)) {
          traceGroups.set(traceId, []);
        }
        traceGroups.get(traceId)!.push(entry);
      }

      // Track which level each trace ID is assigned to
      const traceLevels = new Map<string, number>();

      // Track the end time of each level to find available slots
      const levelEndTimes: Array<number> = [];

      // Track the next available level for streaming queries
      let nextStreamingLevel = 0;

      // Create stacked bars with trace ID grouping
      const stacked = sorted.map(entry => {
        const startTime = entry.event.timestamp;
        const isStreaming = entry.event.state === QueryTraceState.WAITING_STREAM;
        // For stacking purposes, streaming queries only occupy their start point
        // We'll render them longer, but they don't block the timeline
        const endTime = isStreaming ? startTime : entry.runtime ? startTime + entry.runtime : startTime;
        const traceId = entry.event.id;

        // If this trace already has a level, use it
        let level: number;
        if (traceLevels.has(traceId)) {
          level = traceLevels.get(traceId)!;
        } else {
          if (isStreaming) {
            // Each streaming query gets its own dedicated level
            level = nextStreamingLevel;
            nextStreamingLevel++;
            // Ensure level exists but don't extend it (streaming queries don't block)
            if (level >= levelEndTimes.length) {
              levelEndTimes.push(startTime);
            }
          } else {
            // Non-streaming queries stack after all streaming queries
            level = nextStreamingLevel;
            while (level < levelEndTimes.length && levelEndTimes[level] > startTime) {
              level++;
            }
          }
          traceLevels.set(traceId, level);
        }

        // Update the end time for this level (only for non-streaming queries)
        if (!isStreaming) {
          if (level >= levelEndTimes.length) {
            levelEndTimes.push(endTime);
          } else {
            levelEndTimes[level] = Math.max(levelEndTimes[level], endTime);
          }
        }

        return { entry, startTime, endTime, level };
      });

      const maxLevel = Math.max(0, ...stacked.map(s => s.level));

      return {
        relay,
        entries: stacked,
        stackHeight: maxLevel + 1,
      };
    });
  }, [filteredEntries]);

  const relayColors = useMemo(() => {
    const colors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#14b8a6", // teal
      "#f97316", // orange
    ];
    const relays = swimlanes.map(s => s.relay);
    return new Map(relays.map((relay, i) => [relay, colors[i % colors.length]]));
  }, [swimlanes]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const generateTraceData = () => {
    // Convert timeline entries to Chrome Trace Event Format
    const traceEvents: Array<Record<string, unknown>> = [];

    // Add trace events - use duration events if runtime is available, instant events otherwise
    filteredEntries.forEach(entry => {
      const timestamp = entry.event.timestamp * 1000; // Convert to microseconds

      const pid = entry.event.relay; // Process ID = relay name
      const tid = entry.event.id; // Thread ID = query trace ID
      const queryName = entry.queryName || "Query";

      if (entry.runtime !== undefined) {
        // Duration event - shows as a bar
        const duration = entry.runtime * 1000; // Convert to microseconds
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
        });
      } else {
        // Instant event - shows as a point
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
            filters: entry.event.filters,
          },
        });
      }
    });

    return {
      traceEvents,
      displayTimeUnit: "ms",
      metadata: {
        "trace-type": "Nostr Relay Query Traces",
      },
    };
  };

  const exportGoogleTrace = () => {
    const traceData = generateTraceData();

    // Download as JSON file
    const blob = new Blob([JSON.stringify(traceData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nostr-trace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInPerfetto = () => {
    const traceData = generateTraceData();
    const jsonString = JSON.stringify(traceData);

    // Convert JSON string to ArrayBuffer
    const encoder = new TextEncoder();
    const arrayBuffer = encoder.encode(jsonString).buffer;

    // Open Perfetto UI
    const win = window.open("https://ui.perfetto.dev");
    if (!win) {
      alert("Failed to open Perfetto UI. Please allow popups for this site.");
      return;
    }

    // Use PING/PONG protocol to wait for Perfetto UI to be ready
    const pingInterval = setInterval(() => {
      win.postMessage("PING", "https://ui.perfetto.dev");
    }, 50);

    const onMessageHandler = (evt: MessageEvent) => {
      if (evt.data !== "PONG") return;

      // Clear the ping interval
      clearInterval(pingInterval);
      window.removeEventListener("message", onMessageHandler);

      // Send the trace data
      win.postMessage(
        {
          perfetto: {
            buffer: arrayBuffer,
            title: "Nostr Relay Query Traces",
            fileName: `nostr-trace-${Date.now()}.json`,
          },
        },
        "https://ui.perfetto.dev",
      );
    };

    window.addEventListener("message", onMessageHandler);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(pingInterval);
      window.removeEventListener("message", onMessageHandler);
    }, 10000);
  };

  const getBarPosition = (entry: TimelineEntry) => {
    const startTime = entry.event.timestamp;
    const isStreaming = entry.event.state === QueryTraceState.WAITING_STREAM;

    // For streaming queries, show as running until now
    const now = Date.now();
    const endTime = isStreaming ? now : entry.runtime ? startTime + entry.runtime : startTime;

    // Use the zoom scale for width calculation
    const effectiveRange = timeScale ?? baseTimeRange.range;

    // Calculate position based on the full base time range
    const startOffset = ((startTime - baseTimeRange.min) / baseTimeRange.range) * 100;
    const duration = endTime - startTime;
    // Width is based on the zoomed range to make bars wider when zoomed in
    const width = (duration / effectiveRange) * 100;

    // Show as thin marker if no runtime, otherwise show as bar
    return {
      left: Math.max(0, startOffset),
      width: entry.runtime || isStreaming ? Math.max(0.1, width) : 0.1,
      isStreaming,
    };
  };

  const handleZoomReset = () => {
    setTimeScale(null);
  };

  const handleZoomIn = () => {
    if (timeScale === null) {
      // Start from the first scale smaller than the base range
      const nextScale = [...timeScales].reverse().find(s => s < baseTimeRange.range);
      if (nextScale !== undefined) {
        setTimeScale(nextScale);
      }
    } else {
      // Find next smaller scale
      const currentIndex = timeScales.indexOf(timeScale);
      if (currentIndex > 0) {
        const nextScale = timeScales[currentIndex - 1];
        setTimeScale(nextScale);
      }
    }
  };

  const handleZoomOut = () => {
    if (timeScale === null) return;

    const currentIndex = timeScales.indexOf(timeScale);
    if (currentIndex < timeScales.length - 1) {
      // Go to next larger scale
      const nextScale = timeScales[currentIndex + 1];
      if (nextScale >= baseTimeRange.range) {
        // If next scale is larger than base range, go to auto
        setTimeScale(null);
      } else {
        setTimeScale(nextScale);
      }
    } else {
      // Already at largest scale, go to auto
      setTimeScale(null);
    }
  };

  const TRACK_HEIGHT = 20; // Height per stack level
  const HEADER_WIDTH = 200;

  return (
    <div className="trace-timeline-container">
      <div className="trace-timeline-controls">
        <input
          type="text"
          placeholder="Filter by relay or query ID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="trace-timeline-filter-input"
        />
        <div className="trace-timeline-controls-right">
          <button onClick={handleZoomOut} disabled={timeScale === null} className="trace-timeline-btn" title="Zoom out">
            -
          </button>
          <div className="trace-timeline-scale-label">{timeScale === null ? "Auto" : timeScaleLabels[timeScale]}</div>
          <button
            onClick={handleZoomIn}
            disabled={timeScale === timeScales[0]}
            className="trace-timeline-btn"
            title="Zoom in">
            +
          </button>
          <button
            onClick={handleZoomReset}
            disabled={timeScale === null}
            className="trace-timeline-btn"
            title="Reset zoom">
            Reset
          </button>
          <button
            onClick={openInPerfetto}
            disabled={filteredEntries.length === 0}
            className="trace-timeline-btn-export"
            title="Open trace in Perfetto UI">
            Open in Perfetto
          </button>
          <button
            onClick={exportGoogleTrace}
            disabled={filteredEntries.length === 0}
            className="trace-timeline-btn-export"
            title="Download trace as JSON">
            Export
          </button>
          <div className="trace-timeline-entry-count">
            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
          </div>
        </div>
      </div>

      <div className="trace-timeline-main">
        <div className="trace-timeline-chart">
          {/* Time ruler - fixed at top */}
          <div className="trace-timeline-header">
            <div className="trace-timeline-header-label" style={{ width: HEADER_WIDTH, height: 24 }} />
            <div className="trace-timeline-header-ruler">
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} className="trace-timeline-ruler-mark" style={{ left: `${pct}%` }}>
                  <div className="trace-timeline-ruler-mark-inner">
                    <div className="trace-timeline-ruler-mark-text">{formatTime((timeRange.range * pct) / 100)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable swimlanes */}
          <div className="trace-timeline-swimlanes">
            <div
              className="trace-timeline-swimlanes-content"
              style={{
                width: timeScale ? `${(baseTimeRange.range / timeRange.range) * 100}%` : "100%",
                minWidth: "100%",
              }}>
              {swimlanes.map(lane => (
                <div
                  key={lane.relay}
                  className="trace-timeline-lane"
                  style={{ height: lane.stackHeight * TRACK_HEIGHT }}>
                  {/* Relay label */}
                  <div className="trace-timeline-lane-label" style={{ width: HEADER_WIDTH, flexShrink: 0 }}>
                    <div className="trace-timeline-lane-label-content">
                      <div
                        className="trace-timeline-relay-color"
                        style={{ backgroundColor: relayColors.get(lane.relay) }}
                      />
                      <span className="trace-timeline-relay-name" title={lane.relay}>
                        {new URL(lane.relay).hostname}
                      </span>
                    </div>
                  </div>

                  {/* Timeline bars for this lane */}
                  <div className="trace-timeline-lane-bars">
                    {lane.entries.map((stacked, entryIdx) => {
                      const { left, width, isStreaming } = getBarPosition(stacked.entry);
                      const color = relayColors.get(lane.relay) || "#6b7280";
                      const isSelected = selectedEntry === stacked.entry;
                      const runtime = stacked.entry.runtime;

                      return (
                        <div
                          key={`${stacked.entry.event.timestamp}-${entryIdx}`}
                          className="trace-timeline-bar"
                          style={{
                            left: `${left}%`,
                            width: width > 0.5 ? `${width}%` : "4px",
                            top: stacked.level * TRACK_HEIGHT + 2,
                            height: TRACK_HEIGHT - 4,
                            background: isStreaming
                              ? `repeating-linear-gradient(45deg, ${color}, ${color} 10px, ${color}dd 10px, ${color}dd 20px)`
                              : color,
                            opacity: [QueryTraceState.TIMEOUT, QueryTraceState.DROP].includes(stacked.entry.event.state)
                              ? 0.6
                              : 0.9,
                            border: isSelected ? "2px solid white" : "none",
                            zIndex: isSelected ? 10 : 1,
                            animation: isStreaming ? "pulse 2s ease-in-out infinite" : "none",
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedEntry(stacked.entry);
                          }}
                          title={
                            isStreaming
                              ? `${stacked.entry.event.state} (streaming)`
                              : runtime !== undefined
                                ? `${stacked.entry.event.state} (${formatTime(runtime)})`
                                : stacked.entry.event.state
                          }>
                          {width > 5 && !isStreaming && runtime !== undefined && (
                            <div className="trace-timeline-bar-label" style={{ lineHeight: `${TRACK_HEIGHT - 4}px` }}>
                              {formatTime(runtime)}
                            </div>
                          )}
                          {width > 5 && isStreaming && (
                            <div className="trace-timeline-bar-label" style={{ lineHeight: `${TRACK_HEIGHT - 4}px` }}>
                              streaming...
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Query detail panel */}
        {selectedEntry && (
          <TraceTimelineDetailPopup selectedEntry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        )}
      </div>
    </div>
  );
}
