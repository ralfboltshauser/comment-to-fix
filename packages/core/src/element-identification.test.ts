import { describe, expect, it } from "vitest";
import {
  contextFromAnnotation,
  getCssSelector,
  identifyElement,
  resolveElementFromSelector,
} from "./element-identification.js";

describe("identifyElement", () => {
  it("names buttons with text", () => {
    const btn = document.createElement("button");
    btn.textContent = "Get started";
    const { name } = identifyElement(btn);
    expect(name).toContain("Get started");
  });

  it("names headings with text", () => {
    const h1 = document.createElement("h1");
    h1.textContent = "Hello World";
    const { name } = identifyElement(h1);
    expect(name).toContain("Hello World");
  });

  it("does not treat empty buttons as named controls", () => {
    const btn = document.createElement("button");
    const { name } = identifyElement(btn);
    expect(name).toBe("button");
  });
});

describe("getCssSelector", () => {
  it("uses id when present", () => {
    const el = document.createElement("div");
    el.id = "hero";
    expect(getCssSelector(el)).toBe("#hero");
  });

  it("builds tag path when id is missing", () => {
    const parent = document.createElement("section");
    const child = document.createElement("p");
    parent.appendChild(child);
    document.body.appendChild(parent);
    expect(getCssSelector(child)).toContain("p");
    parent.remove();
  });
});

describe("contextFromAnnotation", () => {
  it("rebuilds capture context from stored fields", () => {
    const ctx = contextFromAnnotation({
      element: 'button "Save"',
      selector: "#save",
      path: "main > form > button#save",
      classes: "primary",
      selectedText: "Save changes",
      isFixed: true,
    });
    expect(ctx.element).toBe('button "Save"');
    expect(ctx.selector).toBe("#save");
    expect(ctx.elementPath).toBe("main > form > button#save");
    expect(ctx.isFixed).toBe(true);
  });
});

describe("resolveElementFromSelector", () => {
  it("returns null for invalid selectors", () => {
    expect(resolveElementFromSelector("not valid!!!")).toBeNull();
  });
});
