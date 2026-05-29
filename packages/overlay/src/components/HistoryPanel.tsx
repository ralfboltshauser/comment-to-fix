import type { Annotation, AnnotationPhase } from "@comment-to-fix/core";
import { IconEyeReady, IconSpinner } from "./icons";

type Props = {
  annotations: Annotation[];
  visible: boolean;
  above: boolean;
  onJumpTo: (id: string) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
};

function formatRelativeTime(ann: Annotation): string {
  const ts = ann.timestamp ?? (ann.ts ? Date.parse(ann.ts) : NaN);
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PhaseChip({ phase }: { phase?: AnnotationPhase }) {
  if (phase === "fixing") {
    return (
      <span className="ctf-history-chip fixing">
        <IconSpinner size={12} />
      </span>
    );
  }
  if (phase === "ready") {
    return (
      <span className="ctf-history-chip ready">
        <IconEyeReady size={12} />
      </span>
    );
  }
  if (phase === "dismissed") {
    return <span className="ctf-history-chip dismissed">hidden</span>;
  }
  return null;
}

export function HistoryPanel({
  annotations,
  visible,
  above,
  onJumpTo,
  onDismiss,
  onRestore,
}: Props) {
  if (!visible) return null;

  const sorted = [...annotations].sort((a, b) => {
    const ta = a.timestamp ?? Date.parse(a.ts);
    const tb = b.timestamp ?? Date.parse(b.ts);
    return tb - ta;
  });

  return (
    <div className={`ctf-history ${above ? "above" : ""}`} data-ctf-history>
      <h3>History</h3>
      {sorted.length === 0 ? (
        <p className="ctf-history-empty">No comments on this page yet</p>
      ) : (
        <ul className="ctf-history-list">
          {sorted.map((ann, i) => {
            const index = annotations.findIndex((a) => a.id === ann.id);
            const displayIndex = index >= 0 ? index + 1 : i + 1;
            const dismissed = ann.phase === "dismissed";

            return (
              <li key={ann.id} className={`ctf-history-item ${dismissed ? "dismissed" : ""}`}>
                <button
                  type="button"
                  className="ctf-history-main"
                  onClick={() => onJumpTo(ann.id)}
                >
                  <span className="ctf-history-index">{displayIndex}</span>
                  <span className="ctf-history-body">
                    <span className="ctf-history-element">{ann.element}</span>
                    <span className="ctf-history-comment">
                      {ann.comment.length > 80 ? `${ann.comment.slice(0, 80)}…` : ann.comment}
                    </span>
                    <span className="ctf-history-time">{formatRelativeTime(ann)}</span>
                  </span>
                  <PhaseChip phase={ann.phase} />
                </button>
                {dismissed ? (
                  <button
                    type="button"
                    className="ctf-history-action"
                    title="Restore marker"
                    onClick={() => onRestore(ann.id)}
                  >
                    ↩
                  </button>
                ) : ann.phase === "ready" || ann.status === "sent" ? (
                  <button
                    type="button"
                    className="ctf-history-action"
                    title="Hide marker"
                    onClick={() => onDismiss(ann.id)}
                  >
                    ×
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
