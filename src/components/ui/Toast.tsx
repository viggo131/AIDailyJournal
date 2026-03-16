import React, { useEffect, useState } from "react";
import { AppError } from "../../lib/types";

interface ToastProps {
  error: AppError | null;
  onDismiss: () => void;
}

const typeStyles: Record<string, string> = {
  auth:       "border-danger/40 bg-danger/10 text-danger",
  rate_limit: "border-accent/40 bg-accent/10 text-accent",
  network:    "border-border bg-surface text-text-soft",
  server:     "border-border bg-surface text-text-soft",
  storage:    "border-danger/40 bg-danger/10 text-danger",
  unknown:    "border-border bg-surface text-text-soft",
};

export function Toast({ error, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!error) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, 5000);
    return () => clearTimeout(t);
  }, [error, onDismiss]);

  if (!error) return null;

  return (
    <div
      className={[
        "fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 rounded-md border text-sm",
        "transition-all duration-300",
        typeStyles[error.type] ?? typeStyles.unknown,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="selectable">{error.message}</span>
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
          className="text-current opacity-60 hover:opacity-100 shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
