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
    ├── utils.js            # Pure calculation functions, no DOM dependency (~80 lines)
    ├── lv.js               # LV diagram viewer — job header, static sections, viewer singleton (~200 lines)
    ├── equipmentData.js    # HVAC equipment catalog: fault codes, heaters, outdoor units, thermostats, accessories, zoning boards (~400 lines)
    ├── troubleshootingEngine.js  # Rule-based diagnosis engine — pure logic, no UI, no network (~800 lines)
    └── tsPanel.js          # Troubleshooting drawer UI — job selection, step rendering, AI handoff (~500 lines)
```

**Total: 17 files.** Clean, one responsibility per file.

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
- Import Jobs: validates JSON array, deduplicates by normalized address, adds new jobs only
- Export Jobs: serializes current jobs array to JSON file

### `workspace.js`
- Load active job
- Step navigation: Service → Thermostat → Accessories → Fixes → Weight-In → Notes
- Register all items with prices
- Auto-calculate running total
- Attach photos with GPS metadata
- Save completed workspace back to job record
- Single photo store — weigh-in photos and site condition photos. Exposes getPhotoCount() and getAllPhotos() for download button state and ZIP export.

### `reports.js`
- Generate individual completion text per job (exact company format)
- Generate daily summary (all completions concatenated)
- Send daily report via email (mailto)
- Filter/view completions by subdivision
- Export completions as JSON for Dispatch
- Export Completions CSV: all completion fields including weigh-in data, 30+ columns
- Export Completions JSON: completions array for Dispatch import

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

### `lv.js`
- Renders LV tab: dynamic job header, static 4-section diagram browser, brand link footer
- Header chips: Indoor / Outdoor / Blower Data / S Manual — shown only when resource exists for active job
- Viewer singleton: zoom +/−, 1:1 reset, pinch-to-zoom, pan when zoomed
- Footer links: Lennox, Trane, Goodman, Daikin — sourced from SERIES_LINKS / OUTDOOR_LINKS in data.js
- No DOMContentLoaded — called by app.js via renderLV(container)

### `equipmentData.js`
- HVAC equipment catalog: fault codes keyed by board type, heater/air handler models, outdoor unit models, thermostats, accessories, zoning boards
- Single source of truth for all equipment-specific data used by the troubleshooting engine
- No UI, no DOM, no network — pure static data

### Troubleshooting — two-layer architecture

#### `troubleshootingEngine.js` (Layer 1 — Logic)
- Rule-based HVAC field diagnosis; no UI, no network calls
- Exports: `SYMPTOM`, `SYMPTOM_LABELS`, `buildContext(state)`, `diagnose({ symptom, detail, context })`
- `buildContext()` converts a job state object into an equipment context (`isA2L`, `hasZoning`, `hasFloatSwitch`, etc.)
- `diagnose()` routes to one of 9 private handlers; each returns `{ title, severity, summary, steps[], equipmentNotes[], faultCodeInfo }`
- Steps may include `branches` (Yes/No decision trees with nested sub-steps)
- Depends on: `equipmentData.js` only

#### `tsPanel.js` (Layer 2 — UI)
- Controls the troubleshooting drawer: job selection, symptom picker, step rendering, AI handoff
- Uses engine results to populate the DOM; never calls APIs directly
- Depends on: `troubleshootingEngine.js`, `settings.js` (`getApiKey`), `jobs.js` (`getAllJobs`), `storage.js`, `app.js` (toast, AI FAB handoff)

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
    "indoor":  "GR9S800805C",
    "outdoor": "GLXS4BA4210",
    "links":   {}
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
  "indoor":  "GR9S800805C",
  "outdoor": "GLXS4BA4210",
  "indoor2": null,
  "outdoor2": null,
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

---

## 9. Dispatch Integration

### Terminology — Official and Final

All code, JSON contracts, and documentation must use
these terms consistently:

| Concept | Term | Notes |
|---|---|---|
| Indoor unit model | `indoor` | Replaces: furnace, heaterModel, indoorModel |
| Outdoor unit model | `outdoor` | Consistent across all layers |
| Pre-job notes | `notes` | Replaces: details, dispatchNotes |
| Field notes | `notes` | Same key, different object context |

### Current Architecture (Phase 3E)
Manual JSON file exchange between Dispatch and PWA.

### JSON Contract — Dispatch → PWA (Incoming Jobs)

File: `route_YYYY-MM-DD.json` — array of Job objects.

**Required fields** (validated by `importer.js`):

```json
{
  "id": "uuid",
  "date": "2026-05-21",
  "address": "32122 WATERLILY VIEW COURT",
  "subdivision": "DELLROSE",
  "builder": "LENNAR",
  "system1": {
    "indoor": "GR9S800805C",
    "outdoor": "GLXS4BA4210"
  }
}
```

**Optional fields:**

| Field | Type | Notes |
|---|---|---|
| `contact` | string | Name + phone |
| `serviceTime` | string | e.g. `"8:00 AM"` |
| `timeSensitive` | boolean | Overrides keyword detection |
| `isTwoSystems` | boolean | |
| `details` | string | Pre-job notes (**legacy** — canonical: `notes`) |
| `system2` | object | Same shape as `system1`, or `null` |
| `jobAccessories` | array | Pre-assigned accessories |
| `jobThermostat` | object | Pre-assigned thermostat |

> `id` is preserved as-is from Dispatch. Duplicate `id`s are skipped silently (no overwrite).

### JSON Contract — PWA → Dispatch (Completions Export)

File: `dashboard_import_YYYY-MM-DD.json` — array of Completion objects.

```json
{
  "jobId": "uuid",
  "address": "32122 WATERLILY VIEW COURT",
  "subdivision": "DELLROSE",
  "builder": "LENNAR",
  "timestamp": "2026-05-21T14:30:00.000Z",
  "isTwoSystems": false,
  "isTemporary": false,
  "refrigerant": "R-410A",
  "indoorModel": "GR9S800805C",
  "outdoorModel": "GLXS4BA4210",
  "indoorModel2": null,
  "outdoorModel2": null,
  "services": [],
  "selectedThermostat": { "name": "Ecobee" },
  "thermostatQuantity": 1,
  "accessories": [],
  "fixes": [],
  "weightInData": null,
  "weightInData2": null,
  "notes": "Lennar 4030 plan, 1 stage",
  "sitePhotoMeta": [],
  "totals": { "service": 30, "accessory": 10, "fix": 0, "total": 40 },
  "reportText": "32122 WATERLILY VIEW COURT, AC & Heat..."
}
```

> `indoorModel` / `outdoorModel` are completion-layer aliases for `system1.furnace` /
> `system1.outdoor` from the Job object. The rename happens at `buildCompletion()`
> in `workspace.js:355-358`.

> `savedState` is excluded from export — internal PWA state only.

### Field Mapping — Legacy → Canonical

| Legacy field | Canonical | File | Action required |
|---|---|---|---|
| `job.system1.furnace` | `job.system1.indoor` | `jobs.js`, `importer.js` | Rename storage key |
| `completion.indoorModel` | `completion.indoor` | `workspace.js`, `reports.js` | Rename at `buildCompletion` |
| `job.details` | `job.notes` | `jobs.js` | Rename storage key |
| `completion.outdoorModel` | `completion.outdoor` | `workspace.js`, `reports.js` | Rename at `buildCompletion` |
| `job.system1.outdoor` | unchanged | all files | Already canonical |
| `dispatchNotes` | `notes` | N/A | Never existed in code; term retired |

### Validation Rules

Applied by `importer.js` to every incoming job object:

| Rule | Detail |
|---|---|
| Required fields present | `id`, `date`, `address`, `subdivision`, `builder`, `system1` |
| No empty required strings | `null` and `""` both fail |
| `system1` is a plain object | Arrays are rejected |
| No duplicate `id` | Existing jobs skipped, not overwritten |
| Invalid JSON string | Returns `{ imported: 0, errors: [{ index: -1, reason: "invalid JSON: …" }] }` |

Return shape: `{ imported: N, skipped: N, errors: [{ index, id, reason }] }`

### Known Inconsistencies

Live issues in the codebase as of Phase 3E:

1. **`details` / `notes` split** — Pre-job notes exist under two separate keys that
   are never synced. `job.details` is set by the new-job form (`app.js:2212`,
   `jobs.js:26`). `completion.notes` is set by the workspace textarea
   (`workspace.js:366`). A tech's dispatch note in `job.details` is invisible to
   the completion record.

2. **`furnace` / `indoorModel` split** — Indoor model is stored as `system1.furnace`
   (plain string) on Job objects (`jobs.js:30`) but surfaced as `indoorModel` in
   Completion objects (`workspace.js:356`). No migration path exists between the
   two keys.

3. **`importer.js` is unwired** — `importFromJSON` and `importFromPDF` are exported
   but never imported in `app.js`. There is no active import trigger in the UI.
   The module is a no-op at runtime.

4. **New-job form field name mismatch** — `<textarea name="notes">` (`app.js:1222`)
   is read as `fd.get("notes")` and saved as `details: fd.get("notes") || ""`
   (`app.js:2212`). The HTML `name` attribute and the storage key are different.

5. **Data model doc vs. actual code** — `architecture.md §4` shows `system1.furnace`
   as an object `{ "series": "", "model": "GR9S800805C" }`, but `jobs.js:30` stores
   it as a plain string `"GR9S800805C"`. The doc is wrong; the code is authoritative.

### Future Architecture (Phase 5)

Replace manual JSON file exchange with a direct sync channel.

| Component | Phase 3E (current) | Phase 5 (target) |
|---|---|---|
| Job delivery | Manual JSON file, user imports | Dispatch pushes via local API or shared sync |
| Completion delivery | Manual JSON export, user sends | PWA pushes on finalize |
| Field naming | Mixed (`furnace`, `details`, `indoorModel`) | Unified canonical (`indoor`, `outdoor`, `notes`) |
| Duplicate handling | Skip by `id` | Upsert by `id` — Dispatch can update jobs mid-day |
| Import UI | Not wired (`importer.js` unused) | Dedicated Import button + result toast |

### server.js Adaptation Plan

#### Field mapping — PWA canonical → SQLite columns

| PWA field | SQLite column | Action needed |
|---|---|---|
| job.indoor | indoor_model | rename in server.js reader |
| job.outdoor | outdoor_model | rename in server.js reader |
| job.indoor2 | indoor_model_2 | rename in server.js reader |
| job.outdoor2 | outdoor_model_2 | rename in server.js reader |
| job.techName | technician | already handled |
| job.notes | notes | move from savedState level |
| job.totals.total | total_price | use totals object |
| job.weightInData | weight_in_json | move from savedState level |
| job.weightInData2 | weight_in_2_json | move from savedState level |
| job.jobId | job_id | NEW COLUMN — add migration |
| job.timestamp | timestamp | NEW COLUMN — add migration |
| accessories[].techSupplied | tech_supplied | NEW COLUMN in job_items — add migration |

#### SQLite migrations required (server.js)

Three new columns must be added via ALTER TABLE:

1. `jobs` table:
   ```sql
   ALTER TABLE jobs ADD COLUMN job_id TEXT;
   ALTER TABLE jobs ADD COLUMN timestamp TEXT;
   ```

2. `job_items` table:
   ```sql
   ALTER TABLE job_items ADD COLUMN tech_supplied INTEGER DEFAULT 0;
   ```

Migrations run at server startup if columns don't exist.

#### Adaptation principles

- `server.js` adapts to Field Ops canonical format — not the reverse
- Fallbacks for legacy format: if `job.indoor` is missing, fall back to `job.heaterModel` for backward compatibility
- `savedState` is no longer required — all data lives at top level
- `techSupplied` drives inventory deduction: only accessories with `techSupplied=true` are deducted from inventory
