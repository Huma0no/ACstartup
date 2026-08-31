// src/app.js — Entry point: init, tab routing, event wiring, UI updates.

import {
  initSettings,
  getSettings,
  setTheme,
  setAiProvider,
  setApiKey,
  getApiKey,
  getPrices,
  setPrice,
  resetPrices,
} from "./settings.js";
import {
  createJob,
  updateJob,
  removeJob,
  getJobById,
  getAllJobs,
  sortJobs,
  groupBySubdivision,
} from "./jobs.js";
import {
  saveCompletion,
  getCompletions,
  getActiveJobId,
  setActiveJobId,
  deleteCompletion,
  getWorkspaceState,
} from "./storage.js";
import {
  initWorkspace,
  initWeighInPhotos,
  getState,
  clearWorkspace,
  setOption,
  toggleService,
  setSystemService,
  setThermostat,
  toggleAccessory,
  toggleFix,
  setWeightInData,
  setNotes,
  addSitePhoto,
  removeSitePhoto,
  initSitePhotos,
  onWeighInPhotoChange,
  getPhotoCount,
  getAllPhotos,
  calculateTotals,
  saveProgress,
  buildCompletion,
} from "./workspace.js";
import {
  generateReportText,
  generateDailyReport,
  exportJSON,
  exportCSV,
} from "./reports.js";
import {
  ouncesToPoundsAndOunces,
  calculateApproxAdjust,
  processImageWithGps,
  calculateCFM,
  getSubcoolingDefault,
} from "./utils.js";
import { downloadDiagram, precacheJobs } from "./diagrams.js";
import { initChat, sendMessage, clearHistory } from "./ai.js";
import { renderLV as _renderLV, openViewer as _openViewer } from "./lv.js";
import { importFromJSON } from "./importer.js";
import { initTsPanel } from "./tsPanel.js";
import {
  diagnose,
  buildContext,
  SYMPTOM,
  SYMPTOM_LABELS,
} from "./troubleshootingEngine.js";
import {
  SERVICES,
  ACCESSORIES,
  FIXES,
  THERMOSTATS,
  BUILDERS,
  ACCESSORY_DISPLAY,
  FIX_DISPLAY,
  CUSTOM_PRICE_ACCESSORIES,
  CUSTOM_PRICE_FIXES,
  TWO_SYSTEMS_ACCESSORIES,
  TECH_SUPPLIED_ACCESSORIES,
  DEFAULT_PRICES,
  getIndoorSeriesGroups,
  getOutdoorSeriesGroups,
  getIndoorModel,
  getOutdoorModel,
  INDOOR_CATALOG,
  OUTDOOR_CATALOG,
  SERIES_LINKS,
  OUTDOOR_LINKS,
  FINISH_SERVICE_PRICE,
  FACTORY_LINE_CONFIGS,
  LINE_CONFIG_OPTIONS,
} from "./data.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _activeJob = null;
let _chatInitialized = false;
let _newJobAccChips = [];

const SITE_PRESETS = [
  { label: "No P-Drain", slug: "no_p_drain" },
  { label: "No Gas Meter", slug: "no_gas_meter" },
  { label: "Gas Closed", slug: "gas_closed" },
  { label: "No Electric Meter", slug: "no_electric_meter" },
  { label: "Breakers Missing", slug: "breakers_missing" },
];

let _jsZipPromise = null;
function _loadJSZip() {
  if (_jsZipPromise) return _jsZipPromise;
  _jsZipPromise = new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = (e) => {
      _jsZipPromise = null;
      reject(e);
    };
    document.head.appendChild(s);
  });
  return _jsZipPromise;
}

async function _downloadPhotosZip(filename, silent) {
  const photos = getAllPhotos();
  if (!photos.length) return;
  const safeAddr = (_activeJob?.address || "JOB")
    .replace(/[^a-z0-9]/gi, "_")
    .toUpperCase();
  await _loadJSZip();
  const zip = new window.JSZip();
  for (const { file, label } of photos) {
    const name = `${safeAddr}_${label.toUpperCase().replace(/[^A-Z0-9]/g, "_")}.jpg`;
    zip.file(name, file);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
  if (!silent) toast("Photos downloaded!", "success");
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function _shareVia(method, text) {
  const enc = encodeURIComponent(text);
  switch (method) {
    case "whatsapp":
      window.open(`https://api.whatsapp.com/send?text=${enc}`, "_blank");
      break;
    case "sms":
      window.location.href = `sms:?body=${enc}`;
      break;
    case "email":
      window.location.href = `mailto:?subject=${encodeURIComponent(
        "Service Report"
      )}&body=${enc}`;
      break;
    case "copy":
      navigator.clipboard
        .writeText(text)
        .then(() => toast("Copied!", "success"));
      break;
  }
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

function openTab(name) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => {
    const on = p.id === `tab-${name}`;
    p.classList.toggle("active", on);
    p.classList.toggle("hidden", !on);
  });
  if (name === "jobs") renderJobs();
  if (name === "reports") renderReports();
  if (name === "lv") renderLV();
}

// ---------------------------------------------------------------------------
// Jobs tab
// ---------------------------------------------------------------------------

function renderJobs() {
  const jobs = sortJobs(getAllJobs());
  const list = document.getElementById("jobs-list");

  const section = document.getElementById("add-job-section");
  if (section && !jobs.length) section.classList.remove("hidden");

  if (!jobs.length) {
    list.innerHTML = `<li class="empty-state">No jobs</li>`;
    return;
  }

  const completedIds  = new Set(getCompletions().map((c) => c.jobId));
  const activeJobs    = jobs.filter((j) => !completedIds.has(j.id));
  const completedJobs = jobs.filter((j) => completedIds.has(j.id));

  const cards = groupBySubdivision(activeJobs).flatMap(({ colorIndex, jobs: gj }) =>
    gj.map((j) => ({ job: j, html: jobCardHTML(j, colorIndex) }))
  );

  let html = "";
  cards.forEach(({ html: cardHtml }) => { html += cardHtml; });

  if (completedJobs.length) {
    html += `<li><button class="btn-clear-completed" data-clear-completed>Clear completed</button></li>`;
    completedJobs.forEach((job) => {
      html += `<li class="job-completed"><span class="job-completed-addr">${esc(job.address)}</span></li>`;
    });
  }

  const tstatCounts = {};
  const accCounts   = {};
  activeJobs.forEach((job) => {
    if (job.jobThermostat?.model) {
      const m = job.jobThermostat.model;
      tstatCounts[m] = (tstatCounts[m] || 0) + (job.jobThermostat.qty || 1);
    }
    (job.jobAccessories || []).forEach((key) => {
      if (TECH_SUPPLIED_ACCESSORIES.includes(key)) accCounts[key] = (accCounts[key] || 0) + 1;
    });
  });
  let chipsHtml = Object.entries(tstatCounts)
    .map(([model, n]) => `<span class="chip chip-sm chip-primary">${n}× ${esc(model)}</span>`)
    .join("");
  TECH_SUPPLIED_ACCESSORIES.forEach((key) => {
    if (accCounts[key]) {
      const label = ACCESSORY_DISPLAY[key]?.label || key;
      chipsHtml += `<span class="chip chip-sm chip-secondary">${accCounts[key]}× ${esc(label)}</span>`;
    }
  });
  if (!chipsHtml) chipsHtml = `<span class="load-sheet-empty">No accessories scheduled</span>`;
  html += `<li id="load-sheet-summary">
  <div class="load-sheet-header" data-toggle-summary>
    <span class="acc-chevron">›</span>
    <span>🧰 Load Sheet Summary (All Jobs)</span>
  </div>
  <div class="load-sheet-body hidden">${chipsHtml}</div>
</li>`;

  list.innerHTML = html;
}

function jobCardHTML(job, ci) {
  const inProg = !!job.savedState;
  const badge = inProg
    ? `<span class="badge badge-warning">In Progress</span>`
    : "";
  const ts = job.timeSensitive
    ? `<span class="badge badge-danger">Urgent</span>`
    : "";
  const sysList = Array.isArray(job.systems) && job.systems.length > 0
    ? job.systems
    : [job.system1, job.system2].filter(Boolean);
  const sysCount = sysList.length;

  // Col 1 Row 2 of job-top grid — tstat, zone boards, LP Kit, 2-systems only
  const _zoneAndLp = [
    ACCESSORIES.HARMONY,
    ACCESSORIES.HZ322,
    ACCESSORIES.UT3000,
    ACCESSORIES.LP_KIT_LENNOX_1STG,
    ACCESSORIES.LP_KIT_LENNOX_2STG,
    ACCESSORIES.LP_KIT_GOODMAN,
  ];
  const techChips = [
    job.jobThermostat?.model &&
      (() => {
        const qty = job.jobThermostat.qty || 1;
        return `<span class="chip chip-sm chip-primary">${esc(
          qty >= 3
            ? `${qty}× ${job.jobThermostat.model}`
            : job.jobThermostat.model
        )}</span>`;
      })(),
    ...(job.jobAccessories || [])
      .filter((a) => _zoneAndLp.includes(a))
      .map(
        (a) =>
          `<span class="chip chip-sm chip-accessory">${esc(
            ACCESSORY_DISPLAY[a]?.label || a.toLowerCase()
          )}</span>`
      ),
    sysCount > 1 &&
      `<span class="chip chip-sm chip-secondary">${sysCount} Systems</span>`,
  ]
    .filter(Boolean)
    .join("");

  const _equipCard = (indoor, outdoor, label) => {
    if (!indoor && !outdoor) return "";
    const dOut = outdoor ? getOutdoorModel(outdoor) : null;
    const dIn  = indoor  ? getIndoorModel(indoor)  : null;
    const cfm  = dOut ? calculateCFM(dOut.btu) : null;
    const sc   =
      dOut?.oemSubcoolingGoal != null ? `${dOut.oemSubcoolingGoal} °F` : "—";
    const factoryChargeStr = dOut?.FactoryCharge != null
      ? ouncesToPoundsAndOunces(dOut.FactoryCharge)
      : "—";
    const rev  = dOut?.freon === "R-454B"
      ? (dOut.revisedCharge != null ? ouncesToPoundsAndOunces(dOut.revisedCharge) : "—")
      : "N/A";
    const esp = (dIn?.pESP != null && dIn.pESP !== 9.9)
      ? `ESP ~${dIn.pESP}" wc`
      : "ESP N/A";
    return `<div class="equip-card">
      <div class="equip-heading">
        <span>${esc(label)}</span><span>${esp}</span>
      </div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-label">Indoor</div>
          <div class="equip-cell-value">${indoor ? esc(indoor) : "—"}</div>
        </div>
        <div class="equip-cell">
          <div class="equip-cell-label">Outdoor</div>
          <div class="equip-cell-value">${outdoor ? esc(outdoor) : "—"}</div>
        </div>
      </div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-value">${esc(dIn?.hType || "")}</div>
        </div>
        <div class="equip-cell">
          <div class="equip-cell-value">${esc(dOut?.uType || "")}</div>
        </div>
      </div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-label">Factory</div>
          <div class="equip-cell-value">${factoryChargeStr}</div>
        </div>
        <div class="equip-cell">
          <div class="equip-cell-label">Revised</div>
          <div class="equip-cell-value equip-cell-signal">${rev}</div>
        </div>
      </div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-label">Refrigerant</div>
          <div class="equip-cell-value">${dOut?.freon || "—"}</div>
        </div>
        <div class="equip-cell">
          <div class="equip-cell-label">Subcooling</div>
          <div class="equip-cell-value equip-cell-amber">${sc}</div>
        </div>
      </div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-label">CFM Max</div>
          <div class="equip-cell-value">${cfm ? cfm.max : "—"}</div>
        </div>
        <div class="equip-cell">
          <div class="equip-cell-label">CFM Min</div>
          <div class="equip-cell-value">${cfm ? cfm.min : "—"}</div>
        </div>
      </div>
      <div class="equip-lv-row">
        <button class="btn-lv" data-type="indoor" data-model="${esc(
          indoor || ""
        )}">Indoor LV</button>
        <button class="btn-lv" data-type="outdoor" data-model="${esc(
          outdoor || ""
        )}">Outdoor LV</button>
        <button class="btn-blower" data-model="${esc(
          indoor || ""
        )}">Blower Data</button>
      </div>
    </div>`;
  };
  const equipCards = sysList
    .map((sys, idx) => _equipCard(sys.indoor, sys.outdoor, `System ${idx + 1}`))
    .filter(Boolean)
    .join("");

  const _hist = job.addressHistory;
  const _note = job.dispatchNote;
  const histPair = (_hist && _hist.length)
    ? `<button class="chip chip-sm chip-history" data-toggle-history="${esc(job.id)}" style="border-color:var(--subdivision-${ci})">History</button>
  <div class="job-history-entries" style="border-color:var(--subdivision-${ci})">${_hist.map((h) => `<div class="job-history-entry">${esc(h)}</div>`).join("")}</div>`
    : "";
  const notePair = _note
    ? `<button class="chip chip-sm chip-history" data-toggle-history="${esc(job.id)}-note" style="border-color:var(--subdivision-${ci})">Dispatch Note</button>
  <div class="job-history-entries" style="border-color:var(--subdivision-${ci})"><div class="job-history-entry">${esc(_note)}</div></div>`
    : "";
  const historyHTML = (histPair || notePair)
    ? `<div class="job-history">
  ${histPair}${notePair}
</div>`
    : "";

  return `
<li class="job-item${inProg ? " expanded" : ""}" data-id="${esc(job.id)}"
    style="border-left-color:var(--subdivision-${ci})">
  <div class="job-face">
    <div class="job-top">
      <div class="job-top-row1">
        <div class="job-top-addr"><strong>${esc(job.address)}</strong></div>
        <button class="btn-delete" data-delete="${esc(job.id)}"
          aria-label="Delete"></button>
      </div>
      ${job.notes ? `<div class="job-top-notes">${esc(job.notes)}</div>` : ""}
      <div class="job-top-row2">
        ${techChips ? `<div class="job-top-tech">${techChips}</div>` : '<div class="job-top-tech"></div>'}
        <div class="job-top-meta">
          <div class="job-meta-chips">
            <span class="chip chip-sm chip-secondary">${esc(job.builder)}</span>
            <span class="chip chip-sm chip-secondary">${esc(job.subdivision)}</span>
          </div>
          ${badge}${ts}
          <button class="btn btn-edit" data-edit="${esc(job.id)}">Edit</button>
          <button class="btn btn-maps" data-maps="${esc(job.address)}">Maps</button>
        </div>
      </div>
    </div>
    ${equipCards ? `<div class="equip-grid">${equipCards}</div>` : ""}
    ${historyHTML}
    <button class="btn-start-job" data-start="${esc(job.id)}">
      ${inProg ? "Continue →" : "Start →"}
    </button>
  </div>
</li>`;
}

// ---------------------------------------------------------------------------
// Open workspace
// ---------------------------------------------------------------------------

function openWorkspace(job) {
  _activeJob = job;
  setActiveJobId(job.id);
  const isResume = getWorkspaceState()?.jobId === job.id;
  initWorkspace(job);
  initWeighInPhotos(job.address);
  onWeighInPhotoChange(_updatePhotoCount);
  _initSitePhotoPresets();
  initChat(job);
  _chatInitialized = true;
  openTab("workspace");
  renderWorkspace();
  _showSection("section-service");
  updateActiveJobBar();
  initSitePhotos().then((stored) => {
    for (const [slug, { file, label, gps, gpsSource }] of Object.entries(stored)) {
      _renderSitePhotoThumb(slug, label, file, gps, gpsSource);
    }
    _updatePhotoCount();
  });
}

// ---------------------------------------------------------------------------
// Workspace rendering
// ---------------------------------------------------------------------------

const WI_FIELDS = [
  ["linesetLength", "Lineset ft"],
  ["factoryChargeOz", "Factory Charge oz"],
  ["factoryLineConfig", "Line Config"],
  ["approxAdjustOz", "Approx Adjust oz"],
  ["adjustedOz", "Adjusted oz"],
  ["fanSpeedCfm", "Fan CFM"],
  ["liquidLineTemp", "Liquid Temp °F"],
  ["suctionLineTemp", "Suction Temp °F"],
  ["condenserSatTemp", "Condenser Sat °F"],
  ["subcoolingValue", "Subcooling °F"],
  ["oemSubcoolingGoal", "OEM SC Goal °F"],
  ["subcoolingDeviation", "SC Deviation °F"],
];

const FIX_GROUPS = [
  {
    label: "Fixed Leaks",
    id: "leaks",
    fixes: [
      { key: FIXES.LEAKS_ECOIL, label: "Ecoil" },
      { key: FIXES.LEAKS_CUNIT, label: "Cunit" },
      { key: FIXES.LEAKS_WALL, label: "Wall" },
    ],
  },
  {
    label: "Extended Wire",
    id: "ext-lv",
    fixes: [
      { key: FIXES.EXTENDED_WIRE_FURNACE, label: "Furnace" },
      { key: FIXES.EXTENDED_WIRE_CUNIT, label: "Cunit" },
    ],
  },
];

function wiGridHTML(data, attr) {
  return `<div class="wi-grid">${WI_FIELDS.map(([key, lbl]) => {
    let field;
    if (key === "factoryLineConfig") {
      const val = data?.[key] ?? "";
      const opts = LINE_CONFIG_OPTIONS.map(
        (o) =>
          `<option value="${esc(o)}"${o === val ? " selected" : ""}>${
            esc(o) || "—"
          }</option>`
      ).join("");
      field = `<select ${attr}="${key}">${opts}</select>`;
    } else {
      field = `<input type="text" inputmode="decimal" ${attr}="${key}" value="${esc(
        data?.[key] ?? ""
      )}">`;
    }
    const warn =
      key === "subcoolingValue"
        ? `<span class="sc-warning" data-sc-warn></span>`
        : "";
    return `<label class="wi-field"><span>${lbl}</span>${field}</label>${warn}`;
  }).join("")}</div>`;
}

function _showSection(id) {
  document.querySelectorAll("#workspace-form .step-section")
    .forEach((s) => s.classList.remove("ws-section-active"));
  document.getElementById(id)?.classList.add("ws-section-active");
  document.querySelectorAll("#ws-nav .ws-nav-chip")
    .forEach((c) => c.classList.toggle("ws-nav-current", c.dataset.nav === id));
}

function renderWorkspace() {
  const job = _activeJob;
  const state = getState();
  const on = !!(job && state);

  document.getElementById("workspace-empty").classList.toggle("hidden", on);
  document.getElementById("workspace-form").classList.toggle("hidden", !on);
  document.getElementById("ws-nav").classList.toggle("hidden", !on);
  if (!on) return;

  // Step 1 — Services
  const sel = state.selectedServices;
  const SVC_BTNS = [
    SERVICES.AC,
    SERVICES.HEAT,
    SERVICES.FINISH,
    SERVICES.PRESTART,
    SERVICES.DRIVE_RUN,
    SERVICES.CANCEL,
  ];
  document.getElementById("service-type-buttons").innerHTML =
    SVC_BTNS.map(
      (n) =>
        `<button class="ws-btn${
          sel.includes(n) ? " ws-btn-active" : ""
        }" data-service="${esc(n)}">${esc(n)}</button>`
    ).join("");
  const sysCount = Array.isArray(state.systems) && state.systems.length > 0
    ? state.systems.length
    : (state.isTwoSystems ? 2 : 1);
  const _showTwoSys = sel.some((s) => [SERVICES.AC, SERVICES.HEAT, SERVICES.FINISH, SERVICES.PRESTART].includes(s));
  const _showTemp   = sel.some((s) => [SERVICES.AC, SERVICES.HEAT].includes(s));
  const sysControl = sysCount > 2
    ? `<span class="chip chip-sm chip-secondary" style="font-weight:bold">${sysCount} Systems</span>`
    : `<label class="toggle-row"><span>2 Systems</span><input type="checkbox" id="ws-two-systems"${(state.isTwoSystems || sysCount === 2) ? " checked" : ""}></label>`;

  document.getElementById("ac-heat-options").innerHTML =
    (_showTwoSys ? sysControl : "") +
    (_showTemp ? `<label class="toggle-row"><span>Temporarily</span>
      <input type="checkbox" id="ws-temporarily"${
        state.isTemporary ? " checked" : ""
      }></label>` : "");

  // Per-System Service Override Expander (for multi-system mixed services)
  const perSysContainer = document.getElementById("per-system-services-container");
  if (perSysContainer) {
    if (sysCount > 1 && !sel.includes(SERVICES.CANCEL)) {
      const hasOverrides = state.systems.some((s) => s.serviceType);
      perSysContainer.innerHTML = `
        <details class="ws-per-sys-details" ${hasOverrides ? "open" : ""} style="margin-top:var(--space-2);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-2)">
          <summary style="font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);color:var(--color-primary);cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between">
            <span>⚙️ Per-System Services (${sysCount} Systems)</span>
            <span style="font-size:10px;color:var(--color-text-muted);font-weight:normal">${hasOverrides ? "Mixed Active" : "Click to Override"}</span>
          </summary>
          <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2)">
            ${state.systems.map((sys, idx) => `
              <div class="ws-sys-service-row" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding:var(--space-1) 0;border-bottom:1px solid var(--color-border-subtle)">
                <div style="font-size:var(--font-size-xs)">
                  <strong>System ${idx + 1}</strong>
                  <span style="color:var(--color-text-muted);margin-left:4px">${[sys.indoor, sys.outdoor].filter(Boolean).join(" / ") || "Unit"}</span>
                </div>
                <select class="ws-sys-svc-override" data-sys-idx="${idx}" style="font-size:var(--font-size-xs);padding:2px 6px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text)">
                  <option value="">Default (${sel.join(" & ") || "Inherit"})</option>
                  ${[SERVICES.AC, SERVICES.HEAT, SERVICES.AC_HEAT, SERVICES.PRESTART, SERVICES.FINISH, SERVICES.DRIVE_RUN].map((svc) => `
                    <option value="${esc(svc)}"${sys.serviceType === svc ? " selected" : ""}>${esc(svc)}</option>
                  `).join("")}
                </select>
              </div>
            `).join("")}
          </div>
        </details>
      `;
      perSysContainer.querySelectorAll(".ws-sys-svc-override").forEach((selEl) => {
        selEl.addEventListener("change", (e) => {
          const sIdx = parseInt(e.target.dataset.sysIdx, 10);
          setSystemService(sIdx, e.target.value || null);
          saveProgress(_activeJob);
          updatePriceDisplay();
          updateAccordionSummaries();
          renderWorkspace();
        });
      });
    } else {
      perSysContainer.innerHTML = "";
    }
  }

  // Step 3 — Thermostat
  const tsel = state.selectedThermostat;
  document.getElementById("thermostat-buttons").innerHTML =
    THERMOSTATS.map(
      (n) =>
        `<button class="ws-btn${
          tsel === n ? " ws-btn-active" : ""
        }" data-tstat="${esc(n)}">${esc(n)}</button>`
    ).join("") +
    `<button class="ws-btn${tsel && !THERMOSTATS.includes(tsel) ? " ws-btn-active" : ""}" data-tstat-other>${tsel && !THERMOSTATS.includes(tsel) ? esc(tsel) : "Other"}</button>` +
    (tsel
      ? `<div class="ws-qty-row">` +
        ["1", "2", "3", "4+"].map((q) => {
          const isActive =
            q === "4+"
              ? state.thermostatQuantity >= 4
              : state.thermostatQuantity === parseInt(q);
          return `<button class="ws-qty-btn${
            isActive ? " ws-qty-active" : ""
          }" data-qty-select="${q}">${q}</button>`;
        }).join("") +
        `</div>`
      : "");
  const _otherRow = document.getElementById("tstat-other-row");
  if (tsel && !THERMOSTATS.includes(tsel)) {
    document.getElementById("tstat-other-input").value = tsel;
    _otherRow.classList.remove("hidden");
  } else {
    _otherRow.classList.add("hidden");
  }

  // Step 4 — Accessories
  const _accBtn = (n) => {
    if (n === ACCESSORIES.OTRO) {
      return `<button class="ws-btn" data-accessory="${esc(n)}">Other</button>`;
    }
    const active =
      state.selectedAccessories.includes(n) ||
      state.customAccessories.some((a) => a.name === n);
    const disp = ACCESSORY_DISPLAY[n]?.label || n.toLowerCase();
    const custom = CUSTOM_PRICE_ACCESSORIES.includes(n) ? " data-custom" : "";
    return `<button class="ws-btn${
      active ? " ws-btn-active" : ""
    }" data-accessory="${esc(n)}"${custom}>${esc(disp)}</button>`;
  };
  const _LP_KIT = [
    { key: ACCESSORIES.LP_KIT_LENNOX_1STG, label: "Lennox 1Stg" },
    { key: ACCESSORIES.LP_KIT_LENNOX_2STG, label: "Lennox 2Stg" },
    { key: ACCESSORIES.LP_KIT_GOODMAN,     label: "Goodman" },
  ];
  const _lpActive = _LP_KIT.find((i) => state.selectedAccessories.includes(i.key));
  const _lpBadge = _lpActive ? ` <span class="chip-badge">1</span>` : "";
  const _lpSubHTML = _LP_KIT.map(({ key, label }) =>
    `<button class="chip chip-sm${
      state.selectedAccessories.includes(key) ? " chip-accessory" : ""
    }" data-accessory="${esc(key)}">${esc(label)}</button>`
  ).join("");
  document.getElementById("accessory-buttons").innerHTML =
    `<div class="ws-zone-grid">` +
    [
      ACCESSORIES.UT3000,
      ACCESSORIES.HZ322,
      ACCESSORIES.DAPC,
      ACCESSORIES.ECOIL_WIRE,
      ACCESSORIES.E_BYPASS,
      ACCESSORIES.HARMONY,
      ACCESSORIES.BYPASS,
      ACCESSORIES.FIN180P,
      ACCESSORIES.FLOAT_SWITCH,
      ACCESSORIES.WEIGHT_IN_DATA,
      ACCESSORIES.DEHUM,
      ACCESSORIES.TRANE_HARNESS,
      ACCESSORIES.APRIL_AIR,
      ACCESSORIES.FA_INTAKE,
      ACCESSORIES.FIN6_MD,
      ACCESSORIES.RDS,
    ].map((n) => _accBtn(n)).join("") +
    `<button class="ws-btn${_lpActive ? " ws-btn-active" : ""}" data-group-toggle="lp-kit">LP Kit${_lpBadge}</button>` +
    _accBtn(ACCESSORIES.OTRO) +
    `</div>` +
    `<div class="fix-suboptions${_lpActive ? "" : " hidden"}" id="fix-group-lp-kit">${_lpSubHTML}</div>` +
    (state.customAccessories.length
      ? `<div class="fix-chips-row">${state.customAccessories.map((a) =>
          `<span class="chip chip-sm chip-accessory">${esc(a.name)}${a.price ? ` $${a.price}` : ""}<button type="button" class="chip-remove" data-remove-custom-acc="${esc(a.name)}" aria-label="Remove">×</button></span>`
        ).join("")}</div>`
      : "");

  // Step 5 — Fixes
  const _groupedKeys = new Set(
    FIX_GROUPS.flatMap((g) => g.fixes.map((f) => f.key))
  );
  const _groupsHTML = FIX_GROUPS.map((group) => {
    const count = group.fixes.filter((f) =>
      state.selectedFixes.includes(f.key)
    ).length;
    const badge = count > 0 ? ` <span class="chip-badge">${count}</span>` : "";
    const subHTML = group.fixes
      .map((f) => {
        const active = state.selectedFixes.includes(f.key);
        return `<button class="chip chip-sm${
          active ? " chip-accessory" : ""
        }" data-fix="${esc(f.key)}">${esc(f.label)}</button>`;
      })
      .join("");
    return `<div class="fix-group">
      <button class="ws-btn${
        count > 0 ? " ws-btn-active" : ""
      }" data-group-toggle="${esc(group.id)}">${esc(
      group.label
    )}${badge}</button>
      <div class="fix-suboptions${
        count > 0 ? "" : " hidden"
      }" id="fix-group-${esc(group.id)}">${subHTML}</div>
    </div>`;
  }).join("");
  const _standaloneHTML = Object.values(FIXES)
    .filter((n) => !_groupedKeys.has(n) && n !== FIXES.EXTENDED_WIRE)
    .map((n) => {
      if (n === FIXES.OTRO) {
        return `<button class="ws-btn" data-fix="${esc(n)}">Other</button>`;
      }
      const active =
        state.selectedFixes.includes(n) ||
        state.customFixes.some((f) => f.name === n);
      const disp = FIX_DISPLAY[n]?.label || n.toLowerCase();
      const custom = CUSTOM_PRICE_FIXES.includes(n) ? " data-custom" : "";
      return `<button class="ws-btn${
        active ? " ws-btn-active" : ""
      }" data-fix="${esc(n)}"${custom}>${esc(disp)}</button>`;
    })
    .join("");
  const _customFixChips = state.customFixes.length
    ? `<div class="fix-chips-row">${state.customFixes.map((f) =>
        `<span class="chip chip-sm chip-fix">${esc(f.name)}${f.price ? ` $${f.price}` : ""}<button type="button" class="chip-remove" data-remove-custom-fix="${esc(f.name)}" aria-label="Remove">×</button></span>`
      ).join("")}</div>`
    : "";
  document.getElementById("fixes-list").innerHTML =
    `<div class="ws-fix-grid">${_standaloneHTML}${_groupsHTML}</div>${_customFixChips}`;

  // Step 5 — Weight-In
  const rawSystems = Array.isArray(state.systems) && state.systems.length > 0
    ? state.systems
    : [
        { indoor: state.heaterModel || job.system1?.indoor, outdoor: state.outdoorModel || job.system1?.outdoor, weightInData: state.weightInData },
        ...((state.isTwoSystems || state.heaterModel2 || state.outdoorModel2 || job.system2) ? [{
          indoor: state.heaterModel2 || job.system2?.indoor,
          outdoor: state.outdoorModel2 || job.system2?.outdoor,
          weightInData: state.weightInData2
        }] : [])
      ];

  const wiContainer = document.getElementById("wi-systems-container");
  if (wiContainer) {
    wiContainer.innerHTML = rawSystems.map((sys, idx) => {
      const sysNum = idx + 1;
      const attr = sysNum === 1 ? "data-wi" : (sysNum === 2 ? "data-wi2" : `data-wi-${sysNum}`);
      let wiData = { ...(sys.weightInData || (sysNum === 1 ? state.weightInData : (sysNum === 2 ? state.weightInData2 : {})) || {}) };
      const _wiOutdoor = getOutdoorModel(sys.outdoor);
      if (_wiOutdoor) {
        const _cfg = FACTORY_LINE_CONFIGS[wiData.factoryLineConfig];
        const _baseCharge = (_cfg?.isRevised && _wiOutdoor.revisedCharge)
          ? _wiOutdoor.revisedCharge
          : _wiOutdoor.FactoryCharge;

        let _changed = false;
        if ((wiData.factoryChargeOz == null || wiData.factoryChargeOz === "") && _baseCharge != null) {
          wiData.factoryChargeOz = String(_baseCharge);
          _changed = true;
        }
        if (wiData.oemSubcoolingGoal == null || wiData.oemSubcoolingGoal === "") {
          wiData.oemSubcoolingGoal = String(getSubcoolingDefault(sys.outdoor));
          _changed = true;
        }
        if ((wiData.approxAdjustOz == null || wiData.approxAdjustOz === "") && wiData.linesetLength && wiData.factoryLineConfig) {
          const calcAdj = calculateApproxAdjust(parseFloat(wiData.linesetLength), wiData.factoryLineConfig);
          if (calcAdj !== null) {
            wiData.approxAdjustOz = calcAdj;
            _changed = true;
          }
        }
        if (_changed) {
          setWeightInData(wiData, sysNum);
        }
      }

      return `
        <div id="wi-fields-sys${sysNum}" class="wi-system-block" data-sys-num="${sysNum}">
          <div class="wi-system-header">
            <span class="step-label">System ${sysNum}</span>
            <div class="wi-model-chips">
              ${sys.indoor ? `<span class="chip chip-sm">${esc(sys.indoor)}</span>` : ""}
              ${sys.outdoor ? `<span class="chip chip-sm">${esc(sys.outdoor)}</span>` : ""}
            </div>
          </div>
          ${wiGridHTML(wiData, attr)}
          <div id="wi-photo-row-${sysNum}"></div>
        </div>
      `;
    }).join("");

    initWeighInPhotos(state.address || job.address || "default", rawSystems.length);

    rawSystems.forEach((sys, idx) => {
      const sysNum = idx + 1;
      const wiData = sys.weightInData || (sysNum === 1 ? state.weightInData : (sysNum === 2 ? state.weightInData2 : {})) || {};
      _renderNewTotalCharge(wiData, sysNum);
    });
  }

  // Step 6 — Notes & Photos
  document.getElementById("notes-input").value = state.notes || "";
  updatePriceDisplay();
  updateAccordionSummaries();
}

function updateAccordionSummaries() {
  const state = getState();
  if (!state) return;

  const setDone = (id, done) => {
    const chip = document.querySelector(`#ws-nav [data-nav="${id}"]`);
    if (chip) chip.classList.toggle("ws-nav-done", done);
    const btn = document.querySelector(`#${id} .btn-next`);
    if (btn) btn.classList.toggle("btn-next-active", done);
  };

  setDone("section-service", state.selectedServices.length > 0);
  setDone("section-tstat", !!state.selectedThermostat);
  setDone("section-accessories", state.selectedAccessories.length > 0 || state.customAccessories.length > 0);
  setDone("section-fixes", state.selectedFixes.length > 0 || state.customFixes.length > 0);
  setDone("section-weight-in", Object.values(state.weightInData || {}).some(Boolean));
  setDone("section-notes", (state.notes || "").length > 0);
}

function _updatePhotoCount() {
  const n = getPhotoCount();
  const btn = document.getElementById("btn-download-site-photos");
  if (btn) {
    btn.textContent = `Download All Photos (${n})`;
    btn.disabled = n === 0;
  }
}

function _renderSitePhotoThumb(slug, label, file, gps = null, gpsSource = null) {
  const slot = document.getElementById(`site-slot-${slug}`);
  if (!slot) return;
  const existing = document.getElementById(`site-thumb-${slug}`);
  if (existing) {
    const prev = existing.querySelector("img");
    if (prev?.src?.startsWith("blob:")) URL.revokeObjectURL(prev.src);
    existing.remove();
  }

  const objectUrl = URL.createObjectURL(file);
  const thumb = document.createElement("div");
  thumb.id = `site-thumb-${slug}`;
  thumb.style.cssText =
    "display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-1);";

  const img = document.createElement("img");
  img.src = objectUrl;
  img.setAttribute("data-lightbox-src", objectUrl);
  img.style.cssText =
    "width:60px;height:60px;object-fit:cover;border-radius:var(--radius-sm);cursor:pointer;";
  img.title = "Click to enlarge";

  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  labelSpan.style.cssText =
    "font-size:var(--font-size-xs);color:var(--color-text-secondary);";

  if (gps) {
    const chip = document.createElement("span");
    chip.className = "img-gps-chip";
    chip.textContent = gpsSource === "device" ? "📍 GPS" : "📍 EXIF";
    chip.title = gpsSource === "device" ? `Device GPS: ${gps.lat}, ${gps.lon}` : `EXIF GPS: ${gps.lat}, ${gps.lon}`;
    chip.style.cssText = "font-size:var(--font-size-xs);color:var(--color-accent, #38bdf8);font-weight:600;";
    labelSpan.appendChild(document.createTextNode(" "));
    labelSpan.appendChild(chip);
  }

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn";
  removeBtn.textContent = "✕";
  removeBtn.style.cssText = "padding:2px 6px;font-size:var(--font-size-xs);";
  removeBtn.onclick = () => {
    URL.revokeObjectURL(objectUrl);
    thumb.remove();
    removeSitePhoto(slug);
    saveProgress(_activeJob);
    _updatePhotoCount();
  };

  thumb.appendChild(img);
  thumb.appendChild(labelSpan);
  thumb.appendChild(removeBtn);
  slot.appendChild(thumb);
}

function _makeSiteSlot(slug, label) {
  const slot = document.createElement("div");
  slot.id = `site-slot-${slug}`;
  slot.style.cssText =
    "display:inline-flex;flex-direction:column;margin:var(--space-1);";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = "";
    const { file: processedFile, gps, gpsSource } = await processImageWithGps(file);
    addSitePhoto(slug, label, processedFile, gps, gpsSource);
    saveProgress(_activeJob);
    _renderSitePhotoThumb(slug, label, processedFile, gps, gpsSource);
    _updatePhotoCount();
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-secondary";
  btn.textContent = label;
  btn.onclick = () => fileInput.click();

  slot.appendChild(btn);
  slot.appendChild(fileInput);
  return slot;
}

function _initSitePhotoPresets() {
  const container = document.getElementById("site-photo-presets");
  container.innerHTML = "";

  for (const { label, slug } of SITE_PRESETS) {
    container.appendChild(_makeSiteSlot(slug, label));
  }

  // "+ Other" — shows a text input, then opens file picker
  const otherWrap = document.createElement("div");
  otherWrap.id = "site-other-wrap";
  otherWrap.style.cssText =
    "display:inline-flex;flex-direction:column;gap:var(--space-1);margin:var(--space-1);";

  const otherFileInput = document.createElement("input");
  otherFileInput.type = "file";
  otherFileInput.accept = "image/*";
  otherFileInput.style.display = "none";

  const otherLabelInput = document.createElement("input");
  otherLabelInput.type = "text";
  otherLabelInput.placeholder = "Label…";
  otherLabelInput.style.cssText = "display:none;width:140px;";

  let _pendingLabel = "";

  const otherBtn = document.createElement("button");
  otherBtn.type = "button";
  otherBtn.className = "btn-secondary";
  otherBtn.textContent = "+ Other";
  otherBtn.onclick = () => {
    otherLabelInput.style.display = "inline-block";
    otherLabelInput.focus();
  };

  otherLabelInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const label = otherLabelInput.value.trim();
      if (!label) return;
      _pendingLabel = label;
      otherLabelInput.value = "";
      otherLabelInput.style.display = "none";
      otherFileInput.click();
    } else if (e.key === "Escape") {
      otherLabelInput.value = "";
      otherLabelInput.style.display = "none";
    }
  });

  otherFileInput.addEventListener("change", async () => {
    const file = otherFileInput.files[0];
    if (!file || !_pendingLabel) return;
    const label = _pendingLabel;
    const slug =
      label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
    otherFileInput.value = "";
    _pendingLabel = "";
    const { file: processedFile, gps, gpsSource } = await processImageWithGps(file);
    const slot = _makeSiteSlot(slug, label);
    container.insertBefore(slot, otherWrap);
    addSitePhoto(slug, label, processedFile, gps, gpsSource);
    saveProgress(_activeJob);
    _renderSitePhotoThumb(slug, label, processedFile, gps, gpsSource);
    _updatePhotoCount();
  });

  otherWrap.appendChild(otherBtn);
  otherWrap.appendChild(otherLabelInput);
  otherWrap.appendChild(otherFileInput);
  container.appendChild(otherWrap);
}

function updatePriceDisplay() {
  const t = calculateTotals(getState(), getPrices());
  document.getElementById("price-display").textContent = `$${t.total}`;
}

function _renderNewTotalCharge(data, sys) {
  const el = document.getElementById(
    sys === 1 ? "wi-new-total-charge" : (sys === 2 ? "wi-new-total-charge-2" : `wi-new-total-charge-${sys}`)
  ) || document.getElementById(`wi-new-total-charge-${sys}`);
  if (!el) return;
  const fc = parseFloat(data?.factoryChargeOz);
  const adj = parseFloat(data?.adjustedOz);
  el.textContent =
    !isNaN(fc) && !isNaN(adj) ? ouncesToPoundsAndOunces(fc + adj) : "—";
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------

function renderReports() {
  const list = document.getElementById("reports-list");
  const empty = document.getElementById("reports-empty");
  const actions = document.getElementById("reports-global-actions");
  const all = getCompletions();

  if (!all.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    actions.classList.add("hidden");
    return;
  }
  empty.classList.add("hidden");
  actions.classList.remove("hidden");
  list.innerHTML = all
    .map((c) => {
      const bd = [
        c.totals.service ? `Svc $${c.totals.service}` : "",
        c.totals.accessory ? `Acc $${c.totals.accessory}` : "",
        c.totals.fix ? `Fix $${c.totals.fix}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      return `
    <li class="report-card" data-jobid="${esc(c.jobId)}">
      <button class="btn report-delete-btn" data-delete="${esc(
        c.jobId
      )}">✕</button>
      <div class="report-addr">
        <strong>${esc(c.address)}</strong>
        <span class="chip chip-sm chip-primary">$${c.totals.total}</span>${
        bd ? `<span class="report-breakdown">${bd}</span>` : ""
      }
      </div>
      <p class="report-text">${esc(c.reportText || "")}</p>
      <div class="btn-row">
        <button class="btn btn-copy" data-copy="${esc(
          c.reportText || ""
        )}">Copy</button>
        <button class="btn" data-edit-report="${esc(c.jobId)}">Edit</button>
        <button class="btn" data-share-toggle="${esc(
          c.jobId
        )}">Share</button>
      </div>
      <div id="share-panel-${esc(c.jobId)}" class="hidden">
        <div class="btn-row">
          <button class="btn" data-share-method="whatsapp" data-share-text="${esc(
            c.reportText || ""
          )}">WhatsApp</button>
          <button class="btn" data-share-method="sms"      data-share-text="${esc(
            c.reportText || ""
          )}">SMS</button>
          <button class="btn" data-share-method="email"    data-share-text="${esc(
            c.reportText || ""
          )}">Email</button>
          <button class="btn" data-share-method="copy"     data-share-text="${esc(
            c.reportText || ""
          )}">Copy</button>
        </div>
      </div>
    </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// LV tab
// ---------------------------------------------------------------------------

function renderLV() {
  _renderLV(document.getElementById("lv-container"));
}

// ---------------------------------------------------------------------------
// Settings modal
// ---------------------------------------------------------------------------

const AI_PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google" },
];

const AI_PROVIDER_LINKS = {
  anthropic: { href: "https://console.anthropic.com/settings/billing", text: "Get API key · Add credits →" },
  openai:    { href: "https://platform.openai.com/account/billing",    text: "Get API key · Add credits →" },
  google:    { href: "https://aistudio.google.com",                    text: "Get API key (free) →" },
};

function _renderPricesBody(prices) {
  const row = (cat, name, label, val) =>
    `<label class="toggle-row"><span>${esc(label)}</span><input type="number" min="0" step="1" data-price-category="${cat}" data-price-name="${esc(name)}" value="${val}"></label>`;

  const svcRows = Object.keys(DEFAULT_PRICES.SERVICE)
    .map(k => row("SERVICE", k, k, prices.SERVICE[k] ?? ""))
    .join("");

  const accRows = Object.keys(DEFAULT_PRICES.ACCESSORY)
    .map(k => {
      const r = row("ACCESSORY", k, k, prices.ACCESSORY[k] ?? "");
      if (k === ACCESSORIES.WEIGHT_IN_DATA)
        return r + row("WEIGHT_IN_FINISH_ADDON", "", "  + Finish addon", prices.WEIGHT_IN_FINISH_ADDON);
      return r;
    })
    .join("");

  const fixRows = Object.keys(DEFAULT_PRICES.FIX)
    .map(k => row("FIX", k, k, prices.FIX[k] ?? ""))
    .join("");

  return [
    `<p class="settings-label">Services</p>`, svcRows,
    `<p class="settings-label">Accessories</p>`, accRows,
    `<p class="settings-label">Fixes</p>`, fixRows,
  ].join("");
}

function renderSettingsModal() {
  const s = getSettings();
  document.getElementById("theme-toggle").checked = s.theme === "dark";
  document.getElementById("theme-terminal-btn")?.classList.toggle("chip-primary", s.theme === "terminal");
  document.getElementById("ai-provider-row").innerHTML = AI_PROVIDERS.map(
    ({ id, label }) =>
      `<button class="chip chip-sm${
        s.aiProvider === id ? " chip-primary" : ""
      }" data-provider="${id}">${label}</button>`
  ).join("");
  document.getElementById("ai-settings-key-input").value = getApiKey(s.aiProvider);
  document.getElementById("ai-settings-status").textContent = getApiKey(s.aiProvider)
    ? "Key saved."
    : "No key saved.";
  const _link = AI_PROVIDER_LINKS[s.aiProvider] || AI_PROVIDER_LINKS.anthropic;
  document.getElementById("ai-settings-link").href        = _link.href;
  document.getElementById("ai-settings-link").textContent = _link.text;
  document.getElementById("settings-prices-body").innerHTML = _renderPricesBody(getPrices());
}

// ---------------------------------------------------------------------------
// Add Job — helpers
// ---------------------------------------------------------------------------

function _indoorOptgroups() {
  return getIndoorSeriesGroups()
    .map(
      ({ series, models }) =>
        `<optgroup label="${esc(series)}">${models
          .map((m) => `<option value="${esc(m)}">${esc(m)}</option>`)
          .join("")}</optgroup>`
    )
    .join("");
}

function _outdoorOptgroups() {
  return getOutdoorSeriesGroups()
    .map(
      ({ series, models }) =>
        `<optgroup label="${esc(series)}">${models
          .map((m) => `<option value="${esc(m)}">${esc(m)}</option>`)
          .join("")}</optgroup>`
    )
    .join("");
}

const _LINK_SKIP = new Set([
  "linkText",
  "supplyLinkText",
  "blowerSpeedText",
  "blowerSpeedImage",
]);
const _LINK_LABELS = {
  serviceManual: "Service Manual",
  installManual: "Install Manual",
  lennoxPros: "LennoxPros Docs",
  trane: "Trane Technologies",
  traneSupply: "Trane Supply",
  goodman: "Goodman",
  daikin: "Daikin Comfort",
};

function _showEquipLinks(model, getFn, linksMap, container) {
  if (!model) {
    container.innerHTML = "";
    return;
  }
  const entry = getFn(model);
  const links = entry ? linksMap[entry.series] : null;
  if (!links) {
    container.innerHTML = "";
    return;
  }
  const items = Object.entries(links)
    .filter(([k]) => !_LINK_SKIP.has(k))
    .map(
      ([k, url]) =>
        `<a href="${esc(url)}" target="_blank" rel="noopener">${
          _LINK_LABELS[k] || k
        }</a>`
    );
  if (links.blowerSpeedImage)
    items.push(
      `<a href="${esc(
        links.blowerSpeedImage
      )}" target="_blank" rel="noopener">${
        links.blowerSpeedText || "Blower Speed"
      }</a>`
    );
  container.innerHTML = items.join(" · ");
}

function _renderNewJobAccChips() {
  document.getElementById("new-job-acc-chips").innerHTML = _newJobAccChips
    .map((name) => {
      const disp = ACCESSORY_DISPLAY[name]?.label || name.toLowerCase();
      return `<span class="chip chip-sm chip-secondary">${esc(
        disp
      )}<button type="button" class="chip-remove" data-remove-acc="${esc(
        name
      )}" aria-label="Remove">×</button></span>`;
    })
    .join("");
}

let _newJobSystems = [{ indoor: "", outdoor: "", links: {} }];

function _renderNewJobSystems() {
  const container = document.getElementById("new-job-systems-container");
  if (!container) return;
  container.innerHTML = _newJobSystems.map((sys, idx) => `
    <div class="settings-group nj-sys-item" data-idx="${idx}" style="background:var(--color-surface);border:1px solid var(--color-border);padding:var(--space-2);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-1)">
        <span class="settings-label" style="margin:0;font-weight:var(--font-weight-bold)">System ${idx + 1}</span>
        ${idx > 0 ? `<button type="button" class="btn-icon nj-btn-remove-sys" data-remove-idx="${idx}" style="color:var(--color-danger);font-size:var(--font-size-sm);padding:0 var(--space-1)">✕</button>` : ""}
      </div>
      <div class="form-row">
        <div>
          <label>Indoor unit
            <select class="nj-sys-indoor">
              <option value="">-- Select model --</option>${_indoorOptgroups()}
            </select>
          </label>
          <div class="series-links nj-indoor-links"></div>
        </div>
        <div>
          <label>Outdoor unit
            <select class="nj-sys-outdoor">
              <option value="">-- Select model --</option>${_outdoorOptgroups()}
            </select>
          </label>
          <div class="series-links nj-outdoor-links"></div>
        </div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".nj-sys-item").forEach((item, idx) => {
    const sys = _newJobSystems[idx];
    const inSel = item.querySelector(".nj-sys-indoor");
    const outSel = item.querySelector(".nj-sys-outdoor");
    const inLinks = item.querySelector(".nj-indoor-links");
    const outLinks = item.querySelector(".nj-outdoor-links");

    if (inSel) {
      inSel.value = sys?.indoor || "";
      if (sys?.indoor) _showEquipLinks(sys.indoor, getIndoorModel, SERIES_LINKS, inLinks);
      inSel.addEventListener("change", (e) => {
        _syncNewJobSystemsFromDOM();
        _showEquipLinks(e.target.value, getIndoorModel, SERIES_LINKS, inLinks);
      });
    }
    if (outSel) {
      outSel.value = sys?.outdoor || "";
      if (sys?.outdoor) _showEquipLinks(sys.outdoor, getOutdoorModel, OUTDOOR_LINKS, outLinks);
      outSel.addEventListener("change", (e) => {
        _syncNewJobSystemsFromDOM();
        _showEquipLinks(e.target.value, getOutdoorModel, OUTDOOR_LINKS, outLinks);
      });
    }
  });

  container.querySelectorAll(".nj-btn-remove-sys").forEach((btn) => {
    btn.addEventListener("click", () => {
      const removeIdx = parseInt(btn.dataset.removeIdx);
      _syncNewJobSystemsFromDOM();
      _newJobSystems.splice(removeIdx, 1);
      _renderNewJobSystems();
    });
  });
}

function _syncNewJobSystemsFromDOM() {
  const container = document.getElementById("new-job-systems-container");
  if (!container) return;
  const items = container.querySelectorAll(".nj-sys-item");
  items.forEach((item, idx) => {
    if (_newJobSystems[idx]) {
      const inVal = item.querySelector(".nj-sys-indoor")?.value || "";
      const outVal = item.querySelector(".nj-sys-outdoor")?.value || "";
      _newJobSystems[idx].indoor = inVal;
      _newJobSystems[idx].outdoor = outVal;
      _newJobSystems[idx].links = {
        ...(SERIES_LINKS[getIndoorModel(inVal)?.series] ?? {}),
        ...(OUTDOOR_LINKS[getOutdoorModel(outVal)?.series] ?? {}),
      };
    }
  });
}

function _collapseAddJobForm() {
  _newJobAccChips = [];
  _newJobSystems = [{ indoor: "", outdoor: "", links: {} }];
  const chips = document.getElementById("new-job-acc-chips");
  if (chips) chips.innerHTML = "";
  const tstatOther = document.getElementById("new-job-tstat-other");
  if (tstatOther) tstatOther.classList.add("hidden");
  document.getElementById("add-job-form")?.reset();
  _renderNewJobSystems();
  document.getElementById("add-job-section")?.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Add Job section — built dynamically, inserted inline in #tab-jobs
// ---------------------------------------------------------------------------

function buildAddJobSection() {
  const accOpts = Object.values(ACCESSORIES)
    .filter((a) => !CUSTOM_PRICE_ACCESSORIES.includes(a))
    .map(
      (a) =>
        `<option value="${esc(a)}">${esc(
          ACCESSORY_DISPLAY[a]?.label || a.toLowerCase()
        )}</option>`
    )
    .join("");

  const section = document.createElement("div");
  section.id = "add-job-section";
  section.className = "add-job-section hidden";
  section.innerHTML = `
    <form class="modal-body" id="add-job-form">
      <label>Address *
        <input type="text" name="address" required autocomplete="off" placeholder="32122 WATERLILY VIEW CT">
      </label>
      <div class="form-row">
        <label>Subdivision
          <input type="text" name="subdivision" autocomplete="off" placeholder="DELLROSE">
        </label>
        <label>Builder
          <input type="text" name="builder" list="builders-list" autocomplete="off">
          <datalist id="builders-list">${BUILDERS.map(
            (b) => `<option value="${esc(b)}">`
          ).join("")}</datalist>
        </label>
      </div>
      <label>Notes<textarea name="notes" rows="2" placeholder="Optional"></textarea></label>
      
      <div id="new-job-systems-container"></div>
      <button type="button" id="new-job-btn-add-sys" class="btn" style="margin-bottom:var(--space-2);width:100%;border:1px dashed var(--color-border);background:none">+ Add System</button>

      <div class="form-row">
        <label>Tstat
          <select name="tstat" id="new-job-tstat">
            <option value="">-- Select --</option>
            ${THERMOSTATS.map(
              (t) => `<option value="${esc(t)}">${esc(t)}</option>`
            ).join("")}
            <option value="Other">Other</option>
          </select>
        </label>
        <label style="flex: 0 0 4.5rem">Qty
          <select name="tstat-qty">${[1, 2, 3, 4, 5]
            .map((n) => `<option>${n}</option>`)
            .join("")}</select>
        </label>
        <label>+ Acc
          <select id="new-job-acc-picker">
            <option value="">-- Add --</option>${accOpts}
          </select>
        </label>
      </div>
      <input type="text" name="tstat-other" id="new-job-tstat-other" autocomplete="off" placeholder="Tstat model name" class="hidden">
      <div id="new-job-acc-chips"></div>
      <div class="btn-row">
        <button type="submit" class="btn-primary">Add Job</button>
        <button type="button" id="add-job-cancel" class="btn-secondary">Cancel</button>
      </div>
    </form>`;
  document
    .getElementById("tab-jobs")
    .insertBefore(section, document.getElementById("jobs-list"));
  _renderNewJobSystems();
}

// ---------------------------------------------------------------------------
// Active job bar
// ---------------------------------------------------------------------------

let _popoverEl = null;

function _wireHold(el, cb, ms = 500) {
  let timer = null;
  const start = () => {
    timer = setTimeout(() => {
      timer = null;
      cb();
    }, ms);
  };
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", cancel);
  el.addEventListener("touchcancel", cancel);
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", cancel);
  el.addEventListener("mouseleave", cancel);
}

function _showOutdoorPopover(anchor, entry) {
  if (_popoverEl) {
    _popoverEl.remove();
    _popoverEl = null;
  }
  const ton = entry.btu ? (entry.btu / 12000).toFixed(1) : null;
  const cfm = calculateCFM(entry.btu);
  const lines = [
    ton && `Ton: ${ton}`,
    entry.freon && `Ref: ${entry.freon}`,
    entry.FactoryCharge && `Factory: ${ouncesToPoundsAndOunces(entry.FactoryCharge)}`,
    entry.revisedCharge > 0 && `Revised: ${ouncesToPoundsAndOunces(entry.revisedCharge)}`,
    cfm && `Max CFM: ${cfm.max}`,
    cfm && `Min CFM: ${cfm.min}`,
  ].filter(Boolean);

  _popoverEl = document.createElement("div");
  _popoverEl.className = "lv-outdoor-popover";
  _popoverEl.innerHTML = lines.map((l) => `<div>${esc(l)}</div>`).join("");

  const rect = anchor.getBoundingClientRect();
  _popoverEl.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${
    rect.left
  }px;`;
  document.body.appendChild(_popoverEl);

  const dismiss = (e) => {
    if (!_popoverEl?.contains(e.target)) {
      _popoverEl?.remove();
      _popoverEl = null;
      document.removeEventListener("click", dismiss);
      document.removeEventListener("touchstart", dismiss);
    }
  };
  setTimeout(() => {
    document.addEventListener("click", dismiss);
    document.addEventListener("touchstart", dismiss);
  }, 0);
}

function updateActiveJobBar() {
  const header = document.querySelector(".app-header");
  const addrEl = document.getElementById("active-job-addr");
  const chipsEl = document.getElementById("active-job-chips");

  if (!_activeJob) {
    header.classList.remove("has-active-job");
    addrEl.textContent = "";
    chipsEl.innerHTML = "";
    return;
  }

  header.classList.add("has-active-job");
  addrEl.textContent = _activeJob.address;
  chipsEl.innerHTML = "";

  if (_activeJob.subdivision) {
    const chip = document.createElement("span");
    chip.className = "chip chip-sm chip-secondary";
    chip.textContent = _activeJob.subdivision;
    chipsEl.appendChild(chip);
  }

  if (_activeJob.builder) {
    const chip = document.createElement("span");
    chip.className = "chip chip-sm chip-secondary";
    chip.textContent = _activeJob.builder;
    chipsEl.appendChild(chip);
  }
}

function updateJobCardHeader(job) {
  const header = document.querySelector(".app-header");
  const addrEl = document.getElementById("active-job-addr");
  const chipsEl = document.getElementById("active-job-chips");
  if (!job) {
    header.classList.remove("has-active-job");
    addrEl.textContent = "";
    chipsEl.innerHTML = "";
    return;
  }
  header.classList.add("has-active-job");
  addrEl.textContent = job.address;
  chipsEl.innerHTML = "";
  if (job.subdivision) {
    const c = document.createElement("span");
    c.className = "chip chip-sm chip-secondary";
    c.textContent = job.subdivision;
    chipsEl.appendChild(c);
  }
  if (job.builder) {
    const c = document.createElement("span");
    c.className = "chip chip-sm chip-secondary";
    c.textContent = job.builder;
    chipsEl.appendChild(c);
  }
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function _confirmTstatOther() {
  const name = document.getElementById("tstat-other-input").value.trim();
  if (!name) return;
  setThermostat(name, 1);
  saveProgress(_activeJob);
  renderWorkspace();
}

function _confirmOtherInline(ctx) {
  const desc = document.getElementById(`${ctx}-other-desc`).value.trim();
  const price = parseFloat(document.getElementById(`${ctx}-other-price`).value) || 0;
  if (!desc) return;
  if (ctx === "acc") {
    getState().customAccessories.push({ name: desc, price });
  } else {
    getState().customFixes.push({ name: desc, price });
  }
  document.getElementById(`${ctx}-other-desc`).value = "";
  document.getElementById(`${ctx}-other-price`).value = "";
  document.getElementById(`${ctx}-other-row`).classList.add("hidden");
  saveProgress(_activeJob);
  renderWorkspace();
}

function wireEvents() {
  function _openModal(id) {
    const m = document.getElementById(id);
    const b = document.getElementById(id + "-backdrop");
    m.style.display = "flex";
    m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (b) { b.style.display = "block"; }
  }

  function _closeModal(id) {
    const m = document.getElementById(id);
    const b = document.getElementById(id + "-backdrop");
    m.style.display = "none";
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (b) { b.style.display = "none"; }
  }

  let _editingJobSystems = [];

  function _renderEditJobSystems() {
    const container = document.getElementById("ej-systems-container");
    if (!container) return;
    container.innerHTML = _editingJobSystems.map((sys, idx) => `
      <div class="settings-group ej-sys-item" data-idx="${idx}" style="background:var(--color-surface);border:1px solid var(--color-border);padding:var(--space-2);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-1)">
          <span class="settings-label" style="margin:0;font-weight:var(--font-weight-bold)">System ${idx + 1}</span>
          ${idx > 0 ? `<button type="button" class="btn-icon ej-btn-remove-sys" data-remove-idx="${idx}" style="color:var(--color-danger);font-size:var(--font-size-sm);padding:0 var(--space-1)">✕</button>` : ""}
        </div>
        <input type="text" class="ej-sys-indoor" placeholder="Indoor model" list="ej-indoor-list" value="${esc(sys.indoor || "")}" style="margin-bottom:var(--space-1)" />
        <input type="text" class="ej-sys-outdoor" placeholder="Outdoor model" list="ej-outdoor-list" value="${esc(sys.outdoor || "")}" style="margin-bottom:var(--space-1)" />
        <select class="ej-sys-service" style="width:100%;font-size:var(--font-size-xs);padding:var(--space-1);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text)">
          <option value="">Service: Inherit (Default)</option>
          ${[SERVICES.AC, SERVICES.HEAT, SERVICES.AC_HEAT, SERVICES.PRESTART, SERVICES.FINISH, SERVICES.DRIVE_RUN].map(svc => `
            <option value="${esc(svc)}"${sys.serviceType === svc ? " selected" : ""}>${esc(svc)}</option>
          `).join("")}
        </select>
      </div>
    `).join("");

    container.querySelectorAll(".ej-btn-remove-sys").forEach(btn => {
      btn.addEventListener("click", () => {
        const removeIdx = parseInt(btn.dataset.removeIdx);
        _syncEditJobSystemsFromDOM();
        _editingJobSystems.splice(removeIdx, 1);
        _renderEditJobSystems();
      });
    });
  }

  function _syncEditJobSystemsFromDOM() {
    const container = document.getElementById("ej-systems-container");
    if (!container) return;
    const items = container.querySelectorAll(".ej-sys-item");
    items.forEach((item, idx) => {
      if (_editingJobSystems[idx]) {
        _editingJobSystems[idx].indoor = item.querySelector(".ej-sys-indoor")?.value.trim() || "";
        _editingJobSystems[idx].outdoor = item.querySelector(".ej-sys-outdoor")?.value.trim() || "";
        _editingJobSystems[idx].serviceType = item.querySelector(".ej-sys-service")?.value || null;
      }
    });
  }

  function openJobEditModal(job) {
    document.getElementById("ej-address").value     = job.address || "";
    document.getElementById("ej-builder").value     = job.builder || "";
    document.getElementById("ej-subdivision").value = job.subdivision || "";
    const notesEl = document.getElementById("ej-notes");
    if (notesEl) notesEl.value = job.notes || "";
    document.getElementById("edit-job-modal").dataset.jobId = job.id;

    _editingJobSystems = Array.isArray(job.systems) && job.systems.length > 0
      ? JSON.parse(JSON.stringify(job.systems))
      : [
          { indoor: job.system1?.indoor || "", outdoor: job.system1?.outdoor || "", serviceType: job.system1?.serviceType || null, links: job.system1?.links || {} },
          ...((job.system2?.indoor || job.system2?.outdoor || job.isTwoSystems) ? [{
            indoor: job.system2?.indoor || "",
            outdoor: job.system2?.outdoor || "",
            serviceType: job.system2?.serviceType || null,
            links: job.system2?.links || {}
          }] : [])
        ];
    if (!_editingJobSystems.length) {
      _editingJobSystems.push({ indoor: "", outdoor: "", links: {}, serviceType: null });
    }

    _renderEditJobSystems();
    _openModal("edit-job-modal");
  }

  // Tab buttons
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.addEventListener("click", () => openTab(b.dataset.tab)));

  // Tstat Other — inline input
  document.getElementById("tstat-other-confirm").addEventListener("click", _confirmTstatOther);
  document.getElementById("tstat-other-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") _confirmTstatOther();
  });
  // Acc / Fix Other — inline input
  document.getElementById("acc-other-confirm").addEventListener("click", () => _confirmOtherInline("acc"));
  document.getElementById("fix-other-confirm").addEventListener("click", () => _confirmOtherInline("fix"));
  document.getElementById("acc-other-desc").addEventListener("keydown", (e) => {
    if (e.key === "Enter") _confirmOtherInline("acc");
  });
  document.getElementById("fix-other-desc").addEventListener("keydown", (e) => {
    if (e.key === "Enter") _confirmOtherInline("fix");
  });

  // Header — modals & drawer
  document.getElementById("btn-settings").addEventListener("click", () => {
    renderSettingsModal();
    _openModal("settings-modal");
  });
  document.getElementById("settings-modal-backdrop").addEventListener("click", () => {
    _closeModal("settings-modal");
  });
  document
    .getElementById("settings-close")
    .addEventListener("click", () =>
      _closeModal("settings-modal")
    );
  document
    .getElementById("btn-open-quick-calc")
    .addEventListener("click", () => {
      const body = document.getElementById("quick-calc-body");
      const opts = LINE_CONFIG_OPTIONS.map(
        (o) => `<option value="${esc(o)}">${esc(o) || "—"}</option>`
      ).join("");
      body.innerHTML = `
        <div class="quick-calc-wrapper">
          <div class="quick-calc-flex">
            <label class="quick-calc-label">Lineset ft
              <input type="number" id="qc-lineset" class="input-lg" min="0" step="1" placeholder="—">
            </label>
            <label class="quick-calc-label">Line Config
              <select id="qc-config">${opts}</select>
            </label>
          </div>
          <div id="qc-result" class="result-box-large">—</div>
          <div id="qc-detail" style="font-size:var(--font-size-xs);color:var(--color-text-secondary);text-align:center;padding-top:var(--space-1)"></div>
        </div>`;
      function calc() {
        const configVal = body.querySelector("#qc-config").value;
        const linesetVal = parseFloat(body.querySelector("#qc-lineset").value);
        const oz = parseFloat(calculateApproxAdjust(linesetVal, configVal));
        const cfg = FACTORY_LINE_CONFIGS[configVal];
        const ref = cfg?.freon || "";
        const ozStr = isNaN(oz) ? "—" : oz >= 0 ? `+ ${oz.toFixed(2)} oz` : `− ${Math.abs(oz).toFixed(2)} oz`;
        body.querySelector("#qc-result").textContent = ref ? `${ozStr} · ${ref}` : ozStr;

        let detail = "";
        if (!isNaN(oz) && cfg) {
          const extraFt = linesetVal - cfg.factoryLength;
          detail = `${cfg.multiplier} oz per extra lineset ft · ${extraFt} additional ft to add.`;
        }
        body.querySelector("#qc-detail").textContent = detail;
      }
      body.querySelector("#qc-lineset").addEventListener("input", calc);
      body.querySelector("#qc-config").addEventListener("change", calc);
      _openModal("quick-calc-modal");
    });
  document.getElementById("quick-calc-modal-backdrop").addEventListener("click", () => {
    _closeModal("quick-calc-modal");
  });
  document
    .getElementById("quick-calc-close")
    .addEventListener("click", () =>
      _closeModal("quick-calc-modal")
    );
  document.getElementById("edit-job-modal-backdrop").addEventListener("click", () => {
    _closeModal("edit-job-modal");
  });
  document.getElementById("edit-job-close").addEventListener("click", () => {
    _closeModal("edit-job-modal");
  });
  document.getElementById("edit-job-cancel").addEventListener("click", () => {
    _closeModal("edit-job-modal");
  });
  document.getElementById("ej-btn-add-system")?.addEventListener("click", () => {
    _syncEditJobSystemsFromDOM();
    _editingJobSystems.push({ indoor: "", outdoor: "", links: {} });
    _renderEditJobSystems();
  });
  document.getElementById("edit-job-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const jobId = document.getElementById("edit-job-modal").dataset.jobId;
    const job = getJobById(jobId);
    if (!job) return;
    _syncEditJobSystemsFromDOM();

    job.address     = document.getElementById("ej-address").value.trim().toUpperCase();
    job.builder     = document.getElementById("ej-builder").value.trim();
    job.subdivision = document.getElementById("ej-subdivision").value.trim().toUpperCase();
    const notesInput = document.getElementById("ej-notes");
    if (notesInput) job.notes = notesInput.value.trim();

    job.systems = _editingJobSystems.length > 0 ? _editingJobSystems : [{ indoor: "", outdoor: "", links: {} }];
    job.system1 = job.systems[0] || { indoor: "", outdoor: "", links: {} };
    job.system2 = job.systems[1] || null;
    job.isTwoSystems = job.systems.length === 2;

    updateJob(job);
    renderJobs();
    if (_activeJob?.id === job.id) {
      _activeJob = job;
      if (typeof initWorkspace === "function") {
        initWorkspace(job);
        renderWorkspace();
      }
    }
    _closeModal("edit-job-modal");
    toast("Job updated", "success");
  });
  document
    .getElementById("btn-open-troubleshoot")
    .addEventListener("click", () => {
      document.getElementById("ts-drawer").classList.add("ts-open");
      document.getElementById("ts-drawer").setAttribute("aria-hidden", "false");
      document.getElementById("ts-overlay").classList.add("ts-open");
    });
  document.getElementById("ts-overlay").addEventListener("click", () => {
    document.getElementById("ts-drawer").classList.remove("ts-open");
    document.getElementById("ts-drawer").setAttribute("aria-hidden", "true");
    document.getElementById("ts-overlay").classList.remove("ts-open");
  });

  // Workspace chip nav
  document.getElementById("ws-nav").addEventListener("click", (e) => {
    const chip = e.target.closest(".ws-nav-chip");
    if (!chip) return;
    _showSection(chip.dataset.nav);
  });

  // Workspace next-section button
  document.getElementById("workspace-form").addEventListener("click", (e) => {
    if (!e.target.closest("[data-next]")) return;
    const chips = [...document.querySelectorAll("#ws-nav .ws-nav-chip")];
    const idx = chips.findIndex((c) => c.classList.contains("ws-nav-current"));
    if (idx >= 0 && idx < chips.length - 1) _showSection(chips[idx + 1].dataset.nav);
  });

  // Jobs — list delegation
  document
    .getElementById("btn-add-job")
    .addEventListener("click", () =>
      document.getElementById("add-job-section").classList.remove("hidden")
    );
  document.getElementById("btn-import-calls").addEventListener("click", () => {
    document.getElementById("import-calls-input").click();
  });
  document.getElementById("import-calls-input").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    file.text().then((text) => {
      const result = importFromJSON(text);
      const _status = document.getElementById("import-status");
      if (result.errors[0]?.index === -1) {
        toast(result.errors[0].reason, "error");
        if (_status) _status.textContent = result.errors[0].reason;
      } else {
        toast(`${result.imported} imported, ${result.skipped} skipped`, "success");
        if (_status) _status.textContent = `${result.imported} imported, ${result.skipped} skipped`;
      }
      if (_status) setTimeout(() => { _status.textContent = ""; }, 4000);
      renderJobs();
    });
  });
  document.getElementById("btn-export-calls").addEventListener("click", () => {
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(getAllJobs(), null, 2)], { type: "application/json" })
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: `calls_${date}.json`,
    }).click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("jobs-list").addEventListener("click", (e) => {
    const del = e.target.closest("[data-delete]");
    const start = e.target.closest("[data-start]");
    const edit = e.target.closest("[data-edit]");
    const maps = e.target.closest("[data-maps]");
    const item = e.target.closest(".job-item");
    const clearCompleted  = e.target.closest("[data-clear-completed]");
    const toggleSummary   = e.target.closest("[data-toggle-summary]");
    const toggleHistory   = e.target.closest("[data-toggle-history]");

    if (toggleHistory) {
      toggleHistory.nextElementSibling?.classList.toggle("open");
      return;
    }
    if (toggleSummary) {
      const li = document.getElementById("load-sheet-summary");
      const body = li?.querySelector(".load-sheet-body");
      const chevron = toggleSummary.querySelector(".acc-chevron");
      if (body) body.classList.toggle("hidden");
      if (chevron) chevron.classList.toggle("open");
      return;
    }
    if (clearCompleted) {
      const ids = new Set(getCompletions().map((c) => c.jobId));
      getAllJobs().filter((j) => ids.has(j.id)).forEach((j) => removeJob(j.id));
      renderJobs();
      return;
    }
    if (del) {
      const dj = getJobById(del.dataset.delete);
      if (!confirm(`Delete ${dj ? dj.address : "this job"}?`)) return;
      removeJob(del.dataset.delete);
      renderJobs();
      return;
    }
    if (start) {
      const j = getJobById(start.dataset.start);
      if (j) openWorkspace(j);
      return;
    }
    if (edit) {
      const j = getJobById(edit.dataset.edit);
      if (j) openJobEditModal(j);
      return;
    }
    if (maps) {
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(maps.dataset.maps)}`,
        "_blank"
      );
      return;
    }
    const lv     = e.target.closest(".btn-lv");
    const blower = e.target.closest(".btn-blower");
    if (lv) {
      const model = lv.dataset.model;
      if (lv.dataset.type === "indoor") {
        const dIn = getIndoorModel(model);
        if (!dIn) { _openViewer("Indoor LV", ""); return; }
        let img;
        if (dIn.hType === "AirHandler") {
          img = "images/lv/airhandler.png";
        } else {
          const card = lv.closest(".equip-card");
          const dOut = getOutdoorModel(
            card?.querySelector('.btn-lv[data-type="outdoor"]')?.dataset.model || ""
          );
          img = dOut?.uType === "Heat Pump"
            ? "images/lv/furnace-heatpump.png"
            : "images/lv/furnace-1-2stage.png";
        }
        _openViewer("Indoor LV", img);
        return;
      }
      if (lv.dataset.type === "outdoor") {
        const dOut = getOutdoorModel(model);
        if (!dOut) { _openViewer("Outdoor LV", ""); return; }
        const img = dOut.uType === "Heat Pump"
          ? "images/lv/cond-heatpump.png"
          : dOut.series?.startsWith("DC")
            ? "images/lv/cond-daikin.png"
            : "images/lv/cond-1-2stage.png";
        _openViewer("Outdoor LV", img);
        return;
      }
    }
    if (blower) {
      const dIn = getIndoorModel(blower.dataset.model);
      _openViewer("Blower Data", dIn?.imagen || "");
      return;
    }
    const lbImg = e.target.closest("[data-lightbox-src]");
    if (lbImg) {
      document.getElementById("lightbox-img").src = lbImg.dataset.lightboxSrc;
      document.getElementById("lightbox").classList.remove("hidden");
      return;
    }
    if (item && !e.target.closest("button")) {
      const alreadyOpen = item.classList.contains("expanded");
      document
        .querySelectorAll(".job-item.expanded")
        .forEach((el) => el.classList.remove("expanded"));
      if (!alreadyOpen) {
        item.classList.add("expanded");
        if (!_activeJob) updateJobCardHeader(getJobById(item.dataset.id));
        item.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        if (!_activeJob) updateJobCardHeader(null);
      }
    }
  });

  // Workspace — click delegation
  const wsForm = document.getElementById("workspace-form");
  wsForm.addEventListener("click", (e) => {
    const state = getState();
    if (!state) return;

    const svc = e.target.closest("[data-service]");
    const tst      = e.target.closest("[data-tstat]");
    const tstOther = e.target.closest("[data-tstat-other]");
    const qty      = e.target.closest("[data-qty]");
    const qtySelect = e.target.closest("[data-qty-select]");
    const acc = e.target.closest("[data-accessory]");
    const grp = e.target.closest("[data-group-toggle]");
    const fix = e.target.closest("[data-fix]");

    if (svc) {
      toggleService(svc.dataset.service);
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    if (tst) {
      const n = tst.dataset.tstat;
      setThermostat(
        state.selectedThermostat === n ? null : n,
        state.thermostatQuantity
      );
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    if (tstOther) {
      const isCustom = state.selectedThermostat && !THERMOSTATS.includes(state.selectedThermostat);
      if (isCustom) {
        setThermostat(null, 1);
        saveProgress(_activeJob);
        renderWorkspace();
      } else {
        const inp = document.getElementById("tstat-other-input");
        inp.value = "";
        document.getElementById("tstat-other-row").classList.remove("hidden");
        inp.focus();
      }
      return;
    }
    if (qty) {
      setThermostat(
        state.selectedThermostat,
        Math.max(1, state.thermostatQuantity + parseInt(qty.dataset.qty))
      );
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    if (qtySelect) {
      const v = qtySelect.dataset.qtySelect;
      setThermostat(state.selectedThermostat, v === "4+" ? 4 : parseInt(v));
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    if (acc) {
      const key = acc.dataset.accessory;
      const _LP_KEYS = [ACCESSORIES.LP_KIT_LENNOX_1STG, ACCESSORIES.LP_KIT_LENNOX_2STG, ACCESSORIES.LP_KIT_GOODMAN];
      if (_LP_KEYS.includes(key)) {
        _LP_KEYS.filter((k) => k !== key)
          .forEach((k) => { if (getState().selectedAccessories.includes(k)) toggleAccessory(k); });
      }
      if (key === ACCESSORIES.OTRO) {
        document.getElementById("acc-other-row").classList.remove("hidden");
        document.getElementById("acc-other-desc").focus();
        return;
      }
      if ("custom" in acc.dataset) {
        const p = prompt(`Price for ${key}:`);
        if (p === null) return;
        toggleAccessory(key, parseFloat(p) || 0);
      } else {
        toggleAccessory(key);
      }
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    if (grp) {
      const groupEl = document.getElementById(
        `fix-group-${grp.dataset.groupToggle}`
      );
      if (groupEl) groupEl.classList.toggle("hidden");
      return;
    }
    if (fix) {
      const key = fix.dataset.fix;
      if (key === FIXES.OTRO) {
        document.getElementById("fix-other-row").classList.remove("hidden");
        document.getElementById("fix-other-desc").focus();
        return;
      }
      if ("custom" in fix.dataset) {
        const p = prompt(`Price for ${key}:`);
        if (p === null) return;
        toggleFix(key, parseFloat(p) || 0);
      } else {
        toggleFix(key);
      }
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    const removeCustomAcc = e.target.closest("[data-remove-custom-acc]");
    if (removeCustomAcc) {
      const s = getState();
      s.customAccessories = s.customAccessories.filter((a) => a.name !== removeCustomAcc.dataset.removeCustomAcc);
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    const removeCustomFix = e.target.closest("[data-remove-custom-fix]");
    if (removeCustomFix) {
      const s = getState();
      s.customFixes = s.customFixes.filter((f) => f.name !== removeCustomFix.dataset.removeCustomFix);
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
  });

  // Workspace — checkboxes + Line Config select
  wsForm.addEventListener("change", (e) => {
    const state = getState();
    if (!state) return;
    if (e.target.id === "ws-two-systems") {
      setOption("isTwoSystems", e.target.checked);
      saveProgress(_activeJob);
      renderWorkspace();
      return;
    }
    if (e.target.id === "ws-temporarily") {
      setOption("isTemporary", e.target.checked);
      saveProgress(_activeJob);
      return;
    }
    const _getWiSysInfo = (target) => {
      if (target.dataset.wi) return { sys: 1, attr: "data-wi", field: target.dataset.wi };
      if (target.dataset.wi2) return { sys: 2, attr: "data-wi2", field: target.dataset.wi2 };
      for (const k of Object.keys(target.dataset)) {
        if (k.startsWith("wi")) {
          const m = k.match(/^wi(\d+)$/i);
          if (m) {
            const sys = parseInt(m[1]);
            return { sys, attr: `data-wi-${sys}`, field: target.dataset[k] };
          }
        }
      }
      return null;
    };

    const sysInfo = _getWiSysInfo(e.target);
    if (sysInfo && sysInfo.field === "factoryLineConfig") {
      const { sys, attr } = sysInfo;
      const data = {};
      wsForm.querySelectorAll(`[${attr}]`).forEach((inp) => {
        data[inp.getAttribute(attr)] = inp.value;
      });
      const sysList = getState()?.systems || [];
      const outdoorModel = sysList[sys - 1]?.outdoor || (sys === 1 ? _activeJob?.system1?.outdoor : _activeJob?.system2?.outdoor);
      const outdoor = getOutdoorModel(outdoorModel);
      if (outdoor) {
        const lineConfig = e.target.value;
        const cfg = FACTORY_LINE_CONFIGS[lineConfig];
        const baseCharge = (cfg?.isRevised && outdoor.revisedCharge)
          ? outdoor.revisedCharge
          : outdoor.FactoryCharge;
        const fcInput = wsForm.querySelector(`[${attr}="factoryChargeOz"]`);
        if (fcInput && baseCharge != null) {
          fcInput.value = String(baseCharge);
          data.factoryChargeOz = String(baseCharge);
        }
        const approxInput = wsForm.querySelector(`[${attr}="approxAdjustOz"]`);
        const result = calculateApproxAdjust(
          parseFloat(data.linesetLength),
          lineConfig
        );
        data.approxAdjustOz =
          result !== null ? result : (baseCharge != null ? String(baseCharge) : "");
        if (approxInput) approxInput.value = data.approxAdjustOz;
      }
      setWeightInData(data, sys);
      _renderNewTotalCharge(data, sys);
      updatePriceDisplay();
      saveProgress(_activeJob);
    }
  });

  wsForm.addEventListener("input", (e) => {
    const state = getState();
    if (!state) return;
    if (e.target.id === "notes-input") {
      setNotes(e.target.value);
      saveProgress(_activeJob);
      return;
    }
    const _getWiSysInfo = (target) => {
      if (target.dataset.wi) return { sys: 1, attr: "data-wi", field: target.dataset.wi };
      if (target.dataset.wi2) return { sys: 2, attr: "data-wi2", field: target.dataset.wi2 };
      for (const k of Object.keys(target.dataset)) {
        if (k.startsWith("wi")) {
          const m = k.match(/^wi(\d+)$/i);
          if (m) {
            const sys = parseInt(m[1]);
            return { sys, attr: `data-wi-${sys}`, field: target.dataset[k] };
          }
        }
      }
      return null;
    };

    const sysInfo = _getWiSysInfo(e.target);
    if (sysInfo) {
      const { sys, attr, field } = sysInfo;
      const data = {};
      wsForm.querySelectorAll(`[${attr}]`).forEach((inp) => {
        data[inp.getAttribute(attr)] = inp.value;
      });
      // Auto-calc subcooling
      const liq = parseFloat(data.liquidLineTemp);
      const csat = parseFloat(data.condenserSatTemp);
      if (!isNaN(liq) && !isNaN(csat)) {
        const sc = csat - liq;
        data.subcoolingValue = String(parseFloat(sc.toFixed(1)));
        const scInput = wsForm.querySelector(`[${attr}="subcoolingValue"]`);
        if (scInput) scInput.value = data.subcoolingValue;
      }
      const scVal = parseFloat(data.subcoolingValue);
      const oemGoal = parseFloat(data.oemSubcoolingGoal);
      if (!isNaN(scVal) && !isNaN(oemGoal)) {
        const dev = Math.abs(scVal - oemGoal);
        data.subcoolingDeviation = String(parseFloat(dev.toFixed(1)));
        const devInput = wsForm.querySelector(
          `[${attr}="subcoolingDeviation"]`
        );
        if (devInput) devInput.value = data.subcoolingDeviation;
      }
      const warnContainer = document.getElementById(`wi-fields-sys${sys}`);
      const warnEl = warnContainer?.querySelector("[data-sc-warn]");
      if (warnEl) {
        warnEl.classList.remove("sc-warn-danger", "sc-warn-caution");
        if (!isNaN(scVal) && scVal < 0) {
          warnEl.textContent = "negative reading";
          warnEl.classList.add("sc-warn-danger");
        } else if (
          !isNaN(scVal) &&
          !isNaN(oemGoal) &&
          Math.abs(scVal - oemGoal) > 3
        ) {
          warnEl.textContent = `±${Math.abs(scVal - oemGoal).toFixed(
            1
          )}°F from goal`;
          warnEl.classList.add("sc-warn-caution");
        } else {
          warnEl.textContent = "";
        }
      }
      // Recalc approxAdjustOz when linesetLength changes
      if (field === "linesetLength") {
        const sysList = getState()?.systems || [];
        const outdoorModel = sysList[sys - 1]?.outdoor || (sys === 1 ? _activeJob?.system1?.outdoor : _activeJob?.system2?.outdoor);
        const outdoor = getOutdoorModel(outdoorModel);
        if (outdoor) {
          const lineConfig = data.factoryLineConfig || "";
          const result = calculateApproxAdjust(
            parseFloat(data.linesetLength),
            lineConfig
          );
          if (result !== null) {
            data.approxAdjustOz = result;
            const approxInput = wsForm.querySelector(
              `[${attr}="approxAdjustOz"]`
            );
            if (approxInput) approxInput.value = result;
          }
        }
      }
      setWeightInData(data, sys);
      _renderNewTotalCharge(data, sys);
      updatePriceDisplay();
      saveProgress(_activeJob);
    }
  });

  // Generate Report
  document
    .getElementById("btn-generate-report")
    .addEventListener("click", async () => {
      if (!_activeJob) return;
      const completion = buildCompletion(_activeJob, getPrices());
      completion.refrigerant = getOutdoorModel(completion.outdoor)?.freon ||
        getOutdoorModel(completion.outdoor2)?.freon || "";
      completion.reportText = generateReportText(completion);
      saveCompletion(completion);
      await _downloadPhotosZip(`${(_activeJob?.address || "JOB").replace(/[^a-z0-9]/gi, "_").toUpperCase()}_PHOTOS.zip`, true);
      clearWorkspace();
      setActiveJobId(null);
      _activeJob = null;
      updateActiveJobBar();
      toast("Report saved!", "success");
      renderJobs();
      openTab("reports");
    });

  // Reports — per-card actions
  document.getElementById("reports-list").addEventListener("click", (e) => {
    const copy = e.target.closest("[data-copy]");
    const del = e.target.closest("[data-delete]");
    const edit = e.target.closest("[data-edit-report]");
    const toggle = e.target.closest("[data-share-toggle]");
    const share = e.target.closest("[data-share-method]");
    if (copy)
      navigator.clipboard
        .writeText(copy.dataset.copy)
        .then(() => toast("Copied!", "success"));
    if (del && confirm("Delete this report?")) {
      const jobId = del.dataset.delete;
      deleteCompletion(jobId);
      removeJob(jobId);
      renderReports();
      renderJobs();
      toast("Report and associated job deleted.", "success");
    }
    if (edit) {
      const c = getCompletions().find(
        (c) => c.jobId === edit.dataset.editReport
      );
      if (c) openEditModal(c);
    }
    if (toggle) {
      const p = document.getElementById(
        `share-panel-${toggle.dataset.shareToggle}`
      );
      if (p) p.classList.toggle("hidden");
    }
    if (share) _shareVia(share.dataset.shareMethod, share.dataset.shareText);
    if (!copy && !del && !edit && !toggle && !share) {
      const card = e.target.closest(".report-card");
      if (!card) return;
      const wasSelected = card.classList.contains("report-selected");
      document
        .querySelectorAll("#reports-list .report-card.report-selected")
        .forEach((c) => c.classList.remove("report-selected"));
      if (!wasSelected) card.classList.add("report-selected");
    }
  });

  // Reports — global actions
  document
    .getElementById("btn-share-all")
    .addEventListener("click", () =>
      document.getElementById("share-all-panel").classList.toggle("hidden")
    );
  document.getElementById("share-all-panel").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-share-all-method]");
    if (!btn) return;
    _shareVia(
      btn.dataset.shareAllMethod,
      generateDailyReport(getCompletions())
    );
    document.getElementById("share-all-panel").classList.add("hidden");
  });
  document.getElementById("btn-delete-all").addEventListener("click", () => {
    if (!confirm("Delete all reports?")) return;
    const jobIds = getCompletions().map((c) => c.jobId);
    getCompletions().forEach((c) => deleteCompletion(c.jobId));
    jobIds.forEach((id) => removeJob(id));
    renderReports();
    renderJobs();
    toast("All reports and completed jobs deleted.", "success");
  });
  document.getElementById("btn-export-json").addEventListener("click", () => {
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(
      new Blob([exportJSON(getCompletions())], { type: "application/json" })
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: `dashboard_import_${date}.json`,
    }).click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("btn-export-csv").addEventListener("click", () => {
    const d = new Date();
    const date = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}-${String(d.getFullYear()).slice(2)}`;
    const url = URL.createObjectURL(
      new Blob([exportCSV(getCompletions())], { type: "text/csv" })
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: `service_reports_${date}.csv`,
    }).click();
    URL.revokeObjectURL(url);
  });

  // LV — cache download
  document
    .getElementById("lv-container")
    .addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-dl]");
      if (!btn) return;
      try {
        await downloadDiagram(btn.dataset.dl);
        toast("Cached for offline use", "success");
        renderLV();
      } catch {
        toast("Download failed — check connection", "error");
      }
    });

  // Lightbox
  document
    .getElementById("lightbox-close")
    .addEventListener("click", () =>
      document.getElementById("lightbox").classList.add("hidden")
    );
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
  });

  // Site photos — download ZIP
  document
    .getElementById("btn-download-site-photos")
    .addEventListener("click", async () => {
      const safeAddr = (_activeJob?.address || "SITE")
        .replace(/[^a-z0-9]/gi, "_")
        .toUpperCase();
      await _downloadPhotosZip(`${safeAddr}_PHOTOS.zip`, false);
    });

  document.querySelectorAll(".btn-next").forEach(btn => {
    for (let i = 0; i < 3; i++) {
      const s = document.createElement("span");
      s.className = "ripple";
      btn.appendChild(s);
    }
  });

  // Settings modal — theme, provider, key
  document.getElementById("theme-toggle").addEventListener("change", (e) => {
    const mode = e.target.checked ? "dark" : "light";
    setTheme(mode);
    document.documentElement.setAttribute("data-mode", mode);
  });
  document.getElementById("theme-terminal-btn").addEventListener("click", () => {
    setTheme("terminal");
    document.documentElement.setAttribute("data-mode", "terminal");
  });
  document.getElementById("ai-provider-row").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-provider]");
    if (btn) {
      setAiProvider(btn.dataset.provider);
      renderSettingsModal();
    }
  });
  document.getElementById("ai-settings-save").addEventListener("click", () => {
    const key = document.getElementById("ai-settings-key-input").value.trim();
    setApiKey(getSettings().aiProvider, key);
    document.getElementById("ai-settings-status").textContent = key
      ? "Key saved."
      : "Key cleared.";
    toast("API key saved", "success");
  });
  document.getElementById("ai-settings-clear").addEventListener("click", () => {
    setApiKey(getSettings().aiProvider, "");
    document.getElementById("ai-settings-key-input").value = "";
    document.getElementById("ai-settings-status").textContent = "Key cleared.";
  });
  document
    .getElementById("ai-settings-more")
    .addEventListener("click", () =>
      document.getElementById("ai-provider-ext-row").classList.toggle("hidden")
    );
  document.getElementById("settings-modal").addEventListener("input", (e) => {
    const inp = e.target.closest("[data-price-category]");
    if (!inp) return;
    const val = parseFloat(inp.value);
    if (isNaN(val)) return;
    setPrice(inp.dataset.priceCategory, inp.dataset.priceName || null, val);
  });
  document.getElementById("btn-reset-prices").addEventListener("click", () => {
    resetPrices();
    renderSettingsModal();
  });

  // Add Job form
  document
    .getElementById("add-job-cancel")
    .addEventListener("click", _collapseAddJobForm);
  document
    .getElementById("new-job-btn-add-sys")
    .addEventListener("click", () => {
      _syncNewJobSystemsFromDOM();
      _newJobSystems.push({ indoor: "", outdoor: "", links: {} });
      _renderNewJobSystems();
    });
  document
    .getElementById("new-job-tstat")
    .addEventListener("change", (e) =>
      document
        .getElementById("new-job-tstat-other")
        .classList.toggle("hidden", e.target.value !== "Other")
    );
  document
    .getElementById("new-job-acc-picker")
    .addEventListener("change", (e) => {
      const name = e.target.value;
      e.target.value = "";
      if (!name || _newJobAccChips.includes(name)) return;
      _newJobAccChips.push(name);
      _renderNewJobAccChips();
    });
  document
    .getElementById("new-job-acc-chips")
    .addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-acc]");
      if (!btn) return;
      _newJobAccChips = _newJobAccChips.filter(
        (a) => a !== btn.dataset.removeAcc
      );
      _renderNewJobAccChips();
    });
  document.getElementById("add-job-form").addEventListener("submit", (e) => {
    e.preventDefault();
    _syncNewJobSystemsFromDOM();
    const fd = new FormData(e.target);
    const tstatVal = fd.get("tstat");
    const tstatModel =
      tstatVal === "Other"
        ? (fd.get("tstat-other") || "").trim()
        : tstatVal || "";
    
    const systems = _newJobSystems.map((s, idx) => ({
      id: `sys_${idx + 1}`,
      indoor: s.indoor || "",
      outdoor: s.outdoor || "",
      serviceType: s.serviceType || null,
      links: s.links || {
        ...(SERIES_LINKS[getIndoorModel(s.indoor)?.series] ?? {}),
        ...(OUTDOOR_LINKS[getOutdoorModel(s.outdoor)?.series] ?? {}),
      },
      weightInData: null,
      accessories: [],
    }));

    const job = createJob({
      address: fd.get("address").toUpperCase(),
      subdivision: (fd.get("subdivision") || "").toUpperCase(),
      builder: fd.get("builder") || "",
      notes: fd.get("notes") || "",
      systems,
      isTwoSystems: systems.length === 2,
      jobAccessories: [..._newJobAccChips],
      jobThermostat: tstatModel
        ? { model: tstatModel, qty: parseInt(fd.get("tstat-qty")) || 1 }
        : null,
    });
    precacheJobs([job]);
    _collapseAddJobForm();
    renderJobs();
    toast(`Job added: ${job.address}`, "success");
  });

  // AI FAB
  const _aiHistory = document.getElementById("ai-chat-history");
  const _aiInput   = document.getElementById("ai-chat-input");
  const _aiSend    = document.getElementById("ai-chat-send");
  const _aiFab     = document.getElementById("ai-fab");
  const _aiPanel   = document.getElementById("ai-panel");

  function _appendBubble(text, role) {
    const el = document.createElement("div");
    el.className = role === "user" ? "ai-msg-user" : "ai-msg-assistant";
    el.textContent = text;
    _aiHistory.appendChild(el);
    _aiHistory.scrollTop = _aiHistory.scrollHeight;
  }

  async function _sendChat() {
    const text = _aiInput.value.trim();
    if (!text) return;
    const s = getSettings();
    if (!getApiKey(s?.aiProvider)) {
      _appendBubble("Configure your API key in Settings to use the AI assistant.", "assistant");
      return;
    }
    _appendBubble(text, "user");
    _aiInput.value = "";
    _aiInput.style.height = "";
    _aiSend.disabled = true;
    try {
      const reply = await sendMessage(text);
      _appendBubble(reply, "assistant");
    } catch (err) {
      _appendBubble(`Error: ${err.message}`, "assistant");
    } finally {
      _aiSend.disabled = false;
      _aiInput.focus();
    }
  }

  _aiFab.addEventListener("click", () => {
    if (!_chatInitialized) { initChat(_activeJob); _chatInitialized = true; }
    _aiFab.classList.add("hidden");
    _aiPanel.classList.remove("hidden");
    _aiInput.focus();
  });
  document.addEventListener("click", (e) => {
    if (!_aiPanel.classList.contains("hidden") &&
        !e.target.closest("#ai-fab-wrap")) {
      _aiPanel.classList.add("hidden");
      _aiFab.classList.remove("hidden");
    }
  });
  _aiSend.addEventListener("click", _sendChat);
  _aiInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      _sendChat();
    }
  });
  _aiInput.addEventListener("input", () => {
    _aiInput.style.height = "auto";
    _aiInput.style.height = _aiInput.scrollHeight + "px";
  });
}

// ---------------------------------------------------------------------------
// Edit report modal
// ---------------------------------------------------------------------------

function openEditModal(completion) {
  document.getElementById("_edit-report-modal")?.remove();

  const c = completion;
  const svc0 = c.services?.[0];
  const svcName = svc0?.name ?? "";
  const svcDn = svc0?.displayName ?? "";
  const isCanceled = svcName === SERVICES.CANCEL;

  const iniAC =
    !isCanceled &&
    (svcName === SERVICES.AC ||
      svcName === SERVICES.AC_HEAT ||
      (svcName === SERVICES.FINISH && svcDn.includes("AC")));
  const iniHeat =
    !isCanceled &&
    (svcName === SERVICES.HEAT ||
      svcName === SERVICES.AC_HEAT ||
      (svcName === SERVICES.FINISH && svcDn.includes("Heat")));
  const iniFinish = !isCanceled && svcName === SERVICES.FINISH;
  const iniPrestart = !isCanceled && svcName === SERVICES.PRESTART;
  const iniDriveRun = !isCanceled && svcName === SERVICES.DRIVE_RUN;
  const iniCancel = isCanceled;

  const sysList = Array.isArray(c.systems) && c.systems.length > 0
    ? c.systems
    : [
        { indoor: c.indoor, outdoor: c.outdoor, weightInData: c.weightInData },
        ...((c.indoor2 || c.outdoor2 || c.isTwoSystems) ? [{ indoor: c.indoor2, outdoor: c.outdoor2, weightInData: c.weightInData2 }] : [])
      ];

  const makeItemRow = (item, type) => {
    const catalog =
      type === "acc"
        ? Object.values(ACCESSORIES).filter((v) => v !== ACCESSORIES.OTRO)
        : Object.values(FIXES).filter((v) => v !== FIXES.OTRO);
    const inCatalog = catalog.includes(item.name);
    const selVal = inCatalog ? item.name : "__other__";
    const otherVal = inCatalog ? "" : item.name;
    return `
    <div class="em-row">
      <select class="em-sel em-input" style="flex:1;min-width:0;width:auto">
        <option value="__other__"${
          selVal === "__other__" ? " selected" : ""
        }>Other...</option>
        ${catalog
          .map(
            (v) =>
              `<option value="${esc(v)}"${
                item.name === v ? " selected" : ""
              }>${esc(v)}</option>`
          )
          .join("")}
      </select>
      <input type="text" class="em-other" value="${esc(
        otherVal
      )}" placeholder="Custom name"
        style="flex:1;min-width:0;width:auto${
          inCatalog ? ";display:none" : ""
        }" />
      <input type="number" class="em-price" value="${
        item.price ?? 0
      }" min="0" step="any" />
      <button type="button" class="btn em-remove">✕</button>
    </div>`;
  };

  const wiSection = (data, sys) => `
    <details class="em-details"${
      Object.values(data).some(Boolean) ? " open" : ""
    }>
      <summary class="em-summary">System ${sys} Weigh-In</summary>
      <div class="em-wi-grid">
        ${WI_FIELDS.map(
          ([key, lbl]) => `
          <div class="em-field">
            <label class="em-label">${lbl}</label>
            ${
              key === "factoryLineConfig"
                ? `<select class="em-input" data-wi="${sys}" data-key="${key}">
                  ${LINE_CONFIG_OPTIONS.map(
                    (o) =>
                      `<option value="${esc(o)}"${
                        (data[key] ?? "") === o ? " selected" : ""
                      }>${esc(o)}</option>`
                  ).join("")}
                </select>`
                : `<input type="text" class="em-input" data-wi="${sys}" data-key="${key}" value="${esc(
                    String(data[key] ?? "")
                  )}" />`
            }
          </div>`
        ).join("")}
      </div>
    </details>`;

  const svcCheckboxes = [
    ["AC", SERVICES.AC, iniAC],
    ["Heat", SERVICES.HEAT, iniHeat],
    ["Finish", SERVICES.FINISH, iniFinish],
    ["Prestart", SERVICES.PRESTART, iniPrestart],
    ["Drive Run", SERVICES.DRIVE_RUN, iniDriveRun],
    ["Cancel", SERVICES.CANCEL, iniCancel],
  ];

  const overlay = document.createElement("div");
  overlay.id = "_edit-report-modal";
  overlay.className = "em-overlay";
  overlay.innerHTML = `
    <div class="em-card">
      <div class="em-header">
        <span>${esc(c.address)}</span>
        <button type="button" id="_em-close" class="btn">✕</button>
      </div>
      <div class="em-body">
        <div class="em-section">
          <div class="em-section-title">Notes</div>
          <textarea id="_em-notes" class="em-textarea" rows="3">${esc(
            c.notes || ""
          )}</textarea>
        </div>
        <div class="em-section">
          <div class="em-section-title">Service</div>
          <div class="em-checkboxes">
            ${svcCheckboxes
              .map(
                ([label, val, checked]) =>
                  `<label class="em-check-label"><input type="checkbox" name="_emsvc" value="${esc(
                    val
                  )}"${checked ? " checked" : ""}> ${label}</label>`
              )
              .join("")}
          </div>
          <div class="em-flags">
            ${sysList.length > 2
              ? `<span class="chip chip-sm chip-secondary" style="font-weight:bold">${sysList.length} Systems Active</span>`
              : `<label class="em-check-label"><input type="checkbox" id="_em2sys"${(c.isTwoSystems || sysList.length === 2) ? " checked" : ""}> 2 Systems</label>`}
            <label class="em-check-label"><input type="checkbox" id="_emtemp"${
              c.isTemporary ? " checked" : ""
            }> Temporarily</label>
          </div>
        </div>
        <div class="em-section">
          <div class="em-section-title">Systems & Services</div>
          ${sysList.map((sys, idx) => `
            <div class="em-row" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-1);gap:var(--space-1)">
              <span style="font-weight:bold;font-size:var(--font-size-sm)">System ${idx + 1}: ${[sys.indoor, sys.outdoor].filter(Boolean).join(" / ") || "Unit"}</span>
              <select class="em-input em-sys-svc" data-sys-idx="${idx}" style="font-size:var(--font-size-xs);width:auto">
                <option value="">Default (from Service checkboxes)</option>
                ${[SERVICES.AC, SERVICES.HEAT, SERVICES.AC_HEAT, SERVICES.PRESTART, SERVICES.FINISH, SERVICES.DRIVE_RUN].map(svc => `
                  <option value="${esc(svc)}"${sys.serviceType === svc ? " selected" : ""}>${esc(svc)}</option>
                `).join("")}
              </select>
            </div>
          `).join("")}
        </div>
        <div class="em-section">
          <div class="em-section-title">Thermostat</div>
          <div class="em-tstat-row">
            <select id="_em-tstat" class="em-input em-tstat-select">
              <option value="">None</option>
              ${THERMOSTATS.map(
                (n) =>
                  `<option value="${esc(n)}"${
                    c.selectedThermostat?.name === n ? " selected" : ""
                  }>${esc(n)}</option>`
              ).join("")}
            </select>
            <input type="number" id="_em-tqty" class="em-input em-tqty" value="${
              c.thermostatQuantity || 1
            }" min="1" max="99" />
            <span class="em-label">qty</span>
          </div>
        </div>
        <div class="em-section">
          <div class="em-section-title">Accessories</div>
          <div id="_em-acclist">${(c.accessories || [])
            .map((a) => makeItemRow(a, "acc"))
            .join("")}</div>
          <button type="button" id="_em-addacc" class="btn em-add-btn">+ Add Accessory</button>
        </div>
        <div class="em-section">
          <div class="em-section-title">Fixes</div>
          <div id="_em-fixlist">${(c.fixes || [])
            .map((f) => makeItemRow(f, "fix"))
            .join("")}</div>
          <button type="button" id="_em-addfix" class="btn em-add-btn">+ Add Fix</button>
        </div>
        ${sysList.map((sys, idx) => {
          const sWid = sys.weightInData || (idx === 0 ? c.weightInData : (idx === 1 ? c.weightInData2 : {})) || {};
          return wiSection(sWid, idx + 1);
        }).join("")}
      </div>
      <div class="em-footer">
        <button type="button" id="_em-apply" class="btn btn-primary">Apply</button>
        <button type="button" id="_em-cancel" class="btn">Cancel</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#_em-close").addEventListener("click", close);
  overlay.querySelector("#_em-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
    if (e.target.classList.contains("em-remove"))
      e.target.closest(".em-row")?.remove();
  });
  overlay.addEventListener("change", (e) => {
    if (e.target.classList.contains("em-sel")) {
      const other = e.target.closest(".em-row")?.querySelector(".em-other");
      if (other)
        other.style.display = e.target.value === "__other__" ? "" : "none";
    }
  });
  overlay
    .querySelector("#_em-addacc")
    .addEventListener("click", () =>
      overlay
        .querySelector("#_em-acclist")
        .insertAdjacentHTML(
          "beforeend",
          makeItemRow({ name: "", price: 0 }, "acc")
        )
    );
  overlay
    .querySelector("#_em-addfix")
    .addEventListener("click", () =>
      overlay
        .querySelector("#_em-fixlist")
        .insertAdjacentHTML(
          "beforeend",
          makeItemRow({ name: "", price: 0 }, "fix")
        )
    );

  overlay.querySelector("#_em-apply").addEventListener("click", () => {
    const prices = getPrices();
    const newNotes = overlay.querySelector("#_em-notes").value.trim();
    const selSvcs = Array.from(
      overlay.querySelectorAll('[name="_emsvc"]:checked')
    ).map((el) => el.value);
    const new2sys = overlay.querySelector("#_em2sys") ? overlay.querySelector("#_em2sys").checked : (sysList.length === 2);
    const newTemp = overlay.querySelector("#_emtemp").checked;
    const tstatVal = overlay.querySelector("#_em-tstat").value;
    const newTstat = tstatVal ? { name: tstatVal } : null;
    const newTstatQty = parseInt(overlay.querySelector("#_em-tqty").value) || 1;

    const collectItems = (listId) =>
      Array.from(overlay.querySelectorAll(`#${listId} .em-row`))
        .map((row) => {
          const sel = row.querySelector(".em-sel");
          const name =
            sel.value === "__other__"
              ? row.querySelector(".em-other").value.trim()
              : sel.value;
          const price = parseFloat(row.querySelector(".em-price").value) || 0;
          return name ? { name, displayName: name.toLowerCase(), price } : null;
        })
        .filter(Boolean);

    const newAccs = collectItems("_em-acclist");
    const newFixes = collectItems("_em-fixlist");

    const updatedSystems = sysList.map((sys, idx) => {
      const sysWid = {};
      overlay.querySelectorAll(`[data-wi='${idx + 1}']`).forEach((el) => {
        sysWid[el.dataset.key] = el.value.trim();
      });
      const svcEl = overlay.querySelector(`.em-sys-svc[data-sys-idx='${idx}']`);
      return {
        ...sys,
        serviceType: svcEl ? (svcEl.value || null) : (sys.serviceType || null),
        weightInData: sysWid,
      };
    });
    const updatedWid = updatedSystems[0]?.weightInData || {};
    const updatedWid2 = updatedSystems[1]?.weightInData || null;

    const hasCancel = selSvcs.includes(SERVICES.CANCEL);
    const svcItems = [];
    if (hasCancel) {
      svcItems.push({
        name: SERVICES.CANCEL,
        displayName: "service canceled",
        price: 0,
      });
    } else {
      const formatSvc = (name) => {
        if (!name) return { name: "", label: "", price: 0 };
        if (name === SERVICES.FINISH) return { name: SERVICES.FINISH, label: "Finish/", price: FINISH_SERVICE_PRICE };
        if (name === SERVICES.AC_HEAT) return { name: SERVICES.AC_HEAT, label: newTemp ? "AC & Heat started (Temporarily)" : "AC & Heat started", price: prices.SERVICE[SERVICES.AC_HEAT] ?? 30 };
        if (name === SERVICES.AC) return { name: SERVICES.AC, label: newTemp ? "AC (Temporarily) started" : "AC started", price: prices.SERVICE[SERVICES.AC] ?? 30 };
        if (name === SERVICES.HEAT) return { name: SERVICES.HEAT, label: newTemp ? "Heat (Temporarily) started" : "Heat started", price: prices.SERVICE[SERVICES.HEAT] ?? 30 };
        if (name === SERVICES.PRESTART) return { name: SERVICES.PRESTART, label: "System Prestarted", price: prices.SERVICE[SERVICES.PRESTART] ?? 20 };
        if (name === SERVICES.DRIVE_RUN) return { name: SERVICES.DRIVE_RUN, label: "Drive Run", price: prices.SERVICE[SERVICES.DRIVE_RUN] ?? 10 };
        return { name, label: name, price: prices.SERVICE[name] ?? 0 };
      };

      const getGlobalSvc = () => {
        const hasAC = selSvcs.includes(SERVICES.AC);
        const hasHeat = selSvcs.includes(SERVICES.HEAT);
        const hasFinish = selSvcs.includes(SERVICES.FINISH);
        const hasPrestart = selSvcs.includes(SERVICES.PRESTART);
        const hasDriveRun = selSvcs.includes(SERVICES.DRIVE_RUN);
        if (hasFinish) {
          const combo = hasAC && hasHeat ? "AC & Heat" : hasAC ? "AC" : hasHeat ? "Heat" : "";
          const label = combo ? `Finish/ ${combo} started` : "Finish";
          return { name: SERVICES.FINISH, label, price: (hasAC || hasHeat) ? FINISH_SERVICE_PRICE : 0 };
        } else if (hasAC && hasHeat) {
          return { name: SERVICES.AC_HEAT, label: newTemp ? "AC & Heat started (Temporarily)" : "AC & Heat started", price: prices.SERVICE[SERVICES.AC_HEAT] ?? 30 };
        } else if (hasAC) {
          return { name: SERVICES.AC, label: newTemp ? "AC (Temporarily) started" : "AC started", price: prices.SERVICE[SERVICES.AC] ?? 30 };
        } else if (hasHeat) {
          return { name: SERVICES.HEAT, label: newTemp ? "Heat (Temporarily) started" : "Heat started", price: prices.SERVICE[SERVICES.HEAT] ?? 30 };
        } else if (hasPrestart) {
          return { name: SERVICES.PRESTART, label: "System Prestarted", price: prices.SERVICE[SERVICES.PRESTART] ?? 20 };
        } else if (hasDriveRun) {
          return { name: SERVICES.DRIVE_RUN, label: "Drive Run", price: prices.SERVICE[SERVICES.DRIVE_RUN] ?? 10 };
        }
        return { name: "", label: "", price: 0 };
      };

      const globalSvc = getGlobalSvc();
      const perSys = updatedSystems.map(s => s.serviceType ? formatSvc(s.serviceType) : globalSvc);
      const allIdentical = perSys.length > 0 && perSys.every(p => p.name === perSys[0].name && p.label === perSys[0].label);

      let tstatSuffix = "";
      if (newTstat) {
        const ql = newTstatQty === 1 ? "tstat" : "tstats";
        tstatSuffix = ` ${newTstatQty} ${newTstat.name} ${ql}`;
      }

      const sysCount = updatedSystems.length > 2
        ? updatedSystems.length
        : (new2sys ? 2 : (updatedSystems.length || 1));

      if (allIdentical && perSys[0].name) {
        let dn = perSys[0].label;
        if (sysCount > 1) dn += ` (${sysCount} Systems)`;
        dn += tstatSuffix;
        svcItems.push({ name: perSys[0].name, displayName: dn, price: perSys[0].price * sysCount });
      } else if (perSys.some(p => p.name)) {
        perSys.forEach((svc, idx) => {
          let dn = `Sys ${idx + 1}: ${svc.label}`;
          if (idx === perSys.length - 1 && tstatSuffix) dn += tstatSuffix;
          svcItems.push({ name: svc.name, displayName: dn, price: svc.price, systemIndex: idx });
        });
      }
    }

    const svcTotal = svcItems.reduce((s, i) => s + i.price, 0);
    const accTotal = newAccs.reduce((s, i) => s + i.price, 0);
    const fixTotal = newFixes.reduce((s, i) => s + i.price, 0);

    const sysCount = updatedSystems.length > 2
      ? updatedSystems.length
      : (new2sys ? 2 : (updatedSystems.length || 1));

    const updated = {
      ...c,
      notes: newNotes,
      isTwoSystems: sysCount === 2,
      isTemporary: newTemp,
      selectedThermostat: newTstat,
      thermostatQuantity: newTstatQty,
      services: svcItems,
      accessories: newAccs,
      fixes: newFixes,
      systems: updatedSystems,
      weightInData: updatedWid,
      weightInData2: updatedWid2,
      totals: {
        service: svcTotal,
        accessory: accTotal,
        fix: fixTotal,
        total: svcTotal + accTotal + fixTotal,
      },
    };
    updated.reportText = generateReportText(updated);
    if (!updated.refrigerant) {
      updated.refrigerant = getOutdoorModel(updated.outdoor)?.freon ||
        getOutdoorModel(updated.outdoor2)?.freon || "";
    }

    saveCompletion(updated);
    renderReports();
    close();
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("./sw.js").catch(() => {});

  initSettings();
  const s = getSettings();
  document.documentElement.setAttribute("data-mode", s.theme);

  // Restore interrupted session
  const savedId = getActiveJobId();
  if (savedId) {
    const job = getJobById(savedId);
    if (job) {
      _activeJob = job;
      initWorkspace(job);
      initChat(job);
      _chatInitialized = true;
    }
  }

  buildAddJobSection();
  wireEvents();
  const _inList  = document.getElementById("ej-indoor-list");
  const _outList = document.getElementById("ej-outdoor-list");
  Object.keys(INDOOR_CATALOG).forEach((m) => {
    const o = document.createElement("option"); o.value = m; _inList.appendChild(o);
  });
  Object.keys(OUTDOOR_CATALOG).forEach((m) => {
    const o = document.createElement("option"); o.value = m; _outList.appendChild(o);
  });
  initTsPanel();
  renderJobs();
  renderWorkspace();
  updateActiveJobBar();
  precacheJobs(getAllJobs()); // background, no await

  getCompletions().forEach((c) => {
    if (!c.refrigerant) {
      const freon = getOutdoorModel(c.outdoor)?.freon ||
        getOutdoorModel(c.outdoor2)?.freon || "";
      if (freon) saveCompletion({ ...c, refrigerant: freon });
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
