// ─── Core data types ──────────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Entry {
  id: string;
  date: string;           // ISO date YYYY-MM-DD
  created_at: string;     // ISO datetime
  conversation: Message[];
  journal_text: string;   // user messages only, concatenated
  review: string;         // Patriarch's structured response
  mood: number | null;    // 1-5
}

export interface Memory {
  id: string;
  entry_id: string;
  date: string;
  themes: string | null;  // comma-separated lowercase tags
  mood: number | null;
  content: string;        // structured memory block text
  token_estimate: number;
}

export interface Settings {
  model: string;
  personal_context: string;
  memory_depth: number;
  theme: "dark" | "light" | "system";
  use_keychain: boolean;
}

// ─── Error types ──────────────────────────────────────────────────────────────

export type AppErrorType = "auth" | "rate_limit" | "server" | "network" | "storage" | "unknown";

export interface AppError {
  type: AppErrorType;
  message: string;         // friendly user-facing message — never raw API text
  retryAfter?: number;     // milliseconds (for rate_limit)
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type Screen = "setup" | "journal" | "review" | "history" | "dashboard" | "settings";

// ─── Pipeline result ──────────────────────────────────────────────────────────

export interface PipelineResult {
  entry: Entry;
  alreadySaved: boolean;
}
