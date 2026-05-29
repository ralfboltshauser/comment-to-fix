import { describe, expect, it } from "vitest";

import {
  shouldFullReload,
  shouldHotSwapCss,
  shouldQueueReload,
} from "./reload-policy.js";

describe("reload-policy", () => {
  it("hot-swaps css regardless of feedback mode", () => {
    expect(shouldHotSwapCss("css")).toBe(true);
    expect(shouldHotSwapCss("html")).toBe(false);
  });

  it("full reloads html when feedback is off", () => {
    expect(shouldFullReload("html", false)).toBe(true);
    expect(shouldFullReload("js", false)).toBe(true);
    expect(shouldFullReload("css", false)).toBe(false);
  });

  it("defers html reload when feedback is on", () => {
    expect(shouldFullReload("html", true)).toBe(false);
    expect(shouldQueueReload("html", true)).toBe(true);
    expect(shouldQueueReload("js", true)).toBe(true);
  });

  it("never queues css reload", () => {
    expect(shouldQueueReload("css", true)).toBe(false);
  });
});
