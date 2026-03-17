# Product Requirements Document: The Daily Ledger

## 1. Overview

**The Daily Ledger** is a native macOS journaling application powered by GPT-4.1. Users provide their OpenAI API key, engage in a guided daily reflection conversation, and receive structured advice from "The Patriarch" — a wise elder advisor. The app compresses and stores every conversation locally, building a growing memory of the user's life that informs future sessions.

### Core Value Proposition

A daily thinking partner that actually remembers you. Each conversation is distilled into a compact memory and stored locally. Over time, the Patriarch draws on weeks and months of compressed context to spot patterns, track growth, and give advice grounded in your real history — not generic platitudes.

### Target User

Anyone who wants an active daily reflection practice with a mentor that remembers their story.

---

## 2. Architecture

### Stack

- **Framework:** Tauri v2 (Rust backend + React/TypeScript frontend)
- **Frontend:** Vite + React + TypeScript
- **Styling:** Tailwind CSS
- **Local Storage:** SQLite via Tauri's SQL plugin (`tauri-plugin-sql`)
- **AI Provider:** OpenAI API (`api.openai.com`)
- **Packaging:** Tauri bundles to a native `.app` for macOS (universal binary, Apple Silicon + Intel)
- **Package Manager:** pnpm

### Why Tauri

- Produces a native macOS `.app` — double-click to run, drag to Applications
- ~5 MB binary vs ~150 MB for Electron
- Rust backend gives native filesystem + SQLite access without a separate server
- No Node.js runtime required on the user's machine
- macOS code signing and notarization supported out of the box

### Data Flow

```
                    ┌─────────────────────────────┐
                    │     SQLite (local)           │
                    │  ┌───────────────────────┐   │
                    │  │ entries (full convos)  │   │
                    │  │ memories (compressed)  │   │
                    │  │ settings (api key etc) │   │
                    │  └───────────────────────┘   │
                    └──────┬──────────────▲────────┘
                           │              │
                    read memories    write entry + memory
                           │              │
                           ▼              │
User ◄──► Journal Agent (GPT-4.1) ──► Patriarch (GPT-4.1) ──► Compress Agent (GPT-5 mini)
            uses recent memories        reviews entry         distills conversation
            as context                  gives guidance         into compact memory
```

---

## 3. Context Management System

This is the core differentiator. Every conversation is compressed into a structured memory that fits in a fraction of the original token count. Future sessions load relevant memories into context so the Patriarch can reference the user's real history.

### 3.1 Memory Lifecycle

```
1. CONVERSATION  →  Full multi-turn journal chat (~1000-3000 tokens of user text)
2. REVIEW        →  Patriarch reads journal + recent memories, gives structured advice
3. COMPRESSION   →  Compress Agent distills the entire session into a ~200-400 token memory
4. STORAGE       →  Memory saved to SQLite with date, tags, and mood metadata
5. RETRIEVAL     →  Next session loads the last 7-14 memories as Patriarch context
```

### 3.2 Memory Format

Each compressed memory is a structured text block:

```
DATE: 2026-03-11
MOOD: 3/5
KEY THEMES: work pressure, relationship with manager, exercise consistency
WHAT HAPPENED: [2-3 sentence factual summary of the day]
EMOTIONAL STATE: [1-2 sentences on how the user felt and why]
ACTIVE CONCERNS: [ongoing issues carried forward]
PROGRESS: [anything that improved or was resolved vs. prior entries]
PATRIARCH ADVICE GIVEN: [1-2 sentence summary of key guidance]
```

### 3.3 Compression Agent

A dedicated GPT-5 mini call that takes the full conversation + Patriarch review and outputs ONLY the structured memory block above. GPT-5 mini is used here (rather than GPT-4.1) to keep cost low on this background, high-volume call. System prompt enforces:

- Strict format adherence
- Maximum 400 tokens output
- Factual accuracy — no editorializing
- Track continuity with prior entries (flag what's new vs. recurring)

### 3.4 Context Window Budget

For each new session, the context is assembled as:

| Component | Approx. Tokens | Source |
|---|---|---|
| System prompt (Journal Agent) | ~300 | Static |
| User profile / standing context | ~200 | Settings |
| Recent memories (last 7–14) | ~2800–5600 | SQLite |
| Current conversation turns | Variable | Live state |
| **Total budget target** | **< 12,000** | — |

For the Patriarch call:

| Component | Approx. Tokens | Source |
|---|---|---|
| System prompt (Patriarch) | ~400 | Static |
| User profile / standing context | ~200 | Settings |
| Recent memories (last 7–14) | ~2800–5600 | SQLite |
| Today's journal text | ~500–2000 | Current session |
| **Total budget target** | **< 12,000** | — |

The app dynamically adjusts how many memories to include based on their individual length, working backward from the most recent until the budget is met.

### 3.5 API Call Budget

The app makes the minimum number of API calls possible per session:

| Action | API calls | Notes |
|---|---|---|
| App launch / navigation | 0 | Everything reads from SQLite |
| Start new entry | 0 | Opening message is a local static prompt |
| Each user send | 1 | Journal Agent turn (gpt-4.1, max 400 tokens) |
| Confirm entry done | 1 | Patriarch review (gpt-4.1, max 900 tokens) |
| Background compression | 1 | Compression Agent (gpt-5-mini, max 450 tokens) |
| View history / past review | 0 | Reads stored data from SQLite |
| Save new API key | 1 | Validation ping only |

A typical daily session = **4–7 API calls total** (3–5 journal turns + 1 Patriarch + 1 compression).

### 3.6 Memory Retrieval Strategy

**MVP (v1):** Load the N most recent memories, fitting within the token budget. Simple and effective for daily use.

**Future (v2):** Hybrid retrieval — always include the last 3 days, then fill remaining budget with keyword-relevant older memories (using SQLite FTS5 full-text search against the `key_themes` and `what_happened` fields).

---

## 4. User Flows

### 4.1 First Launch

1. User opens the `.app`
2. Welcome screen: brief explanation, single input for API key
3. User pastes their OpenAI API key
4. App validates with a test API call
5. On success: key stored in macOS Keychain via Tauri plugin, proceed to main screen
6. On failure: clear inline error, retry

### 4.2 Daily Entry

1. Main screen shows today's date and a "Start Today's Entry" button
2. If an entry already exists for today, show it with option to "Reflect Again"
3. On start: Journal Agent opens with a randomized prompt, informed by recent memories
4. Conversational back-and-forth (3–5 turns)
5. User can end early with "I'm done" after 2+ messages
6. Agent signals completion → user confirms → entry moves to Patriarch review

### 4.3 Patriarch Review

1. Loading state: "The Patriarch is reviewing your day…"
2. Patriarch receives: system prompt + personal context + recent memories + today's journal text
3. Structured review displays in a card layout
4. After review renders, the compression agent runs in the background (non-blocking)
5. Full entry, review, and compressed memory are all saved to SQLite

### 4.4 History

1. Sidebar or dedicated screen shows all past entries as a scrollable timeline
2. Each item: date, mood indicator, theme tags, first line preview
3. Click to expand: full journal conversation + Patriarch review
4. Search bar for keyword search across entries

### 4.5 Settings

Accessible via Cmd+, or menu bar:

- API key: view (masked), update, remove
- Model selection: dropdown (GPT-4.1, GPT-5 mini)
- Personal context: free text field for standing information the Patriarch should always know (e.g., "I'm a chemical engineer. I have two kids. I'm training for a marathon.")
- Memory depth: slider for how many past memories to include (default 7, max 30)
- Data export: button to export all entries as JSON
- Data location: show the SQLite file path

---

## 5. Agent Specifications

### 5.1 Journal Agent

**Role:** Warm, attentive daily reflection guide.

**System prompt key behaviors:**
- Opens with a single question about the user's day
- Asks ONE question at a time
- Responses are 2–3 sentences max
- Follows up on what the user shares before moving to new topics
- After 3–5 exchanges, winds down naturally
- Signals completion with `[JOURNAL_COMPLETE]` token at end of final message
- Never gives advice — that is exclusively the Patriarch's role
- If memories are provided, may reference them naturally: "Last week you mentioned X — how's that going?"

**Context injection:** Recent memories are prepended to the system prompt in a `<recent_context>` block so the agent can reference prior entries naturally.

### 5.2 The Patriarch

**Role:** Wise elder advisor who reviews today's entry with awareness of the user's recent history.

**Persona:**
- Marcus Aurelius meets a beloved grandfather
- Direct but kind — never preachy
- Short punchy sentences mixed with reflective ones
- References prior entries when relevant: "Three days ago you committed to X. I notice you haven't mentioned it since."
- Occasional dry humor

**Output sections:**
1. **What I See** — read on the day, validate emotions
2. **What You Might Be Missing** — challenge, reframe, or blind spot
3. **Patterns I'm Tracking** — connections to recent entries (only when memories are present)
4. **Tomorrow's Moves** — 2–3 specific actions
5. **A Word to Carry** — closing wisdom

**Context injection:** `<recent_context>` block of memories + `<personal_context>` from settings.

### 5.3 Compression Agent

**Role:** Neutral summarizer that distills a session into a compact structured memory.

**System prompt key behaviors:**
- Output ONLY the structured memory format, nothing else
- Be factual — no interpretation beyond what the user explicitly stated
- Track continuity: note what's new vs. recurring from the memories provided
- Hard cap: 400 tokens output
- Tag 2–5 key themes as lowercase comma-separated values

---

## 6. Data Model (SQLite)

### Table: `entries`

| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID |
| `date` | TEXT NOT NULL | ISO date (2026-03-11), unique, indexed |
| `created_at` | TEXT NOT NULL | ISO datetime |
| `conversation` | TEXT NOT NULL | Full conversation as JSON array |
| `journal_text` | TEXT NOT NULL | Compiled user messages only |
| `review` | TEXT NOT NULL | Patriarch's full response |
| `mood` | INTEGER | 1–5, nullable |

### Table: `memories`

| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID |
| `entry_id` | TEXT NOT NULL | FK → entries.id |
| `date` | TEXT NOT NULL | Same as entry date, indexed |
| `themes` | TEXT | Comma-separated theme tags |
| `mood` | INTEGER | 1–5 |
| `content` | TEXT NOT NULL | The compressed memory block |
| `token_estimate` | INTEGER | Approximate token count for budgeting |

### Table: `settings`

| Column | Type | Description |
|---|---|---|
| `key` | TEXT PK | Setting name |
| `value` | TEXT NOT NULL | JSON-encoded setting value |

Settings keys: `api_key`, `model`, `personal_context`, `memory_depth`, `theme`.

---

## 7. UI/UX Guidelines

### Design Direction

- **Aesthetic:** Warm, quiet, native macOS feel — not a web app in a wrapper
- **Palette:** Dark warm neutrals. Background: #1a1714. Accent: amber/gold #c9a86c. Text: warm off-white #e8e0d4. Muted: #7a7060.
- **Typography:** Serif for display headings (Playfair Display or Lora). Clean sans for body (Source Sans 3 or IBM Plex Sans).
- **Window:** Standard macOS title bar with traffic lights. Respect system-level window management.
- **Layout:** Single-window. Left sidebar for navigation (Today, History, Settings). Main content area right.
- **Animations:** Subtle CSS transitions only. Fade in messages. No spring physics.

### macOS Integration

- Respect system dark/light mode (with override in settings)
- Native keyboard shortcuts: Cmd+, for settings, Cmd+N for new entry, Cmd+Return to send message
- Standard macOS menu bar menus (File, Edit, View, Window, Help)
- App lives in `~/Library/Application Support/com.daily-ledger.app/`

---

## 8. Error Handling

| Scenario | Behavior |
|---|---|
| Invalid API key | Inline error on setup, block entry creation |
| API 401 mid-session | Prompt to update key in settings, preserve draft in memory |
| API 429 rate limit | "Give it a moment" + auto-retry after 10 seconds |
| API 500 / network | Retry with backoff (3 attempts), then show error + manual retry |
| Compression fails | Non-blocking — save entry without memory, flag for background retry |
| SQLite error | Error toast, log to file for debugging |
| Context too large | Dynamically reduce memory count and retry |

---

## 9. Security & Privacy

- **API key:** Stored in macOS Keychain via `tauri-plugin-keychain` (preferred) or encrypted in SQLite as fallback
- **All data local:** SQLite lives in `~/Library/Application Support/com.daily-ledger.app/`
- **No network calls** except to `api.openai.com`
- **No telemetry, analytics, or crash reporting**
- **Settings screen** shows the exact database file path for transparency

---

## 10. Feature Tiers

### P0 — MVP

- API key setup + validation
- Conversational journaling (Journal Agent)
- Patriarch review with memory-informed context
- Memory compression + SQLite storage
- Entry history (list + detail)
- macOS `.app` bundle via Tauri

### P1 — v1.1

- Personal context field in settings
- Mood tracking per entry
- Entry search (SQLite FTS5)
- Model selection (GPT-4.1 / GPT-5 mini)
- Export to JSON / Markdown
- Streak counter
- System dark/light mode respect

### P2 — v2+

- Weekly digest: Patriarch reviews the full week
- Semantic memory retrieval (embed + similarity search)
- Multiple Patriarch personas
- Global hotkey to start entry
- Menu bar quick-entry mode
- iCloud backup of SQLite (opt-in)

---

## 11. Open Questions

1. **Keychain vs. encrypted SQLite for API key?** Keychain is more secure and native. Encrypted SQLite is simpler. Recommend Keychain if the Tauri plugin is stable.
2. **One entry per day or multiple?** Current design assumes one. Multiple per day adds flexibility but complicates memory.
3. **Should compression happen sync or async?** Recommend async — save the entry immediately, compress in background, write memory when done.
4. **Memory depth default?** 7 entries (~2800 tokens) is the recommended default. User-configurable up to 30.
5. **Model default?** `gpt-4.1` for journal + Patriarch calls. `gpt-5-mini` is the default for the compression agent to keep background call costs low.


## 12. Known Gaps (current implementation vs. spec)

The following items from the PRD are either missing, incomplete, or diverge from the spec in the current codebase.

### Not Functional

| Area | Status | Details |
|---|---|---|
| **macOS Keychain storage** | Not functional | Rust SecItem code exists in `lib.rs` and the settings UI has a toggle, but `use_keychain` defaults to `false` and Keychain storage does not work reliably at runtime. API key is stored in a local file as a fallback. |
| **Mood capture** | Not wired | The `mood` column exists in the `entries` table but is always saved as `null`. Neither user-prompted mood rating nor automatic extraction from the Patriarch's `[EMOTIONS]` block is connected to the entry save path. |
| **Data export** | Missing | PRD specifies a "Export to JSON / Markdown" button in Settings (P1). No export functionality exists. |

### Incomplete / Basic

| Area | Status | Details |
|---|---|---|
| **Dashboard ("Chronicle")** | Very basic | Shows streak, total entries, mood sparkline, recurring themes, and last Patriarch quote. However, mood data is always null (see above), so the sparkline never renders meaningful data. No emotion trend charts or deeper insights yet. |
| **Compression model** | Wrong model name | `constants.ts` sets `COMPRESSION_MODEL = "gpt-4o-mini"` — PRD specifies `gpt-5-mini`. Update the constant once the model is available. |
| **Search** | Basic string matching | History search uses JavaScript `.includes()` on journal_text/review. PRD's P1 spec calls for SQLite FTS5 full-text search. Functional but slow on large datasets. |

### P1 Features Not Yet Started

These are listed as P1 (v1.1) in the PRD but have no implementation:

- **Entry search with FTS5** — only basic string filter exists
- **Export to JSON / Markdown** — no export UI or logic
- **Streak counter in sidebar** — streak exists on Dashboard but not in the sidebar nav
- **System dark/light mode respect** — app uses a fixed dark theme; no system mode detection or theme override in settings

### P2 Features (future, not started)

- Weekly digest (Patriarch reviews the full week)
- Semantic memory retrieval (embed + similarity search)
- Multiple Patriarch personas
- Global hotkey to start entry
- Menu bar quick-entry mode
- iCloud backup of SQLite

---

## 13. Future Improvements

- lets build a task veiw, so if a user says they need some kind of completed task or whatever, it will populate another page, and we can use a calendar veiw to capture this information and keep it stored please. so basically natural language to putting it directly into the view
- iCloud backup of SQLite (opt-in)
- Weekly digest: Patriarch reviews the full week
- Semantic memory retrieval (embed + similarity search)
- Multiple Patriarch personas
- Global hotkey to start entry
- Menu bar quick-entry mode
