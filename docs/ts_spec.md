# Troubleshooting Panel — Reverse-Engineered Specification

Source: `troubleshootingPanel.js` + `styles.css` (lines 3059–3980)  
Engine wired: `troubleshootingEngine.js` (Level 1) + `aiProviders.js` / `claudeAssist.js` (Level 2)

---

## 1. COMPONENTS

### 1.1 Overlay

| | |
|---|---|
| Element | `#ts-overlay` |
| Classes | `.ts-overlay`, `.ts-overlay.ts-open` |
| Default state | Hidden (`opacity: 0`, `pointer-events: none`) |
| Open state | `opacity: 1`, `pointer-events: all`, fade 0.25s ease |
| Purpose | Darkens the app behind the drawer; clicking it closes the drawer |

### 1.2 Drawer Panel

| | |
|---|---|
| Element | `#ts-drawer` |
| Classes | `.ts-drawer`, `.ts-drawer.ts-open` |
| Default state | Offscreen right (`translateX(100%)`) |
| Open state | `translateX(0)`, transition 0.28s cubic-bezier(0.4,0,0.2,1) |
| Dimensions | `min(420px, 100vw)` wide × `100dvh` tall |
| z-index | 9999 |
| Structure | Fixed flex column: header (shrink: 0) + scrollable body (flex: 1) |
| `aria-hidden` | Set to `"true"` when closed; removed when open |

### 1.3 Drawer Header

| | |
|---|---|
| Element | `#ts-header.ts-header` |
| Layout | Flex row, space-between, min-height 40px, padding 8px 10px |
| Background | `var(--title-bar-bg)`, white text |
| Children | `#ts-job-addr` (span, unused in current code) · `#ts-context-chips` · close button `#ts-drawer-close` |

**Context Chips** (`#ts-context-chips`)  
A flex-wrap row of `.ts-context-chip` spans. Each chip: `rgba(255,255,255,0.18)` background, `rgba(255,255,255,0.35)` border, 3px radius, 0.72em font, 1px 6px padding. Chips reflect the current job's equipment summary (see §3).

**Close Button** (`#ts-drawer-close`)  
Text "✕". Border `rgba(255,255,255,0.4)`, 2px 7px padding. Hover: `rgba(255,255,255,0.2)` background.

### 1.4 Drawer Body

Scrollable column, 12px padding, 14px gap between sections. Contains the following sections in order:

1. Job Section
2. Symptom Section
3. Results Section
4. Claude (AI) Section

### 1.5 Job Section

**Container:** `#ts-job-section`

Renders one of three states depending on job availability:

#### A. Active Job Card (`.ts-active-job`)

Structure:
```
.ts-active-job
  .ts-active-job-address       — job.address, bold 0.9em, truncated with ellipsis
  .ts-active-job-meta          — flex-wrap row of chips (gap 4px)
    .ts-active-job-chip        — heaterModel (default color)
    .ts-active-job-chip.ts-chip-outdoor   — outdoorModel
    .ts-active-job-chip.ts-chip-a2l       — A2L flag
    .ts-active-job-chip.ts-chip-tstat     — thermostat type (static)
    .ts-active-job-chip.ts-chip-tstat-menu — thermostat (interactive, has submenu)
    .ts-active-job-chip.ts-chip-acc       — Zoning / Float Switch
    .ts-active-job-chip.ts-chip-a2l       — Trane Harness
  .ts-job-change-btn           — "Cambiar job →" link-style button (only if >1 job)
```

Chip colors:
| Variant | Background | Notes |
|---|---|---|
| default | `var(--title-bar-bg)` | heater model |
| `.ts-chip-outdoor` | `#1b5e20` | outdoor model |
| `.ts-chip-a2l` | `#b71c1c` | A2L refrigerant, Trane harness |
| `.ts-chip-tstat` | `#4a148c` | thermostat (no submenu) |
| `.ts-chip-tstat-menu` | `#4a148c`, border `rgba(191,90,242,0.5)` | thermostat with submenu; hover: `#6a1ab2` + purple glow |
| `.ts-chip-acc` | `#e65100` | accessories: Zoning, Float Switch |

All chips: white text, 0.7em bold, 2px 7px padding, 3px radius.

When job has no equipment, a `.ts-no-equip-warning` is appended:
- Background `#fff9c4`, border `#f9a825`, text `#5d4037`, 0.82em — "⚠️ Este job no tiene equipo registrado. El diagnóstico será genérico."

#### B. Job Picker

Shown when jobs exist but none is selected.

```
div (wrapper)
  p.ts-section-label            — "Selecciona el job que estás trabajando:"
  .ts-job-picker                — scrollable column, max-height 240px, gap 5px
    button.ts-job-picker-item   — one per job
      span.ts-job-picker-address — job.address, bold 0.85em, truncated
      div.ts-job-picker-equip   — "ModelA + ModelB" or "Sin equipo registrado", 0.73em, 75% opacity
```

Followed by a Generic Mode Badge.

#### C. Generic Mode Badge (`.ts-generic-badge`)

Shown when there are no jobs at all, or as a secondary option below the picker.

```
.ts-generic-badge               — flex row, gap 10px; rgba(255,214,10,0.07) bg; rgba(255,214,10,0.2) border; 8px radius
  .ts-generic-icon              — ⚡ emoji, 18px
  div
    .ts-generic-title           — "Generic Mode", #ffd60a, 12px bold
    .ts-generic-sub             — subtitle text, var(--text-muted,#888), 11px
```

### 1.6 Symptom Section

**Container:** `#ts-symptom-section`. Hidden until a job is selected (or when no jobs at all, shown immediately).

```
p.ts-section-label              — "Select symptom"
#ts-symptom-grid.ts-symptom-grid — 2-column CSS grid, gap 6px
  button.ts-symptom-btn[data-symptom="..."] — one per symptom
div#ts-fault-row.hidden         — fault code sub-row (initially hidden)
  input#ts-fault-input          — text input, monospace, uppercase
  button#ts-lookup-btn          — "Look up"
```

**Symptom button states:**
- Default: `var(--button-bg)`, 2px border (`--container-border-dark`), 9px 6px padding, 0.82em bold
- Hover: `var(--button-bg-hover)`
- Active (`.ts-active`): `var(--button-bg-active)` background, `var(--button-text-active)` color

The fault code input row (`#ts-fault-row`) appears only when the `FAULT_CODE` symptom is selected.

### 1.7 Results Section

**Container:** `#ts-results-section.hidden` (shown after a diagnosis runs).

```
div.ts-results-header
  div.ts-results-title-row
    span#ts-severity-badge      — severity label
    span#ts-result-title        — diagnosis title
  p#ts-result-summary           — summary text

div.ts-steps-header             — rendered inside #ts-steps-list header
  span.ts-steps-label           — "PASOS — TOCA PARA MARCAR" (uppercase, 0.75em, 50% opacity)
  button.ts-steps-reset         — "↺ Reset"

ol#ts-steps-list                — one .ts-step-item per step
  div.ts-step-item
    div.ts-step-num
      span.ts-step-num-inner    — step number
    div.ts-step-content
      div.ts-step-action        — action text (bold)
      div.ts-step-detail        — detail text (optional, 75% opacity)
      span.ts-step-tool         — tool pill (optional, 🔧 prefix)
      div.ts-branch-wrap        — conditional branch (optional)

div#ts-equipment-notes          — equipment-specific notes
  div.ts-note-item              — one per note
    div.ts-note-label
    div.ts-note-text

div#ts-result-actions
  button#ts-reset-btn           — "Reset"
```

**Severity badge** (`#ts-severity-badge`, `.ts-severity-badge`):

| Severity | Light mode | Dark mode |
|---|---|---|
| `ts-info` | bg `#b3e5fc`, text `#01579b` | bg `rgba(56,190,255,0.15)`, text `#38beff`, border `rgba(56,190,255,0.3)` |
| `ts-warning` | bg `#fff9c4`, text `#f57f17` | bg `rgba(255,159,10,0.15)`, text `#ff9f0a`, border `rgba(255,159,10,0.3)` |
| `ts-critical` | bg `#ffcdd2`, text `#b71c1c` | bg `rgba(255,45,85,0.15)`, text `#ff2d55`, border `rgba(255,45,85,0.3)` |

Styles: 2px 8px padding, 3px radius, 0.7em bold, uppercase, letter-spacing 0.04em.

**Step item** (`.ts-step-item`):
- Layout: flex row, gap 9px, 8px 10px padding, `var(--border-radius)` radius
- Number circle: 22×22px, `var(--title-bar-bg)` fill, white text, 0.72em bold
- Hover: `var(--acc-grey-bg)`
- Checked (`.ts-checked`): 45% opacity; action text struck through; number circle turns `#22c55e` (green) and shows ✓ (number hidden)

**Branch component** (`.ts-branch-wrap`):
```
.ts-branch-wrap                 — top border (1px dashed), padding-top 8px, margin-top 8px
  .ts-branch-question           — question text, 0.8em bold, 85% opacity
  .ts-branch-btns               — flex row, gap 6px
    button.ts-branch-btn.ts-branch-yes  — "✓ {yes.label}"
    button.ts-branch-btn.ts-branch-no   — "✗ {no.label}"
  .ts-branch-substeps[style="display:none"] — hidden until branch chosen
    .ts-branch-step             — one per sub-step (checkable)
      .ts-branch-step-num       — 20×20px circle
      .ts-branch-step-body
        .ts-branch-step-action
        .ts-step-detail         — (optional)
        .ts-step-tool           — (optional)
```

Branch button active colors:

| State | Light | Dark |
|---|---|---|
| Yes active | bg `rgba(34,197,94,0.15)`, border `#22c55e`, text `#16a34a` | bg `rgba(34,197,94,0.18)`, text `#4ade80` |
| No active | bg `rgba(239,68,68,0.12)`, border `#ef4444`, text `#dc2626` | bg `rgba(239,68,68,0.18)`, text `#f87171` |

Sub-steps have a 3px left border in `var(--title-bar-bg)` color.

**Equipment notes** (`.ts-note-item`):
- Dark mode: `rgba(255,214,10,0.08)` background, `rgba(255,214,10,0.2)` border
- Each note: `.ts-note-label` (label) + `.ts-note-text` (body)

### 1.8 Claude (AI) Section

**Container:** `#ts-claude-section.hidden` (revealed after first diagnosis result).

```
div.ts-claude-header
  span.ts-claude-title          — section title
  button#ts-api-key-toggle      — 🔑 icon button

#ts-provider-selector
  div.ts-provider-row#ts-provider-main        — main providers
    button.ts-provider-chip[data-provider="..."] — one per provider
  div.ts-provider-row.hidden#ts-provider-extended — extended providers (toggle)
  button.ts-provider-more-btn#ts-provider-more   — "More ▾" / "Less ▴"

div#ts-provider-status-bar      — status line: provider name + key status

div#ts-api-key-panel.ts-api-key-panel.hidden
  input#ts-api-key-input.ts-api-key-field    — monospace, 0.8em
  div.ts-api-key-actions
    button#ts-save-key-btn
    button#ts-clear-key-btn
  span.ts-api-key-note          — key status + docs link

div.ts-chat-input-wrap
  textarea#ts-chat-input.ts-chat-input       — optional context, min-height 64px, resize vertical
  div.ts-chat-actions
    button#ts-ask-claude-btn.ts-ask-claude-btn
      span#ts-claude-btn-text   — "✨ Ask {provider}"
      span#ts-claude-spinner.ts-spinner.hidden
    button#ts-clear-chat-btn.ts-clear-chat-btn

div#ts-chat-history.ts-chat-history.hidden
  div.ts-chat-msg.ts-chat-msg-{role}         — one per message
    div.ts-chat-msg-label       — "You" or "AI"
    div.ts-chat-msg-text        — message body
```

**Provider chip** (`.ts-provider-chip`):
- Pill shape, 20px radius, 5px 10px padding, 11px font
- Uses CSS custom property `--pc` (provider color) for border/text/background tint
- Active (`.active`): border + text in `--pc`; `color-mix(--pc 12%, transparent)` background; glow shadow

**Ask AI button** (`.ts-ask-claude-btn`):
- `#4a1a9e` background, `#2d0d6e` border, white text, full width
- Hover: `#6a2ec4`
- Disabled: 50% opacity, not-allowed cursor
- Contains a 14×14px spinner (0.7s linear spin) that shows during streaming

**Chat history** (`.ts-chat-history`):
- Max-height 320px, scrollable, auto-scrolls to bottom on update
- User message: right-aligned bubble, `rgba(37,99,235,0.08)` bg, `rgba(37,99,235,0.15)` border, max-width 92%
- AI message: full width, `rgba(255,255,255,0.04)` bg
- Labels: 10px uppercase; user label color `var(--color-primary,#2563eb)`; AI label color `var(--neon-primary,#02bcfa)`
- Message text: `pre-wrap`, 0.83em, 1.55 line-height, `word-break: break-word`
- `\n` characters replaced with `<br>` on render

**Chat input** (`.ts-chat-input`):
- Focus ring: `var(--neon-primary,#02bcfa)` border + `rgba(2,188,250,0.12)` shadow

### 1.9 AI Settings Modal

**Container:** `#ai-settings-modal` (global, in document body, `display:none` / `display:flex`).

Opened by `#btn-settings` (app header button). Identical provider chip + key management UI. Changes made here are reflected in the drawer's button label and status bar.

Backdrop: `rgba(0,0,0,0.65)`, backdrop-filter blur 4px. Modal card: max-width 380px, 85dvh, `var(--container-bg,#0f1520)`, `rgba(56,190,255,0.2)` border, 14px radius. Closes on overlay click, close button, or Escape.

### 1.10 Thermostat Submenu (`#_tstat-menu`)

A floating `div` appended to `document.body` when a `.ts-chip-tstat-menu` chip is clicked.

Position: fixed, directly below the chip + 6px gap. Adjusts left if it overflows the right viewport edge.

```
div#_tstat-menu
  button  — "🔌 How to Wire"
  button  — "⚙️ How to Program"
  button  — "📄 Installation Manual" (opens external URL)
```

Visual: `var(--container-bg,#1a1a2e)` background, `rgba(56,190,255,0.25)` border, 10px radius, `0 12px 40px rgba(0,0,0,0.55)` shadow, `fadeIn 0.12s ease` animation. Hover: `rgba(56,190,255,0.1)` row background. Closes on outside click (with 0.1s opacity fade-out + `scale(0.95)`).

### 1.11 Thermostat Wiring Modal

Opens from submenu "How to Wire". Uses the generic modal shell (`#_tstat-modal`).

Body contains one block per `wiring.stage`, each with a heading and an SVG diagram.

**SVG diagram** (`buildWiringSVG`):
- 320px wide, `#0d1420` background, 8px radius
- Left column labeled "UNIT", right column labeled "TSTAT"
- One row per wire terminal; row height 44px
- Terminal boxes: 36×22px, `#1a2438` fill, stroke in wire color, wire letter centered in monospace bold
- Wire: horizontal line between terminals, 2.5px stroke; C wire uses dashed pattern (6,3)
- Wire label: centered between columns, 9px, 40% white opacity
- Wire color map: `Y=#FFD600` (Cooling), `R=#E53935` (Power 24V), `C=#1E88E5` (Common), `G=#43A047` (Fan), `W=#FFFFFF` (Heat/Stage 1)

Below the SVG: a yellow-tinted warning note box (`rgba(255,214,10,0.07)` bg, `rgba(255,214,10,0.2)` border).

### 1.12 Thermostat Programming Modal

Opens from submenu "How to Program". Uses the same generic modal shell.

Body structure:
1. **Builder badge** — if job's builder matches a rule: green badge showing cool°/heat° setpoints and optional notes. If builder exists but no rule matches: orange warning. If no builder: grey notice.
2. **Programming steps** — ordered list of steps from `data.programming.steps`
3. **All Builder Rules** — table of all builder entries; matched builder highlighted with cyan accent border

### 1.13 Generic Modal Shell (`#_tstat-modal`)

```
div#_tstat-modal (overlay)      — fixed inset 0, rgba(0,0,0,0.65), backdrop-filter blur 4px, fadeIn 0.15s
  div (card)                    — max-width 380px, 85dvh, flex column
    div (header)                — title text + ✕ close button
    div (body)                  — padding 18px, overflow-y auto
```

Closes on overlay click, close button.

---

## 2. BEHAVIORS

### 2.1 Opening the Drawer

Trigger: click `#btn-open-troubleshoot`.

1. Auto-selects a job if none is currently selected:
   - Prefers the active job (matched by `getActiveJobAddress()`)
   - Falls back to the only job if exactly one exists
2. Builds `currentContext` from selected job (or global state if no job)
3. Calls `renderJobSection()` and `renderContextChips()`
4. Adds `.ts-open` to overlay and drawer
5. Removes `aria-hidden` from drawer
6. Sets `document.body.style.overflow = "hidden"` (prevents background scroll)

### 2.2 Closing the Drawer

Triggers: close button (`#ts-drawer-close`), overlay click, or Escape key (only when drawer is open).

1. Removes `.ts-open` from overlay and drawer
2. Sets `aria-hidden="true"` on drawer
3. Restores `document.body.style.overflow = ""`

Session state (`selectedJob`, `activeSymptom`, etc.) is **not** reset on close — reopening resumes where it left off.

### 2.3 Job Selection

**When multiple jobs exist and none is selected:**  
The job picker is shown. Clicking a picker item:
1. Sets `selectedJob`
2. Rebuilds `currentContext`
3. Calls `resetToSymptomSelection()` (clears symptom + results)
4. Re-renders job section and context chips
5. Shows symptom section

**When a job is already selected and multiple jobs exist:**  
A "Cambiar job →" link appears at the bottom of the active job card. Clicking it:
1. Clears `selectedJob`
2. Calls `resetToSymptomSelection()`
3. Re-renders job section and context chips (now shows picker)

**When no jobs exist:**  
Generic mode badge is shown immediately. The symptom section is made visible. Diagnosis runs without equipment context.

**When job has no equipment:**  
A yellow warning banner is appended below the active job card. Symptom section remains visible; diagnosis runs in generic mode.

### 2.4 Symptom Selection

Clicking a `.ts-symptom-btn`:
1. If jobs exist but none is selected: action is blocked (early return)
2. Sets `activeSymptom`, clears `activeFaultCode`
3. Toggles `.ts-active` onto clicked button, removes from all others
4. If symptom is `FAULT_CODE`: shows `#ts-fault-row` (fault code input) and waits for explicit lookup
5. Otherwise: hides fault row and immediately calls `runDiagnosis(symptom, "")`

### 2.5 Fault Code Lookup

1. User types a fault code into `#ts-fault-code-field`
2. Trigger: click `#ts-lookup-btn` or press Enter in the field
3. Stores code in `activeFaultCode`
4. Calls `runDiagnosis(SYMPTOM.FAULT_CODE, code)`

### 2.6 Diagnosis Run

`runDiagnosis(symptom, detail)`:
1. Rebuilds `currentContext` from selected job
2. Calls `diagnose({ symptom, detail, context })` → L1 result
3. Stores result in `currentL1Result`
4. Calls `renderResults(result)`

### 2.7 Results Rendering

`renderResults(result)`:
1. Shows results section and symptom section (removes `.hidden`)
2. Populates title, summary, severity badge (with appropriate `ts-{severity}` class)
3. Clears and rebuilds `#ts-steps-list`:
   - If no steps: renders a "no specific steps" message
   - Otherwise: renders a header row (label + ↺ Reset button) followed by step items
4. Clears and rebuilds `#ts-equipment-notes` (hides if empty)
5. Shows Claude section
6. Calls `refreshDrawerProviderStatus()`

### 2.8 Step Marking (Checkboxes)

Clicking anywhere on a `.ts-step-item` (except on branch buttons or sub-steps) toggles `.ts-checked`.

Checked visual state:
- Item: 45% opacity
- Action text: line-through
- Number circle: changes to `#22c55e` (green), shows ✓, hides number

Dark mode checked: `rgba(34,197,94,0.05)` background, `rgba(34,197,94,0.15)` border.

### 2.9 Steps Reset

Clicking "↺ Reset" in the steps header removes `.ts-checked` from all `.ts-step-item` elements in the list. Propagation is stopped to prevent step-item toggle.

### 2.10 Branch Yes/No Interaction

Clicking Yes or No button:
1. If neither branch is currently active: activates clicked branch, renders its sub-steps, shows `.ts-branch-substeps`
2. If clicking the already-active branch: deactivates it, hides and clears sub-steps (toggle off)
3. If clicking the opposite branch: switches to that branch's sub-steps

Sub-steps are rendered inside `.ts-branch-substeps` and are individually clickable to toggle `.ts-checked` (same visual as top-level steps).

### 2.11 Equipment Notes Display

Notes from `result.equipmentNotes` are shown if the array is non-empty and items have a `text` field. Each note renders a `.ts-note-item` with `.ts-note-label` and `.ts-note-text`. Notes appear below the steps list and above the reset button.

### 2.12 Ask AI Flow

Trigger: click `#ts-ask-claude-btn` or Ctrl/Cmd+Enter in the chat textarea.

Pre-flight checks (in order):
1. If currently streaming: silently ignored
2. If no key saved for active provider: opens `#ts-api-key-panel`, focuses input, returns
3. If no `activeSymptom`: shows toast "Select a symptom first", returns

On proceed:
1. Reads optional text from `#ts-chat-input`
2. Builds `userMessage` via `buildUserMessage(jobLabel, detail, currentContext, currentL1Result)` from `claudeAssist.js`
3. If extra text present: appends `\n\n## Contexto adicional del técnico\n{text}`
4. Pushes `{ role: "user", text: displayText }` to `_chatHistory` (displayText = textarea content or "Diagnóstico: {symptomLabel}")
5. Pushes an empty `{ role: "ai", text: "" }` placeholder
6. Re-renders chat history
7. Clears textarea
8. Sets `isStreaming = true`, disables button, shows spinner, changes button text to "Asking…"
9. Calls `askAI({ providerId, userMessage, onChunk, onDone, onError })`
   - `onChunk`: appends chunk to AI placeholder text, re-renders chat history
   - `onDone`: restores button, hides spinner, sets `isStreaming = false`
   - `onError`: sets AI text to `Error: {message}`, restores button, hides spinner

Chat history auto-scrolls to bottom on every render (`scrollTop = scrollHeight`).

### 2.13 Multi-Turn Chat

After the first exchange, the textarea is cleared and ready for a follow-up message. Each new send appends to `_chatHistory` — there is no conversation compaction or limit in the panel code. The full history renders on every `renderChatHistory()` call.

### 2.14 Clear Chat

Trigger: click `#ts-clear-chat-btn`.

Resets `_chatHistory = []`, hides `.ts-chat-history`, clears textarea value.

### 2.15 API Key Management

**Toggle panel:** Click `#ts-api-key-toggle` (🔑). Toggles `.hidden` on `#ts-api-key-panel`.  
On open: shows masked value (`••••••••••••••••`) if a key is saved, else empty; focuses input.

**Save:** Click save button.
- If input is empty or starts with `•`: closes panel without saving
- Otherwise: calls `saveProviderKey(providerId, value)`, closes panel, refreshes provider state, shows toast `"{provider} key saved ✓"`

**Clear:** Click clear button.
- Calls `clearProviderKey(providerId)`, clears input, refreshes provider state, shows toast `"{provider} key cleared"`

Both save and clear are also available in the AI Settings Modal with identical logic.

### 2.16 Provider Selection

Clicking a `.ts-provider-chip` in the drawer or AI settings modal:
1. Calls `setActiveProvider(id)`
2. Updates `.active` class on all provider chips (both in drawer and modal stay in sync)
3. Updates `#ts-api-key-input` placeholder to `provider.keyPlaceholder`
4. Updates `#ts-api-key-note` text: saved key → "✓ Key saved for {label} · {docs link}"; no key → "⚠️ No key saved · {docs link}"
5. Updates button label to `"✨ Ask {provider.label}"`

### 2.17 Provider Status Bar

`refreshDrawerProviderStatus()` updates `#ts-provider-status-bar` after every result render:
- Has key: `{icon} {label}` in provider color + "✓ Ready" in green (`#30d158`)
- No key: `{icon} {label}` + "⚠ No key" in amber (`#ff9f0a`) + "Configure →" button (opens AI settings modal)

### 2.18 Reset

Trigger: click `#ts-reset-btn`.

`resetToSymptomSelection()`:
1. Clears `activeSymptom`, `activeFaultCode`, `currentL1Result`
2. Removes `.ts-active` from all symptom buttons
3. Hides fault code input row
4. Clears fault code field value
5. Hides results section
6. Hides Claude section
7. Hides API key panel

Does NOT clear: selected job, chat history, or provider state.

### 2.19 Thermostat Chip Submenu

Clicking a `.ts-chip-tstat-menu` chip:
1. Closes any existing menu
2. Looks up `TSTAT_DATA[tstatKey]`; if no data found, returns
3. Builds floating menu positioned below the chip (left-aligned, adjusted if right edge overflow)
4. Appends to `document.body`
5. On outside click (once): closes menu with fade+scale animation

Menu items:
- **How to Wire** → opens wiring modal
- **How to Program** → opens programming modal (passes `job.builder`)
- **Installation Manual** → `window.open(data.manualUrl, "_blank")`

### 2.20 Wiring Modal

Builds an SVG diagram per stage of `TSTAT_DATA[tstatKey].wiring.stages`. Each stage has a label and a list of wire terminals. Below all stages: a yellow warning note from `data.wiring.notes`.

### 2.21 Programming Modal

Resolves the builder rule via case-insensitive partial match on `prog.builders`. Renders:
1. Matched builder badge with setpoints, or "no rule for builder" warning, or "no builder assigned" notice
2. Ordered list of programming steps
3. All builder rules table with current builder highlighted

---

## 3. DATA FLOW

### 3.1 Job Object → Context

`buildContextFromJob(job)` produces `currentContext` by calling `buildContext()` from the engine:

| Source | Preferred | Fallback |
|---|---|---|
| Job with `savedState` | `buildContext(job.savedState)` | — |
| Job without `savedState` | minimal state from job fields | `buildContext(getState())` if no job |

Minimal state fields passed to engine:
- `heaterModel`, `outdoorModel`, `heaterModel2`, `outdoorModel2`
- `selectedThermostat` ← `job.thermostat?.type`
- `selectedAccessories` ← `job.extractedAccessories`
- `isTwoSystems`

### 3.2 Job Fields → Active Job Card Chips

| Job field / context flag | Chip text | Chip variant |
|---|---|---|
| `job.heaterModel` | model string | default (title-bar-bg) |
| `job.outdoorModel` | model string | `.ts-chip-outdoor` (green) |
| `ctx.isA2L` | "A2L" | `.ts-chip-a2l` (red) |
| `job.thermostat.type` + no tstatKey | thermostat string | `.ts-chip-tstat` (purple, static) |
| `job.thermostat.type` + valid tstatKey | "type ▾" | `.ts-chip-tstat-menu` (interactive) |
| `ctx.hasZoning` | "Zoning" | `.ts-chip-acc` (orange) |
| `ctx.hasFloatSwitch` | "Float Switch" | `.ts-chip-acc` (orange) |
| `ctx.hasTraneHarness` | "Harness" | `.ts-chip-a2l` (red) |
| (none of above) | "Sin equipo" | default |

### 3.3 Job Fields → Header Context Chips

| Condition | Chip text |
|---|---|
| `currentContext.heaterModel` | heater model string |
| `currentContext.outdoorModel` | outdoor model string |
| `currentContext.tstatKey` | tstat key string |
| `currentContext.isA2L` | "⚠️ A2L" |
| `currentContext.hasZoning` | "Zoning" |
| No heater or outdoor model | first 3 words of `job.address` |
| No selected job | "Selecciona un job" |

### 3.4 Severity → Badge Class

Engine returns `result.severity` as one of three strings:

| String | CSS class | Badge label |
|---|---|---|
| `"info"` | `.ts-info` | "INFO" |
| `"warning"` | `.ts-warning` | "WARNING" |
| `"critical"` | `.ts-critical` | "CRITICAL" |

Badge text is always `result.severity.toUpperCase()`.

### 3.5 Step Object → Rendered HTML

Each step from `result.steps` has the shape `{ step, action, detail?, tool?, branches? }`:

| Field | Rendered as | Condition |
|---|---|---|
| `s.step` | Number circle content + `data-stepIdx` attribute | always |
| `s.action` | `.ts-step-action` text (HTML-escaped) | always |
| `s.detail` | `.ts-step-detail` text (HTML-escaped) | if present |
| `s.tool` | `.ts-step-tool` pill with 🔧 prefix (escaped) | if present |
| `s.branches` | `.ts-branch-wrap` block | if present |

Branch object shape: `{ question, yes: { label, steps[] }, no: { label, steps[] } }`.

### 3.6 AI Message Construction

`buildUserMessage(jobLabel, detail, currentContext, currentL1Result)` is called from `claudeAssist.js` and is not defined in the panel. The panel appends:

```
\n\n## Contexto adicional del técnico\n{textarea value}
```

only if the textarea has non-empty content.

The display text shown in the chat bubble is:
- Textarea value (if non-empty)
- Otherwise: `"Diagnóstico: {SYMPTOM_LABELS[activeSymptom]}"`

---

## 4. VISUAL DESIGN

### 4.1 Layout

The drawer is a fixed, full-height right panel. It never displaces content — it overlaps with a semi-transparent backdrop. On screens ≤440px the drawer expands to full viewport width.

The drawer is always a 2-zone layout:
- **Header** (fixed, non-scrolling): branding/context strip
- **Body** (scrollable): all interactive sections

Sections within the body are shown/hidden progressively:
1. Job section — always visible once drawer opens
2. Symptom section — shown once a job is selected (or immediately if no jobs)
3. Results section — shown after first diagnosis
4. Claude section — shown after first diagnosis

### 4.2 Typography

| Element | Size | Weight | Notes |
|---|---|---|---|
| Section label | 0.9em | bold | `var(--text-color)` |
| Symptom buttons | 0.82em | bold | centered |
| Step action | 0.83em (content) | bold | |
| Step detail | ~0.76em | normal | 75% opacity |
| Step tool | 0.75em | normal | pill shape |
| Severity badge | 0.7em | bold | uppercase, letter-spacing |
| Context chips | 0.72em | normal | header |
| Active job address | 0.9em | bold | truncated |
| Active job chips | 0.7em | bold | |
| Job picker address | 0.85em | bold | truncated |
| Chat message text | 0.83em | normal | `pre-wrap`, 1.55 line-height |
| Chat label | 10px | 700 | uppercase, 0.5px letter-spacing |
| Provider chips | 11px | 600 | |

### 4.3 Spacing

- Drawer body padding: 12px
- Section gap: 14px
- Symptom grid gap: 6px
- Step list gap: 8px
- Branch sub-step gap: 5px
- Chat history gap: 10px, max-height 320px

### 4.4 Color Decisions

**Job chip colors encode equipment type:**
- Default (blue/grey) = heating unit model
- Green = outdoor unit (cooling)
- Red = hazardous refrigerant (A2L) or Trane-specific harness
- Purple = thermostat (controls)
- Orange = accessories (Zoning, Float Switch)

**Severity badge colors follow industry convention:**
- Info = cool blue (informational, no urgency)
- Warning = amber (attention needed)
- Critical = red (safety-relevant or system-down)

**Branch button outcome colors:**
- Green = positive/pass outcome (Yes = problem resolved)
- Red = negative/fail outcome (No = problem persists or escalates)

**Ask AI button** uses deep purple (`#4a1a9e`) — visually distinct from all other buttons, signals AI/premium action.

**Generic mode badge** uses gold/amber — matches the caution/advisory palette without being an error state.

### 4.5 Animation

| Effect | Duration | Easing |
|---|---|---|
| Drawer slide-in | 0.28s | cubic-bezier(0.4, 0, 0.2, 1) |
| Overlay fade | 0.25s | ease |
| Tstat menu open | 0.12s | ease (fadeIn keyframe) |
| Tstat menu close | 0.1s | ease (opacity + scale) |
| Tstat modal open | 0.15s | ease (fadeIn keyframe) |
| AI spinner | 0.7s | linear (infinite rotation) |
| Step item state change | 0.2s | (opacity + background) |
| Provider chip hover | 0.15s | (all properties) |

### 4.6 Dark Mode Overrides

Dark mode (`html[data-theme="darkMode"]`) modifies:
- Drawer: 1px cyan-tinted border (`rgba(56,190,255,0.2)`), drop shadow `-8px 0 40px rgba(0,0,0,0.6)`
- Step items: `var(--surface-2)` background; checked state gains subtle green tint
- Branch buttons: `rgba(255,255,255,0.05)` background; active states use brighter hue variants
- Equipment notes: amber-tinted background
- Severity badges: all three use translucent tinted backgrounds matching the badge hue, with matching borders
- Branch sub-step left border respects `var(--title-bar-bg)` (theme-aware)
