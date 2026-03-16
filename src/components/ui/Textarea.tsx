import React, { useRef, useEffect } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number;
}

export function Textarea({ maxRows = 8, className = "", ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-expand height
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 22;
    const maxHeight = lineHeight * maxRows;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [props.value, maxRows]);

  return (
    <textarea
      ref={ref}
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
