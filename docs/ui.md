# UI Component Inventory — HVAC Field Ops

---

## 1. App Shell

### `body` / `.app-wrapper`
```html
<body>
  <div class="app-wrapper">
    …
  </div>
</body>
```
**CSS classes:** `app-wrapper`  
**Layout:** `flex`, `flex-direction: column`, full `100dvh`  
**Max-width:** 480px, centered with `margin: 0 auto`  
**Responsive:** No media queries; single-column layout fixed at ≤480px. `overflow: hidden` on wrapper.  
**Notes:** Clips to viewport height; all inner panels scroll independently within `.tab-panels`.

---

### `header.app-header`
```html
<header class="app-header">
  <span class="app-title">Field Ops</span>
  <div class="header-actions">
    <button class="btn-primary" id="btn-add-job">+ Job</button>
    <button class="btn-icon" id="btn-open-quick-calc">Calc</button>
    <button class="btn-icon" id="btn-open-troubleshoot">TS</button>
    <button class="btn-icon" id="btn-settings">⚙</button>
  </div>
  <div class="active-job-row">
    <span id="active-job-addr" class="active-job-addr"></span>
    <div id="active-job-chips" class="active-job-chips"></div>
  </div>
</header>
```
**CSS classes:** `app-header`, `header-actions`, `app-title`, `active-job-row`, `active-job-addr`, `active-job-chips`  
**Layout:** `flex`, `flex-wrap: wrap`, `justify-content: space-between`. Default height `52px` (`--header-h`).  
**States:**
- Default: single row, `min-height: 52px`. `.active-job-row` is `display: none`.
- `.has-active-job`: expands to `52px + 36px`. `.active-job-row` becomes `display: flex`, showing job address + small chips.

**Notes:** `z-index: var(--z-navbar)` (1000). `.btn-primary` inside header gets overrides: `min-height: 32px`, `font-size: 11px`. `.btn-icon` inside header gets `font-size: 13px`.

---

### `nav.tabs-nav`
```html
<nav class="tabs-nav" role="tablist">
  <button class="tab-btn active" data-tab="jobs">Jobs</button>
  <button class="tab-btn" data-tab="workspace">Workspace</button>
  <button class="tab-btn" data-tab="reports">Reports</button>
  <button class="tab-btn" data-tab="lv">LV</button>
</nav>
```
**CSS classes:** `tabs-nav`, `tab-btn`  
**Layout:** `flex`, `align-items: stretch`, `height: 48px` (`--nav-h`). Each `.tab-btn` is `flex: 1`.  
**States:**
- Default: `color: var(--color-text-secondary)`, `border-bottom: 2px solid transparent`.
- `.active`: accent color text, `border-bottom-color: var(--color-accent)`, bold.
- `.completed`: accent color only (no underline).

**Notes:** `z-index: var(--z-navbar)`. JS toggles `.active` on both buttons and panels via `openTab()`.

---

### `main.tab-panels` / `section.tab-panel`
```html
<main class="tab-panels">
  <section id="tab-jobs"       class="tab-panel active" role="tabpanel">…</section>
  <section id="tab-workspace"  class="tab-panel hidden" role="tabpanel">…</section>
  <section id="tab-reports"    class="tab-panel hidden" role="tabpanel">…</section>
  <section id="tab-lv"         class="tab-panel hidden" role="tabpanel">…</section>
</main>
```
**CSS classes:** `tab-panels`, `tab-panel`, `active`, `hidden`  
**Layout:** `.tab-panels` is `flex: 1`, `overflow-y: auto`. `.tab-panel` is `display: none` by default, `min-height: 100%`.  
**States:**
- `.active`: `display: block`.
- `.active.fade-in`: `fadeIn` animation (opacity + translateY).
- `.active.slide-in-right` / `.slide-in-left`: directional slide animations.
- `.hidden`: `display: none !important`.

---

## 2. Job Card

### `.job-item`
```html
<li class="job-item" style="border-left-color: var(--subdivision-N)">
  <div class="job-face">
    <div class="job-top">
      <div class="job-top-row1">…</div>
      <div class="job-top-row2">…</div>
    </div>
    <div class="job-chip-row">…</div>  <!-- expanded only -->
    <div class="equip-grid">…</div>    <!-- expanded only -->
  </div>
  <div class="job-actions">
    <div class="job-buttons">
      <button class="btn-edit">Edit</button>
      <button class="btn-maps">Maps</button>
    </div>
    <button class="btn-start-job">Start Job</button>
  </div>
</li>
```
**CSS classes:** `job-item`, `job-face`, `job-actions`, `job-buttons`  
**Layout:** Block, `overflow: hidden`. Left border 3px colored by subdivision variable.  
**States:**
- Default: collapsed.
- `.active-job`: accent border + `box-shadow: 0 0 0 1px var(--color-accent)`.
- `.expanded`: shows `.job-chip-row`, `.equip-grid`, `.btn-edit`, `.btn-maps`; `box-shadow: var(--shadow-md)`.

**Notes:** `border-left-width: 3px` colored per subdivision (8 color variables `--subdivision-1` through `--subdivision-8`).

---

### `.job-top` / `.job-top-row1` / `.job-top-row2`
```html
<div class="job-top">
  <div class="job-top-row1">
    <div class="job-top-addr">
      <strong>123 Main St</strong>
    </div>
    <span class="badge badge-warning">In Progress</span>
    <span class="badge badge-danger">Urgent</span>
    <button class="btn-delete"></button>
  </div>
  <div class="job-top-row2">
    <div class="job-top-tech">…chips…</div>
    <div class="job-top-meta">…chips…</div>
  </div>
</div>
```
**CSS classes:** `job-top`, `job-top-row1`, `job-top-row2`, `job-top-addr`, `job-top-tech`, `job-top-meta`  
**Layout:**
- `.job-top`: `flex-direction: column`, `gap: 4px`.
- `.job-top-row1`: `flex`, row, `align-items: center`.
- `.job-top-row2`: `grid`, `grid-template-columns: 1fr 1fr`.
- `.job-top-tech`: `flex-wrap: wrap`, left-aligned chips.
- `.job-top-meta`: `flex-direction: column`, `align-items: flex-end`.

**Notes:** `btn-delete` is always visible in row1 (28×28px, shows "✕" via `::after`, icon hidden with `font-size: 0`). Becomes danger color on hover.

---

### `.equip-card`
```html
<div class="equip-grid">
  <div class="equip-card">
    <div class="equip-heading"><span>System 1</span><span>ESP ~0.5" wc</span></div>
    <div class="equip-row">
      <div class="equip-cell">
        <div class="equip-cell-label">Indoor</div>
        <div class="equip-cell-value">XC2036…</div>
      </div>
      <div class="equip-cell">
        <div class="equip-cell-label">Outdoor</div>
        <div class="equip-cell-value">4AC16…</div>
      </div>
    </div>
    <div class="equip-lv-row">
      <button class="btn-lv">LV Diagram</button>
      <button class="btn-blower">Blower</button>
    </div>
  </div>
</div>
```
**CSS classes:** `equip-grid`, `equip-card`, `equip-heading`, `equip-row`, `equip-cell`, `equip-cell-label`, `equip-cell-value`, `equip-lv-row`, `btn-lv`, `btn-blower`  
**Layout:**
- `.equip-grid`: `display: none` by default → `grid` when `.expanded`. `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`.
- `.equip-card`: `flex-direction: column`, `gap: 8px`. Background `var(--color-bg)`.
- `.equip-row`: `grid`, `1fr 1fr`; expands to `1fr 1fr 1fr` when 3 cells present (`:has` selector).
- `.equip-cell-value.equip-cell-signal`: accent color; `.equip-cell-amber`: warning color.

---

### `.btn-start-job`
```html
<button class="btn-start-job">▶ Start Job</button>
```
**CSS classes:** `btn-start-job`  
**Layout:** `display: flex`, `width: 100%`, `min-height: 48px`. Full-width accent-colored CTA.  
**States:** Hover brightens via `filter: brightness(1.08)`.  
**Notes:** Placed inside `.job-actions` which shows after the job face. Text changes to "Resume Job" when `savedState` exists.

---

## 3. Workspace Sections (Accordion)

### `.step-section` / `.step-header` / `.step-body`
```html
<div id="section-service" class="step-section">
  <div class="step-header" data-section="service">
    <span class="acc-state-icon">○</span>
    <span>Service</span>
    <span class="acc-summary"></span>
    <span class="acc-chevron">›</span>
  </div>
  <div class="step-body">
    …content…
  </div>
</div>
```
**CSS classes:** `step-section`, `step-header`, `step-body`, `acc-state-icon`, `acc-summary`, `acc-chevron`  
**Layout:**
- `.step-section`: `border: 1px solid var(--color-border)`, `border-radius: 10px`, `overflow: hidden`, `margin-bottom: 8px`.
- `.step-header`: `flex`, `height: 52px`, `justify-content: space-between`, `gap: 12px`, `padding: 0 16px`. Hover lightens background.
- `.acc-summary`: `flex: 1`, right-aligned, ellipsis text, shows current selection summary.
- `.step-body`: `display: none` by default; background `var(--color-bg)`.

**States:**
- `.acc-open`: `.step-body` becomes `display: block`. `.acc-chevron` rotates `90deg`.
- `.acc-done`: `.step-header` border accent-colored; `.acc-state-icon` turns accent.
- `.acc-na`: entire section `opacity: 0.5`.

**Section IDs in HTML:** `section-service`, `section-accessories`, `section-fixes`, `section-weight-in`, `section-notes`.

---

## 4. Service Buttons

### `.ws-btn` / `.ws-btn-grid`
```html
<div class="ws-btn-grid">
  <button class="ws-btn ws-btn-active">AC</button>
  <button class="ws-btn">Heat</button>
  <button class="ws-btn">AC & Heat</button>
</div>
```
**CSS classes:** `ws-btn`, `ws-btn-grid`, `ws-btn-active`  
**Layout:**
- `.ws-btn-grid`: `display: grid`, `grid-template-columns: repeat(auto-fit, minmax(100px, 1fr))`, `gap: 8px`, `margin-bottom: 12px`.
- `.ws-btn`: `width: 100%`, `min-height: 64px`, `border-radius: 10px`, `font-size: 15px`, `font-weight: 600`. Background `var(--color-surface)`.

**States:**
- Default: secondary text color.
- `.ws-btn-active`: `background: var(--color-accent-soft)`, `border-color: var(--color-accent)`, accent text.

**Special overrides:**
- `#service-type-buttons` and `#thermostat-buttons` both use `display: grid`, `grid-template-columns: repeat(2, 1fr)` (2-column fixed).

---

## 5. Accessory Buttons / Chips

### `.ws-zone-grid` / `.chip` / `.chip-accessory`
```html
<div id="accessory-buttons">
  <div class="ws-zone-grid">
    <button class="chip chip-sm chip-accessory">FIN180P</button>
    <button class="chip chip-sm chip-accessory selected">Float Switch</button>
    …
  </div>
</div>
```
**CSS classes:** `ws-zone-grid`, `chip`, `chip-sm`, `chip-accessory`, `selected`/`active`  
**Layout:**
- `#accessory-buttons`: `display: block` (overrides chip-group flex).
- `.ws-zone-grid`: `display: grid`, `grid-template-columns: repeat(3, 1fr)`, `gap: 4px`, `margin-bottom: 8px`, `grid-column: 1 / -1`.
- `.chip`: `display: inline-flex`, `height: 32px`, `padding: 0 12px`, `border-radius: 999px`, `font-size: 11px`.
- `.chip-sm`: `height: 26px`, `padding: 0 8px`.

**States:**
- Default: `background: var(--color-surface)`, `border: 1px solid var(--color-border)`.
- `.chip.selected` / `.chip.active`: `background: var(--color-accent)`, `border-color: var(--color-accent)`, accent-text.
- `.chip-accessory`: `border-color: var(--color-success)`, `color: var(--color-success)`.
- `[aria-disabled="true"]`: `opacity: 0.45`, `pointer-events: none`.

**Chip variants in use:**

| Class | Description |
|---|---|
| `chip-primary` | Accent soft bg, accent text |
| `chip-secondary` | Surface-raised bg, secondary text |
| `chip-outline` | Transparent bg, secondary text |
| `chip-label` | Non-interactive label chip |
| `chip-service` | Accent border/text |
| `chip-accessory` | Success border/text |
| `chip-fix` | Warning border/text |

---

## 6. Fix Buttons

### `.ws-fix-grid` / `.fix-group` / `.fix-suboptions`
```html
<div class="ws-fix-grid">
  <button class="ws-btn">Pressure Test</button>   <!-- span 2 cols -->
  <button class="ws-btn">Open Ecoil</button>
  <div class="fix-group">                          <!-- span 3 cols -->
    <button class="ws-btn btn-fix-group">
      Extended Wire <span class="chip-badge">2</span>
    </button>
    <div class="fix-suboptions">
      <button class="chip chip-sm chip-fix">Furnace</button>
      <button class="chip chip-sm chip-fix selected">Cunit</button>
    </div>
  </div>
</div>
```
**CSS classes:** `ws-fix-grid`, `fix-group`, `fix-suboptions`, `btn-fix-group`, `chip-badge`  
**Layout:**
- `.ws-fix-grid`: `display: grid`, `grid-template-columns: repeat(6, 1fr)`, `gap: 8px`.
- `.ws-fix-grid .ws-btn`: `grid-column: span 2` (takes 2 of 6 columns).
- `.ws-fix-grid .fix-group`: `grid-column: span 3` (takes 3 of 6 columns).
- `.fix-group`: `flex-direction: column`, `gap: 4px`.
- `.fix-suboptions`: `flex-wrap: wrap`, `gap: 4px`. Hidden by default (`.hidden`), shown when parent fix is active.
- `.btn-fix-group`: `min-height: 52px`, `padding: 12px`, `justify-content: flex-start`.
- `.chip-badge`: circular count badge inside button, `background: var(--color-accent)`.

**States:** `.fix-suboptions.hidden` → `display: none`. Chips follow standard chip selected state.

---

## 7. Report Card

### `.report-card`
```html
<li>
  <div class="report-card">
    <div class="report-head">
      <span class="report-title">123 Main St</span>
      <span class="report-meta">May 20</span>
    </div>
    <div class="report-body">
      <div class="report-chips">…chip rows…</div>
      <div class="report-notes">Field notes…</div>
      <div class="report-total">
        <span>Total</span>
        <span class="total-amount">$420</span>
        <span class="total-breakdown">…</span>
      </div>
    </div>
    <div class="btn-row">  <!-- hidden until .report-selected -->
      <div class="report-share-group">…</div>
      <button class="btn">Edit</button>
      <button class="btn report-delete-btn">✕</button>
    </div>
  </div>
</li>
```
**CSS classes:** `report-card`, `report-head`, `report-title`, `report-meta`, `report-body`, `report-chips`, `report-notes`, `report-total`, `total-amount`, `total-breakdown`, `report-buttons`, `report-share-group`, `report-share-options`  
**Layout:** `.report-card` block, `border-radius: 10px`, `padding: 12px 16px`, `box-shadow: var(--shadow-sm)`. `.report-head` is `flex`, `justify-content: space-between`.  
**States:**
- Default: `.btn-row` is `display: none`.
- `.report-selected`: accent border + raised surface, `.btn-row` becomes `display: flex`.

**Notes:** `.report-share-options` is absolutely positioned dropdown (2-col grid of share method buttons), toggled via `.hidden`. `.report-delete-btn` is `position: absolute`, `top/right: 8px`.

---

## 8. Modals

### `dialog.modal` / `.modal-header` / `.modal-body`

**Two modal instances in HTML:**
- `#quick-calc-modal` — Quick Charge Calc
- `#settings-modal` — Settings

```html
<dialog id="quick-calc-modal" class="modal">
  <div class="modal-header">
    <span>Quick Charge Calc</span>
    <button class="btn-icon" id="quick-calc-close"></button>
  </div>
  <div id="quick-calc-body" class="modal-body"></div>
</dialog>
```
**CSS classes:** `modal`, `modal-header`, `modal-body`  
**Layout:**
- `dialog.modal`: `position: fixed`, `inset: 0`, `margin: auto`, `width: min(480px, 100dvw - 32px)`, `max-height: calc(100dvh - 64px)`, `display: flex` / `flex-direction: column` when `[open]`.
- `.modal-header`: `flex`, `height` auto, `padding: 12px 16px`, `border-bottom`. Title `font-size: 15px bold`.
- `.modal-body`: `flex: 1`, `overflow-y: auto`, `padding: 16px`, column flex with `gap: 16px`.

**States:**
- Closed: native `<dialog>` closed state (display:none).
- Open (`[open]`): `display: flex` + `scaleIn` animation (scale from 0.95).
- `::backdrop`: `rgba(0,0,0,0.6)` with `backdrop-filter: blur(4px)`.

**Close button:** `.modal-header .btn-icon` has `font-size: 0` with "✕" injected via `::after`.

---

## 9. Settings Panel

### `#settings-modal` internal structure
```html
<div class="modal-body">
  <div class="settings-group">
    <p class="settings-label">Appearance</p>
    <label class="toggle-row">
      <span>Dark Mode</span>
      <input type="checkbox" id="theme-toggle" role="switch" />
    </label>
  </div>
  <div class="settings-group">
    <p class="settings-label">AI Provider</p>
    <div id="ai-provider-row" class="ai-provider-row"></div>
    <div id="ai-provider-ext-row" class="ai-provider-row hidden"></div>
    <button class="btn-text" id="ai-settings-more">More ▾</button>
  </div>
  <div class="settings-group">
    <p class="settings-label">API Key</p>
    <input type="password" id="ai-settings-key-input" />
    <div class="btn-row">
      <button class="btn-primary" id="ai-settings-save">Save</button>
      <button class="btn-secondary" id="ai-settings-clear">Clear</button>
    </div>
    <p id="ai-settings-status" class="settings-status"></p>
  </div>
  <div class="settings-group">
    <p class="settings-label">Prices</p>
    <!-- toggle-row per price item: label + number input -->
    …
    <button class="btn-secondary" id="btn-reset-prices">Reset to defaults</button>
  </div>
</div>
```
**CSS classes:** `settings-group`, `settings-label`, `settings-status`, `ai-provider-row`, `toggle-row`  
**Layout:**
- `.settings-group`: `flex-direction: column`, `gap: 8px`, `padding-bottom: 16px`, `border-bottom: 1px solid var(--color-border)`. Last child has no border.
- `.settings-label`: 11px, uppercase, letter-spacing 0.06em, secondary color.
- `.toggle-row`: `flex`, `justify-content: space-between`, `min-height: 44px`. Contains either a checkbox (custom toggle) or a number input.
- `.toggle-row input[type="checkbox"]`: custom pill toggle 44×26px, accent fill when `:checked`.
- `.ai-provider-row`: `flex-wrap: wrap`, `gap: 8px` — holds provider chip buttons.

**Prices section:** Lists service, accessory, fix prices as `.toggle-row` with `<span>` label + `<input type="number">`. Uses `data-price-category` / `data-price-name` attributes.

---

## 10. LV Tab

### `#tab-lv` / `.lv-container`
```html
<section id="tab-lv" class="tab-panel hidden">
  <div id="lv-container" class="lv-container">
    <!-- Filled by renderLV() -->
    <div class="lv-header">
      <p class="lv-job-addr">123 Main St</p>
      <div class="lv-chip-row">…chips…</div>
    </div>
    <div class="lv-section">
      <p class="lv-section-label">System 1</p>
      <div class="lv-btn-grid">
        <button class="btn">AC Diagram</button>
        …
      </div>
    </div>
    <div class="lv-footer">
      <a class="lv-footer-link" href="…">Series Docs</a>
    </div>
  </div>
</section>
```
**CSS classes:** `lv-container`, `lv-header`, `lv-job-addr`, `lv-no-job`, `lv-chip-row`, `lv-section`, `lv-section-label`, `lv-btn-grid`, `lv-footer`, `lv-footer-link`  
**Layout:**
- `.lv-container`: `padding: 16px`, `min-height: 100%`. Block flow.
- `.lv-chip-row`: `flex-wrap: wrap`, `gap: 8px`.
- `.lv-section`: `margin-bottom: 24px`.
- `.lv-section-label`: 11px uppercase label.
- `.lv-btn-grid`: `flex-wrap: wrap`, `gap: 8px` — holds `.btn` diagram buttons.
- `.lv-footer`: `flex-wrap: wrap`, `gap: 12px`, `border-top`.

**LV Viewer (full-screen overlay, JS-rendered):**
```
#lv-viewer (fixed, z-index 8500, initially opacity:0/pointer-events:none)
  └── .lv-viewer-header (flex, dark semi-transparent)
        ├── .lv-viewer-title
        └── .lv-viewer-btn (share/close)
  └── .lv-viewer-body (flex, centered)
        ├── #lv-diagram-img
        └── .lv-zoom-controls (absolute, bottom-right)
              └── .lv-zoom-btn (×3: +, −, reset)
```
**States:** `.lv-viewer.visible` → `opacity: 1`, `pointer-events: auto`.

---

## 11. Troubleshooting Drawer

### `#ts-drawer` / `.ts-overlay`
```html
<aside id="ts-drawer" class="ts-drawer" aria-hidden="true">
  <header id="ts-header" class="ts-header"></header>
  <div id="ts-body" class="ts-body"></div>
</aside>
<div id="ts-overlay" class="ts-overlay" aria-hidden="true"></div>
```
**CSS classes:** `ts-drawer`, `ts-header`/`ts-drawer-header`, `ts-body`/`ts-drawer-body`, `ts-overlay`  
**Layout:**
- `.ts-overlay`: `position: fixed`, `inset: 0`, `z-index: 8999`, `opacity: 0`, `pointer-events: none`. Backdrop blur.
- `.ts-drawer`: `position: fixed`, `top: 0`, `right: 0`, `width: min(420px, 100vw)`, `height: 100dvh`, `z-index: 9000`. `transform: translateX(100%)` (off-screen right).
- `.ts-header`: `flex`, `min-height: 52px`, `background: var(--color-accent)` (teal bar at top).
- `.ts-body`: `flex: 1`, `overflow-y: auto`, `padding: 12px 16px`, `flex-direction: column`, `gap: 12px`.

**States:**
- `.ts-open` on drawer: `transform: translateX(0)` — slides in from right, `transition: 0.28s cubic-bezier`.
- `.ts-open` on overlay: `opacity: 1`, `pointer-events: auto`.

**Interior components:**

| Class | Purpose |
|---|---|
| `ts-active-job` | Active job context card |
| `ts-severity-badge` + `ts-critical/high/medium/low` | Colored severity pills |
| `ts-step-item` / `ts-step-num` / `ts-step-content` | Numbered checklist steps |
| `ts-step-item.ts-checked` | Completed step (success bg, opacity 0.7) |
| `ts-branch-wrap` / `ts-branch-question` / `ts-branch-btns` | Yes/No branch cards |
| `ts-chat-msg-user` / `ts-chat-msg-assistant` | Chat bubble layout (max-width 88%) |
| `ts-provider-chip` | AI provider selector pill |

---

## 12. Toast

### `.toast-container` / `.undo-toast`
```html
<div id="toast-container" class="toast-container" aria-live="polite">
  <!-- Injected by JS: -->
  <div class="undo-toast">
    Job deleted
    <button class="btn-undo">UNDO</button>
  </div>
</div>
```
**CSS classes:** `toast-container`, `undo-toast`, `btn-undo`  
**Layout:**
- `.toast-container`: `position: fixed`, `bottom: 24px`, `left: 50%`, `transform: translateX(-50%)`, `z-index: var(--z-overlay)` (10000). `flex-direction: column`, `align-items: center`.
- `.undo-toast`: `flex`, `padding: 12px 24px`, `border-radius: 10px`, surface-raised bg. `slideUp` animation on enter.

**States:** `.undo-toast.hiding` → `slideDown` animation. JS removes after 3.5s.

---

## 13. Lightbox

### `#lightbox`
```html
<div id="lightbox" class="lightbox hidden" role="dialog" aria-modal="true">
  <button id="lightbox-close" class="lightbox-close"></button>
  <img id="lightbox-img" src="" alt="" />
</div>
```
**CSS classes:** `lightbox`, `lightbox-close`  
**Layout:** `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.9)`, `flex`, centered. `z-index: var(--z-overlay)` (10000).  
**Image:** `max-width: 90vw`, `max-height: 85dvh`, `object-fit: contain`.  
**Close button:** `position: fixed`, `top: 16px`, `right: 16px`, 44×44px circle, semi-transparent white.  
**States:** `.hidden` → `display: none !important`. Visible: remove `.hidden`.  
**Notes:** There is also a second `#image-lightbox` element managed by JS (via `opacity`/`pointer-events` instead of `.hidden`). Both coexist.

---

## 14. Workspace Footer

### `.workspace-footer`
```html
<footer class="workspace-footer">
  <button id="btn-generate-report" class="btn-primary">Generate Report</button>
  <span id="price-display" class="price-display"></span>
</footer>
```
**CSS classes:** `workspace-footer`, `price-display`  
**Layout:** `position: sticky`, `bottom: 0`, `flex`, `justify-content: space-between`, `padding: 12px 16px`. `z-index: var(--z-sticky)` (100). `box-shadow: 0 -4px 12px rgba(0,0,0,0.15)`.  
**Notes:** `.price-display` is `font-size: 18px`, bold, accent color. Updates live as workspace selections change.
