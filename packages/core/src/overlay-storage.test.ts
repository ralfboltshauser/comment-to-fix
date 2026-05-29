import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAnnotations,
  clearSession,
  getAnnotationsStorageKey,
  loadAnnotations,
  loadSession,
  loadSettings,
  loadToolbarPos,
  saveAnnotations,
  saveSession,
  saveSettings,
  saveToolbarPos,
} from "./overlay-storage.js";
import { DEFAULT_OVERLAY_SETTINGS, type Annotation } from "./types.js";

const store = new Map<string, string>();
const sessionStore = new Map<string, string>();

beforeEach(() => {
  store.clear();
  sessionStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => sessionStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      sessionStore.set(key, value);
    },
    removeItem: (key: string) => {
      sessionStore.delete(key);
    },
  });
  vi.stubGlobal("window", {
    location: { pathname: "/demo", search: "?v=1" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sampleAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: "ann_1",
  ts: new Date().toISOString(),
  comment: "Fix headline",
  page: "demo.html",
  pageUrl: "/demo?v=1",
  root: ".",
  element: 'h1 "Title"',
  selector: "h1",
  path: "main > h1",
  text: "Title",
  classes: "hero",
  box: null,
  selectedText: null,
  markdown: "",
  timestamp: Date.now(),
  ...overrides,
});

describe("overlay-storage", () => {
  it("round-trips annotations for a page key", () => {
    const pageKey = "/demo?v=1";
    const annotations = [sampleAnnotation()];
    saveAnnotations(pageKey, annotations);
    expect(loadAnnotations(pageKey)).toEqual(annotations);
    expect(store.has(getAnnotationsStorageKey(pageKey))).toBe(true);
  });

  it("drops annotations older than retention window", () => {
    const pageKey = "/demo?v=1";
    const stale = sampleAnnotation({
      id: "ann_stale",
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    const fresh = sampleAnnotation({ id: "ann_fresh" });
    saveAnnotations(pageKey, [stale, fresh]);
    expect(loadAnnotations(pageKey).map((a) => a.id)).toEqual(["ann_fresh"]);
  });

  it("merges saved settings with defaults", () => {
    saveSettings({ ...DEFAULT_OVERLAY_SETTINGS, outputDetail: "forensic", dark: false });
    expect(loadSettings()).toMatchObject({
      outputDetail: "forensic",
      dark: false,
      blockInteractions: true,
    });
  });

  it("persists toolbar position", () => {
    saveToolbarPos(120, 80);
    expect(loadToolbarPos()).toEqual({ x: 120, y: 80 });
  });

  it("clears annotations for a page", () => {
    const pageKey = "/demo?v=1";
    saveAnnotations(pageKey, [sampleAnnotation()]);
    clearAnnotations(pageKey);
    expect(loadAnnotations(pageKey)).toEqual([]);
  });

  it("round-trips session snapshot per page", () => {
    const pageKey = "/demo?v=1";
    const snapshot = {
      scrollY: 420,
      active: true,
      draft: { kind: "pending" as const, text: "Fix headline", pending: undefined },
    };
    saveSession(pageKey, snapshot);
    expect(loadSession(pageKey)).toEqual(snapshot);
    clearSession(pageKey);
    expect(loadSession(pageKey)).toBeNull();
  });
});
