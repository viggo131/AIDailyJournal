/**
 * OpenAI API client — SINGLE source of truth for all AI calls.
 * SECURITY: Never log apiKey. Never include apiKey in thrown error messages.
 * All callers MUST pass maxTokens explicitly — no open-ended generation.
 */
import { Message } from "./types";
import { DEFAULT_MODEL } from "../constants";

// ─── Error types ──────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor() {
    super("Your API key was rejected. Please update it in Settings.");
    this.name = "AuthError";
  }
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super("Too many requests. Waiting a moment before retrying.");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends Error {
  constructor() {
    super("OpenAI is having trouble. Retrying in a moment.");
    this.name = "ServerError";
  }
}

export class NetworkError extends Error {
  constructor() {
    super("No internet connection. Please check your network.");
    this.name = "NetworkError";
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface CallParams {
  apiKey: string;
  system: string;
  messages: Message[];
  model?: string;
  maxTokens: number; // required — callers must set a tight limit
}

async function callOpenAI(params: CallParams, attempt = 0): Promise<string> {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model ?? DEFAULT_MODEL,
        max_tokens: params.maxTokens,
        messages: [
          { role: "system", content: params.system },
          ...params.messages,
        ],
      }),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 401) throw new AuthError();

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("retry-after") ?? "10", 10) * 1000;
    if (attempt === 0) {
      await sleep(retryAfter);
      return callOpenAI(params, 1);
    }
    throw new RateLimitError(retryAfter);
  }

  if (response.status >= 500) {
    if (attempt < 3) {
      await sleep(1000 * Math.pow(2, attempt)); // 1s, 2s, 4s
      return callOpenAI(params, attempt + 1);
    }
    throw new ServerError();
  }

  if (!response.ok) throw new ServerError();

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Exported agent functions ─────────────────────────────────────────────────

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    await callOpenAI({
      apiKey: key,
      system: "Reply with OK.",
      messages: [{ role: "user", content: "OK" }],
      maxTokens: 5,
    });
    return true;
  } catch (err) {
    if (err instanceof AuthError) return false;
    throw err;
  }
}

export async function sendJournalMessage(params: {
  apiKey: string;
  system: string;
  messages: Message[];
  model?: string;
}): Promise<string> {
  return callOpenAI({ ...params, maxTokens: 400 });
}

export async function getPatriarchReview(params: {
  apiKey: string;
  system: string;
  messages: Message[];
  model?: string;
}): Promise<string> {
  return callOpenAI({ ...params, maxTokens: 1200 });
}

export async function compressEntry(params: {
  apiKey: string;
  system: string;
  messages: Message[];
}): Promise<string> {
  return callOpenAI({ ...params, maxTokens: 450 });
}
