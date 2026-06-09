import { useState, useEffect } from "react";
import { buildJournalSystemPrompt } from "../lib/memory";
import { JOURNAL_SYSTEM_PROMPT } from "../lib/prompts";
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
      let prompt: string;
      try {
        prompt = await buildJournalSystemPrompt(depth);
      } catch (err) {
        // Memory load failed — degrade gracefully to the base prompt (no
        // recent context) rather than hanging the journal screen forever.
        console.error("[memories] failed to assemble context:", err);
        prompt = JOURNAL_SYSTEM_PROMPT.replace("{{RECENT_CONTEXT}}", "");
      }
      if (!cancelled) {
        setJournalSystemPrompt(prompt);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [depth]);

  return { journalSystemPrompt, isLoading };
}
