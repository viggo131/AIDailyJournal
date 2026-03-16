import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export function Input({ error, label, className = "", id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-soft font-medium">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={[
          "w-full rounded-md px-3 py-2 text-sm bg-surface border text-text",
          "placeholder:text-muted outline-none transition-colors duration-150",
          "focus:border-accent focus:ring-1 focus:ring-accent/30",
          error ? "border-danger" : "border-border",
          className,
        ].join(" ")}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
