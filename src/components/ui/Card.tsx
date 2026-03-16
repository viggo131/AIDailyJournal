import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hoverable = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "bg-card border border-border rounded-md p-4",
        hoverable ? "hover:bg-surface-hover cursor-pointer transition-colors duration-150" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
