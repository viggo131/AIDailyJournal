import React from "react";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted text-sm" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-muted animate-pulse-soft"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="ml-1">{label}</span>
    </div>
  );
}
