function escapeCss(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

export function getParentElement(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  if (root instanceof ShadowRoot) return root.host;
  return null;
}

export function closestCrossingShadow(element: Element, selector: string): Element | null {
  let current: Element | null = element;
  while (current) {
    if (current.matches(selector)) return current;
    current = getParentElement(current);
  }
  return null;
}

export function deepElementFromPoint(x: number, y: number): HTMLElement | null {
  let element = document.elementFromPoint(x, y) as HTMLElement | null;
  while (element?.shadowRoot) {
    const deeper = element.shadowRoot.elementFromPoint(x, y) as HTMLElement | null;
    if (!deeper || deeper === element) break;
    element = deeper;
  }
  return element;
}

export function getElementPath(target: HTMLElement, maxDepth = 4): string {
  const parts: string[] = [];
  let current: HTMLElement | null = target;
  let depth = 0;

  while (current && depth < maxDepth) {
    const tag = current.tagName.toLowerCase();
    if (tag === "html" || tag === "body") break;

    let identifier = tag;
    if (current.id) {
      identifier = `#${current.id}`;
    } else if (current.className && typeof current.className === "string") {
      const meaningfulClass = current.className
        .split(/\s+/)
        .find((c) => c.length > 2 && !/^[a-z]{1,2}$/.test(c) && !/[A-Z0-9]{5,}/.test(c));
      if (meaningfulClass) identifier = `.${meaningfulClass.split("_")[0]}`;
    }

    const nextParent = getParentElement(current);
    if (!current.parentElement && nextParent) {
      identifier = `⟨shadow⟩ ${identifier}`;
    }

    parts.unshift(identifier);
    current = nextParent as HTMLElement | null;
    depth++;
  }

  return parts.join(" > ");
}

export function identifyElement(target: HTMLElement): { name: string; path: string } {
  const path = getElementPath(target);

  if (target.dataset.element) {
    return { name: target.dataset.element, path };
  }

  const tag = target.tagName.toLowerCase();

  if (["path", "circle", "rect", "line", "g"].includes(tag)) {
    const svg = closestCrossingShadow(target, "svg");
    if (svg) {
      const parent = getParentElement(svg);
      if (parent instanceof HTMLElement) {
        return { name: `graphic in ${identifyElement(parent).name}`, path };
      }
    }
    return { name: "graphic element", path };
  }

  if (tag === "button") {
    const text = target.textContent?.trim();
    const ariaLabel = target.getAttribute("aria-label");
    if (ariaLabel) return { name: `button [${ariaLabel}]`, path };
    return { name: text ? `button "${text.slice(0, 25)}"` : "button", path };
  }

  if (tag === "a") {
    const text = target.textContent?.trim();
    const href = target.getAttribute("href");
    if (text) return { name: `link "${text.slice(0, 25)}"`, path };
    if (href) return { name: `link to ${href.slice(0, 30)}`, path };
    return { name: "link", path };
  }

  if (tag === "input") {
    const type = target.getAttribute("type") || "text";
    const placeholder = target.getAttribute("placeholder");
    const name = target.getAttribute("name");
    if (placeholder) return { name: `input "${placeholder}"`, path };
    if (name) return { name: `input [${name}]`, path };
    return { name: `${type} input`, path };
  }

  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
    const text = target.textContent?.trim();
    return { name: text ? `${tag} "${text.slice(0, 35)}"` : tag, path };
  }

  if (tag === "p") {
    const text = target.textContent?.trim();
    if (text) return { name: `paragraph: "${text.slice(0, 40)}${text.length > 40 ? "..." : ""}"`, path };
    return { name: "paragraph", path };
  }

  if (tag === "img") {
    const alt = target.getAttribute("alt");
    return { name: alt ? `image "${alt.slice(0, 30)}"` : "image", path };
  }

  if (["div", "section", "article", "nav", "header", "footer", "aside", "main"].includes(tag)) {
    const ariaLabel = target.getAttribute("aria-label");
    const role = target.getAttribute("role");
    if (ariaLabel) return { name: `${tag} [${ariaLabel}]`, path };
    if (role) return { name: role, path };

    const className = target.className;
    if (typeof className === "string" && className) {
      const words = className
        .split(/[\s_-]+/)
        .map((c) => c.replace(/[A-Z0-9]{5,}.*$/, ""))
        .filter((c) => c.length > 2 && !/^[a-z]{1,2}$/.test(c))
        .slice(0, 2);
      if (words.length > 0) return { name: words.join(" "), path };
    }

    return { name: tag === "div" ? "container" : tag, path };
  }

  return { name: tag, path };
}

export function getCssSelector(element: Element): string {
  if (element.id) return `#${escapeCss(element.id)}`;

  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.tagName.toLowerCase() !== "html") {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${escapeCss(current.id)}`;
      path.unshift(selector);
      break;
    }

    const parent = getParentElement(current);
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(" > ");
}

export function getNearbyText(element: HTMLElement): string {
  const texts: string[] = [];
  const ownText = element.textContent?.trim();
  if (ownText && ownText.length < 100) texts.push(ownText);

  const prev = element.previousElementSibling;
  if (prev) {
    const prevText = prev.textContent?.trim();
    if (prevText && prevText.length < 50) {
      texts.unshift(`[before: "${prevText.slice(0, 40)}"]`);
    }
  }

  const next = element.nextElementSibling;
  if (next) {
    const nextText = next.textContent?.trim();
    if (nextText && nextText.length < 50) {
      texts.push(`[after: "${nextText.slice(0, 40)}"]`);
    }
  }

  return texts.join(" ");
}

export function getElementClasses(target: HTMLElement): string {
  const className = target.className;
  if (typeof className !== "string" || !className) return "";

  return className
    .split(/\s+/)
    .filter((c) => c.length > 0)
    .map((c) => {
      const match = c.match(/^([a-zA-Z][a-zA-Z0-9_-]*?)(?:_[a-zA-Z0-9]{5,})?$/);
      return match ? match[1]! : c;
    })
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .join(", ");
}

export function getAccessibilityInfo(target: HTMLElement): string {
  const parts: string[] = [];
  const role = target.getAttribute("role");
  const ariaLabel = target.getAttribute("aria-label");
  if (role) parts.push(`role="${role}"`);
  if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);
  if (target.matches("a, button, input, select, textarea, [tabindex]")) {
    parts.push("focusable");
  }
  return parts.join(", ");
}

export function getFullElementPath(target: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = target;

  while (current && current.tagName.toLowerCase() !== "html") {
    const tag = current.tagName.toLowerCase();
    let identifier = tag;
    if (current.id) {
      identifier = `${tag}#${current.id}`;
    } else if (current.className && typeof current.className === "string") {
      const cls = current.className
        .split(/\s+/)
        .map((c) => c.replace(/[_][a-zA-Z0-9]{5,}.*$/, ""))
        .find((c) => c.length > 2);
      if (cls) identifier = `${tag}.${cls}`;
    }
    const nextParent = getParentElement(current);
    if (!current.parentElement && nextParent) {
      identifier = `⟨shadow⟩ ${identifier}`;
    }
    parts.unshift(identifier);
    current = nextParent as HTMLElement | null;
  }

  return parts.join(" > ");
}

const DEFAULT_STYLE_VALUES = new Set([
  "none", "normal", "auto", "0px", "rgba(0, 0, 0, 0)", "transparent", "static", "visible",
]);

export function getDetailedComputedStyles(target: HTMLElement): Record<string, string> {
  if (typeof window === "undefined") return {};
  const styles = window.getComputedStyle(target);
  const result: Record<string, string> = {};
  const tag = target.tagName.toLowerCase();

  let properties: string[];
  if (["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "label", "li", "a"].includes(tag)) {
    properties = ["color", "fontSize", "fontWeight", "fontFamily", "lineHeight"];
  } else if (tag === "button" || tag === "input") {
    properties = ["backgroundColor", "color", "padding", "borderRadius", "fontSize"];
  } else {
    properties = ["display", "padding", "margin", "gap", "backgroundColor", "color", "fontSize"];
  }

  for (const prop of properties) {
    const cssPropertyName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
    const value = styles.getPropertyValue(cssPropertyName);
    if (value && !DEFAULT_STYLE_VALUES.has(value)) {
      result[prop] = value;
    }
  }

  return result;
}

export function getForensicComputedStyles(target: HTMLElement): string {
  if (typeof window === "undefined") return "";
  const styles = window.getComputedStyle(target);
  const props = [
    "color", "background-color", "font-size", "font-weight", "padding", "margin",
    "display", "position", "width", "height", "border-radius",
  ];
  const parts: string[] = [];
  for (const prop of props) {
    const value = styles.getPropertyValue(prop);
    if (value && !DEFAULT_STYLE_VALUES.has(value)) {
      parts.push(`${prop}: ${value}`);
    }
  }
  return parts.join("; ");
}

export function isElementFixed(element: Element): boolean {
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.position === "fixed" || style.position === "sticky") return true;
    current = getParentElement(current);
  }
  return false;
}

export type CapturedAnnotationContext = {
  element: string;
  /** Short readable path (e.g. section > button) */
  elementPath: string;
  selector: string;
  /** Full DOM path */
  path: string;
  text: string | null;
  classes: string | null;
  box: { x: number; y: number; w: number; h: number } | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  selectedText: string | null;
  nearbyText: string;
  cssClasses: string;
  computedStyles: string;
  computedStylesObj: Record<string, string>;
  accessibility: string;
  fullPath: string;
  isFixed: boolean;
};

export function captureAnnotationContext(
  element: HTMLElement,
  selectedText?: string | null,
): CapturedAnnotationContext {
  const { name, path: shortPath } = identifyElement(element);
  const rect = element.getBoundingClientRect();
  const isFixed = isElementFixed(element);
  const scrollY = window.scrollY;
  const fullPath = getFullElementPath(element);

  return {
    element: name,
    elementPath: shortPath,
    selector: getCssSelector(element),
    path: fullPath,
    text: element.textContent?.trim().slice(0, 80) ?? null,
    classes: getElementClasses(element) || null,
    box: {
      x: Math.round(rect.x + scrollY),
      y: Math.round(rect.y + (isFixed ? 0 : scrollY)),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
    boundingBox: {
      x: rect.left,
      y: isFixed ? rect.top : rect.top + scrollY,
      width: rect.width,
      height: rect.height,
    },
    selectedText: selectedText?.trim().slice(0, 500) ?? null,
    nearbyText: getNearbyText(element),
    cssClasses: getElementClasses(element),
    computedStyles: getForensicComputedStyles(element),
    computedStylesObj: getDetailedComputedStyles(element),
    accessibility: getAccessibilityInfo(element),
    fullPath: getFullElementPath(element),
    isFixed,
  };
}

/** Rebuild capture context from a stored annotation (e.g. when editing). */
export function contextFromAnnotation(annotation: {
  element: string;
  selector: string;
  path: string;
  text?: string | null;
  classes?: string | null;
  box?: { x: number; y: number; w: number; h: number } | null;
  boundingBox?: { x: number; y: number; width: number; height: number };
  selectedText?: string | null;
  nearbyText?: string;
  computedStyles?: string;
  accessibility?: string;
  fullPath?: string;
  isFixed?: boolean;
}): CapturedAnnotationContext {
  const parts = annotation.path.split(" > ");
  return {
    element: annotation.element,
    elementPath: parts.slice(-3).join(" > ") || annotation.element,
    selector: annotation.selector,
    path: annotation.path,
    text: annotation.text ?? null,
    classes: annotation.classes ?? null,
    box: annotation.box ?? null,
    boundingBox: annotation.boundingBox ?? null,
    selectedText: annotation.selectedText ?? null,
    nearbyText: annotation.nearbyText ?? "",
    cssClasses: annotation.classes ?? "",
    computedStyles: annotation.computedStyles ?? "",
    computedStylesObj: {},
    accessibility: annotation.accessibility ?? "",
    fullPath: annotation.fullPath ?? annotation.path,
    isFixed: annotation.isFixed ?? false,
  };
}

export function resolveElementFromSelector(selector: string): HTMLElement | null {
  try {
    const el = document.querySelector(selector);
    return el instanceof HTMLElement ? el : null;
  } catch {
    return null;
  }
}
