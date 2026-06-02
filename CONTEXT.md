# Meeting Assistant — Full Project Context

## What this is
An Electron-based AI meeting assistant overlay (similar to Cluely). Sits always-on-top of the screen, invisible to screen sharing (Windows `SetWindowDisplayAffinity WDA_EXCLUDEFROMCAPTURE`), captures mic audio via Web Speech API, captures screenshots, and sends context to Groq API for real-time AI suggestions.

---

## Project structure
```
meeting-assistant/
├── src/
│   ├── main.js          — Electron main process (window, IPC, global shortcuts)
│   └── renderer.html    — Single-file UI (HTML + CSS + JS, no build step)
├── package.json
└── node_modules/
    ├── electron@28
    ├── marked@4          — Markdown parser for AI responses
    └── highlight.js      — Syntax highlighting for code blocks
```

---

## Running the app
```bash
# Dev mode (content protection ON, window visible in screenshots too):
npm run dev
# or directly:
node_modules/electron/dist/electron.exe . --dev

# Production:
npm start

# Build portable .exe:
npm run build
```

---

## All keyboard shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+S` | Ask AI (global — works even when Zoom/Teams is focused) |
| `Ctrl+C` | Clear chat (only when no text selected; selected text still copies) |
| `Ctrl+Shift+M` | Toggle microphone |
| `Ctrl+Shift+A` | Toggle system/speaker audio |
| `Ctrl+Shift+S` | Take screenshot |
| `Ctrl+Space` | Hide / show overlay |
| `Ctrl+Arrow keys` | Move overlay window 30px in any direction |
| `Ctrl+Shift+R` | Reset window to top-right corner |
| `Ctrl+Shift+Q` | Quit |

---

## UI layout
```
┌─────────────────────────────────────┐  40px — titlebar (drag to move)
│ ● ASSISTANT  00:00  ⚙ 🎙 📸 ⌫ ✕  │
├─────────────────────────────────────┤
│ [Settings panel — ⚙ to toggle]     │  collapsible
│   API Key:  [gsk_............]      │
│   Opacity:  ━━━━━●━━  94%          │  15%–100%, makes window see-through
│   How to answer: [custom prompt]   │  appended to every AI system prompt
├─────────────────────────────────────┤
│                                     │
│  You                                │  transcript bubble (plain text)
│  "what they said in meeting..."     │
│                                     │
│  Assistant                [⎘ copy] │  AI response bubble
│  Rendered markdown with             │  markdown + syntax highlighted code
│  **bold**, `inline code`,           │  streams in real-time, renders on done
│  ```js                              │
│  const x = 1;                       │
│  ```                                │
│                                     │
│  [scrollable, max 380px tall]       │  overflow-y: auto, auto-scrolls to bottom
├─────────────────────────────────────┤
│ [📸 Screenshot attached]  [✕ clear]│  shown only when screenshot is attached
├─────────────────────────────────────┤
│ Listening · Ctrl+S to ask      23w │  status + word count
└─────────────────────────────────────┘
```

Window: 360px wide, auto-resizes height (max 720px) via IPC.

---

## main.js — key IPC handlers
```javascript
ipcMain.on('quit',        ()       => app.quit())
ipcMain.on('resize',      (e, h)   => mainWindow.setSize(360, clamp(h, 44, 720)))
ipcMain.on('move-window', (e, [dx,dy]) => mainWindow.setPosition(x+dx, y+dy))
ipcMain.handle('capture-screenshot', async () => base64JPEG)
ipcMain.handle('get-sources',        async () => [{id, name}])  // system audio sources
ipcMain.handle('save-notes',         async (e, md) => bool)
```

Global shortcuts registered: `Control+S`, `Control+Space`, `Control+Shift+S/M/A/R/Q`
- `Control+Shift+A` sends `toggle-sys` IPC to renderer (system audio toggle)

Content protection: `mainWindow.setContentProtection(true)` — always on (no --dev bypass).
Re-applied on `did-finish-load` to handle apps that check at render time.

---

## renderer.html — key state variables
```javascript
let micOn      = false      // mic recording active
let recognition = null      // SpeechRecognition instance
let transcript  = ''        // full accumulated transcript this session
let lastSent    = ''        // transcript slice already shown to AI (for dedup)
let screenshot  = null      // base64 JPEG or null
let busy        = false     // AI request in flight
```

localStorage keys:
- `groq_key`       — Groq API key
- `opacity`        — window background opacity (15–100)
- `custom_prompt`  — appended to AI system prompt

---

## AI call flow
```
Ctrl+S pressed
  → show transcript since lastSent as "You" bubble
  → show streaming "Assistant" bubble with cursor blink
  → if screenshot: POST to Groq vision (llama-4-scout-17b, non-streaming)
  → else: POST to Groq chat (llama-3.3-70b-versatile, streaming SSE)
  → on stream complete: convert plain text → marked.parse() → innerHTML
  → auto-copy full response to clipboard
  → update lastSent = transcript
```

System prompt structure:
```
"You are a real-time meeting assistant. Based on the transcript, suggest a
natural, confident response the user can say next. Be concise — 2-4 sentences,
no preamble or meta-commentary."
+ (if custom_prompt set): "\n\nAdditional instructions: {custom_prompt}"
```

Vision model: `meta-llama/llama-4-scout-17b-16e-instruct`
Text model:   `llama-3.3-70b-versatile`
Max tokens:   400 (text), 500 (vision)
Temperature:  0.65

---

## Bugs fixed during this session
1. `startMic()` used `await` but wasn't `async` — syntax error, mic never worked
2. `closeBtn` used removed `require('electron').remote` — fell back to no-op instead of quit
3. Duplicate `ipcRenderer.on('trigger-ask', doAsk)` registration — fired twice per shortcut
4. System audio (`sysBtn`) used `SpeechRecognition` which always reads mic input, not the captured stream — replaced with `MediaRecorder` + Groq Whisper API in 5-second chunks
5. Content protection disabled in `--dev` mode via flag check — removed, always on now

---

## Features removed in redesign
The original app had these which were cut for simplicity:
- System audio capture tab (Sys Audio button)
- Notes page (save/export responses)
- AI mode tabs (Suggest / Summary / Answer / Screen)
- Response history navigation (◁ ▷)
- Compact/pill mode
- Auto-trigger AI on speech pause (timer-based)
- Multiple model selectors in settings

---

## SaaS plan (discussed, not yet built)

### Why not rotate free Groq accounts
- Groq detects correlated usage from same app fingerprint
- Mass ban risk with no recourse
- Actual AI cost is ~$0.02–0.05 per 2-hour session on paid tier
- Not worth the risk at 97%+ margins

### Recommended pricing model — credits (not subscription)
| Pack | Price | Hours | AI cost | Margin |
|---|---|---|---|---|
| Starter | $3 | 3 hrs | ~$0.08 | 97% |
| Standard | $8 | 10 hrs | ~$0.25 | 97% |
| Pro | $20 | 30 hrs | ~$0.75 | 96% |

Rationale: users who meet once/month hate subscriptions. Pay-per-hour is a gap vs Otter ($17/mo), Fireflies ($10/mo), Cluely (~$40/mo).

### Architecture for SaaS
```
Current:  Electron → Groq API (user's key, stored in localStorage)

Target:   Electron → Your backend API → Groq paid (your key, server-side)
                         ↓
                    Supabase (users, credit balances, usage logs)
                         ↓
                    Stripe (one-time credit purchases)
```

### Tech stack decided
- **Backend**: Node.js + Express, hosted on Railway or Render (~$7/mo)
- **Database + Auth**: Supabase (PostgreSQL, built-in auth, JWT)
- **Billing**: Stripe (credit packs, one-time purchases)
- **AI**: Groq paid tier (keep existing models, fastest for real-time)
- **App changes needed**:
  - Remove API key input from settings
  - Add login screen (email + password via Supabase auth)
  - Replace direct Groq calls with calls to your backend
  - Store JWT in `electron-store` (encrypted)
  - Add `electron-updater` for auto-updates
  - Code-sign the installer for distribution

### Next steps (not yet implemented)
1. Backend server (Express + Supabase client)
   - `POST /auth/login` — returns JWT
   - `POST /ai/ask` — validates token, checks credits, proxies to Groq, deducts usage
   - `POST /ai/vision` — same for screenshot analysis
   - `GET /user/credits` — returns balance
   - Stripe webhook handler — adds credits on payment
2. Supabase schema: `users`, `credit_ledger`, `usage_logs`
3. Stripe product setup: 3 credit pack products
4. Electron app login flow
5. Signed installer + auto-updater setup

---

## Current file sizes / complexity
- `src/main.js`: ~110 lines
- `src/renderer.html`: ~600 lines (HTML + CSS + JS combined)
- No TypeScript, no bundler, no React — plain JS for simplicity
