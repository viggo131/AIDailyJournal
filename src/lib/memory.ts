/**
 * Memory context assembly — centralized.
 * Loads memories from SQLite, fits within token budget, formats context blocks.
 */
import { Memory } from "./types";
import { estimateTokens } from "./tokens";
import { getMemoriesByDepth } from "./storage";
import {
  JOURNAL_SYSTEM_PROMPT,
  PATRIARCH_SYSTEM_PROMPT,
  COMPRESSION_SYSTEM_PROMPT,
} from "./prompts";
import {
  JOURNAL_CONTEXT_BUDGET,
  PATRIARCH_CONTEXT_BUDGET,
  DEFAULT_MEMORY_DEPTH,
} from "../constants";

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatMemoryBlock(memories: Memory[]): string {
  if (memories.length === 0) return "";
  const blocks = memories.map((m) => m.content).join("\n---\n");
  return `<recent_context>\n${blocks}\n</recent_context>`;
}

export function formatPersonalContext(text: string): string {
  if (!text.trim()) return "";
  return `<personal_context>\n${text.trim()}\n</personal_context>`;
}

// ─── Budget-aware assembly ────────────────────────────────────────────────────

export async function assembleContext(
  budget: number,
  depth: number = DEFAULT_MEMORY_DEPTH
): Promise<string> {
  const memories = await getMemoriesByDepth(depth);
  if (memories.length === 0) return "";

  const selected: Memory[] = [];
  let total = 0;

  for (const mem of memories) {
    const cost = mem.token_estimate ?? estimateTokens(mem.content);
    if (total + cost > budget) break;
    selected.push(mem);
    total += cost;
  }

  return formatMemoryBlock(selected);
}

// ─── System prompt builders ───────────────────────────────────────────────────

export async function buildJournalSystemPrompt(depth: number): Promise<string> {
  const recentCtx = await assembleContext(JOURNAL_CONTEXT_BUDGET, depth);
  return JOURNAL_SYSTEM_PROMPT.replace("{{RECENT_CONTEXT}}", recentCtx);
}

export async function buildPatriarchSystemPrompt(
  journalText: string,
  personalContext: string,
  depth: number
): Promise<string> {
  const recentCtx = await assembleContext(PATRIARCH_CONTEXT_BUDGET, depth);
  const personalCtx = formatPersonalContext(personalContext);

  return PATRIARCH_SYSTEM_PROMPT
    .replace("{{RECENT_CONTEXT}}", recentCtx)
    .replace("{{PERSONAL_CONTEXT}}", personalCtx);
}

export function buildCompressionSystemPrompt(
  recentCtx: string
): string {
  // Inject context so the compression agent can note continuity
  const withContext = recentCtx
    ? `${COMPRESSION_SYSTEM_PROMPT}\n\nPRIOR CONTEXT FOR CONTINUITY:\n${recentCtx}`
    : COMPRESSION_SYSTEM_PROMPT;
  return withContext;
}

// ─── Memory parser ────────────────────────────────────────────────────────────

/** Extract mood and themes from a structured memory block string. */
export function parseMemoryBlock(content: string): {
  mood: number | null;
  themes: string | null;
} {
  const moodMatch = content.match(/^MOOD:\s*(\d)/m);
  const themesMatch = content.match(/^KEY THEMES:\s*(.+)/m);

  const mood = moodMatch ? parseInt(moodMatch[1], 10) : null;
  const themes = themesMatch ? themesMatch[1].trim() : null;

  return { mood, themes };
}
