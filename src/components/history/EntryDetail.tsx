import React from "react";
import { Entry } from "../../lib/types";
import { MessageBubble } from "../journal/MessageBubble";
import { ReviewCard } from "../review/ReviewCard";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface EntryDetailProps {
  entry: Entry;
  onBack: () => void;
}

export function EntryDetail({ entry, onBack }: EntryDetailProps) {
  const dateLabel = new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4 shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div>
          <p className="text-text text-sm font-medium">{dateLabel}</p>
          {entry.mood && (
            <Badge variant="accent">{entry.mood}/5</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Journal conversation */}
        <section>
          <h3 className="font-display text-text-soft text-sm font-semibold mb-4 uppercase tracking-wide">
            Journal
          </h3>
          <div className="space-y-3">
            {entry.conversation.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
          </div>
        </section>

        {/* Patriarch review */}
        <section>
          <h3 className="font-display text-text-soft text-sm font-semibold mb-4 uppercase tracking-wide">
            The Patriarch's Review
          </h3>
          <ReviewCard review={entry.review} />
        </section>
      </div>
    </div>
  );
}
