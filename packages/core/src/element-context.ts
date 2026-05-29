import { captureAnnotationContext, getCssSelector, getElementPath, getNearbyText } from "./element-identification.js";

export type ElementContextInput = {
  element: Element;
  page: string;
  pageUrl: string;
  root: string;
  comment: string;
  selectedText?: string | null;
};

export type CapturedElementContext = {
  element: string;
  selector: string;
  path: string;
  text: string | null;
  classes: string | null;
  box: { x: number; y: number; w: number; h: number } | null;
  selectedText: string | null;
};

export { getCssSelector, getElementPath, getNearbyText, captureAnnotationContext };

export function captureElementContext(input: ElementContextInput): CapturedElementContext {
  const ctx = captureAnnotationContext(input.element as HTMLElement, input.selectedText);
  return {
    element: ctx.element,
    selector: ctx.selector,
    path: ctx.path,
    text: ctx.text,
    classes: ctx.classes,
    box: ctx.box,
    selectedText: ctx.selectedText,
  };
}
