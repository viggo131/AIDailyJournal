import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings } from "../lib/types";
import { getAllSettings, setSetting, nukeAll } from "../lib/storage";
import { validateApiKey } from "../lib/openai";
import { DEFAULT_MEMORY_DEPTH, DEFAULT_MODEL } from "../constants";

const DEFAULT_SETTINGS: Settings = {
  model: DEFAULT_MODEL,
  personal_context: "",
  memory_depth: DEFAULT_MEMORY_DEPTH,
  theme: "system",
  use_keychain: false, // default to local file — no system prompt on first launch
};

function keyCmd(useKeychain: boolean) {
  return {
    get: useKeychain ? "get_api_key" : "get_key_local",
    set: useKeychain ? "set_api_key" : "set_key_local",
    del: useKeychain ? "delete_api_key" : "delete_key_local",
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Keep a ref so callbacks always see the latest value without needing re-creation
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getAllSettings();
      const merged = { ...DEFAULT_SETTINGS, ...stored };
      const cmd = keyCmd(merged.use_keychain !== false);
      const key = await invoke<string>(cmd.get).catch(() => null);
      if (!cancelled) {
        setSettings(merged);
        setApiKeyState(key);
        setIsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (key: keyof Settings, value: string | number | boolean) => {
    // When toggling use_keychain, best-effort migrate the key to the new location.
    // Wrapped in try-catch so a dismissed keychain prompt doesn't freeze the UI —
    // the preference saves regardless; user may need to re-enter their key.
    if (key === "use_keychain" && apiKeyRef.current) {
      const cachedKey = apiKeyRef.current;
      try {
        if (value === false) {
          await invoke("set_key_local", { key: cachedKey });
          await invoke("delete_api_key").catch(() => {});
        } else {
          await invoke("set_api_key", { key: cachedKey });
          await invoke("delete_key_local").catch(() => {});
        }
      } catch {
        // Migration failed — preference still saves below.
      }
    }
    const jsonValue = JSON.stringify(value);
    await setSetting(key, jsonValue);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setApiKey = useCallback(async (key: string): Promise<boolean> => {
    const valid = await validateApiKey(key);
    if (!valid) return false;
    const cmd = keyCmd(settingsRef.current.use_keychain !== false);
    try {
      await invoke(cmd.set, { key });
    } catch {
      // Keychain write failed (e.g., prompt dismissed). Fall back to local file.
      await invoke("set_key_local", { key }).catch(console.error);
    }
    setApiKeyState(key);
    return true;
  }, []);

  const deleteApiKey = useCallback(async () => {
    // Clear both locations to avoid stale data if setting was ever toggled
    await invoke("delete_api_key").catch(() => {});
    await invoke("delete_key_local").catch(() => {});
    setApiKeyState(null);
  }, []);

  const nuke = useCallback(async () => {
    await nukeAll();
    await invoke("delete_api_key").catch(() => {});
    await invoke("delete_key_local").catch(() => {});
    setSettings(DEFAULT_SETTINGS);
    setApiKeyState(null);
  }, []);

  return { settings, apiKey, isLoaded, update, setApiKey, deleteApiKey, nuke };
}
