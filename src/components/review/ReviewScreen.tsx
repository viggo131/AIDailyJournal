import { useCallback, useEffect, useState } from "react";
import { Settings, Message } from "../../lib/types";
import { useEntries } from "../../hooks/useEntries";
import { ReviewCard } from "./ReviewCard";
import { Spinner } from "../ui/Spinner";
import { Button } from "../ui/Button";
import { Toast } from "../ui/Toast";
import { ErrorNotice } from "../ui/ErrorNotice";

interface ReviewScreenProps {
  apiKey: string;
  settings: Settings;
  journalText: string;
  messages: Message[];
  onDone: () => void;
}

export function ReviewScreen({
  apiKey,
  settings,
  journalText,
  messages,
  onDone,
}: ReviewScreenProps) {
  const { isLoading, error, clearError, runPipeline } = useEntries();
  const [review, setReview] = useState<string | null>(null);
  const [memorySaved, setMemorySaved] = useState(false);
  const [memoryFailed, setMemoryFailed] = useState(false);

  const runReview = useCallback(() => {
    clearError();
    runPipeline(
      journalText,
      messages,
      apiKey,
      settings,
      () => setMemorySaved(true),
      () => setMemoryFailed(true)
    )
      .then(({ entry }) => setReview(entry.review))
      .catch(() => {}); // Patriarch error shown inline + via Toast
  }, [apiKey, settings, journalText, messages, runPipeline, clearError]);

  useEffect(() => {
    runReview();
    // Run once on mount; the in-flight lock in useEntries dedupes StrictMode.
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <p className="text-text-soft text-xs">{dateLabel}</p>
          <h2 className="font-display text-text text-lg">The Patriarch's Review</h2>
        </div>
        {review && (
          <div className="flex items-center gap-3">
            {memorySaved && (
              <span className="text-xs text-accent animate-fade-in">✓ Memory saved</span>
            )}
            {memoryFailed && (
              <span className="text-xs text-danger animate-fade-in" role="alert">
                ⚠ Memory not saved
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={onDone}>
              Done
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading && !review && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner label="The Patriarch is reviewing your day…" />
          </div>
        )}

        {!isLoading && !review && error && (
          <ErrorNotice message={error.message} onRetry={runReview} />
        )}

        {review && <ReviewCard review={review} />}
      </div>

      <Toast error={error} onDismiss={clearError} />
    </div>
  );
}
