import { useState, useEffect } from "react";
import { getAllEntries, getMemoriesByDepth } from "../lib/storage";
import { Entry, Memory } from "../lib/types";

export interface DashboardData {
  streak: number;
  totalEntries: number;
  moodHistory: { date: string; mood: number }[];
  topThemes: { tag: string; count: number }[];
  lastWisdom: string | null;
  lastEntryDate: string | null;
  isLoaded: boolean;
}

function computeStreak(entries: Entry[]): number {
  if (!entries.length) return 0;
  const today = new Date().toISOString().split("T")[0];
  const dateSet = new Set(entries.map((e) => e.date));
  let streak = 0;
  const d = new Date(today + "T12:00:00");
  while (dateSet.has(d.toISOString().split("T")[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function extractWordToCarry(review: string): string | null {
  const header = "## A Word to Carry";
  const start = review.indexOf(header);
  if (start === -1) return null;
  // Content begins after the header line
  const afterHeader = review.slice(start + header.length).replace(/^\s*\n/, "");
  // Stop at the next section, EMOTIONS block, or end of string
  const stopAt = ["\n## ", "\n[EMOTIONS", "[EMOTIONS"].reduce<number>((earliest, marker) => {
    const idx = afterHeader.indexOf(marker);
    return idx !== -1 && idx < earliest ? idx : earliest;
  }, afterHeader.length);
  const text = afterHeader.slice(0, stopAt).trim();
  return text || null;
}

function computeTopThemes(memories: Memory[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const mem of memories) {
    if (!mem.themes) continue;
    for (const tag of mem.themes.split(",").map((t) => t.trim()).filter(Boolean)) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const EMPTY: DashboardData = {
  streak: 0,
  totalEntries: 0,
  moodHistory: [],
  topThemes: [],
  lastWisdom: null,
  lastEntryDate: null,
  isLoaded: false,
};

export function useDashboard(): DashboardData {
  const [data, setData] = useState<DashboardData>(EMPTY);

  useEffect(() => {
    (async () => {
      const [entries, memories] = await Promise.all([
        getAllEntries(),
        getMemoriesByDepth(200),
      ]);

      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
      const lastEntry = sorted[0] ?? null;

      const moodHistory = sorted
        .filter((e) => e.mood !== null)
        .slice(0, 14)
        .reverse()
        .map((e) => ({ date: e.date, mood: e.mood! }));

      setData({
        streak: computeStreak(entries),
        totalEntries: entries.length,
        moodHistory,
        topThemes: computeTopThemes(memories),
        lastWisdom: lastEntry ? extractWordToCarry(lastEntry.review) : null,
        lastEntryDate: lastEntry?.date ?? null,
        isLoaded: true,
      });
    })();
  }, []);

  return data;
}
