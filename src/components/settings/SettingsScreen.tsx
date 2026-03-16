import React, { useState } from "react";
import { Settings } from "../../lib/types";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { validateApiKey } from "../../lib/openai";

// ─── Key Storage Card ─────────────────────────────────────────────────────────

const STORAGE_OPTIONS = [
  {
    value: true,
    label: "Keychain",
    sublabel: "macOS protected",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="3" y="6" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="7.5" cy="9.5" r="1" fill="currentColor" />
      </svg>
    ),
    detail: "Encrypted by macOS. Requires your login password once per session.",
  },
  {
    value: false,
    label: "Local file",
    sublabel: "No prompts",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H9l3 3v8.5A1.5 1.5 0 0 1 10.5 14h-6A1.5 1.5 0 0 1 3 12.5v-10Z" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9 1v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    detail: "Stored in your app data folder as an encoded file. No system dialogs.",
  },
] as const;

function KeyStorageCard({ useKeychain, onToggle }: { useKeychain: boolean; onToggle: (v: boolean) => void }) {
  const active = STORAGE_OPTIONS.find((o) => o.value === useKeychain)!;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "0.875rem" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text)",
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
          }}
        >
          Key Storage
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.72rem", lineHeight: 1.6 }}>
          {active.detail}
        </p>
      </div>

      {/* Segmented control */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.25rem",
          padding: "0.25rem",
          background: "var(--surface)",
          borderRadius: "0.75rem",
          border: "1px solid var(--border)",
        }}
      >
        {STORAGE_OPTIONS.map((opt) => {
          const isActive = useKeychain === opt.value;
          return (
            <button
              key={String(opt.value)}
              onClick={() => onToggle(opt.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: isActive ? "1px solid var(--accent)" : "1px solid transparent",
                background: isActive ? "var(--accent-dim)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease",
                boxShadow: isActive ? "0 1px 6px rgba(201,168,108,0.12)" : "none",
                width: "100%",
              }}
            >
              <span
                style={{
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  transition: "color 0.15s ease",
                  flexShrink: 0,
                  display: "flex",
                }}
              >
                {opt.icon}
              </span>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    color: isActive ? "var(--text)" : "var(--text-soft)",
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.3,
                    transition: "color 0.15s ease",
                  }}
                >
                  {opt.label}
                </div>
                <div style={{ color: isActive ? "var(--accent)" : "var(--muted)", fontSize: "0.65rem", lineHeight: 1.2, transition: "color 0.15s ease" }}>
                  {opt.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Path info — only when local */}
      {!useKeychain && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.5rem 0.75rem",
            background: "var(--surface)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
          }}
          className="animate-fade-in"
        >
          <p style={{ color: "var(--muted)", fontSize: "0.65rem", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            File path
          </p>
          <p style={{ color: "var(--text-soft)", fontSize: "0.68rem", fontFamily: "monospace", wordBreak: "break-all" }}>
            ~/Library/Application Support/com.daily-ledger.app/.apikey
          </p>
        </div>
      )}
    </div>
  );
}

interface SettingsScreenProps {
  settings: Settings;
  onUpdate: (key: keyof Settings, value: string | number | boolean) => Promise<void>;
  onSetApiKey: (key: string) => Promise<boolean>;
  onDeleteApiKey: () => Promise<void>;
  onNuke: () => Promise<void>;
}

export function SettingsScreen({ settings, onUpdate, onSetApiKey, onDeleteApiKey, onNuke }: SettingsScreenProps) {
  const [updatingKey, setUpdatingKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [isNuking, setIsNuking] = useState(false);
  const [dbPath] = useState("~/Library/Application Support/com.daily-ledger.app/ledger.db");

  const handleSaveKey = async () => {
    const trimmed = newKey.trim();
    if (!trimmed.startsWith("sk-")) {
      setKeyError("Keys must start with sk-");
      return;
    }
    setIsSavingKey(true);
    setKeyError("");
    const ok = await onSetApiKey(trimmed);
    if (ok) {
      setKeySuccess(true);
      setUpdatingKey(false);
      setNewKey("");
      setTimeout(() => setKeySuccess(false), 3000);
    } else {
      setKeyError("Key rejected by OpenAI.");
    }
    setIsSavingKey(false);
  };

  const handleDeleteKey = async () => {
    if (!confirm("Remove your API key? You'll need to re-enter it to use the app.")) return;
    setIsDeletingKey(true);
    await onDeleteApiKey();
    setIsDeletingKey(false);
  };

  const handleNuke = async () => {
    if (!confirm("This will permanently delete all journal entries, memories, settings, and your API key from this machine. There is no undo.\n\nAre you sure?")) return;
    setIsNuking(true);
    await onNuke();
    setIsNuking(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h2 className="font-display text-text text-lg">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-lg">
        {/* API Key */}
        <Card>
          <h3 className="text-sm font-semibold text-text mb-3">API Key</h3>
          {keySuccess && <p className="text-xs text-accent mb-2">✓ Key updated successfully</p>}
          {!updatingKey ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted font-mono">
                {settings.use_keychain !== false ? "sk-… (Keychain)" : "sk-… (local file)"}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setUpdatingKey(true)}>
                  Update
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isDeletingKey}
                  onClick={handleDeleteKey}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                error={keyError}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSavingKey}
                  onClick={handleSaveKey}
                >
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setUpdatingKey(false); setKeyError(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Key storage */}
        <KeyStorageCard
          useKeychain={settings.use_keychain !== false}
          onToggle={(val) => onUpdate("use_keychain", val)}
        />

        {/* Model */}
        <Card>
          <h3 className="text-sm font-semibold text-text mb-3">Model</h3>
          <select
            value={settings.model}
            onChange={(e) => onUpdate("model", e.target.value)}
            className="w-full bg-surface border border-border text-text text-sm rounded-md px-3 py-2 outline-none focus:border-accent"
          >
            <option value="gpt-4.1">GPT-4.1 (Recommended)</option>
            <option value="gpt-5-mini">GPT-5 mini (Faster, cheaper)</option>
          </select>
          <p className="text-xs text-muted mt-2">
            Applies to journal and Patriarch calls. Compression always uses GPT-5 mini.
          </p>
        </Card>

        {/* Personal context */}
        <Card>
          <h3 className="text-sm font-semibold text-text mb-1">Personal Context</h3>
          <p className="text-xs text-muted mb-3">
            Standing information the Patriarch always knows — your profession, family, goals, etc.
          </p>
          <Textarea
            value={settings.personal_context}
            onChange={(e) => onUpdate("personal_context", e.target.value)}
            placeholder="e.g. I'm a software engineer. I have two kids. I'm training for a half marathon."
            maxRows={5}
          />
        </Card>

        {/* Memory depth */}
        <Card>
          <h3 className="text-sm font-semibold text-text mb-1">Memory Depth</h3>
          <p className="text-xs text-muted mb-3">
            How many past entries the Patriarch can reference. More = richer context, higher cost.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={30}
              value={settings.memory_depth}
              onChange={(e) => onUpdate("memory_depth", parseInt(e.target.value, 10))}
              className="flex-1 accent-[var(--color-accent)]"
            />
            <span className="text-sm text-text w-8 text-right">{settings.memory_depth}</span>
          </div>
        </Card>

        {/* Data */}
        <Card>
          <h3 className="text-sm font-semibold text-text mb-3">Data</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted mb-1">Database location</p>
              <p className="text-xs font-mono text-text-soft break-all selectable">{dbPath}</p>
            </div>
          </div>
        </Card>

        {/* Nuke */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
            borderRadius: "var(--radius)",
            padding: "1.25rem",
          }}
        >
          <h3 className="text-sm font-semibold text-text mb-1">Danger Zone</h3>
          <p className="text-xs text-muted mb-4">
            Permanently deletes all journal entries, memories, settings, and your stored API key from this machine. Cannot be undone.
          </p>
          <Button variant="danger" size="sm" isLoading={isNuking} onClick={handleNuke}>
            Nuke all local data
          </Button>
        </div>
      </div>
    </div>
  );
}
