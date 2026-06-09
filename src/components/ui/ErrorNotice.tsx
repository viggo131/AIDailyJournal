import { Button } from "./Button";

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Inline error block for screens whose data load failed. Used instead of a
 * transient Toast when the failure leaves the screen with nothing to show —
 * so the user always sees that something went wrong and can retry.
 */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-4 px-8 text-center animate-fade-in">
      <span className="text-2xl" aria-hidden>
        ⚠
      </span>
      <p className="text-text-soft text-sm max-w-xs" role="alert">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
