import { useState, useEffect } from "react";
import { buildJournalSystemPrompt } from "../lib/memory";
import { DEFAULT_MEMORY_DEPTH } from "../constants";

interface UseMemoriesResult {
  journalSystemPrompt: string;
  isLoading: boolean;
}

/**
 * Loads memories from SQLite and assembles the Journal Agent system prompt.
 * Result is cached for the session — does NOT reload on each message.
 * No API calls are made here.
 */
export function useMemories(depth: number = DEFAULT_MEMORY_DEPTH): UseMemoriesResult {
  const [journalSystemPrompt, setJournalSystemPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prompt = await buildJournalSystemPrompt(depth);
      if (!cancelled) {
        setJournalSystemPrompt(prompt);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [depth]);

  return { journalSystemPrompt, isLoading };
}
