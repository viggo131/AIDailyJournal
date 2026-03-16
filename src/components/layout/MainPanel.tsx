import React from "react";

interface MainPanelProps {
  children: React.ReactNode;
}

export function MainPanel({ children }: MainPanelProps) {
  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden">
      {children}
    </main>
  );
}
