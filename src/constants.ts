export const JOURNAL_CONTEXT_BUDGET = 8000;   // tokens reserved for memories in journal system prompt
export const PATRIARCH_CONTEXT_BUDGET = 9000; // tokens reserved for memories in patriarch system prompt
export const DEFAULT_MEMORY_DEPTH = 7;
export const MAX_MEMORY_DEPTH = 30;
export const MIN_TURNS_BEFORE_DONE = 2;       // user must send at least 2 messages before "I'm done"
export const DEFAULT_MODEL = "gpt-4.1";
export const COMPRESSION_MODEL = "gpt-5-mini";
export const DB_PATH = "ledger.db";

/**
 * Format a Date as a YYYY-MM-DD string in the user's LOCAL timezone.
 * Using toISOString() here would yield the UTC date, which can be a day
 * off for users in the evening (negative offsets) or early morning
 * (positive offsets) — throwing off "already reflected today" and streaks.
 */
export const localDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const TODAY = (): string => localDateStr(new Date());
