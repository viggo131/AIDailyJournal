import { forwardRef, useRef, useEffect, TextareaHTMLAttributes, MutableRefObject } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ maxRows = 8, className = "", ...props }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    // Wire both the internal ref (for auto-expand) and any forwarded ref.
    const setRef = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    // Auto-expand height
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 22;
      const maxHeight = lineHeight * maxRows;
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [props.value, maxRows]);

    return (
      <textarea
        ref={setRef}
        rows={1}
        {...props}
        className={[
          "w-full rounded-md px-3 py-2 text-sm bg-surface border border-border text-text",
          "placeholder:text-muted outline-none resize-none transition-colors duration-150",
          "focus:border-accent focus:ring-1 focus:ring-accent/30",
          className,
        ].join(" ")}
      />
    );
  }
);
