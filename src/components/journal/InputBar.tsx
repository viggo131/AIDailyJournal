import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { MIN_TURNS_BEFORE_DONE } from "../../constants";

interface InputBarProps {
  onSend: (text: string) => void;
  onDone: () => void;
  isLoading: boolean;
  isComplete: boolean;
  turnCount: number;
}

export function InputBar({ onSend, onDone, isLoading, isComplete, turnCount }: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canDone = turnCount >= MIN_TURNS_BEFORE_DONE && !isLoading;
  const canSend = value.trim().length > 0 && !isLoading && !isComplete;

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };

  // Cmd+Return to send
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Focus textarea after loading completes
  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  if (isComplete) return null;

  return (
    <div className="border-t border-border p-4 bg-bg">
      <div className="flex gap-3 items-end">
        <Textarea
          ref={textareaRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write your reply… (⌘↵ to send)"
          disabled={isLoading || isComplete}
          maxRows={6}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!canSend}
            isLoading={isLoading}
          >
            Send
          </Button>
          {canDone && (
            <Button variant="ghost" size="sm" onClick={onDone}>
              I'm done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
