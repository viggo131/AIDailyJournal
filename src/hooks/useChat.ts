import { useState, useCallback } from "react";
import { Message, AppError } from "../lib/types";
import { sendJournalMessage } from "../lib/openai";
import { getRandomOpener } from "../lib/prompts";
import { AuthError, RateLimitError, NetworkError } from "../lib/openai";
import { saveDraft } from "../lib/storage";
import { TODAY } from "../constants";

const COMPLETE_MARKER = "[JOURNAL_COMPLETE]";

interface UseChatParams {
  apiKey: string;
  systemPrompt: string;
  model: string;
}

export function useChat({ apiKey, systemPrompt, model }: UseChatParams) {
  const opener = getRandomOpener();

  // Start with the random opener — no API call
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: opener },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const turnCount = messages.filter((m) => m.role === "user").length;
  // Always current — not gated on [JOURNAL_COMPLETE]
  const journalText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  const send = useCallback(
    async (content: string) => {
      if (isLoading || isComplete || !content.trim()) return;

      const userMsg: Message = { role: "user", content: content.trim() };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setIsLoading(true);
      setError(null);

      try {
        const response = await sendJournalMessage({
          apiKey,
          system: systemPrompt,
          messages: updated,
          model,
        });

        const isJournalComplete = response.includes(COMPLETE_MARKER);
        const cleanResponse = response.replace(COMPLETE_MARKER, "").trim();

        const assistantMsg: Message = { role: "assistant", content: cleanResponse };
        const finalMessages = [...updated, assistantMsg];
        setMessages(finalMessages);
        saveDraft(TODAY(), finalMessages).catch(console.error);

        if (isJournalComplete) {
          setIsComplete(true);
        }
      } catch (err) {
        if (err instanceof AuthError) {
          setError({ type: "auth", message: err.message });
        } else if (err instanceof RateLimitError) {
          setError({ type: "rate_limit", message: err.message, retryAfter: err.retryAfter });
        } else if (err instanceof NetworkError) {
          setError({ type: "network", message: err.message });
        } else {
          setError({ type: "server", message: "Something went wrong. Please try again." });
        }
        // Remove the user message so they can retry
        setMessages(messages);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, systemPrompt, model, messages, isLoading, isComplete]
  );

  const restore = useCallback((savedMessages: Message[]) => {
    setMessages(savedMessages);
  }, []);

  return { messages, send, restore, isLoading, isComplete, journalText, turnCount, error };
}
