-- The Daily Ledger — Initial Schema
-- All queries against these tables must use parameterized form to prevent SQL injection.

CREATE TABLE IF NOT EXISTS entries (
  id          TEXT    PRIMARY KEY,
  date        TEXT    NOT NULL UNIQUE,   -- ISO date: YYYY-MM-DD, one per day
  created_at  TEXT    NOT NULL,          -- ISO datetime
  conversation TEXT   NOT NULL,          -- JSON array of {role, content}
  journal_text TEXT   NOT NULL,          -- user messages only, concatenated
  review       TEXT   NOT NULL,          -- Patriarch's full structured response
  mood         INTEGER                   -- 1-5, nullable
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

CREATE TABLE IF NOT EXISTS memories (
  id             TEXT    PRIMARY KEY,
  entry_id       TEXT    NOT NULL REFERENCES entries(id),
  date           TEXT    NOT NULL,       -- same as entry date
  themes         TEXT,                   -- comma-separated lowercase tags
  mood           INTEGER,                -- 1-5, nullable
  content        TEXT    NOT NULL,       -- structured memory block (400 tokens max)
  token_estimate INTEGER                 -- approximate token count for budget math
);

CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                    -- JSON-encoded value
);

-- Default settings rows (inserted only if not present)
INSERT OR IGNORE INTO settings (key, value) VALUES ('model',           '"gpt-4.1"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('personal_context', '""');
INSERT OR IGNORE INTO settings (key, value) VALUES ('memory_depth',    '7');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme',           '"system"');
