export type FileChangeKind = "css" | "html" | "js" | "processed";

export type FileChangeEvent = {
  kind: "css" | "html" | "js";
  path: string;
};

export type ProcessedChangeEvent = {
  kind: "processed";
  processedIds: string[];
  lastId: string | null;
};

export type SseEvent = FileChangeEvent | ProcessedChangeEvent;

/** CSS updates never need a full page reload. */
export function shouldHotSwapCss(kind: FileChangeKind): boolean {
  return kind === "css";
}

/** Full reload when HTML/JS changes and feedback mode is off. */
export function shouldFullReload(kind: FileChangeKind, feedbackActive: boolean): boolean {
  if (kind === "css") return false;
  return !feedbackActive;
}

/** Queue reload for later (on Exit) when HTML/JS changes during feedback mode. */
export function shouldQueueReload(kind: FileChangeKind, feedbackActive: boolean): boolean {
  if (kind === "css") return false;
  return feedbackActive;
}
