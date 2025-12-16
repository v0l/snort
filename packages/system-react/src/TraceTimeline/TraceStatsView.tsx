import { QueryTraceState, type TimelineEntry } from "@snort/system";
import { SnortContext } from "../context";
import { use, useMemo, useSyncExternalStore } from "react";
import "./TraceTimeline.css";
import { sanitizeRelayUrl } from "@snort/shared";

export function TraceStatsView() {
  const system = use(SnortContext);

  const timeline = useSyncExternalStore(
    c => system.traceTimeline?.hook(c) ?? (() => {}),
    () => system.traceTimeline?.snapshot() ?? { entries: [] },
  );

  const entries = timeline.entries;

  const stats = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }

    // Group entries by trace ID and get the latest state for each trace
    const latestStateByTrace = new Map<string, TimelineEntry>();
    for (const entry of entries) {
      const traceId = entry.event.id;
      const existing = latestStateByTrace.get(traceId);
      // Keep the entry with the latest timestamp (most recent state)
      if (!existing || entry.event.timestamp > existing.event.timestamp) {
        latestStateByTrace.set(traceId, entry);
      }
    }

    const latestEntries = Array.from(latestStateByTrace.values());

    const forcedCount = latestEntries.filter(e =>
      [QueryTraceState.TIMEOUT, QueryTraceState.DROP].includes(e.event.state),
    ).length;
    const completedCount = latestEntries.filter(e =>
      [QueryTraceState.EOSE, QueryTraceState.REMOTE_CLOSE, QueryTraceState.LOCAL_CLOSE].includes(e.event.state),
    ).length;
    const queuedCount = latestEntries.filter(e => e.event.state === QueryTraceState.QUEUED).length;
    const waitingCount = latestEntries.filter(e => e.event.state === QueryTraceState.WAITING).length;
    const streamingCount = latestEntries.filter(e => e.event.state === QueryTraceState.WAITING_STREAM).length;
    const syncCount = latestEntries.filter(e =>
      [QueryTraceState.SYNC_WAITING, QueryTraceState.SYNC_FALLBACK].includes(e.event.state),
    ).length;

    // Calculate timing statistics - time from sent to first response
    // Group entries by trace ID
    const traceTimings = new Map<string, number>();
    const traceGroups = new Map<string, Array<TimelineEntry>>();
    for (const entry of entries) {
      const traceId = entry.event.id;
      if (!traceGroups.has(traceId)) {
        traceGroups.set(traceId, []);
      }
      traceGroups.get(traceId)!.push(entry);
    }

    // Calculate response time for each trace
    for (const [traceId, traceEntries] of traceGroups) {
      // Sort by timestamp
      traceEntries.sort((a, b) => a.event.timestamp - b.event.timestamp);

      // Find the first "sent" event (WAITING or WAITING_STREAM)
      const sentEntry = traceEntries.find(e =>
        [QueryTraceState.WAITING, QueryTraceState.WAITING_STREAM].includes(e.event.state),
      );

      // Find the first completion event
      const completionEntry = traceEntries.find(e =>
        [QueryTraceState.EOSE, QueryTraceState.REMOTE_CLOSE, QueryTraceState.LOCAL_CLOSE].includes(e.event.state),
      );

      if (sentEntry && completionEntry) {
        const responseTime = completionEntry.event.timestamp - sentEntry.event.timestamp;
        traceTimings.set(traceId, responseTime);
      }
    }

    const runtimes = Array.from(traceTimings.values());
    const avgRuntime = runtimes.length > 0 ? runtimes.reduce((a, b) => a + b, 0) / runtimes.length : 0;
    const minRuntime = runtimes.length > 0 ? Math.min(...runtimes) : 0;
    const maxRuntime = runtimes.length > 0 ? Math.max(...runtimes) : 0;
    const medianRuntime = runtimes.length > 0 ? runtimes.sort((a, b) => a - b)[Math.floor(runtimes.length / 2)] : 0;

    interface RelayStatDetails {
      count: number;
      timeoutCount: number;
      dropCount: number;
      queuedCount: number;
      streamingCount: number;
      completedCount: number;
      avgRuntime: number;
      minRuntime: number;
      maxRuntime: number;
    }

    // Relay stats: count unique traces per relay, but use all entries for timing
    const relayStats = new Map<string, RelayStatDetails>();
    for (const entry of latestEntries) {
      const addr = sanitizeRelayUrl(entry.event.relay)!;
      const existing = relayStats.get(addr) || {
        count: 0,
        timeoutCount: 0,
        dropCount: 0,
        queuedCount: 0,
        streamingCount: 0,
        completedCount: 0,
        avgRuntime: 0,
        minRuntime: Infinity,
        maxRuntime: 0,
      };
      existing.count++;
      if (entry.event.state === QueryTraceState.TIMEOUT) existing.timeoutCount++;
      if (entry.event.state === QueryTraceState.DROP) existing.dropCount++;
      if (entry.event.state === QueryTraceState.QUEUED) existing.queuedCount++;
      if (entry.event.state === QueryTraceState.WAITING_STREAM) existing.streamingCount++;
      if (
        [QueryTraceState.EOSE, QueryTraceState.REMOTE_CLOSE, QueryTraceState.LOCAL_CLOSE].includes(entry.event.state)
      ) {
        existing.completedCount++;
      }
      relayStats.set(addr, existing);
    }

    // Add timing statistics per relay using the traceGroups already calculated above
    for (const [traceId, traceEntries] of traceGroups) {
      // Sort by timestamp to ensure correct order
      traceEntries.sort((a, b) => a.event.timestamp - b.event.timestamp);

      // Find the first "sent" event (WAITING or WAITING_STREAM)
      const sentEntry = traceEntries.find(e =>
        [QueryTraceState.WAITING, QueryTraceState.WAITING_STREAM].includes(e.event.state),
      );

      // Find the first completion event
      const completionEntry = traceEntries.find(e =>
        [QueryTraceState.EOSE, QueryTraceState.REMOTE_CLOSE, QueryTraceState.LOCAL_CLOSE].includes(e.event.state),
      );

      if (sentEntry && completionEntry) {
        const responseTime = completionEntry.event.timestamp - sentEntry.event.timestamp;
        const addr = sanitizeRelayUrl(sentEntry.event.relay)!;
        const stat = relayStats.get(addr);
        if (stat) {
          stat.avgRuntime += responseTime;
          stat.minRuntime = Math.min(stat.minRuntime, responseTime);
          stat.maxRuntime = Math.max(stat.maxRuntime, responseTime);
        }
      }
    }

    // Finalize averages
    for (const [relay, stat] of relayStats) {
      stat.avgRuntime = stat.completedCount > 0 ? stat.avgRuntime / stat.completedCount : 0;
      if (stat.minRuntime === Infinity) stat.minRuntime = 0;
    }

    // Group by query name (count unique traces)
    const queryNameStats = new Map<string, number>();
    for (const entry of latestEntries) {
      if (entry.queryName) {
        queryNameStats.set(entry.queryName, (queryNameStats.get(entry.queryName) || 0) + 1);
      }
    }

    return {
      totalEntries: latestEntries.length, // Count unique traces, not all state transitions
      forcedCount,
      completedCount,
      queuedCount,
      waitingCount,
      streamingCount,
      syncCount,
      avgRuntime,
      minRuntime,
      maxRuntime,
      medianRuntime,
      relayStats: [...relayStats.entries()].sort((a, b) => b[1].count - a[1].count),
      queryNameStats: [...queryNameStats.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [entries]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const exportGoogleTrace = () => {
    if (!system.traceTimeline) return;
    const traceData = system.traceTimeline.exportGoogleTrace();

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
    if (!system.traceTimeline) return;
    const traceData = system.traceTimeline.exportGoogleTrace();
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

  if (!stats) {
    return <div className="trace-stats-no-data">No trace data available</div>;
  }

  return (
    <div className="trace-stats-container">
      {/* Export Buttons */}
      <div className="trace-stats-export-buttons">
        <button
          onClick={openInPerfetto}
          disabled={entries.length === 0}
          className="trace-timeline-btn-export"
          title="Open trace in Perfetto UI">
          Open in Perfetto
        </button>
        <button
          onClick={exportGoogleTrace}
          disabled={entries.length === 0}
          className="trace-timeline-btn-export"
          title="Download trace as JSON">
          Export JSON
        </button>
      </div>

      {/* Overview Stats */}
      <div className="trace-stats-grid">
        <div className="trace-stats-card">
          <div className="trace-stats-card-label">Total Queries</div>
          <div className="trace-stats-card-value">{stats.totalEntries}</div>
        </div>
        <div className="trace-stats-card">
          <div className="trace-stats-card-label">Completed</div>
          <div className="trace-stats-card-value-xl trace-stats-value-green">
            {stats.completedCount} ({((stats.completedCount / stats.totalEntries) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="trace-stats-card">
          <div className="trace-stats-card-label">Forced EOSE</div>
          <div className="trace-stats-card-value-xl trace-stats-value-yellow">
            {stats.forcedCount} ({((stats.forcedCount / stats.totalEntries) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="trace-stats-card">
          <div className="trace-stats-card-label">Queued</div>
          <div className="trace-stats-card-value-xl trace-stats-value-blue">{stats.queuedCount}</div>
        </div>
      </div>

      {/* State Breakdown */}
      <div className="trace-stats-card">
        <h3 className="trace-stats-section-title">State Distribution</h3>
        <div className="trace-stats-grid">
          <div>
            <div className="trace-stats-card-label">Waiting</div>
            <div className="trace-stats-card-value-lg">{stats.waitingCount}</div>
          </div>
          <div>
            <div className="trace-stats-card-label">Streaming</div>
            <div className="trace-stats-card-value-lg trace-stats-value-purple">{stats.streamingCount}</div>
          </div>
          <div>
            <div className="trace-stats-card-label">Syncing</div>
            <div className="trace-stats-card-value-lg">{stats.syncCount}</div>
          </div>
          <div>
            <div className="trace-stats-card-label">Success Rate</div>
            <div className="trace-stats-card-value-lg trace-stats-value-green">
              {((stats.completedCount / (stats.completedCount + stats.forcedCount || 1)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Timing Statistics */}
      <div className="trace-stats-card">
        <h3 className="trace-stats-section-title">Query Performance</h3>
        <div className="trace-stats-grid">
          <div>
            <div className="trace-stats-card-label">Average</div>
            <div className="trace-stats-card-value-lg">{formatTime(stats.avgRuntime)}</div>
          </div>
          <div>
            <div className="trace-stats-card-label">Median</div>
            <div className="trace-stats-card-value-lg">{formatTime(stats.medianRuntime)}</div>
          </div>
          <div>
            <div className="trace-stats-card-label">Min</div>
            <div className="trace-stats-card-value-lg trace-stats-value-green">{formatTime(stats.minRuntime)}</div>
          </div>
          <div>
            <div className="trace-stats-card-label">Max</div>
            <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
              {formatTime(stats.maxRuntime)}
            </div>
          </div>
        </div>
      </div>

      {/* Query Names */}
      {stats.queryNameStats.length > 0 && (
        <div className="trace-stats-card">
          <h3 className="trace-stats-section-title">Query Names</h3>
          <div className="flex flex-col gap-2">
            {stats.queryNameStats.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <div className="text-sm font-mono truncate flex-1" title={name}>
                  {name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                  {count} ({((count / stats.totalEntries) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relay Statistics */}
      <div className="trace-stats-card">
        <h3 className="trace-stats-section-title">Relay Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 font-semibold">Relay</th>
                <th className="text-right py-2 font-semibold">Queries</th>
                <th className="text-right py-2 font-semibold">Completed</th>
                <th className="text-right py-2 font-semibold">Queued</th>
                <th className="text-right py-2 font-semibold">Streaming</th>
                <th className="text-right py-2 font-semibold">Timeout</th>
                <th className="text-right py-2 font-semibold">Drop</th>
                <th className="text-right py-2 font-semibold">Avg Time</th>
                <th className="text-right py-2 font-semibold">Min/Max</th>
              </tr>
            </thead>
            <tbody>
              {stats.relayStats.map(([relay, stat]) => (
                <tr key={relay} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-2 font-mono text-xs truncate max-w-xs" title={relay}>
                    {new URL(relay).hostname}
                  </td>
                  <td className="text-right py-2">{stat.count}</td>
                  <td className="text-right py-2">
                    <span className="text-green-600 dark:text-green-400">{stat.completedCount}</span>
                  </td>
                  <td className="text-right py-2">
                    {stat.queuedCount > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400">{stat.queuedCount}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-right py-2">
                    {stat.streamingCount > 0 ? (
                      <span className="text-purple-600 dark:text-purple-400">{stat.streamingCount}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-right py-2">
                    {stat.timeoutCount > 0 ? (
                      <span className="text-red-600 dark:text-red-400">{stat.timeoutCount}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-right py-2">
                    {stat.dropCount > 0 ? (
                      <span className="text-orange-600 dark:text-orange-400">{stat.dropCount}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-right py-2 font-mono text-xs">
                    {stat.completedCount > 0 ? formatTime(stat.avgRuntime) : "-"}
                  </td>
                  <td className="text-right py-2 font-mono text-xs">
                    {stat.completedCount > 0 ? (
                      <>
                        <span className="text-green-600 dark:text-green-400">{formatTime(stat.minRuntime)}</span>
                        {" / "}
                        <span className="text-yellow-600 dark:text-yellow-400">{formatTime(stat.maxRuntime)}</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
