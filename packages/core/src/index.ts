export * from "./types.js";
export * from "./annotation-phase.js";
export * from "./inbox.js";
export * from "./ids.js";
export * from "./format.js";
export * from "./element-context.js";
export * from "./element-identification.js";
export * from "./generate-output.js";
export * from "./overlay-storage.js";
export * from "./freeze-animations.js";

export const DEFAULT_INBOX_FILE = ".comment-to-fix/inbox.jsonl";
export const DEFAULT_PROCESSED_FILE = ".comment-to-fix/processed.json";

/** Port the preview server prefers before falling back to the next free one. */
export const DEFAULT_PREVIEW_PORT = 5173;

/**
 * Give each parallel session its own inbox keyed by the port it bound to.
 * The default port keeps the default inbox for backwards compatibility.
 */
export function inboxPathForPort(port: number): string {
  return port === DEFAULT_PREVIEW_PORT
    ? DEFAULT_INBOX_FILE
    : `.comment-to-fix/inbox-${port}.jsonl`;
}
