import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-accent text-bg hover:opacity-90 font-semibold",
  secondary: "bg-surface text-text border border-border hover:bg-surface-hover",
  ghost:     "text-text-soft hover:text-text hover:bg-surface",
  danger:    "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md transition-all duration-150 cursor-pointer",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {isLoading ? <span className="animate-pulse-soft">…</span> : children}
    </button>
  );
}
