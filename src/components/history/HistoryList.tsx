import React, { useEffect, useState } from "react";
import { Entry } from "../../lib/types";
import { getAllEntries } from "../../lib/storage";
import { HistoryItem } from "./HistoryItem";
import { EntryDetail } from "./EntryDetail";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";

export function HistoryScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);

  // Load all entries from SQLite — no API calls
  useEffect(() => {
    getAllEntries()
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, []);

  if (selected) {
    return <EntryDetail entry={selected} onBack={() => setSelected(null)} />;
  }

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.journal_text.toLowerCase().includes(search.toLowerCase()) ||
        e.review.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + search */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h2 className="font-display text-text text-lg mb-3">History</h2>
        <Input
          placeholder="Search entries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center pt-12">
            <Spinner label="Loading entries…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-text-soft text-sm">
              {search ? "No entries match your search." : "No entries yet. Start your first journal session."}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
          ))
        )}
      </div>
    </div>
  );
}
