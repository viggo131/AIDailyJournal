import React, { useEffect, useRef, useState } from "react";
import { Settings, Message } from "../../lib/types";
import { useChat } from "../../hooks/useChat";
import { useMemories } from "../../hooks/useMemories";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";
import { Spinner } from "../ui/Spinner";
import { Toast } from "../ui/Toast";
import { getEntryByDate, getDraft, clearDraft } from "../../lib/storage";
import { TODAY } from "../../constants";
import { Button } from "../ui/Button";

interface JournalScreenProps {
  apiKey: string;
  settings: Settings;
  onComplete: (payload: { journalText: string; messages: Message[] }) => void;
}

export function JournalScreen({ apiKey, settings, onComplete }: JournalScreenProps) {
  const [started, setStarted] = useState(false);
  const [existingEntry, setExistingEntry] = useState<{ date: string } | null | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { journalSystemPrompt, isLoading: memoriesLoading } = useMemories(settings.memory_depth);

  const chat = useChat({
    apiKey,
    systemPrompt: journalSystemPrompt,
    model: settings.model,
  });

  // Check if today already has an entry (no API call)
  useEffect(() => {
    getEntryByDate(TODAY()).then((entry) => setExistingEntry(entry ?? null));
  }, []);

  // Restore draft when session starts
  useEffect(() => {
    if (!started) return;
    getDraft(TODAY()).then((draft) => {
      if (draft && draft.length > 1) {
        chat.restore(draft);
        setDraftRestored(true);
      }
    });
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  const handleDone = () => setShowConfirm(true);

  const handleConfirm = () => {
    setShowConfirm(false);
    clearDraft(TODAY()).catch(console.error);
    onComplete({ journalText: chat.journalText, messages: chat.messages });
  };

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Still loading settings/memories
  if (existingEntry === undefined || memoriesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Preparing your session…" />
      </div>
    );
  }

  // Today's entry already exists and not started a new one
  if (existingEntry && !started) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 animate-fade-in">
        <p className="text-text-soft text-sm">{dateLabel}</p>
        <h2 className="font-display text-2xl text-text text-center">
          You've already reflected today.
        </h2>
        <p className="text-text-soft text-sm text-center max-w-xs">
          Your entry and the Patriarch's review are saved in History.
        </p>
        <Button variant="secondary" onClick={() => setStarted(true)}>
          Reflect Again
        </Button>
      </div>
    );
  }

  // Not started yet
  if (!started) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 animate-fade-in">
        <p className="text-text-soft text-sm">{dateLabel}</p>
        <h2 className="font-display text-2xl text-text">Good to see you.</h2>
        <Button variant="primary" onClick={() => setStarted(true)}>
          Start Today's Entry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <p className="text-text-soft text-sm">{dateLabel}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {draftRestored && (
          <div className="text-center text-xs text-muted animate-fade-in py-1">
            ↩ Restored from earlier today
          </div>
        )}
        {chat.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {chat.isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-md px-4 py-3">
              <Spinner label="" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="px-6 py-3 border-t border-border bg-surface/50 animate-fade-in">
          <p className="text-sm text-text-soft mb-3">
            Ready to send this to the Patriarch for review?
          </p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleConfirm}>
              Yes, review my day
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
              Keep going
            </Button>
          </div>
        </div>
      )}

      {/* Input bar */}
      {!showConfirm && (
        <InputBar
          onSend={chat.send}
          onDone={handleDone}
          isLoading={chat.isLoading}
          isComplete={chat.isComplete}
          turnCount={chat.turnCount}
        />
      )}

      {/* Error toast */}
      <Toast error={chat.error} onDismiss={() => {}} />
    </div>
  );
}
