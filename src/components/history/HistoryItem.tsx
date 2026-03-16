import React from "react";
import { Entry } from "../../lib/types";
import { Badge } from "../ui/Badge";

interface HistoryItemProps {
  entry: Entry;
  onClick: () => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Very low", 2: "Low", 3: "Okay", 4: "Good", 5: "Great",
};

export function HistoryItem({ entry, onClick }: HistoryItemProps) {
  const dateLabel = new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const preview = entry.journal_text.slice(0, 120).trim();

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-4 border-b border-border hover:bg-surface transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="text-sm text-text font-medium">{dateLabel}</span>
        {entry.mood && (
          <Badge variant="muted">{MOOD_LABELS[entry.mood] ?? entry.mood}</Badge>
        )}
      </div>
      <p className="text-text-soft text-xs leading-relaxed line-clamp-2">
        {preview}{preview.length < entry.journal_text.length ? "…" : ""}
      </p>
    </button>
  );
}
