# Dispatch — Plan de Mejoras

## Principios
- Dispatch se adapta al formato canonical de Field Ops
- server.js es el único punto de contacto con SQLite
- UI changes in dispatch.html only — no bundler, no modules

---

## Fase D1 — New Job UX ✅

**Current behavior:** Jobs created in New Job section go to
Export PWA. User must scroll to find and select them manually.

**Target behavior:**
- After creating a job, it appears immediately below the
  form/PDF drop area with an active checkbox
- A button "Export selected as JSON" generates the PWA JSON
  for checked jobs only
- Export PWA section remains for bulk/scheduled exports

---

## Fase D2A — HOME Cleanup

**Status:** Pending

**Current:** HOME shows income KPI cards (Revenue · 7 days,
Top Tech · Week) and a Total $ column in Recent Activity table.

**Target:**
- Remove "Revenue · 7 days" KPI card (`hk-revenue`)
- Remove "Top Tech · Week" KPI card (`hk-tech`)
- Remove Total $ column from Recent Activity table
- HOME shows operations only: jobs today, server status,
  recent activity (without revenue column)

---

## Fase D2B — INCOME Panel

**Status:** Future — dedicated session

**Target:**
- New dedicated INCOME panel
- Chart with daily granularity, default last 30 days
- Period filters: day, week, month, year, YTD, all
- Up to 5 comparative lines (previous period overlay) —
  TradingView-style
- Consolidates Payments + Custom Reports income
- Filters: date range, technician, subdivision, builder

---

## Fase D3 — Section Renames ✅

- COMPLETION → IMPORT PWA
- No other renames at this time

---

## Fase D4 — RESTOCK Module

**Purpose:** Generate restocking lists for accessories and
refrigerant to submit to the company for replenishment.

**Two independent flows — Accessories and Refrigerant:**

Each flow:
1. Filter completions by date range
2. List: completion date, address, items used (with quantity)
3. Each record selectable via checkbox
4. Selected records generate a printable list in real time
5. "RESTOCKED" button per record + "RESTOCK ALL" button
6. On restock: items added to inventory, restock event recorded
   with date, items, quantities

**Key rules:**
- Accessories and refrigerant are restocked independently
- Partial restock allowed — not all used items need restocking
  at once
- Each restock event is stored with date for audit trail

**SQLite changes needed:**
- restock_items table already exists (job_item_id, restocked_at)
- May need quantity field on restock_items

---

## Fase D5 — Partial Jobs ✅

**Purpose:** Track jobs that were completed partially and
require a follow-up visit.

**Model:** Single boolean flag — is_partial (0/1).
- 0 = normal job (default)
- 1 = partial, pending continuation

**SQLite change needed:**
ALTER TABLE jobs ADD COLUMN is_partial INTEGER DEFAULT 0;

**Set partial from three places:**
1. Import JSON — auto-suggest partial if only service is Prestart
2. History — manual toggle per job via edit
3. Properties — manual toggle per job by address

**View:** Filter in History — "Show partial only"
shows the technician's pending job list.

---

## Fase D6 — Additional Features

### Technician Performance
- Completions per technician
- Daily average per tech
- Most frequent services

### Job Aging
- Jobs created more than N days without completion
- Alert/badge on aging jobs

### Equipment Frequency
- Most common indoor/outdoor models
- Useful for anticipating parts and accessories

---

## Payments Section

**Status:** Purpose unclear — needs audit before deciding
to keep, merge into INCOME, or remove.
Action: CC to audit what /reports/payments endpoint returns
before planning changes.

---

## SQLite Migrations Required

| Table | Column | Type | Default |
|---|---|---|---|
| jobs | is_partial | INTEGER | 0 |
| restock_items | quantity | REAL | 1 |

---

## Implementation Order

1. D3 — Rename ✅
2. D5 — Partial jobs ✅
3. D1 — New Job UX ✅
4. D2A — HOME cleanup (pending)
5. D4 — RESTOCK module (complex)
6. D2B — INCOME panel (future)
7. D6 — Additional features (future)

---

## Purge List

### Scheduled for removal (post-audit session)

**Restock Queue UI** — to be removed when Custom Reports
restock feature is implemented:
- HTML: Restock Queue card in panel-reports
  (#restock-list, #restock-print-btn, #restock-hist-wrap,
  #restock-hist-empty, restock History <details>)
- JS functions: loadRestockPending(), printAndMarkRestock(),
  loadRestockHistory(), restockSyncMaster(), restockSyncGroup(),
  restockToggleAll(), restockToggleGroup()
- Note: server.js endpoints /api/restock/pending,
  /api/restock/mark, /api/restock/history are KEPT —
  they will be called from Custom Reports restock feature.

**General JS audit** — after all Dispatch features complete:
- Identify and remove dead functions
- Reduce duplication
- Align with Field Ops canonical naming where applicable
