/**
 * SQLite storage wrapper — all DB access goes through here.
 * SECURITY: All queries use parameterized form ($1, $2...). No string concatenation.
 */
import Database from "@tauri-apps/plugin-sql";
import { Entry, Memory, Message, Settings } from "./types";
import { DB_PATH } from "../constants";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load(`sqlite:${DB_PATH}`);
  return _db;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
    [key, value]
  );
}

export async function getDraft(date: string): Promise<Message[] | null> {
  const raw = await getSetting(`draft_${date}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Message[]) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(date: string, messages: Message[]): Promise<void> {
  await setSetting(`draft_${date}`, JSON.stringify(messages));
}

export async function clearDraft(date: string): Promise<void> {
  await setSetting(`draft_${date}`, "");
}

export async function getAllSettings(): Promise<Partial<Settings>> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings"
  );
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result as Partial<Settings>;
}

// ─── Entries ─────────────────────────────────────────────────────────────────

export async function getEntryByDate(date: string): Promise<Entry | null> {
  const db = await getDb();
  const rows = await db.select<
    { id: string; date: string; created_at: string; conversation: string; journal_text: string; review: string; mood: number | null }[]
  >(
    "SELECT id, date, created_at, conversation, journal_text, review, mood FROM entries WHERE date = $1",
    [date]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    conversation: JSON.parse(row.conversation) as Message[],
  };
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.select<
    { id: string; date: string; created_at: string; conversation: string; journal_text: string; review: string; mood: number | null }[]
  >(
    "SELECT id, date, created_at, conversation, journal_text, review, mood FROM entries ORDER BY date DESC"
  );
  return rows.map((row) => ({
    ...row,
    conversation: JSON.parse(row.conversation) as Message[],
  }));
}

export async function saveEntry(
  entry: Omit<Entry, "id" | "created_at">
): Promise<Entry> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const conversationJson = JSON.stringify(entry.conversation);

  await db.execute(
    `INSERT INTO entries (id, date, created_at, conversation, journal_text, review, mood)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, entry.date, created_at, conversationJson, entry.journal_text, entry.review, entry.mood]
  );

  return { id, created_at, ...entry };
}

// ─── Memories ────────────────────────────────────────────────────────────────

export async function getMemoriesByDepth(depth: number): Promise<Memory[]> {
  const db = await getDb();
  return db.select<Memory[]>(
    "SELECT id, entry_id, date, themes, mood, content, token_estimate FROM memories ORDER BY date DESC LIMIT $1",
    [depth]
  );
}

export async function getMemoryByEntryId(entryId: string): Promise<Memory | null> {
  const db = await getDb();
  const rows = await db.select<Memory[]>(
    "SELECT id, entry_id, date, themes, mood, content, token_estimate FROM memories WHERE entry_id = $1",
    [entryId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function nukeAll(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM memories");
  await db.execute("DELETE FROM entries");
  await db.execute("DELETE FROM settings");
  // Reset singleton so next getDb() returns a fresh connection with empty tables
  _db = null;
}

export async function saveMemory(memory: Omit<Memory, "id">): Promise<Memory> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO memories (id, entry_id, date, themes, mood, content, token_estimate)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, memory.entry_id, memory.date, memory.themes, memory.mood, memory.content, memory.token_estimate]
  );
  return { id, ...memory };
}
