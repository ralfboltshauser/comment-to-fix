import type { Annotation } from "@comment-to-fix/core";
import { IconEdit, IconEyeReady, IconPlus, IconSpinner, IconX } from "./icons";

type Props = {
  annotation: Annotation;
  index: number;
  isHovered: boolean;
  isFocused: boolean;
  isExiting: boolean;
  isEditingAny: boolean;
  markerClickBehavior: "edit" | "delete";
  onHover: (a: Annotation | null) => void;
  onClick: (a: Annotation) => void;
  onContextMenu: (a: Annotation) => void;
  onDismiss?: (id: string) => void;
  onApplyFix?: () => void;
  tooltipStyle?: Record<string, string | number>;
};

export function AnnotationMarker({
  annotation,
  index,
  isHovered,
  isFocused,
  isExiting,
  isEditingAny,
  markerClickBehavior,
  onHover,
  onClick,
  onContextMenu,
  onDismiss,
  onApplyFix,
  tooltipStyle,
}: Props) {
  const isMulti = annotation.isMultiSelect;
  const phase = annotation.phase;
  const isFixing = phase === "fixing";
  const isReady = phase === "ready";
  const showDelete =
    isHovered && !isEditingAny && markerClickBehavior === "delete" && !isFixing && !isReady;
  const showEdit =
    isHovered && !isEditingAny && markerClickBehavior === "edit" && !isFixing && !isReady;

  return (
    <div
      className={`ctf-marker ${isMulti ? "multi" : ""} ${isExiting ? "exit" : ""} ${isFixing ? "fixing" : ""} ${isReady ? "ready" : ""} ${isFocused ? "focused" : ""}`}
      data-ctf-marker
      style={{
        left: `${annotation.x ?? 50}%`,
        top: annotation.y ?? 0,
        backgroundColor: showDelete ? "#ff453a" : isReady ? "#1a3d24" : undefined,
        animationDelay: `${index * 20}ms`,
      }}
      onMouseEnter={() => onHover(annotation)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (isExiting || isFixing) return;
        if (isReady) {
          onApplyFix?.();
          return;
        }
        if (!isExiting) onClick(annotation);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFixing) return;
        onContextMenu(annotation);
      }}
    >
      {showDelete ? (
        <IconX size={14} />
      ) : showEdit ? (
        <IconEdit size={14} />
      ) : isFixing ? (
        <IconSpinner size={14} />
      ) : isReady ? (
        <IconEyeReady size={14} />
      ) : (
        index + 1
      )}

      {isReady && isHovered && !isEditingAny && onDismiss && (
        <button
          type="button"
          className="ctf-marker-dismiss"
          title="Hide marker"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(annotation.id);
          }}
        >
          <IconX size={10} />
        </button>
      )}

      {isHovered && !isEditingAny && (
        <div className="ctf-marker-tooltip" style={tooltipStyle}>
          <span className="ctf-marker-quote">
            {annotation.element}
            {annotation.selectedText &&
              ` "${annotation.selectedText.slice(0, 30)}${annotation.selectedText.length > 30 ? "..." : ""}"`}
          </span>
          <span className="ctf-marker-note">{annotation.comment}</span>
          {isFixing && <span className="ctf-marker-status">Agent is working…</span>}
          {isReady && <span className="ctf-marker-status ready">Click to reload and see fix</span>}
        </div>
      )}
    </div>
  );
}

export function PendingMarker({
  x,
  y,
  isMultiSelect,
  isExiting,
}: {
  x: number;
  y: number;
  isMultiSelect?: boolean;
  isExiting?: boolean;
}) {
  return (
    <div
      className={`ctf-marker pending ${isMultiSelect ? "multi" : ""} ${isExiting ? "exit" : ""}`}
      style={{ left: `${x}%`, top: y }}
    >
      <IconPlus />
    </div>
  );
}
