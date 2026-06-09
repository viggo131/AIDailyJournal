import { describe, it, expect, vi, beforeEach } from "vitest";
import { Memory } from "./types";

// memory.ts only touches storage via getMemoriesByDepth — mock just that.
vi.mock("./storage", () => ({
  getMemoriesByDepth: vi.fn(),
}));

import { getMemoriesByDepth } from "./storage";
import {
  formatMemoryBlock,
  formatPersonalContext,
  assembleContext,
  parseMemoryBlock,
  buildJournalSystemPrompt,
  buildPatriarchSystemPrompt,
  buildCompressionSystemPrompt,
} from "./memory";

const mockGet = vi.mocked(getMemoriesByDepth);

function mem(content: string, tokens: number, over: Partial<Memory> = {}): Memory {
  return {
    id: "m-" + content,
    entry_id: "e",
    date: "2026-01-01",
    themes: null,
    mood: null,
    content,
    token_estimate: tokens,
    ...over,
  };
}

beforeEach(() => {
  mockGet.mockReset();
});

describe("formatMemoryBlock", () => {
  it("returns an empty string for no memories", () => {
    expect(formatMemoryBlock([])).toBe("");
  });

  it("wraps a single memory in a recent_context block", () => {
    expect(formatMemoryBlock([mem("alpha", 1)])).toBe(
      "<recent_context>\nalpha\n</recent_context>"
    );
  });

  it("joins multiple memories with a separator", () => {
    expect(formatMemoryBlock([mem("alpha", 1), mem("beta", 1)])).toBe(
      "<recent_context>\nalpha\n---\nbeta\n</recent_context>"
    );
  });
});

describe("formatPersonalContext", () => {
  it("returns empty for blank or whitespace-only input", () => {
    expect(formatPersonalContext("")).toBe("");
    expect(formatPersonalContext("   \n ")).toBe("");
  });

  it("wraps trimmed content in a personal_context block", () => {
    expect(formatPersonalContext("  I have two kids  ")).toBe(
      "<personal_context>\nI have two kids\n</personal_context>"
    );
  });
});

describe("assembleContext", () => {
  it("returns empty when there are no memories", async () => {
    mockGet.mockResolvedValue([]);
    expect(await assembleContext(1000)).toBe("");
  });

  it("includes every memory when they fit the budget", async () => {
    mockGet.mockResolvedValue([mem("a", 100), mem("b", 100), mem("c", 100)]);
    const block = await assembleContext(1000);
    expect(block).toContain("a");
    expect(block).toContain("b");
    expect(block).toContain("c");
  });

  it("drops memories that exceed the budget (oldest-loaded last)", async () => {
    // Loaded newest-first; budget 250 fits the first two (200) but not a third.
    mockGet.mockResolvedValue([mem("newest", 100), mem("middle", 100), mem("oldest", 100)]);
    const block = await assembleContext(250);
    expect(block).toContain("newest");
    expect(block).toContain("middle");
    expect(block).not.toContain("oldest");
  });

  it("estimates tokens from content when token_estimate is missing", async () => {
    // 40 chars -> ~10 tokens each; budget 15 fits exactly one.
    const long = "x".repeat(40);
    mockGet.mockResolvedValue([
      mem(long + "1", null as unknown as number),
      mem(long + "2", null as unknown as number),
    ]);
    const block = await assembleContext(15);
    expect(block).toContain(long + "1");
    expect(block).not.toContain(long + "2");
  });
});

describe("parseMemoryBlock", () => {
  const block = [
    "DATE: 2026-01-01",
    "MOOD: 4/5",
    "KEY THEMES: work, family, health",
    "WHAT HAPPENED: things",
  ].join("\n");

  it("extracts mood and themes from a well-formed block", () => {
    expect(parseMemoryBlock(block)).toEqual({ mood: 4, themes: "work, family, health" });
  });

  it("returns nulls when fields are absent", () => {
    expect(parseMemoryBlock("just some prose")).toEqual({ mood: null, themes: null });
  });

  it("rejects mood values outside 1-5", () => {
    expect(parseMemoryBlock("MOOD: 7/5").mood).toBeNull();
    expect(parseMemoryBlock("MOOD: 0/5").mood).toBeNull();
    expect(parseMemoryBlock("MOOD: 1/5").mood).toBe(1);
    expect(parseMemoryBlock("MOOD: 5/5").mood).toBe(5);
  });
});

describe("system prompt builders", () => {
  it("injects assembled context into the journal prompt and removes the placeholder", async () => {
    mockGet.mockResolvedValue([mem("remembered thing", 10)]);
    const prompt = await buildJournalSystemPrompt(7);
    expect(prompt).not.toContain("{{RECENT_CONTEXT}}");
    expect(prompt).toContain("remembered thing");
  });

  it("injects both recent and personal context into the Patriarch prompt", async () => {
    mockGet.mockResolvedValue([mem("past entry", 10)]);
    const prompt = await buildPatriarchSystemPrompt("today's journal", "I'm an engineer", 7);
    expect(prompt).not.toContain("{{RECENT_CONTEXT}}");
    expect(prompt).not.toContain("{{PERSONAL_CONTEXT}}");
    expect(prompt).toContain("past entry");
    expect(prompt).toContain("I'm an engineer");
  });

  it("only appends prior-context to the compression prompt when present", () => {
    expect(buildCompressionSystemPrompt("")).not.toContain("PRIOR CONTEXT");
    expect(buildCompressionSystemPrompt("some ctx")).toContain("PRIOR CONTEXT");
    expect(buildCompressionSystemPrompt("some ctx")).toContain("some ctx");
  });
});
