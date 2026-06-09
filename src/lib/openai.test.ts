import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendJournalMessage,
  getPatriarchReview,
  compressEntry,
  validateApiKey,
  AuthError,
  RateLimitError,
  ServerError,
  NetworkError,
} from "./openai";

type Headers = Record<string, string>;

function makeResponse(status: number, body: unknown, headers: Headers = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

function ok(content: string): Response {
  return makeResponse(200, { choices: [{ message: { content } }] });
}

/** Parse the JSON body of the Nth fetch call. */
function bodyOf(mock: ReturnType<typeof vi.fn>, call = 0) {
  return JSON.parse((mock.mock.calls[call][1] as RequestInit).body as string);
}

const baseParams = {
  apiKey: "sk-test-123",
  system: "SYSTEM PROMPT",
  messages: [{ role: "user" as const, content: "hello" }],
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("request shape", () => {
  it("posts to the OpenAI endpoint with the bearer key and a system-first message array", async () => {
    const mock = vi.fn().mockResolvedValue(ok("hi"));
    vi.stubGlobal("fetch", mock);

    await sendJournalMessage(baseParams);

    const [url, init] = mock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Headers)["Authorization"]).toBe("Bearer sk-test-123");
    expect((init.headers as Headers)["Content-Type"]).toBe("application/json");

    const body = bodyOf(mock);
    expect(body.messages[0]).toEqual({ role: "system", content: "SYSTEM PROMPT" });
    expect(body.messages[1]).toEqual({ role: "user", content: "hello" });
  });

  it("uses the default model and a 400-token cap for journal turns", async () => {
    const mock = vi.fn().mockResolvedValue(ok("hi"));
    vi.stubGlobal("fetch", mock);

    await sendJournalMessage(baseParams);

    const body = bodyOf(mock);
    expect(body.model).toBe("gpt-4.1");
    expect(body.max_tokens).toBe(400);
  });

  it("honours an explicit model override", async () => {
    const mock = vi.fn().mockResolvedValue(ok("hi"));
    vi.stubGlobal("fetch", mock);

    await sendJournalMessage({ ...baseParams, model: "gpt-5-mini" });

    expect(bodyOf(mock).model).toBe("gpt-5-mini");
  });

  it("caps the Patriarch review at 1200 tokens", async () => {
    const mock = vi.fn().mockResolvedValue(ok("review"));
    vi.stubGlobal("fetch", mock);

    await getPatriarchReview(baseParams);

    expect(bodyOf(mock).max_tokens).toBe(1200);
  });

  it("runs compression on the cheaper model with a 450-token cap", async () => {
    const mock = vi.fn().mockResolvedValue(ok("memory"));
    vi.stubGlobal("fetch", mock);

    await compressEntry(baseParams);

    const body = bodyOf(mock);
    expect(body.model).toBe("gpt-5-mini");
    expect(body.max_tokens).toBe(450);
  });
});

describe("response parsing", () => {
  it("returns the assistant message content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok("the answer")));
    expect(await sendJournalMessage(baseParams)).toBe("the answer");
  });

  it("throws ServerError when the body is not valid JSON", async () => {
    const bad = {
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(bad));

    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(ServerError);
  });

  it("throws ServerError when content is missing or empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200, { choices: [] })));
    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(ServerError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200, { choices: [{ message: { content: null } }] })));
    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(ServerError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok("   ")));
    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(ServerError);
  });
});

describe("error mapping", () => {
  it("maps 401 to AuthError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401, {})));
    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(AuthError);
  });

  it("maps a fetch rejection (offline) to NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(NetworkError);
  });

  it("maps a non-retryable non-OK status (400) to ServerError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(400, {})));
    await expect(sendJournalMessage(baseParams)).rejects.toBeInstanceOf(ServerError);
  });
});

describe("retry behaviour", () => {
  it("retries once on 429 after the retry-after delay, then succeeds", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(429, {}, { "retry-after": "1" }))
      .mockResolvedValueOnce(ok("recovered"));
    vi.stubGlobal("fetch", mock);

    const p = sendJournalMessage(baseParams);
    await vi.runAllTimersAsync();

    expect(await p).toBe("recovered");
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("gives up with RateLimitError after a second 429", async () => {
    const mock = vi.fn().mockResolvedValue(makeResponse(429, {}, { "retry-after": "1" }));
    vi.stubGlobal("fetch", mock);

    const p = getPatriarchReview(baseParams);
    const expectation = expect(p).rejects.toBeInstanceOf(RateLimitError);
    await vi.runAllTimersAsync();
    await expectation;

    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("retries 5xx with backoff and recovers", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(503, {}))
      .mockResolvedValueOnce(ok("up again"));
    vi.stubGlobal("fetch", mock);

    const p = compressEntry(baseParams);
    await vi.runAllTimersAsync();

    expect(await p).toBe("up again");
  });

  it("gives up with ServerError after 4 failed 5xx attempts", async () => {
    const mock = vi.fn().mockResolvedValue(makeResponse(500, {}));
    vi.stubGlobal("fetch", mock);

    const p = compressEntry(baseParams);
    const expectation = expect(p).rejects.toBeInstanceOf(ServerError);
    await vi.runAllTimersAsync();
    await expectation;

    expect(mock).toHaveBeenCalledTimes(4); // initial + 3 retries
  });
});

describe("validateApiKey", () => {
  it("resolves true when the key is accepted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok("OK")));
    expect(await validateApiKey("sk-good")).toBe(true);
  });

  it("resolves false on a 401 rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401, {})));
    expect(await validateApiKey("sk-bad")).toBe(false);
  });

  it("rethrows non-auth errors (e.g. offline)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(validateApiKey("sk-x")).rejects.toBeInstanceOf(NetworkError);
  });
});
