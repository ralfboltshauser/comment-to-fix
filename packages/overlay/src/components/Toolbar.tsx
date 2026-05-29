import type { Annotation, OverlaySettings } from "@comment-to-fix/core";
import {
  IconCopy,
  IconEye,
  IconGear,
  IconList,
  IconPause,
  IconPlay,
  IconFeedback,
  IconTrash,
  IconX,
} from "./icons";
import { HistoryPanel } from "./HistoryPanel";
import { SettingsPanel } from "./SettingsPanel";

type Props = {
  active: boolean;
  expanded: boolean;
  frozen: boolean;
  showMarkers: boolean;
  copied: boolean;
  annotations: Annotation[];
  settings: OverlaySettings;
  showSettings: boolean;
  showHistory: boolean;
  toolbarPos: { x: number; y: number } | null;
  anchorRight: boolean;
  onToggleFreeze: () => void;
  onToggleMarkers: () => void;
  onCopy: () => void;
  onClear: () => void;
  onToggleSettings: () => void;
  onToggleHistory: () => void;
  onSettingsChange: (patch: Partial<OverlaySettings>) => void;
  onDeactivate: () => void;
  onDragStart: (e: PointerEvent, collapsed: boolean) => void;
  onJumpTo: (id: string) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
};

function ControlBtn({
  label,
  shortcut,
  children,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  shortcut?: string;
  children: import("preact").ComponentChildren;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="ctf-btn-wrap">
      <button
        type="button"
        className={`ctf-btn ${active ? "active" : ""} ${danger ? "danger" : ""}`}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
      <span className="ctf-tooltip">
        {label}
        {shortcut && <span className="ctf-shortcut">{shortcut}</span>}
      </span>
    </div>
  );
}

export function Toolbar({
  active,
  expanded,
  frozen,
  showMarkers,
  copied,
  annotations,
  settings,
  showSettings,
  showHistory,
  toolbarPos,
  anchorRight,
  onToggleFreeze,
  onToggleMarkers,
  onCopy,
  onClear,
  onToggleSettings,
  onToggleHistory,
  onSettingsChange,
  onDeactivate,
  onDragStart,
  onJumpTo,
  onDismiss,
  onRestore,
}: Props) {
  const customPos = toolbarPos !== null;
  const visibleCount = annotations.filter((a) => a.phase !== "dismissed").length;
  const panelAbove = toolbarPos ? toolbarPos.y > window.innerHeight - 280 : true;

  return (
    <div
      className={`ctf-toolbar-wrap${customPos ? " custom-pos" : ""}${anchorRight ? " anchor-right" : ""}`}
      style={customPos ? { left: toolbarPos.x, top: toolbarPos.y } : undefined}
      data-ctf-toolbar
    >
      <div
        className={`ctf-toolbar ${expanded ? "expanded" : "collapsed"}`}
        onPointerDown={(e) => onDragStart(e, !expanded)}
      >
        {!expanded ? (
          <div className="ctf-toolbar-toggle" title="Start feedback mode" role="button" aria-label="Start feedback mode">
            <IconFeedback />
            {visibleCount > 0 && <span className="ctf-badge">{visibleCount}</span>}
          </div>
        ) : (
          <>
            <div className="ctf-toolbar-controls" style={{ display: "flex" }}>
              <ControlBtn
                label={frozen ? "Resume animations" : "Pause animations"}
                shortcut="P"
                onClick={onToggleFreeze}
                active={frozen}
              >
                {frozen ? <IconPlay size={20} /> : <IconPause size={20} />}
              </ControlBtn>

              <ControlBtn
                label={showMarkers ? "Hide markers" : "Show markers"}
                shortcut="H"
                onClick={onToggleMarkers}
                disabled={annotations.length === 0}
                active={showMarkers}
              >
                <IconEye size={20} open={showMarkers} />
              </ControlBtn>

              <ControlBtn
                label="History"
                shortcut="L"
                onClick={onToggleHistory}
                disabled={annotations.length === 0}
                active={showHistory}
              >
                <IconList size={20} />
              </ControlBtn>

              <ControlBtn
                label="Copy feedback"
                shortcut="C"
                onClick={onCopy}
                disabled={annotations.length === 0}
                active={copied}
              >
                <IconCopy size={20} copied={copied} />
              </ControlBtn>

              <ControlBtn
                label="Clear all"
                shortcut="X"
                onClick={onClear}
                disabled={annotations.length === 0}
                danger
              >
                <IconTrash size={20} />
              </ControlBtn>

              <ControlBtn label="Settings" onClick={onToggleSettings} active={showSettings}>
                <IconGear size={20} />
              </ControlBtn>

              <div className="ctf-divider" />

              <ControlBtn label="Exit" shortcut="Esc" onClick={onDeactivate}>
                <IconX size={20} />
              </ControlBtn>
            </div>
          </>
        )}
      </div>

      <SettingsPanel
        settings={settings}
        onChange={onSettingsChange}
        visible={showSettings && expanded}
        above={panelAbove}
      />

      <HistoryPanel
        annotations={annotations}
        visible={showHistory && expanded}
        above={panelAbove}
        onJumpTo={onJumpTo}
        onDismiss={onDismiss}
        onRestore={onRestore}
      />
    </div>
  );
}
