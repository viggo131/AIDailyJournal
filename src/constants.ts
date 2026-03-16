export const JOURNAL_CONTEXT_BUDGET = 8000;   // tokens reserved for memories in journal system prompt
export const PATRIARCH_CONTEXT_BUDGET = 9000; // tokens reserved for memories in patriarch system prompt
export const DEFAULT_MEMORY_DEPTH = 7;
export const MAX_MEMORY_DEPTH = 30;
export const MIN_TURNS_BEFORE_DONE = 2;       // user must send at least 2 messages before "I'm done"
export const DEFAULT_MODEL = "gpt-4.1";
export const COMPRESSION_MODEL = "gpt-4o-mini";
export const DB_PATH = "ledger.db";

export const TODAY = (): string => new Date().toISOString().split("T")[0];
