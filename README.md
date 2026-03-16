# The Daily Ledger

**A native macOS journal app that remembers you.**

Write daily. Reflect with a warm AI guide. Receive structured wisdom from a wise elder advisor — who draws on weeks and months of your compressed history to give advice that's *actually* personal.

Built with Tauri v2, React, and GPT-4.1. All data stays on your machine.

---

## How It Works

Each session flows through three AI agents:

| Agent | Role | Model |
|---|---|---|
| **Journal Agent** | Warm, attentive guide — draws out your day through 3–5 turns of natural conversation, one question at a time | `gpt-4.1` |
| **The Patriarch** | Wise elder reviewer — reads your entry with full awareness of your recent history and delivers structured advice (think Marcus Aurelius meets a beloved grandfather) | `gpt-4.1` |
| **Compression Agent** | Silently distills each session into a ~300 token structured memory for future sessions | `gpt-5-mini` |

Over time, The Patriarch stops giving generic advice and starts referencing *your* patterns, *your* growth, *your* recurring themes.

---

## Features

### Conversational Journaling
A guided daily reflection — not a blank page. The Journal Agent asks one thoughtful question at a time, adapting to what you share. The conversation opens with a locally-picked prompt (no API call on mount) and flows naturally through 3–5 turns.

### Patriarch Review
After you finish writing, The Patriarch delivers a structured review in five sections:
- **What I See** — reflection of the day's core themes
- **What You're Missing** — blind spots, gently surfaced
- **Patterns I'm Tracking** — recurring threads across your history
- **Tomorrow's Moves** — concrete next steps
- **A Word to Carry** — a closing thought to hold onto

### Persistent Memory System
Every session is compressed into a structured memory block and stored in SQLite. Future sessions load recent memories into context — so your advisor actually *knows* what happened last Tuesday, what you've been struggling with, and where you've grown.

### Dashboard
At-a-glance view of your journaling stats, mood trends, and emotion tracking over time.

> **Note:** The dashboard is currently very basic — it shows placeholder stats and minimal visualization. A more complete implementation with real mood charts and detailed insights is planned.

### Entry History
Full timeline of past entries with mood indicators and theme tags. Browse, search, and revisit any session.

### Secure API Key Storage
Your OpenAI API key is stored in the macOS Keychain, secured by Touch ID or your system passcode. Never written to disk in any other form.

> **Note:** Keychain integration is currently not functional. The API key is stored in SQLite as a fallback. Keychain support will be restored in a future update.

### Draft Persistence
Mid-conversation state is auto-saved to SQLite. Close the app, come back later — your draft is waiting.

### 100% Local
All journal data lives in SQLite on your machine. The only outbound network call is to `api.openai.com`. No telemetry, no analytics, no crash reporting.

---

## Getting Started

### 1. Install Prerequisites

You need the following tools installed on your Mac before you can run the app:

**Rust** (the Tauri backend is written in Rust)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
After install, restart your terminal and verify with:
```bash
rustc --version   # should show 1.77 or higher
```

**Xcode Command Line Tools** (required for compiling native code on macOS)
```bash
xcode-select --install
```

**Node.js** (v18 or higher)
```bash
brew install node
```
Or download from [nodejs.org](https://nodejs.org).

**pnpm** (the package manager used by this project)
```bash
npm install -g pnpm
```

**OpenAI API Key** — you'll need one to use the app. Get it from [platform.openai.com/api-keys](https://platform.openai.com/api-keys). The app will ask for it on first launch.

### 2. Clone the Repo

```bash
git clone https://github.com/YOUR_USERNAME/AIDailyJournal.git
cd AIDailyJournal
```

### 3. Install Dependencies

This installs both the JavaScript (frontend) and Rust (backend) dependencies:
```bash
pnpm install
```

### 4. Run in Development Mode

```bash
pnpm tauri dev
```

This will:
- Start the Vite dev server (frontend with hot reload)
- Compile the Rust backend (first run takes a few minutes)
- Open the app window

You'll see Rust compilation output on the first run — this is normal and only slow the first time.

### 5. Build for Production (optional)

```bash
pnpm tauri build
```

Output files land in `src-tauri/target/release/bundle/`:
- `macos/The Daily Ledger.app` — drag to Applications
- `dmg/The Daily Ledger_0.0.1_aarch64.dmg` — distributable installer

> **Tip:** If macOS blocks the unsigned app, right-click the `.app` and select **Open**.

### First Launch

On first open the app prompts for your OpenAI API key. The key is currently stored in SQLite (Keychain integration is not yet functional). All journal data lives in:

```
~/Library/Application Support/com.daily-ledger.app/ledger.db
```

---

## Available Commands

| Command | What it does |
|---|---|
| `pnpm install` | Install all dependencies (JS + Rust) |
| `pnpm tauri dev` | Run the app in development mode with hot reload |
| `pnpm tauri build` | Build a production `.app` and `.dmg` |
| `pnpm dev` | Run only the Vite frontend (no Tauri window) |
| `pnpm build` | Build only the frontend to `dist/` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop runtime | [Tauri v2](https://tauri.app) — Rust backend + WebView frontend |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Typography | Playfair Display (headings) + Source Sans 3 (body) |
| Database | SQLite via `tauri-plugin-sql` |
| AI | OpenAI API — `gpt-4.1` + `gpt-5-mini` |
| Package manager | pnpm |

---

## Project Structure

```
src-tauri/
├── src/lib.rs               Tauri setup, keychain commands, plugin registration
├── migrations/001_init.sql   SQLite schema (entries, memories, settings)
└── tauri.conf.json           Window config, bundle settings, permissions

src/
├── lib/
│   ├── openai.ts             API client (single source of truth for all OpenAI calls)
│   ├── storage.ts            SQLite wrapper (all DB access goes through here)
│   ├── prompts.ts            System prompts + opening questions (prompts are data)
│   ├── memory.ts             Memory loading, budgeting, context formatting
│   ├── tokens.ts             Token estimation (chars / 4)
│   └── types.ts              All TypeScript interfaces
├── hooks/
│   ├── useChat.ts            Journal conversation state + API orchestration
│   ├── useEntries.ts         Entry CRUD operations
│   ├── useMemories.ts        Memory assembly
│   ├── useSettings.ts        Settings read/write
│   └── useDashboard.ts       Dashboard state
├── components/
│   ├── ui/                   Button, Input, Textarea, Card, Badge, Spinner, Toast
│   ├── layout/               Sidebar + MainPanel
│   ├── setup/                API key entry + validation
│   ├── journal/              Chat interface, MessageBubble, InputBar
│   ├── review/               Patriarch review, ReviewCard, EmotionChart
│   ├── dashboard/            Stats and mood visualization
│   ├── history/              Entry list, detail view
│   └── settings/             Settings panel
└── constants.ts              Token budgets, defaults
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `error: linker 'cc' not found` | Run `xcode-select --install` |
| Rust compile errors on first build | Run `rustup update stable` |
| `pnpm: command not found` | Run `npm install -g pnpm` then restart your terminal |
| First `pnpm tauri dev` is very slow | Normal — Rust compiles all dependencies on first run. Subsequent runs are fast. |
| `error[E0463]: can't find crate` | Run `rustup update stable` and try again |
| App won't open (unsigned) | Right-click the `.app` → **Open**, then click Open in the dialog |
| Blank screen on launch | Check the terminal for errors. Make sure `pnpm install` completed without errors. |
| API key not working | Verify your key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). Make sure it has usage credits. |

---

## Privacy

- All journal data lives in `~/Library/Application Support/com.daily-ledger.app/ledger.db`
- The only outbound network call is to `api.openai.com`
- No telemetry, analytics, or crash reporting of any kind
- API key currently stored in SQLite (Keychain integration planned)

---

## Roadmap

**v1.1**
- Personal context field, mood tracking, entry search, model selection, JSON/Markdown export, streak counter

**v2+**
- Weekly digest, semantic memory retrieval, global hotkey, menu bar quick-entry, iCloud backup

---

## License

MIT
