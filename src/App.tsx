import React, { useEffect, useCallback, useState } from "react";
import { Screen, Message } from "./lib/types";
import { useSettings } from "./hooks/useSettings";
import { Sidebar, MainPanel } from "./components/layout";
import { SetupScreen } from "./components/setup/SetupScreen";
import { JournalScreen } from "./components/journal/JournalScreen";
import { ReviewScreen } from "./components/review/ReviewScreen";
import { HistoryScreen } from "./components/history/HistoryList";
import { DashboardScreen } from "./components/dashboard/DashboardScreen";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";

// State passed from JournalScreen → ReviewScreen
interface ReviewPayload {
  journalText: string;
  messages: Message[];
}

export default function App() {
  const { settings, apiKey, isLoaded, update, setApiKey, deleteApiKey, nuke } = useSettings();
  const [screen, setScreen] = useState<Screen>("journal");
  const [reviewPayload, setReviewPayload] = useState<ReviewPayload | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey) return;
      if (e.key === ",") { e.preventDefault(); setScreen("settings"); }
      if (e.key === "n") { e.preventDefault(); setScreen("journal"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s);
    if (s !== "review") setReviewPayload(null);
  }, []);

  const handleJournalComplete = useCallback((payload: ReviewPayload) => {
    setReviewPayload(payload);
    setScreen("review");
  }, []);

  // Wait for settings to load from SQLite + Keychain
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <span className="text-muted text-sm animate-pulse-soft">Loading…</span>
      </div>
    );
  }

  // First launch — no API key in Keychain
  if (!apiKey) {
    return (
      <ErrorBoundary>
        <SetupScreen onSuccess={() => setScreen("journal")} setApiKey={setApiKey} />
      </ErrorBoundary>
    );
  }

  const activeScreen: Record<Screen, React.ReactNode> = {
    setup: null,
    journal: (
      <JournalScreen
        apiKey={apiKey}
        settings={settings}
        onComplete={handleJournalComplete}
      />
    ),
    review: reviewPayload ? (
      <ReviewScreen
        apiKey={apiKey}
        settings={settings}
        journalText={reviewPayload.journalText}
        messages={reviewPayload.messages}
        onDone={() => handleNavigate("dashboard")}
      />
    ) : null,
    history: <HistoryScreen />,
    dashboard: <DashboardScreen />,
    settings: (
      <SettingsScreen
        settings={settings}
        onUpdate={update}
        onSetApiKey={setApiKey}
        onDeleteApiKey={deleteApiKey}
        onNuke={async () => { await nuke(); setScreen("journal"); }}
      />
    ),
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar activeScreen={screen} onNavigate={handleNavigate} />
        <MainPanel>{activeScreen[screen]}</MainPanel>
      </div>
    </ErrorBoundary>
  );
}
