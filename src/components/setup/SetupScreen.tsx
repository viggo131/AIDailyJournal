import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { AuthError, NetworkError } from "../../lib/openai";

interface SetupScreenProps {
  onSuccess: () => void;
  setApiKey: (key: string) => Promise<boolean>;
}

export function SetupScreen({ onSuccess, setApiKey }: SetupScreenProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-")) {
      setError("OpenAI keys start with sk-. Please check and try again.");
      return;
    }

    setError("");
    setIsValidating(true);
    try {
      const ok = await setApiKey(trimmed);
      if (ok) {
        onSuccess();
      } else {
        setError("Key rejected by OpenAI. Double-check and try again.");
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        setError("No internet connection. Check your network and retry.");
      } else if (err instanceof AuthError) {
        setError("Invalid API key. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm px-6 animate-fade-in">
        <h1 className="font-display text-3xl text-accent mb-2">The Daily Ledger</h1>
        <p className="text-text-soft text-sm mb-8 leading-relaxed">
          A daily thinking partner that actually remembers you. Enter your OpenAI API key to begin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="OpenAI API Key"
            type="password"
            placeholder="sk-..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            error={error}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isValidating}
            disabled={!key.trim()}
            className="w-full"
          >
            {isValidating ? "Validating…" : "Get Started"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted leading-relaxed">
          Your key is stored in the macOS Keychain — never on a server. The only outbound connection is to api.openai.com.
        </p>
      </div>
    </div>
  );
}
