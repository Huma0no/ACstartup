# UI Behavior Specification — HVAC Field Ops
**Source:** app.js, workspace.js, data.js, reports.js · v1.0 · May 2026

---

## 1. Job List

### 1.1 What it does
Displays all jobs for the day as cards. Each card shows the address, equipment summary, builder/subdivision chips, and a Start/Continue button. Jobs are grouped by subdivision (each group gets a cycling color index 0–7 applied to the left border).

### 1.2 Create job

Triggered by clicking "+ Job" in the app header. The add-job-section form also auto-appears when the job list is empty.

**Form fields:**
| Field | Notes |
|---|---|
| Address | Required. Forced uppercase on submit. |
| Subdivision | Optional. Forced uppercase. |
| Builder | Optional. Free text with datalist suggestions (Lennar, MHI, Highland, CastleRock, First America, Chesmar). |
| Notes | Optional. Stored as `details` on the job. |
| Indoor unit | Grouped `<select>` by series from INDOOR_CATALOG. |
| Outdoor unit | Grouped `<select>` by series from OUTDOOR_CATALOG. |
| Tstat | Select from THERMOSTATS + "Other" option. Selecting "Other" reveals a plain text input. |
| Tstat qty | 1–5 select. |
| + Acc | Picker adds named accessories as chips; duplicates ignored; no CUSTOM_PRICE_ACCESSORIES. |

**Second system:**  
"+ Add second system" button only appears after both Indoor and Outdoor of System 1 are selected. Clicking it reveals System 2 Indoor/Outdoor selects and marks the job `isTwoSystems: true`. Clicking "− Remove second system" hides the fields and clears System 2 models.

**Series documentation links:**  
Selecting an Indoor or Outdoor model reveals inline links for that model's series (service manual, brand library) directly beneath the select.

**Submit:**  
`createJob()` called with uppercased address, system models, tstat, and accessory chips. Job persisted to localStorage. Form collapses. `renderJobs()` called. Toast: "Job added: {address}".

**Cancel:**  
"Cancel" button collapses form and resets all fields (including chips and links).

### 1.3 View / expand / collapse

- Each card is collapsed by default. Clicking the card body (anywhere that is not a button) **toggles** it expanded.
- Expanding collapses any other currently expanded card (accordion: one open at a time).
- When expanded: equipment cards (Indoor/Outdoor models, ESP, refrigerant, subcooling goal, CFM max/min, LV diagram buttons, Blower Data button) and Edit/Maps action buttons are shown.
- A job with `savedState !== null` renders with `.expanded` class from initial render (starts open) and shows "In Progress" badge and "Continue →" button text.
- An Urgent job (`timeSensitive: true`) shows a red "Urgent" badge.

**Tech chips row** (second row of each card face):  
Shows thermostat model chip (with "N×" prefix if qty ≥ 3), zone board chips and LP Kit chips from `job.jobAccessories`, and a "2 Systems" chip if `isTwoSystems`.

**Pending section:**  
When any job has `savedState` (is in-progress), a compact "Pending" list is injected immediately after the in-progress card. It shows all other jobs with address + subdivision·builder. Urgent pending jobs display a dot indicator. All jobs still render as full cards below.

### 1.4 Start / Continue

- **"Start →"** (no `savedState`): calls `openWorkspace(job)`. Creates a fresh workspace state seeded from `job.jobAccessories` and `job.jobThermostat`. Opens the workspace tab. The Service accordion section opens automatically; all other sections are collapsed.
- **"Continue →"** (`savedState` exists): calls `openWorkspace(job)`. Restores the saved workspace state. Accordion sections remain as saved (no forced collapse/expand).

In both cases:
- `_activeJob` is set.
- Header gets `has-active-job` class showing the address and subdivision/builder chips.
- Weigh-In photo slots are initialized (or restored from IndexedDB).
- AI chat is initialized with the job context.

### 1.5 Delete

The × button (top-right of every card face, always visible) triggers a `confirm()` dialog: "Delete {address}?". On confirm: `removeJob(id)` then `renderJobs()`. No undo.

### 1.6 Edit

Shows toast "Edit not yet implemented". No action taken.

### 1.7 Maps

Opens Google Maps in a new tab with the job address as the query.

### 1.8 Import

Not implemented. No import button or handler exists in the current codebase.

### 1.9 Impact on other sections

- Starting a job populates the workspace and shows it in the header bar.
- Deleting a job also removes its associated `savedState`; if the deleted job was in the header bar, `updateActiveJobBar()` is called.
- Completing a job (generating a report) removes it from the job list and creates a completion in the Reports tab.

### 1.10 Job card color and grouping

- Jobs are grouped by subdivision in the job list.
- Each unique subdivision receives a color index (1–8) assigned in first-seen order.
- The left border of each job card reflects its subdivision color via the `--subdivision-N` CSS variable.
- Jobs within the same subdivision render together.
- Empty subdivision is treated as its own group and receives its own color index.
- Completed jobs render separately after active jobs, without color grouping.

---

## 2. Workspace

The workspace is a five-section accordion. Only one section can be open at a time. Each section header shows a status icon (○ or ✓) and a summary of current selections.

**Accordion open/close:** Clicking a closed section header opens it and closes all others. Clicking an open section header closes it.

**"Done" state (✓ accent icon + accent border):**
- Service: at least one service or thermostat selected
- Accessories: at least one accessory selected (standard or custom)
- Fixes: at least one fix selected (standard or custom)
- Weight-In: at least one field has a value
- Notes: notes textarea is non-empty

**Live price display** (workspace footer): updated on every selection change. Shows calculated total. Cancel → $0.

---

## 3. Service (Step 1) and Thermostat (Step 2)

Service and thermostat controls share the Service accordion section.

### 3.1 Service buttons

Six buttons rendered: AC, Heat, Finish, Prestart, Drive Run, Cancel.

**Toggle rules (from `toggleService`):**

| Service | Rule |
|---|---|
| Cancel | Clicking when inactive → `[Cancel]` (clears all others). Clicking when active → `[]`. |
| Prestart | STANDALONE: replaces all other services. Clicking when active → `[]`. |
| Drive Run | STANDALONE: replaces all other services. Clicking when active → `[]`. |
| AC | Multi-select with Heat/Finish. Selecting AC/Heat/Finish removes any STANDALONE if active. Clicking active deselects. |
| Heat | Same as AC. |
| Finish | Same as AC. Can be active without AC or Heat (valid, service price = $0). |

**AC + Heat combination:**  
AC and Heat can be active simultaneously. Price is $30 (not $60). Report text: "AC & Heat started".

**Finish:**  
Finish is a context flag. It does not have its own price — it modifies the active service price:
- Finish + AC: $20 (not $30). Report: "Finish/ AC started".
- Finish + Heat: $20. Report: "Finish/ Heat started".
- Finish + AC & Heat: $20. Report: "Finish/ AC & Heat started".
- Finish alone (no AC/Heat): $0 service.

### 3.2 2 Systems checkbox

Sets `isTwoSystems` flag. Effects throughout the workspace:
- Service price ×2.
- Qualifying accessories ×2 (see §5 for list).
- Weight-In shows System 2 fields and photo row.
- Report text appends "(2 Systems)".

### 3.3 Temporarily checkbox

Sets `isTemporary` flag. Price is unchanged. Only modifies service report text:
- AC → "AC (Temporarily) started"
- Heat → "Heat (Temporarily) started"

### 3.4 Thermostat buttons

Rendered: T-6, T-10, Ecobee, Daikin One, TH2110, Other.

Only one thermostat can be selected. Clicking an active tstat deselects it (sets to null).

Selecting any tstat shows a **quantity row** (1, 2, 3, 4+). 4+ stores value 4.

**"Other" button behavior:**
- If a custom (non-catalog) tstat is currently active: clicking "Other" deselects the tstat (same behavior as clicking any active button).
- If no custom tstat is set: clicking "Other" reveals an inline input row. User types a model name. Confirming (button click or Enter) sets that string as the thermostat. The "Other" button then shows the custom model name and adopts active styling.

**Section summary** shows: selected service names + thermostat model, joined with "·".

### 3.5 Service rules — price summary

| Condition | Service price |
|---|---|
| Cancel | $0 (total = $0, overrides all) |
| AC only | $30 |
| Heat only | $30 |
| AC + Heat | $30 (combined) |
| Prestart | $20 |
| Drive Run | $10 |
| Finish + (AC or Heat or AC&Heat) | $20 |
| Finish alone | $0 |
| 2 Systems | ×2 on all above |
| Temporarily | no price change |

### 3.6 Report / CSV output

Service section outputs one `ServiceItem`:

| Condition | displayName |
|---|---|
| AC | "AC started" |
| AC + Temporarily | "AC (Temporarily) started" |
| Heat | "Heat started" |
| AC + Heat | "AC & Heat started" |
| Finish/AC | "Finish/ AC started" |
| Finish/AC+Heat | "Finish/ AC & Heat started" |
| Prestart | "System Prestarted" |
| Drive Run | "Drive Run" |
| Cancel | "service canceled" |
| + 2 Systems | appends " (2 Systems)" |
| + Tstat | appends " {qty} {model} tstat(s)" |

In the report text, the service item is formatted as `{displayName} ${price}` (price omitted if 0).

---

## 4. Accessories (Step 3)

### 4.1 What it does

Renders a 3-column grid of accessory chip/buttons. Selections are stored in `selectedAccessories` (standard) or `customAccessories` (custom/Other).

### 4.2 Standard accessories

All standard accessories are toggle buttons. Clicking an active one deselects it.

**Zone board exclusivity** (ZONE_BOARDS: HZ322, Harmony, UT3000):  
Selecting any zone board:
1. Deselects all other zone boards.
2. Removes each deselected board's companion accessories.
3. Adds the newly selected board's companions.

**Companion accessories** (auto-added/removed with their trigger):

| Trigger | Companions |
|---|---|
| HZ322 | Bypass |
| UT3000 | DAPC, eBypass, Ecoil Wire |
| Harmony | (none) |

Companions are added when the trigger is selected and removed when the trigger is deselected.

### 4.3 LP Kit group

A "LP Kit" group toggle button shows/hides a sub-options row with three exclusive sub-buttons: Lennox 1Stg, Lennox 2Stg, Goodman.

Selecting any LP Kit variant deselects the other two LP Kit variants first, then toggles the selected one. The group toggle button shows active styling if any LP Kit variant is selected and displays a count badge.

Sub-options are visible (not hidden) if any LP Kit variant is already selected when the workspace renders.

### 4.4 Other (OTRO)

Clicking the "Other" button reveals an inline row: description text input + price number input + Confirm button.

- Pressing Enter in the description field also confirms.
- On confirm: `{name, price}` pushed to `customAccessories`. Row hidden. Workspace re-rendered.
- Each custom accessory appears as a chip: `{name} ${price} ×`.
- Clicking × removes the entry from `customAccessories`.
- Multiple "Other" accessories allowed per job.

### 4.5 Accessories that double with 2 Systems

Float Switch, RDS, Trane Harness, Ecoil Wire, LP Kit Lennox 1Stg, LP Kit Lennox 2Stg, LP Kit Goodman, Weight-In Data.

### 4.6 Impact on other sections

- Accessories are included in price total (footer display).
- Zone board companions do not have their own buttons; they appear in the accordion summary and report.

### 4.7 Report / CSV output

Each selected accessory outputs one `AccessoryItem`:
- `displayName` from `ACCESSORY_DISPLAY[name].report`
- If `isTwoSystems` and the accessory is in TWO_SYSTEMS_ACCESSORIES, displayName appends " (2 sys)"
- Custom accessories use their entered name (lowercased in `_buildAccessoryItems`)
- Price includes the Finish addon for Weight-In-Data when Finish is active: $10 base + $10 addon = $20

---

## 5. Fixes (Step 4)

### 5.1 What it does

Renders standalone fix buttons plus two grouped toggles with sub-options. Selections stored in `selectedFixes` (standard) or `customFixes` (custom/Other).

### 5.2 Standalone fixes

Rendered as ws-btn buttons in a 6-column grid (each spanning 2 columns):

| Fix | Price |
|---|---|
| Pressure Test | $10 |
| Open Ecoil | $30 |
| Jammed Wires | $5 |
| Stuck Blower | $20 |
| Sheetrock | $15 |
| Other | custom |

`EXTENDED_WIRE` constant is explicitly filtered out and does not render as a standalone button.

### 5.3 Fixed Leaks group

Group toggle button "Fixed Leaks" (spans 3 columns) with a count badge. Clicking shows/hides sub-option chips: Ecoil ($20), Cunit ($20), Inside Wall ($50).

Sub-options are shown (not hidden) if any Leaks fix is already selected. Multiple sub-options can be active simultaneously.

### 5.4 Extended Wire group

Group toggle button "Extended Wire" (spans 3 columns) with a count badge. Sub-options: Furnace ($5), Cunit ($5).

Same visibility rules as Fixed Leaks. Both sub-options can be active simultaneously.

### 5.5 Other (OTRO fix)

Same inline row pattern as Accessories Other. Pushes to `customFixes`. Each entry appears as a chip with ×.

### 5.6 Report / CSV output

Each fix outputs one `FixItem`:
- `displayName` from `FIX_DISPLAY[name].report`
- Custom fixes use their entered name lowercased

No 2-Systems doubling for fixes.

---

## 6. Weight-In (Step 5)

### 6.1 What it does

12 numeric/text fields to record refrigerant charge data for the job. System 2 fields appear when `isTwoSystems` is true.

### 6.2 Fields

| Field | Key | Notes |
|---|---|---|
| Lineset ft | linesetLength | Triggers approxAdjustOz recalc on change |
| Factory Charge oz | factoryChargeOz | Auto-prefilled from outdoor model |
| Line Config | factoryLineConfig | Dropdown; triggers factoryChargeOz + approxAdjustOz recalc |
| Approx Adjust oz | approxAdjustOz | Auto-calculated; can be manually overridden |
| Adjusted oz | adjustedOz | Manual |
| Fan CFM | fanSpeedCfm | Manual |
| Liquid Temp °F | liquidLineTemp | Triggers subcoolingValue auto-calc |
| Suction Temp °F | suctionLineTemp | Manual |
| Condenser Sat °F | condenserSatTemp | Triggers subcoolingValue auto-calc |
| Subcooling °F | subcoolingValue | Auto-calc: condenserSatTemp − liquidLineTemp |
| OEM SC Goal °F | oemSubcoolingGoal | Auto-prefilled from outdoor model |
| SC Deviation °F | subcoolingDeviation | Auto-calc: \|subcoolingValue − oemSubcoolingGoal\| |

### 6.3 Auto-prefill on workspace open

If the job has a known outdoor model:
- `factoryChargeOz`: set to `outdoor.FactoryCharge` if field is empty.
- `oemSubcoolingGoal`: set from `getSubcoolingDefault(outdoor)` if field is empty.
- `approxAdjustOz`: set to `outdoor.FactoryCharge` (or `outdoor.revisedCharge` if line config includes "revisedCharge") if field is empty.

### 6.4 Line Config change (factoryLineConfig dropdown)

Options: "", "10ft (Trane)", "25ft Trane revisedCharge", "15ft Daikin", "15ft Goodman", "15ft Lennox", "30ft Lennox revisedCharge"

On change (if outdoor model known):
- If config string includes "revisedCharge": `factoryChargeOz` ← `outdoor.revisedCharge`
- Else: `factoryChargeOz` ← `outdoor.FactoryCharge`
- `approxAdjustOz` ← `calculateApproxAdjust(linesetLength, lineConfig)`

### 6.5 linesetLength change

When `linesetLength` changes and outdoor model is known: `approxAdjustOz` recalculated via `calculateApproxAdjust`.

### 6.6 Subcooling warning

Shown inline after the subcoolingValue field (`[data-sc-warn]` element):
- **Danger (red):** subcoolingValue < 0 → shows "negative reading"
- **Caution (amber):** |subcoolingValue − oemSubcoolingGoal| > 3 → shows "±X.X°F from goal"
- **Clear:** neither condition

### 6.7 New Total Charge display

Shows `factoryChargeOz + adjustedOz` converted to lbs + oz (e.g. "4 lbs 6 oz"). Updates on every field change. Displays "—" if either value is missing.

### 6.8 Photos

Each system has two photo slots: **Scale** and **Fan Speed**. Each slot has:
- A gallery button (opens file picker)
- A camera button (opens camera capture directly)
- A preview thumbnail with × remove button after a photo is taken

Photos compressed to JPEG (max 1600px, quality 0.8), stored in IndexedDB keyed by `{addressPrefix}_{key}`. GPS metadata extracted from EXIF if present (shown as "EXIF" chip on preview). Restored on workspace resume.

### 6.9 Impact on other sections

Weight-In Data accessory price: $10 base + $10 Finish addon when Finish is also selected ($20 total).

### 6.10 Report / CSV output

- Not included in report text.
- All 12 fields exported per system in CSV (see §11 CSV Columns).

---

## 7. Notes & Photos (Step 6)

### 7.1 Notes textarea

Free-text. Saved on every keystroke. Appears in report text immediately after the address (and any site photo labels).

**Section summary:** first 30 characters of notes followed by "…", or "—" if empty.

### 7.2 Site photos — preset slots

Five preset photo slots always present:

| Label | Slug |
|---|---|
| No P-Drain | no_p_drain |
| No Gas Meter | no_gas_meter |
| Gas Closed | gas_closed |
| No Electric Meter | no_electric_meter |
| Breakers Missing | breakers_missing |

Each slot renders as a labeled button that opens a file picker. After a photo is chosen: compressed, stored in IndexedDB, shown as 60×60px thumbnail with label and × remove button. Removing a photo deletes it from IndexedDB and from `sitePhotoMeta`.

### 7.3 "+ Other" custom site photo

Clicking "+ Other" shows a text input for a label. Pressing Enter with a non-empty label triggers the file picker. On file selection: a new named slot is inserted in the preset container. Pressing Escape cancels without opening the file picker.

Custom slug format: `{label_lowercased_with_underscores}_{Date.now()}` — guaranteed unique.

### 7.4 Download All Photos

Button shows count of all photos (weigh-in + site). Disabled when count = 0. Clicking downloads a ZIP file named `{ADDRESS}_PHOTOS.zip` with all photos as JPG files named `{ADDRESS}_{LABEL}.jpg`.

### 7.5 Impact on report text

Site photo labels (from `sitePhotoMeta`) appear in report text between notes and the service item: `{ADDRESS}, {notes}, {sitePhoto1.label}, {sitePhoto2.label}, {service} $...`

---

## 8. Generate Report

### 8.1 Trigger

"Generate Report" button in the workspace sticky footer.

### 8.2 What happens (in order)

1. `buildCompletion(job, getPrices())` — creates Completion object from current workspace state.
2. `refrigerant` resolved from `getOutdoorModel(outdoorModel)?.freon` or System 2 outdoor if System 1 has none.
3. `generateReportText(completion)` — creates the plain-text report string.
4. `saveCompletion(completion)` — persists to localStorage under REPORTS key.
5. `removeJob(job.id)` — removes the job from the job list (localStorage JOBS key).
6. `clearWorkspace()` — resets all module state, clears IndexedDB images, clears workspace localStorage.
7. `setActiveJobId(null)` — clears active job from localStorage.
8. `_activeJob = null` — clears module-level reference.
9. `updateActiveJobBar()` — collapses header active-job-row.
10. Toast: "Report saved!" (success)
11. `renderJobs()` then `openTab("reports")` — switches to Reports tab.

**Edge case:** If no job is active (`_activeJob` is null), the button click does nothing.

### 8.3 Photo download

Triggered automatically between step 4 (saveCompletion) and step 6 (clearWorkspace):

- If photos exist in the current workspace session (weigh-in slots or site photos), a ZIP is automatically downloaded before the workspace is cleared.
- ZIP filename format: `report_photos_YYYY-MM-DD.zip` (today's date, UTC).
- Each file inside the ZIP is named `{ADDRESS}_{LABEL}.jpg`.
- If no photos exist, the download is skipped silently — no toast, no interruption to the flow.
- The report is saved regardless of whether a photo download occurs.

---

## 9. Reports Tab

### 9.1 What it does

Displays all saved completions. If none exist, shows an empty state and hides global action buttons.

### 9.2 Report card

Each card shows: address (bold), total amount badge ($X), breakdown row (Svc $X | Acc $X | Fix $X — zero-value categories omitted), and the full report text.

**Selection:** Clicking the card body (not a button) selects it, adding `.report-selected` class which shows the action buttons. Clicking a selected card deselects it. Only one card selected at a time.

### 9.3 Per-card actions

| Action | Behavior |
|---|---|
| Copy | Copies `reportText` to clipboard; toast "Copied!" |
| Edit | Opens edit modal (see §9.4) |
| Share | Toggles share panel showing WhatsApp, SMS, Email, Copy buttons |
| WhatsApp | Opens `https://api.whatsapp.com/send?text={encoded reportText}` in new tab |
| SMS | Sets `window.location.href = sms:?body={encoded reportText}` |
| Email | Sets `mailto:?subject=Service Report&body={encoded reportText}` |
| Copy (share) | Copies `reportText` to clipboard |
| Delete (✕) | `confirm()` dialog → `deleteCompletion(jobId)` → `renderReports()` |

### 9.4 Edit modal

Full-screen overlay (`em-overlay`). Editable sections:

- **Notes:** textarea
- **Service:** checkboxes for AC, Heat, Finish, Prestart, Drive Run, Cancel; plus 2 Systems and Temporarily flags
- **Thermostat:** `<select>` (None + catalog items) + quantity number input
- **Accessories:** list of item rows — each row has a `<select>` for catalog items (or "Other...") with a text input that appears when "Other..." is selected, a price number input, and a × remove button. "+ Add Accessory" appends a new empty row.
- **Fixes:** identical structure to Accessories.
- **Weight-In System 1:** collapsible `<details>` section with all 12 fields; starts open if any field has a value.
- **Weight-In System 2:** shown only if `isTwoSystems`. Same structure.

**Apply button:**
- Reconstructs service items using the same pricing logic as the workspace (`_buildServiceItems` equivalent in `app.js`).
- Prices come from current settings (not the original prices at time of job completion).
- Recalculates `totals` from new items.
- Regenerates `reportText`.
- If `refrigerant` was empty, resolves from outdoor model.
- `saveCompletion(updated)` → `renderReports()` → closes overlay.

**Close (×, Cancel, backdrop click):** closes without saving.

### 9.5 Global actions

| Button | Behavior |
|---|---|
| Share All | Toggles share-all-panel; sends `generateDailyReport()` (all reports, double-newline separated) via chosen method |
| Delete All | `confirm()` → deletes every completion → `renderReports()` |
| Export JSON | Downloads `dashboard_import_{YYYY-MM-DD}.json` (pretty-printed JSON array) |
| Export CSV | Downloads `service_reports_{MM-DD-YY}.csv` (43-column CSV; see §11) |

---

## 10. Report Text Format

```
{ADDRESS}[, {notes}][, {sitePhotoMeta[N].label}], {service.displayName}[ ${price}], {acc.displayName} ${price}, ..., {fix.displayName} ${price}, ..., total ${total}
```

**Rules:**
- Parts joined with `", "`.
- Address always first.
- Notes appear if non-empty.
- Each site photo label appears as a separate comma-separated part.
- Service price omitted if price = 0 (Cancel case: just "service canceled" with no dollar amount).
- All accessories appear in selection order.
- All fixes appear in selection order.
- `total $X` is always last.

**Example (Finish + AC & Heat + 2 tstats + accessories + fix):**
```
32122 WATERLILY VIEW COURT, Finish/ AC & Heat started (2 Systems) 2 Ecobee tstats $40, FIN180P wired and set $10, Float Switch $10, I had to open the ecoil to pull out the sensor wire $30, total $90
```

**Example (Cancel):**
```
14701 AMBERFIELD DR, service canceled, total $0
```

**Daily report** (`generateDailyReport`): all completion `reportText` strings joined with `"\n\n"` (two newlines between each job).

---

## 11. CSV Export (43 columns)

File: `service_reports_{MM-DD-YY}.csv`

| Column | Source |
|---|---|
| Date | `completion.timestamp` formatted as local date |
| Address | `completion.address` |
| Subdivision | `completion.subdivision` |
| Builder | `completion.builder` |
| Notes | `completion.notes` |
| Service_Type | `services[0].displayName` with tstat segment stripped (regex removes trailing ` N model tstat(s)`) |
| Service_Price | `totals.service` |
| Thermostat | `selectedThermostat?.name` |
| Tstat_Qty | `thermostatQuantity` |
| Accessories | All accessories as `{displayName} ${price}` joined with `"; "` |
| Accessories_Price | `totals.accessory` |
| Fixes | All fixes as `{displayName} ${price}` joined with `"; "` |
| Fixes_Price | `totals.fix` |
| Total | `totals.total` |
| Indoor_Model | `indoorModel` (System 1) |
| Outdoor_Model | `outdoorModel` (System 1) |
| Refrigerant | `refrigerant` |
| Lineset_Length | `weightInData.linesetLength` |
| Factory_Line_Config | `weightInData.factoryLineConfig` |
| Factory_Charge | `weightInData.factoryChargeOz` |
| Approx_Adjust | `weightInData.approxAdjustOz` |
| Adjusted_Charge | `weightInData.adjustedOz` |
| Fan_Speed | `weightInData.fanSpeedCfm` |
| Liquid_Temp | `weightInData.liquidLineTemp` |
| Suction_Temp | `weightInData.suctionLineTemp` |
| Condenser_Sat_Temp | `weightInData.condenserSatTemp` |
| Subcooling | `weightInData.subcoolingValue` |
| Subcooling_Goal | `weightInData.oemSubcoolingGoal` |
| Subcooling_Deviation | `weightInData.subcoolingDeviation` |
| Indoor_Model_2 | `indoorModel2` |
| Outdoor_Model_2 | `outdoorModel2` |
| Sys2_Lineset … Sys2_SC_Dev | Same 12 fields from `weightInData2` |

Cells containing commas, double-quotes, or newlines are RFC 4180 quoted.

---

## 12. Settings

### 12.1 Theme

Toggle switch (dark/light). Sets `document.documentElement.setAttribute("data-mode", mode)` immediately. Persisted to localStorage via `setTheme()`.

### 12.2 AI Provider

Three chip buttons: Anthropic, OpenAI, Google. The active provider chip has accent styling. A "More ▾" button reveals an extended provider row for additional providers. Saved via `setAiProvider()`.

### 12.3 API Key

Password input. "Save" persists the key via `setAiApiKey()`, shows "Key saved." status text, shows toast "API key saved". "Clear" clears the input and saved key, shows "Key cleared." status (no toast).

### 12.4 Prices

One `<input type="number">` per service, accessory, and fix. The Weight-In Data accessory row has an additional "Finish addon" field immediately below it. Changes applied immediately on `input` event via `setPrice()` — no save button. "Reset to defaults" calls `resetPrices()` and re-renders the prices section with DEFAULT_PRICES values.

**Default prices (DEFAULT_PRICES in data.js):**

| Service | Price |
|---|---|
| AC | $30 |
| Heat | $30 |
| AC & Heat | $30 |
| Prestart | $20 |
| Drive Run | $10 |
| Cancel | $0 |

| Accessory | Price |
|---|---|
| FIN180P | $10 |
| FIN6-MD | $10 |
| Float Switch | $5 |
| Dehum | $10 |
| F/A (Fresh Air) | $10 |
| Harmony | $40 |
| HZ322 | $30 |
| UT3000 | $30 |
| Bypass | $5 |
| eBypass | $10 |
| DAPC | $10 |
| AprilAire | $10 |
| RDS | $10 |
| Trane Harness | $10 |
| Ecoil Wire | $10 |
| LP Kit Lennox 1Stg | $20 |
| LP Kit Lennox 2Stg | $20 |
| LP Kit Goodman | $20 |
| Weight-In Data | $10 |
| Weight-In Finish addon | $10 |

| Fix | Price |
|---|---|
| Pressure Test | $10 |
| Open Ecoil | $30 |
| Jammed Wires | $5 |
| Stuck Blower | $20 |
| Sheetrock (Cut) | $15 |
| Extended Wire (group) | $5 each |
| Leaks Ecoil | $20 |
| Leaks Cunit | $20 |
| Leaks Wall | $50 |

### 12.5 Impact on other sections

Price changes take effect on the next workspace price recalculation. Prices at time of report generation (`getPrices()`) are baked into the completion's `totals` — historical completions retain their original totals. The edit modal re-prices using current settings when "Apply" is clicked.

---

## 13. Cross-Section Interactions Summary

| Trigger | Effect on other sections |
|---|---|
| Cancel selected (service) | Price display → $0; all other service/acc/fix totals zeroed |
| 2 Systems toggled | Service price ×2; qualifying acc prices ×2; Weight-In System 2 row shown/hidden; report text adds "(2 Systems)" |
| Finish selected | Weight-In Data price +$10 if also selected; service price changes to $20 if AC/Heat active |
| Any selection change | Live price display (footer) recalculated immediately |
| Zone board selected | Other zone boards + their companions deselected |
| Zone board deselected | Its companions deselected |
| UT3000 selected | DAPC + eBypass + Ecoil Wire auto-added |
| HZ322 selected | Bypass auto-added |
| LP Kit variant selected | Other LP Kit variants deselected |
| Generate Report | Job removed from Jobs tab; workspace cleared; Reports tab opened |
| Settings price change | Live effect on workspace price display; baked into report on Generate |

---

## 14. Troubleshooting Drawer

### 14.1 Trigger

TS button in the app header opens the drawer. The drawer slides in from the right over the current view.

### 14.2 Flow

1. **Drawer opens** — auto-selects the active job if one exists. Falls back to Generic Mode if no job is active.
2. **Job context displayed** — header shows job address; chips show indoor/outdoor model, refrigerant, and key accessories (zoning, float switch, A2L harness).
3. **Technician selects a symptom** — 9 options available:

| Key | Label |
|---|---|
| `no_cooling` | No Enfría |
| `no_heating` | No Calienta |
| `fault_code` | Fault Code |
| `no_fan` | Fan No Arranca |
| `float_switch` | Float Switch |
| `zoning` | Zoning Issue |
| `a2l_safety` | A2L Safety |
| `tstat` | Tstat Issue |
| `condenser_no_start` | Condensadora No Arranca |

4. **Fault code entry** — selecting `fault_code` reveals a text input. Technician enters the code and taps "Lookup".
5. **Engine runs diagnosis** — returns severity level, summary, ordered steps, and equipment notes.
6. **Steps display** — numbered list with action text, tool required (multimeter, visual, gauges, etc.), and optional detail text. Tapping a step marks it checked.
7. **Branch steps** — some steps include a Yes/No question. Tapping a branch button reveals the relevant sub-steps below the question. Tapping the active button again collapses it.
8. **Ask AI** — the "Ask AI →" button pre-loads the current diagnosis context (symptom, equipment, L1 result) into the global AI assistant and opens it. The troubleshooting drawer closes.
9. **Reset** — returns to symptom selection and clears results. Job context is preserved.

### 14.3 Generic Mode

When no active job exists: diagnosis runs without equipment-specific context. Steps are generic (not tailored to refrigerant, accessories, or board type). A "Generic Mode" label appears in the job section.

Multiple jobs but none selected: a job picker appears. Technician can select a job or proceed in Generic Mode.

### 14.4 Without API Key

Level 1 (rule-based) steps and branches work without a key. Tapping "Ask AI →" opens the Settings modal to configure the API key instead of opening the AI assistant.

### 14.5 Severity Levels

| Level | Meaning |
|---|---|
| `critical` | Potential safety issue (A2L refrigerant, electrical hazard) |
| `high` | System is fully down, affects habitability |
| `medium` | Degraded operation, cooling or heating impaired |
| `low` | Informational, minor issue |
