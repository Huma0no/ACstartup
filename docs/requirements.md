# HVAC Field Tool — Requirements Document
**Version:** 1.0  
**Date:** April 2026  
**Status:** Pending Approval

---

## 1. Problem Statement

A field HVAC technician needs a mobile tool to register, document, and report residential new construction service calls — generating individual completion reports per address and a daily summary report for the company.

---

## 2. Users

| User | Description |
|---|---|
| Field Technician | Primary user. Works from phone in the field. Comfortable with apps (TikTok-level). Not a developer. Needs fast, simple interactions. |
| Future: Other Contractors | Same profile. Will use their own instance of the tool. |

---

## 3. System Overview

The complete system consists of two apps that communicate via JSON:

```
[Company PDF] → [PWA - Field] ⇄ JSON ⇄ [Dispatch - Local]
                      ↓                          ↓
              Daily Email Report           Local Database
```

- **PWA** — used in the field on mobile. Registers services, generates reports, exports to Dispatch.
- **Dispatch** — local desktop tool. Receives jobs from company, sends to PWA, receives completions back, stores in local DB.

This document covers the **PWA only.**

---

## 4. Functional Requirements

### 4.1 Job Management
- [ ] Add jobs manually (address, equipment, accessories, service type)
- [ ] Edit existing jobs
- [ ] Delete jobs
- [ ] Import jobs from JSON (sent by Dispatch)
- [ ] Import jobs from PDF (company sends image-based PDF — best effort parsing, manual correction allowed)
- [ ] Jobs received mid-day must be addable without disrupting current session

### 4.2 Workspace / Service Execution
- [ ] Select active job from job list
- [ ] Register service type: AC, Heat, Prestart, Finish, Drive Run, Cancel
- [ ] Register thermostat type and quantity
- [ ] Register accessories with individual prices (UT3000, HZ322, DAPC, Bypass, Harmony, FIN180P, Dehum, Float Switch, LP Kits, RDS, Trane Harness, Ecoil Wire, etc.)
- [ ] Register fixes performed (Pressure Test, Leaks, Open Ecoil, Wires Jammed, Stuck Blower, Cut Sheetrock, PVC Work, etc.)
- [ ] Register weight-in data (A2L refrigerant workflow)
- [ ] Add notes per job (issues found, pending items, special conditions)
- [ ] Attach photos with GPS metadata to individual job records
- [ ] Auto-calculate total per job based on registered items
- [ ] Export all job photos as a single ZIP — weigh-in photos and site condition photos. One action, one file.

### 4.3 Pricing Configuration
- [ ] On first launch, user configures their own prices for each service type and accessory
- [ ] Prices are stored locally and applied automatically to all jobs
- [ ] User can edit prices at any time from Settings

### 4.4 Reporting
- [ ] Generate individual completion report per address (text format matching company standard)
- [ ] Generate daily summary report (all completions concatenated, plain text)
- [ ] Send daily report via email directly from app
- [ ] Filter reports by subdivision only (keep it simple)
- [ ] Jobs grouped and displayed by subdivision, with a distinct background color per subdivision for quick visual identification
- [ ] Mark individual completion reports as **Pending / Dar Seguimiento** when job cannot be fully completed (no electric meter, no gas meter, no P-drain, missing equipment, requires authorization for sheetrock cut, etc.)
- [ ] Pending status visible in job list and included in daily report
- [ ] Pending jobs flagged in JSON export so Dispatch can filter and follow up
- [ ] Scheduled time from PDF (8:00 AM, 8:30 AM, etc.) is imported but treated as reference only — exception: if PDF notes contain URGENCY / MUST / VISIT AM / VISIT PM, flag that job as time-sensitive
- [ ] Export completions as JSON for import into Dispatch

### 4.5 Equipment Information
- [ ] Access brand-specific equipment data for units registered in the job (Trane, Lennox, Goodman, Daikin)
- [ ] Access fault code tables per brand
- [ ] Access wiring diagrams and field diagrams (LV)
- [ ] Access any other available diagrams beyond job-specific ones

### 4.6 Troubleshooting
- [ ] Access guided troubleshooting tools relevant to the active job
- [ ] Context-aware: suggestions based on registered equipment

### 4.7 AI Assistant
- [ ] In-app chat interface with AI
- [ ] Scoped strictly to HVAC topics — no off-topic responses
- [ ] No explicit content
- [ ] No personal data collected or sent

### 4.8 Route Generation
- [ ] Generate optimized work route from job addresses
- [ ] Open route in native Maps app (Google Maps / Apple Maps)

### 4.9 Data & Storage
- [ ] All data stored locally on device (no server required for PWA)
- [ ] Export/import full data backup (JSON file user saves manually)
- [ ] No personal data collected

---

## 5. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Platform | Mobile-first PWA. Works in browser, no install required. |
| Offline | Core functionality must work without internet connection. |
| Performance | Fast on mid-range phones. No heavy frameworks. |
| Simplicity | Open and use. No setup beyond first-launch pricing config. |
| Privacy | No personal data collected. No analytics. No ads. |
| Notifications | None. |

---

## 6. Out of Scope (PWA)

- User accounts / authentication (future multi-tenant version)
- Server-side storage
- Push notifications
- Content unrelated to HVAC
- Dispatch database management (covered by Dispatch app)

---

## 7. Open Items

| # | Item | Notes |
|---|---|---|
| 1 | PDF import strategy | PDF has consistent, predictable structure per job. Strategy: OCR extracts raw text → AI parses and maps fields to data model (address, subdivision, builder, equipment models, accessories, special notes). User reviews pre-filled jobs before confirming import. Timing: received mornings, sometimes prior afternoon in summer. |
| 2 | AI provider | Default: free-tier AIs (ChatGPT, Copilot, Gemini, Perplexity). Preferred: Claude (Anthropic). User can load their own API key for any supported provider. App detects which key is available and uses it accordingly. |
| 3 | Photo storage | GPS-tagged photos stored locally — size limits TBD. |
| 4 | Diagram sources | Diagrams live on the web. When jobs are imported or added, the app pre-downloads relevant diagrams and caches them locally (service worker cache). This ensures availability in low-signal field conditions. User can also manually trigger a download for any diagram. |

---

## 8. Completion Report Format (Reference)

Standard format used by company. App must generate output matching this exactly:

```
[ADDRESS], [NOTES IF ANY], [SERVICE TYPE] [EQUIPMENT DETAILS] $[SERVICE PRICE], 
[ACCESSORY 1] $[PRICE], [ACCESSORY 2] $[PRICE], total $[TOTAL]
```

**Example:**
```
31531 BLUEBELL, AC & Heat started (2 Systems) 2 Ecobee tstats $60, 
fin180p $10, dehum wired $10, weigh-in data (2 Systems) $20, 
extended wire $5, total $105
```

---

*Document prepared by: PM/Software Engineer*  
*Approved by: _________________ Date: _________*
