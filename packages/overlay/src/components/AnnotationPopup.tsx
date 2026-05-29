import { useEffect, useImperativeHandle, useRef, useState } from "preact/hooks";
import { forwardRef } from "preact/compat";
import { originalSetTimeout } from "@comment-to-fix/core";

export type AnnotationPopupHandle = { shake: () => void };

type Props = {
  element: string;
  selectedText?: string;
  placeholder?: string;
  initialValue?: string;
  draft?: string;
  onDraftChange?: (text: string) => void;
  submitLabel?: string;
  computedStyles?: Record<string, string>;
  accentColor?: string;
  isExiting?: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  style?: Record<string, string | number>;
};

function focusBypassingTraps(el: HTMLElement | null) {
  if (!el) return;
  const trap = (e: Event) => e.stopImmediatePropagation();
  document.addEventListener("focusin", trap, true);
  document.addEventListener("focusout", trap, true);
  try {
    el.focus();
  } finally {
    document.removeEventListener("focusin", trap, true);
    document.removeEventListener("focusout", trap, true);
  }
}

export const AnnotationPopup = forwardRef<AnnotationPopupHandle, Props>(function AnnotationPopup(
  {
    element,
    selectedText,
    placeholder = "What should change?",
    initialValue = "",
    draft,
    onDraftChange,
    submitLabel = "Add",
    computedStyles,
    accentColor = "var(--ctf-accent)",
    isExiting = false,
    onSubmit,
    onCancel,
    onDelete,
    style,
  },
  ref,
) {
  const [internalText, setInternalText] = useState(initialValue);
  const text = onDraftChange ? (draft ?? "") : internalText;
  const setText = onDraftChange
    ? (value: string) => onDraftChange(value)
    : setInternalText;
  const [anim, setAnim] = useState<"enter" | "exit">("enter");
  const [shaking, setShaking] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isExiting) setAnim("exit");
  }, [isExiting]);

  useEffect(() => {
    originalSetTimeout(() => focusBypassingTraps(textareaRef.current), 50);
  }, []);

  useImperativeHandle(ref, () => ({
    shake: () => {
      setShaking(true);
      originalSetTimeout(() => {
        setShaking(false);
        focusBypassingTraps(textareaRef.current);
      }, 250);
    },
  }));

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleCancel = () => {
    setAnim("exit");
    originalSetTimeout(onCancel, 150);
  };

  const hasStyles = computedStyles && Object.keys(computedStyles).length > 0;

  return (
    <div
      className={`ctf-popup ${anim} ${shaking ? "shake" : ""}`}
      data-ctf-popup
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ctf-popup-header">
        {hasStyles ? (
          <button
            type="button"
            className="ctf-popup-element"
            style={{ all: "unset", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flex: 1 }}
            onClick={() => setStylesOpen((v) => !v)}
          >
            <svg className={`ctf-popup-chevron ${stylesOpen ? "open" : ""}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 10.25L9 7.25L5.75 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="ctf-popup-element">{element}</span>
          </button>
        ) : (
          <span className="ctf-popup-element">{element}</span>
        )}
      </div>

      {hasStyles && (
        <div className={`ctf-popup-styles ${stylesOpen ? "open" : ""}`}>
          <div className="ctf-popup-styles-inner">
            <div className="ctf-popup-styles-block">
              {Object.entries(computedStyles!).map(([key, value]) => (
                <div key={key}>
                  {key.replace(/([A-Z])/g, "-$1").toLowerCase()}: {value}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedText && (
        <div className="ctf-popup-quote">
          &ldquo;{selectedText.slice(0, 80)}
          {selectedText.length > 80 ? "..." : ""}&rdquo;
        </div>
      )}

      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={text}
        rows={2}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") handleCancel();
        }}
        style={{ borderColor: text.trim() ? accentColor : undefined }}
      />

      <div className="ctf-popup-actions">
        {onDelete && (
          <button type="button" className="ctf-popup-delete" onClick={onDelete} aria-label="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 11.5V15.5M14 11.5V15.5M9 7.5V6.25C9 5.42 9.67 4.75 10.5 4.75H13.5C14.33 4.75 15 5.42 15 6.25V7.5M5.5 7.75H18.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div className="spacer" />
        <button type="button" className="ctf-popup-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="ctf-popup-submit"
          style={{ backgroundColor: accentColor }}
          disabled={!text.trim()}
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
});
