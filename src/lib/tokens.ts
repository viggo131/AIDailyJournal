/**
 * Rough token estimator: ~4 characters per token for English text.
 * Good enough for context budget calculations. No tokenizer library needed for MVP.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
