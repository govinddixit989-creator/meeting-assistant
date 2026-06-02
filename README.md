# Meeting Assistant — AI Overlay for Windows

A always-on-top, screen-share invisible AI assistant for meetings.
Uses Groq API (free) for ultra-fast AI responses.

## Features
- 🎙 Real-time mic transcription (Web Speech API)
- 🤖 AI suggestions: what to say, summarize, answer questions
- 👁 Invisible to screen share (setContentProtection)
- ⌨ Global hotkeys work even when window is hidden
- 💾 API key saved locally

## Setup

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```
npm install
```

### 3. Run
```
npm start
```

## Hotkeys
| Shortcut | Action |
|----------|--------|
| Ctrl+Space | Show / Hide overlay |
| Ctrl+Shift+R | Reset position (top-right) |
| Ctrl+Shift+Q | Quit |

## Usage
1. Paste your Groq API key (get free at https://console.groq.com)
2. Add your role/context (e.g. "Backend engineer, sprint review")
3. Click **Start Listening** — it transcribes your mic
4. Pick a mode: Suggest reply / Summarize / Answer me
5. AI auto-triggers every 3s of new speech, or press Ask manually
6. Press **Ctrl+Space** to instantly hide when needed

## Screen Share Invisibility
- Uses `setContentProtection(true)` — the window is excluded from screen capture on Windows
- The overlay will NOT appear in Zoom, Teams, Meet recordings or shares
- Works on Windows 10/11

## Get Groq API Key (Free)
1. Go to https://console.groq.com
2. Sign up (free)
3. Create API key
4. Paste into the app

## Build Portable .exe (optional)
```
npm install electron-builder --save-dev
npx electron-builder --win portable
```
Output will be in `dist/` folder.
