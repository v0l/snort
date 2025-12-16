import { QueryTraceState, type TimelineEntry } from "@snort/system";
import "./TraceTimeline.css";

interface TraceTimelineDetailPopupProps {
  selectedEntry: TimelineEntry;
  onClose: () => void;
}

export function TraceTimelineDetailPopup({ selectedEntry, onClose }: TraceTimelineDetailPopupProps) {
  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (unixMs: number) => {
    const date = new Date(unixMs);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const getStatusBadgeClass = (state: QueryTraceState): string => {
    // Streaming
    if (state === QueryTraceState.WAITING_STREAM) {
      return "status-badge status-streaming";
    }
    // Active/pending states
    if (
      [
        QueryTraceState.QUEUED,
        QueryTraceState.WAITING,
        QueryTraceState.SYNC_WAITING,
        QueryTraceState.SYNC_FALLBACK,
      ].includes(state)
    ) {
      return "status-badge status-active";
    }
    // Error states
    if ([QueryTraceState.TIMEOUT, QueryTraceState.DROP].includes(state)) {
      return "status-badge status-error";
    }
    // Success states
    if ([QueryTraceState.EOSE, QueryTraceState.LOCAL_CLOSE, QueryTraceState.REMOTE_CLOSE].includes(state)) {
      return "status-badge status-success";
    }
    // Fallback
    return "status-badge status-fallback";
  };

  return (
    <div className="trace-timeline-details">
      <h3 className="trace-timeline-details-title">Query Details</h3>
      <div className="trace-timeline-details-content">
        <div className="trace-timeline-detail-row">
          <span className="trace-timeline-detail-label">Relay</span>
          <span className="trace-timeline-detail-value">{selectedEntry.event.relay}</span>
        </div>

        <div className="trace-timeline-detail-row">
          <span className="trace-timeline-detail-label">Timestamp</span>
          <span className="trace-timeline-detail-value">{formatTimestamp(selectedEntry.event.timestamp)}</span>
        </div>

        {selectedEntry.runtime !== undefined && (
          <div className="trace-timeline-detail-row-inline">
            <span className="trace-timeline-detail-label">Runtime:</span>
            <span className="trace-timeline-detail-value-large">{formatTime(selectedEntry.runtime)}</span>
          </div>
        )}

        {selectedEntry.event.state === QueryTraceState.WAITING_STREAM && (
          <div className="trace-timeline-detail-row-inline">
            <span className="trace-timeline-detail-label">Duration:</span>
            <span className="trace-timeline-detail-value-streaming">
              {formatTime(Date.now() - selectedEntry.event.timestamp)} (streaming)
            </span>
          </div>
        )}

        <div className="trace-timeline-detail-row-inline">
          <span className="trace-timeline-detail-label">Status:</span>
          <span className={getStatusBadgeClass(selectedEntry.event.state)}>{selectedEntry.event.state}</span>
        </div>

        {selectedEntry.queryName && (
          <div className="trace-timeline-detail-row trace-timeline-detail-row-inline">
            <span className="trace-timeline-detail-label">Query Name</span>
            <span className="trace-timeline-detail-value-name">{selectedEntry.queryName}</span>
          </div>
        )}

        <div className="trace-timeline-detail-row">
          <span className="trace-timeline-detail-label">Trace ID</span>
          <span className="trace-timeline-detail-value">{selectedEntry.event.id}</span>
        </div>

        <div className="trace-timeline-detail-row">
          <span className="trace-timeline-detail-label">Connection ID</span>
          <span className="trace-timeline-detail-value">{selectedEntry.event.connId}</span>
        </div>

        {selectedEntry.event.filters && selectedEntry.event.filters.length > 0 && (
          <div className="trace-timeline-detail-row trace-timeline-detail-row-inline">
            <span className="trace-timeline-detail-label">Filters ({selectedEntry.event.filters.length})</span>
            <div className="trace-timeline-filters-list">
              {selectedEntry.event.filters.map((filter, idx) => (
                <div key={idx} className="trace-timeline-filter-box">
                  <pre className="trace-timeline-filter-pre">{JSON.stringify(filter, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={onClose} className="trace-timeline-close-btn">
        Close
      </button>
    </div>
  );
}
