# HVAC Field Tool — Architecture Document
**Version:** 1.0  
**Date:** April 2026  
**Status:** Pending Approval  
**Prerequisite:** Requirements v1.0 ✅

---

## 1. System Context

This document covers the **PWA only** (field tool). Dispatch is a separate app.

```
┌─────────────────────────────────────────────────────┐
│                    FIELD (PWA)                      │
│                                                     │
│  [PDF Import] → [Job List] → [Workspace] → [Report] │
│                     ↕                               │
│              [Local Storage]                        │
│                     ↕                               │
│            [JSON Export/Import]                     │
└─────────────────────────────────────────────────────┘
                        ↕ JSON
┌─────────────────────────────────────────────────────┐
│                 DISPATCH (local)                    │
└─────────────────────────────────────────────────────┘
```

---

## 2. File Structure

```
/
├── index.html              # App shell — structure only (~120 lines)
├── manifest.json           # PWA config
├── sw.js                   # Service worker — offline + diagram cache
│
├── styles/
│   └── app.css             # All styles, CSS variables, themes (~400 lines)
│
└── src/
    ├── app.js              # Init, routing, tab navigation (~150 lines)
    ├── data.js             # All static data: equipment, accessories, prices (~350 lines)
    ├── storage.js          # Read/write localStorage — single source of truth (~100 lines)
    ├── jobs.js             # Job CRUD, grouping by subdivision (~200 lines)
    ├── workspace.js        # Startup workflow, step navigation (~300 lines)
    ├── reports.js          # Completion report generation, daily summary, email (~250 lines)
    ├── importer.js         # PDF parsing (OCR+AI) and JSON import (~200 lines)
    ├── settings.js         # First-launch onboarding, price config, AI keys (~150 lines)
    ├── ai.js               # AI chat interface, provider switching (~200 lines)
    ├── diagrams.js         # Equipment diagram lookup, cache management (~150 lines)
    └── utils.js            # Pure calculation functions, no DOM dependency (~80 lines)
```

**Total: 13 files.** Clean, one responsibility per file.

---

## 3. Module Responsibilities

### `index.html`
- App shell only: header, tab nav, empty containers
- No inline styles
- No hardcoded data
- No logic

### `manifest.json` + `sw.js`
- PWA installability
- Offline support
- Pre-caching of diagrams when jobs are imported

### `app.css`
- All visual styles
- CSS variables for theming (light/dark)
- Subdivision color assignments

### `app.js`
- Entry point
- Initializes all modules
- Handles tab switching
- Listens for global events

### `data.js`
- Equipment catalog (Trane, Lennox, Goodman, Daikin — models, series)
- Fault code tables per brand
- Accessory definitions
- Default prices (overridable by user settings)
- Builder list
- Thermostat list
- Diagram URL map per equipment model

### `storage.js`
- All localStorage reads and writes go through here
- No other module touches localStorage directly
- Functions: `getJobs()`, `saveJob()`, `deleteJob()`, `getSettings()`, `saveSettings()`
- Handles backup export and import (full JSON)

### `jobs.js`
- Add / edit / delete jobs
- Group jobs by subdivision
- Assign subdivision color
- Flag jobs as time-sensitive (URGENCY / MUST / VISIT AM / VISIT PM)
- Flag jobs as Pending / Dar Seguimiento
- Render job list UI

### `workspace.js`
- Load active job
- Step navigation: Service → Thermostat → Accessories → Fixes → Weight-In → Notes
- Register all items with prices
- Auto-calculate running total
- Attach photos with GPS metadata
- Save completed workspace back to job record

### `reports.js`
- Generate individual completion text per job (exact company format)
- Generate daily summary (all completions concatenated)
- Send daily report via email (mailto)
- Filter/view completions by subdivision
- Export completions as JSON for Dispatch

### `importer.js`
- **PDF import:** OCR extracts raw text → AI structures fields → user reviews → confirmed jobs saved
- **JSON import:** receive jobs from Dispatch, validate, save
- Mid-day import: adds to existing jobs without overwriting current session
- Extracts: address, subdivision, builder, equipment models, scheduled time, special notes, time-sensitive flags

### `settings.js`
- First-launch detection
- Onboarding screen: user sets prices for each service type and accessory
- Price storage and retrieval
- AI provider selection and API key management
- Theme toggle (light/dark)

### `ai.js`
- In-app chat UI
- Provider switching: Claude (preferred) → ChatGPT → Gemini → Copilot → Perplexity
- Uses configured API key if available, falls back to free tier
- System prompt: HVAC-only scope, no personal data, no off-topic responses
- Context injection: active job equipment and accessories passed to AI for relevant answers

### `diagrams.js`
- Look up diagram URLs for equipment models registered in a job
- Trigger pre-download when jobs are imported (via service worker cache)
- Manual download trigger per diagram
- Offline diagram viewer

### `utils.js`
- Pure calculation functions with no DOM or state dependency
- `ouncesToPoundsAndOunces(oz)` — converts total ounces to lb + oz display string
- `getSubcoolingDefault(brand)` — returns expected subcooling range by brand
- `calculateApproxAdjust(linesetReal, factoryLength, brand)` — returns refrigerant
  adjustment excess in oz based on lineset delta and brand multiplier (0.47 Trane, 0.6 all others)
- No imports from other modules — can be imported by any module safely

---

## 4. Data Model

### Job
```json
{
  "id": "uuid",
  "date": "2026-01-08",
  "address": "32122 WATERLILY VIEW COURT",
  "subdivision": "DELLROSE",
  "builder": "LENNAR",
  "contact": "BRENT ANDERSON 281 831 3102",
  "serviceTime": "8:00 AM",
  "timeSensitive": false,
  "status": "pending | completed | follow-up",
  "system1": {
    "furnace": { "series": "", "model": "GR9S800805C" },
    "coil":    { "series": "", "model": "CHPTA4830C3" },
    "outdoor": { "series": "", "model": "GLXS4BA4210" }
  },
  "system2": null,
  "notes": "Lennar 4030 plan, 1 stage, no secondary r/a...",
  "completion": null
}
```

### Completion
```json
{
  "jobId": "uuid",
  "serviceType": "AC & Heat",
  "twoSystems": false,
  "thermostat": { "model": "Ecobee", "qty": 2, "price": 60 },
  "accessories": [
    { "name": "fin180p", "price": 10 },
    { "name": "dehum wired", "price": 10 }
  ],
  "fixes": [],
  "weightIn": null,
  "photos": [],
  "notes": "",
  "total": 105,
  "reportText": "32122 WATERLILY VIEW COURT, AC & Heat started 2 Ecobee tstats $60, fin180p $10, dehum wired $10, total $105",
  "status": "completed | pending | follow-up",
  "pendingReason": ""
}
```

### Settings
```json
{
  "techName": "",
  "prices": {
    "AC": 30,
    "Heat": 30,
    "Prestart": 20,
    "Finish": 20,
    "DriveRun": 10,
    "UT3000": 30,
    "HZ322": 30,
    "DAPC": 10,
    "Bypass": 5,
    "Harmony": 40,
    "FIN180P": 10,
    "Dehum": 10,
    "FloatSwitch": 5,
    "WeightIn": 10,
    "PressureTest": 10
  },
  "aiProvider": "claude",
  "aiKey": "",
  "theme": "light",
  "firstLaunch": true
}
```

---

## 5. Key Flows

### Flow A — Morning Setup
```
Receive PDF → Open app → Import PDF → 
AI parses jobs → Review/confirm → 
Jobs saved grouped by subdivision → 
Diagrams pre-downloaded in background
```

### Flow B — Service Execution
```
Select job from list → 
Workspace opens → 
Register service + thermostat + accessories + fixes → 
Add notes / photos → 
Auto-calculate total → 
Save completion → 
Job marked as Completed or Pending
```

### Flow C — End of Day
```
All jobs completed → 
Open Reports tab → 
Review completions by subdivision → 
Generate daily summary → 
Send via email → 
Export JSON → send to Dispatch
```

### Flow D — Mid-Day Addition
```
Receive additional PDF or JSON → 
Import → AI parses → 
New jobs added to existing list → 
No disruption to current session
```

---

## 6. Storage Strategy

| Data | Location | Notes |
|---|---|---|
| Jobs | localStorage | Keyed by date |
| Completions | localStorage | Linked to job by ID |
| Settings / Prices | localStorage | Persists across sessions |
| Diagrams | Service Worker Cache | Pre-downloaded on job import |
| Photos | localStorage (base64) | Size limit TBD — compress on capture |
| Backup | JSON file (manual export) | User saves to device |

---

## 7. PWA Requirements

| Feature | Implementation |
|---|---|
| Installable | `manifest.json` with icons, name, start_url |
| Offline core | Service worker caches all app files on first load |
| Offline diagrams | Service worker pre-caches diagram URLs on job import |
| No server needed | All data in localStorage, all logic client-side |

---

## 8. Comparison Target (Existing Repo)

| Ideal | Current | Delta |
|---|---|---|
| 12 files | 32+ files | ~20 files to eliminate/merge |
| 1 jobs module | jobs.js + jobmanager.js | Merge into 1 |
| 1 reports module | reports.js + reportmanager.js | Merge into 1 |
| 1 UI layer | ui.js + formmanager.js + script.js | Merge into app.js + workspace.js |
| Prices in settings | Hardcoded in HTML data-price="" | Extract to data.js + settings.js |
| No dev files in repo | reset_db.js, verify_db.js, .db files | Remove |

---

*Document prepared by: PM/Software Engineer*  
*Approved by: _________________ Date: _________*
