import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  freezeAnimations,
  isFrozen,
  toggleFreeze,
  unfreezeAnimations,
} from "./freeze-animations.js";

describe("freeze-animations", () => {
  beforeEach(() => {
    if (isFrozen()) unfreezeAnimations();
    document.getElementById("ctf-freeze-styles")?.remove();
  });

  afterEach(() => {
    if (isFrozen()) unfreezeAnimations();
    document.getElementById("ctf-freeze-styles")?.remove();
  });

  it("starts unfrozen", () => {
    expect(isFrozen()).toBe(false);
  });

  it("freezes and unfreezes", () => {
    freezeAnimations();
    expect(isFrozen()).toBe(true);
    expect(document.getElementById("ctf-freeze-styles")).toBeTruthy();

    unfreezeAnimations();
    expect(isFrozen()).toBe(false);
    expect(document.getElementById("ctf-freeze-styles")).toBeNull();
  });

  it("toggleFreeze returns next frozen state", () => {
    expect(toggleFreeze()).toBe(true);
    expect(isFrozen()).toBe(true);
    expect(toggleFreeze()).toBe(false);
    expect(isFrozen()).toBe(false);
  });
});
