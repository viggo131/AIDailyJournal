import { useState, useCallback } from "react";
import { Entry, Message, Settings, AppError, PipelineResult } from "../lib/types";
import { getEntryByDate, getAllEntries, saveEntry, getMemoryByEntryId, saveMemory } from "../lib/storage";
import { getPatriarchReview, compressEntry } from "../lib/openai";
import { buildPatriarchSystemPrompt, buildCompressionSystemPrompt, assembleContext, parseMemoryBlock } from "../lib/memory";
import { estimateTokens } from "../lib/tokens";
import { COMPRESSION_MODEL, PATRIARCH_CONTEXT_BUDGET, TODAY } from "../constants";
import { COMPRESSION_SYSTEM_PROMPT } from "../lib/prompts";
import { AuthError, RateLimitError, NetworkError } from "../lib/openai";

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const loadAll = useCallback(async () => {
    const all = await getAllEntries();
    setEntries(all);
  }, []);

  const getToday = useCallback(() => getEntryByDate(TODAY()), []);

  /**
   * Post-conversation pipeline — runs once after journal is complete.
   *
   * Step 0: Idempotency — if today's entry already has a review, return it.
   * Step 1: Call Patriarch (gpt-4.1, maxTokens 900).
   * Step 2: Save entry to SQLite.
   * Step 3: Fire-and-forget compression (gpt-5-mini, maxTokens 450).
   */
  const runPipeline = useCallback(
    async (
      journalText: string,
      messages: Message[],
      apiKey: string,
      settings: Settings,
      onMemorySaved: () => void
    ): Promise<PipelineResult> => {
      setIsLoading(true);
      setError(null);

      // Step 0: idempotency guard
      const existing = await getEntryByDate(TODAY());
      if (existing?.review) {
        setIsLoading(false);
        return { entry: existing, alreadySaved: true };
      }

      try {
        // Step 1: Patriarch review
        const patriarchSystem = await buildPatriarchSystemPrompt(
          journalText,
          settings.personal_context,
          settings.memory_depth
        );

        const review = await getPatriarchReview({
          apiKey,
          system: patriarchSystem,
          messages: [{ role: "user", content: journalText }],
          model: settings.model,
        });

        // Step 2: Save entry
        const entry = await saveEntry({
          date: TODAY(),
          conversation: messages,
          journal_text: journalText,
          review,
          mood: null,
        });

        // Step 3: Background compression (fire-and-forget)
        compressInBackground(entry, apiKey, settings.memory_depth, onMemorySaved).catch(
          (err) => console.error("[compression] failed:", err)
        );

        setIsLoading(false);
        return { entry, alreadySaved: false };
      } catch (err) {
        let appError: AppError;
        if (err instanceof AuthError) {
          appError = { type: "auth", message: err.message };
        } else if (err instanceof RateLimitError) {
          appError = { type: "rate_limit", message: err.message, retryAfter: err.retryAfter };
        } else if (err instanceof NetworkError) {
          appError = { type: "network", message: err.message };
        } else {
          appError = { type: "server", message: "The Patriarch couldn't be reached. Please try again." };
        }
        setError(appError);
        setIsLoading(false);
        throw appError;
      }
    },
    []
  );

  return { entries, isLoading, error, loadAll, getToday, runPipeline };
}

// ─── Background compression ───────────────────────────────────────────────────

async function compressInBackground(
  entry: Entry,
  apiKey: string,
  depth: number,
  onComplete: () => void
): Promise<void> {
  // Idempotency: skip if memory already exists for this entry
  const existing = await getMemoryByEntryId(entry.id);
  if (existing) return;

  // Build compression context
  const recentCtx = await assembleContext(PATRIARCH_CONTEXT_BUDGET, depth);
  const system = buildCompressionSystemPrompt(recentCtx);

  // Single message with the full session content
  const sessionContent = [
    "JOURNAL CONVERSATION:",
    entry.conversation.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n"),
    "\nPATRIARCH REVIEW:",
    entry.review,
  ].join("\n");

  const memoryBlock = await compressEntry({
    apiKey,
    system,
    messages: [{ role: "user", content: sessionContent }],
  });

  const { mood, themes } = parseMemoryBlock(memoryBlock);

  await saveMemory({
    entry_id: entry.id,
    date: entry.date,
    themes,
    mood,
    content: memoryBlock,
    token_estimate: estimateTokens(memoryBlock),
  });

  onComplete();
}
