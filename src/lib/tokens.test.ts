import { describe, it, expect } from "vitest";
import { estimateTokens } from "./tokens";

describe("estimateTokens", () => {
  it("returns 0 for an empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("approximates ~4 characters per token, rounding up", () => {
    expect(estimateTokens("abcd")).toBe(1); // 4/4
    expect(estimateTokens("abcde")).toBe(2); // 5/4 -> ceil
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});
