export type AnnotationBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OutputDetailLevel = "compact" | "standard" | "detailed" | "forensic";

export type AnnotationStatus = "local" | "sent";

/** Overlay lifecycle after submit (persisted with marker). */
export type AnnotationPhase = "fixing" | "ready" | "dismissed";

export type Annotation = {
  id: string;
  ts: string;
  comment: string;
  page: string;
  pageUrl: string;
  root: string;
  /** Semantic element label (e.g. button "Get started") */
  element: string;
  selector: string;
  path: string;
  text: string | null;
  classes: string | null;
  box: AnnotationBox | null;
  selectedText: string | null;
  markdown: string;
  /** Marker position: % from left */
  x?: number;
  /** Marker position: px from top of document or viewport if isFixed */
  y?: number;
  timestamp?: number;
  boundingBox?: BoundingBox;
  nearbyText?: string;
  computedStyles?: string;
  accessibility?: string;
  nearbyElements?: string;
  fullPath?: string;
  isMultiSelect?: boolean;
  isFixed?: boolean;
  elementBoundingBoxes?: BoundingBox[];
  status?: AnnotationStatus;
  /** Client lifecycle: fixing → ready (reload) → dismissed */
  phase?: AnnotationPhase;
};

export type ProcessedState = {
  lastId: string | null;
  lastLine: number;
};

export type OverlaySettings = {
  outputDetail: OutputDetailLevel;
  autoClearAfterCopy: boolean;
  autoClearAfterSend: boolean;
  annotationColorId: string;
  blockInteractions: boolean;
  markerClickBehavior: "edit" | "delete";
  dark: boolean;
};

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  outputDetail: "standard",
  autoClearAfterCopy: false,
  autoClearAfterSend: false,
  annotationColorId: "blue",
  blockInteractions: true,
  markerClickBehavior: "edit",
  dark: true,
};

export const COLOR_OPTIONS = [
  { id: "indigo", label: "Indigo", color: "#6155F5" },
  { id: "blue", label: "Blue", color: "#0088FF" },
  { id: "cyan", label: "Cyan", color: "#00C3D0" },
  { id: "green", label: "Green", color: "#34C759" },
  { id: "yellow", label: "Yellow", color: "#FFCC00" },
  { id: "orange", label: "Orange", color: "#FF8D28" },
  { id: "red", label: "Red", color: "#FF383C" },
] as const;
