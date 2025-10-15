import { createPortal } from "react-dom";
import { TraceStatsView } from "./TraceStatsView";
import "./TraceTimeline.css";

interface TraceTimelineOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TraceTimelineOverlay({ isOpen, onClose }: TraceTimelineOverlayProps) {
  if (!isOpen) return;

  return createPortal(
    <div className="trace-timeline-overlay" onClick={onClose}>
      <div className="trace-timeline-modal" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="trace-timeline-modal-header">
          <h2 className="trace-timeline-modal-title">Query Statistics</h2>

          <div className="trace-timeline-modal-controls">
            <button className="trace-timeline-modal-control-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="trace-timeline-modal-content">
          <TraceStatsView />
        </div>
      </div>
    </div>,
    document.body,
  );
}
