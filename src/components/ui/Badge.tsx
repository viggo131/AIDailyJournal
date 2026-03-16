import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "muted";
}

const variantClasses = {
  default: "bg-surface text-text-soft border-border",
  accent:  "bg-accent/15 text-accent border-accent/30",
  muted:   "bg-surface text-muted border-border",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
