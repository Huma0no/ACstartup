// src/app.js — Entry point: init, tab routing, event wiring, UI updates.

import {
  initSettings,
  getSettings,
  setTheme,
  setAiProvider,
  setAiApiKey,
  getPrices,
  setPrice,
  resetPrices,
} from "./settings.js";
import {
  createJob,
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
} from "./storage.js";
import {
  initWorkspace,
  initWeighInPhotos,
  getState,
  clearWorkspace,
  setOption,
  toggleService,
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
  compressImage,
  calculateCFM,
  getSubcoolingDefault,
} from "./utils.js";
import { downloadDiagram, precacheJobs } from "./diagrams.js";
import { initChat } from "./ai.js";
import { renderLV as _renderLV, openViewer as _openViewer } from "./lv.js";
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
  getIndoorSeriesGroups,
  getOutdoorSeriesGroups,
  getIndoorModel,
  getOutdoorModel,
  SERIES_LINKS,
  OUTDOOR_LINKS,
} from "./data.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _activeJob = null;
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

  const cards = groupBySubdivision(jobs).flatMap(({ colorIndex, jobs: gj }) =>
    gj.map((j) => ({ job: j, html: jobCardHTML(j, colorIndex) }))
  );

  const inProgIdx = cards.findIndex(({ job }) => !!job.savedState);

  let html = "";
  cards.forEach(({ html: cardHtml }, i) => {
    html += cardHtml;
    if (i === inProgIdx) {
      const pendingRows = cards
        .filter((_, pi) => pi !== inProgIdx)
        .map(
          ({ job: pj }) =>
            `<div class="pending-item">
            ${
              pj.timeSensitive ? `<span class="pending-urgent-dot"></span>` : ""
            }
            <span class="pending-addr">${esc(pj.address)}</span>
            <span class="pending-meta">${esc(pj.subdivision)} · ${esc(
              pj.builder
            )}</span>
          </div>`
        )
        .join("");
      if (pendingRows)
        html += `<li class="pending-section"><span class="pending-label">Pending</span>${pendingRows}</li>`;
    }
  });

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
  const s1 = job.system1 || {};
  const s2 = job.system2;

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
            ACCESSORY_DISPLAY[a] || a.toLowerCase()
          )}</span>`
      ),
    job.isTwoSystems &&
      `<span class="chip chip-sm chip-secondary">2 Systems</span>`,
  ]
    .filter(Boolean)
    .join("");

  const _equipCard = (furnace, outdoor, label) => {
    if (!furnace && !outdoor) return "";
    const dOut = outdoor ? getOutdoorModel(outdoor) : null;
    const cfm = dOut ? calculateCFM(dOut.btu) : null;
    const sc =
      dOut?.oemSubcoolingGoal != null ? `${dOut.oemSubcoolingGoal} °F` : "—";
    const rev = dOut?.revisedCharge > 0 ? `${dOut.revisedCharge} oz` : "—";
    return `<div class="equip-card">
      <div class="equip-heading">${esc(label)}</div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-label">Indoor</div>
          <div class="equip-cell-value">${furnace ? esc(furnace) : "—"}</div>
        </div>
        <div class="equip-cell">
          <div class="equip-cell-label">Outdoor</div>
          <div class="equip-cell-value">${outdoor ? esc(outdoor) : "—"}</div>
        </div>
      </div>
      <div class="equip-row">
        <div class="equip-cell">
          <div class="equip-cell-label">Factory</div>
          <div class="equip-cell-value">${
            dOut?.FactoryCharge ? `${dOut.FactoryCharge} oz` : "—"
          }</div>
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
          furnace || ""
        )}">Indoor LV</button>
        <button class="btn-lv" data-type="outdoor" data-model="${esc(
          outdoor || ""
        )}">Outdoor LV</button>
        <button class="btn-blower" data-model="${esc(
          furnace || ""
        )}">Blower Data</button>
      </div>
    </div>`;
  };
  const equipCards = [
    _equipCard(s1.furnace, s1.outdoor, "System 1"),
    job.isTwoSystems && s2
      ? _equipCard(s2.furnace, s2.outdoor, "System 2")
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
<li class="job-item${inProg ? " expanded" : ""}" data-id="${esc(job.id)}"
    style="border-left-color:var(--subdivision-${ci})">
  <button class="btn-delete" data-delete="${esc(
    job.id
  )}" aria-label="Delete"></button>
  <div class="job-face">
    <div class="job-top">
      <div class="job-top-addr"><strong>${esc(job.address)}</strong></div>
      <div class="job-top-spacer"></div>
      ${techChips ? `<div class="job-top-tech">${techChips}</div>` : ""}
      <div class="job-top-meta">
        <span class="chip chip-sm chip-secondary">${esc(job.builder)}</span>
        <span class="chip chip-sm chip-secondary">${esc(job.subdivision)}</span>
        ${badge}${ts}
      </div>
    </div>
    ${equipCards ? `<div class="equip-grid">${equipCards}</div>` : ""}
    <button class="btn-start-job" data-start="${esc(job.id)}">
      ${inProg ? "Continue →" : "Start →"}
    </button>
  </div>
  <div class="job-actions"><div class="job-buttons">
    <button class="btn btn-edit" data-edit="${esc(job.id)}">Edit</button>
    <button class="btn btn-maps" data-maps="${esc(job.address)}">Maps</button>
  </div></div>
</li>`;
}

// ---------------------------------------------------------------------------
// Open workspace
// ---------------------------------------------------------------------------

function openWorkspace(job) {
  _activeJob = job;
  setActiveJobId(job.id);
  initWorkspace(job);
  initWeighInPhotos(job.address);
  onWeighInPhotoChange(_updatePhotoCount);
  _initSitePhotoPresets();
  initChat(job);
  openTab("workspace");
  renderWorkspace();
  updateActiveJobBar();
  initSitePhotos().then((stored) => {
    for (const [slug, { file, label }] of Object.entries(stored)) {
      _renderSitePhotoThumb(slug, label, file);
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

const LINE_CONFIG_OPTIONS = [
  "",
  "10ft (Trane)",
  "25ft Trane revisedCharge",
  "15ft Daikin",
  "15ft Goodman",
  "15ft Lennox",
  "30ft Lennox revisedCharge",
];

const FIX_GROUPS = [
  {
    label: "Fixed Leaks",
    id: "leaks",
    fixes: [
      { key: FIXES.LEAKS_ECOIL, label: "at eCoil" },
      { key: FIXES.LEAKS_CUNIT, label: "at Cunit" },
      { key: FIXES.LEAKS_WALL, label: "inside Wall" },
    ],
  },
  {
    label: "Extended LV Wire",
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

function renderWorkspace() {
  const job = _activeJob;
  const state = getState();
  const on = !!(job && state);

  document.getElementById("workspace-empty").classList.toggle("hidden", on);
  document.getElementById("workspace-form").classList.toggle("hidden", !on);
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
    `<div class="ws-btn-grid">` +
    SVC_BTNS.map(
      (n) =>
        `<button class="ws-btn${
          sel.includes(n) ? " ws-btn-active" : ""
        }" data-service="${esc(n)}">${esc(n)}</button>`
    ).join("") +
    `<button class="ws-btn">Other</button>` +
    `</div>`;
  document.getElementById("ac-heat-options").innerHTML = `
    <label class="toggle-row"><span>2 Systems</span>
      <input type="checkbox" id="ws-two-systems"${
        state.isTwoSystems ? " checked" : ""
      }></label>
    <label class="toggle-row"><span>Temporarily</span>
      <input type="checkbox" id="ws-temporarily"${
        state.isTemporary ? " checked" : ""
      }></label>`;

  // Step 3 — Thermostat
  const tsel = state.selectedThermostat;
  document.getElementById("thermostat-buttons").innerHTML =
    `<div class="ws-btn-grid">` +
    THERMOSTATS.map(
      (n) =>
        `<button class="ws-btn${
          tsel === n ? " ws-btn-active" : ""
        }" data-tstat="${esc(n)}">${esc(n)}</button>`
    ).join("") +
    `<button class="ws-btn">Other</button>` +
    `</div>` +
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

  // Step 4 — Accessories
  const _accBtn = (n) => {
    const active =
      state.selectedAccessories.includes(n) ||
      state.customAccessories.some((a) => a.name === n);
    const isTwoSys = state.isTwoSystems && TWO_SYSTEMS_ACCESSORIES.includes(n);
    const disp =
      (ACCESSORY_DISPLAY[n] || n.toLowerCase()) + (isTwoSys ? " (2 sys)" : "");
    const custom = CUSTOM_PRICE_ACCESSORIES.includes(n) ? " data-custom" : "";
    return `<button class="ws-btn${
      active ? " ws-btn-active" : ""
    }" data-accessory="${esc(n)}"${custom}>${esc(disp)}</button>`;
  };
  document.getElementById("accessory-buttons").innerHTML =
    `<div class="ws-zone-grid">` +
    [
      ACCESSORIES.UT3000,
      ACCESSORIES.HZ322,
      ACCESSORIES.HARMONY,
      ACCESSORIES.DAPC,
      ACCESSORIES.E_BYPASS,
      ACCESSORIES.BYPASS,
    ].map((n) => _accBtn(n)).join("") +
    `</div>` +
    `<div class="ws-btn-grid">` +
    [
      ACCESSORIES.FIN180P,
      ACCESSORIES.DEHUM,
      ACCESSORIES.FLOAT_SWITCH,
      ACCESSORIES.WEIGHT_IN_DATA,
      ACCESSORIES.ECOIL_WIRE,
      ACCESSORIES.APRIL_AIR,
      ACCESSORIES.FA_INTAKE,
      ACCESSORIES.FIN6_MD,
      ACCESSORIES.TRANE_HARNESS,
      ACCESSORIES.RDS,
      ACCESSORIES.LP_KIT_LENNOX_1STG,
      ACCESSORIES.LP_KIT_LENNOX_2STG,
      ACCESSORIES.LP_KIT_GOODMAN,
      ACCESSORIES.OTRO,
    ].map((n) => _accBtn(n)).join("") +
    `</div>`;

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
      const active =
        state.selectedFixes.includes(n) ||
        state.customFixes.some((f) => f.name === n);
      const disp = FIX_DISPLAY[n] || n.toLowerCase();
      const custom = CUSTOM_PRICE_FIXES.includes(n) ? " data-custom" : "";
      return `<button class="ws-btn${
        active ? " ws-btn-active" : ""
      }" data-fix="${esc(n)}"${custom}>${esc(disp)}</button>`;
    })
    .join("");
  document.getElementById("fixes-list").innerHTML =
    `<div class="ws-btn-grid">${_standaloneHTML}</div>` + _groupsHTML;

  // Step 5 — Weight-In
  const s1 = job.system1 || {};
  let wiData1 = state.weightInData || {};
  const _wiOutdoor = getOutdoorModel(s1.outdoor);
  if (_wiOutdoor) {
    const _needFc = !wiData1.factoryChargeOz && _wiOutdoor.FactoryCharge;
    const _needAdj = !wiData1.approxAdjustOz;
    if (_needFc || _needAdj) {
      if (_needFc)
        wiData1 = {
          ...wiData1,
          factoryChargeOz: String(_wiOutdoor.FactoryCharge),
        };
      if (_needAdj) {
        const _lc = wiData1.factoryLineConfig || "";
        const _adj = _lc.includes("revisedCharge")
          ? _wiOutdoor.revisedCharge
          : _wiOutdoor.FactoryCharge;
        if (_adj) wiData1 = { ...wiData1, approxAdjustOz: String(_adj) };
      }
      setWeightInData(wiData1, 1);
    }
  }
  if (_wiOutdoor && !wiData1.oemSubcoolingGoal) {
    wiData1 = {
      ...wiData1,
      oemSubcoolingGoal: String(getSubcoolingDefault(s1.outdoor)),
    };
    setWeightInData(wiData1, 1);
  }
  const _wiLc = wiData1.factoryLineConfig || "";
  const _wiBc = _wiOutdoor
    ? _wiLc.includes("revisedCharge")
      ? _wiOutdoor.revisedCharge
      : _wiOutdoor.FactoryCharge
    : 0;
  const _wiAdj = parseFloat(wiData1.adjustedOz);
  const _wiNewTotalTxt =
    _wiBc && !isNaN(_wiAdj) ? ouncesToPoundsAndOunces(_wiBc + _wiAdj) : "—";
  document.getElementById("wi-fields-sys1").innerHTML = wiGridHTML(
    wiData1,
    "data-wi"
  );
  const _sys2Fields = document.getElementById("wi-fields-sys2");
  const _sys2PhotoRow = document.getElementById("wi-photo-row-2");
  _sys2Fields.innerHTML = state.isTwoSystems
    ? `<p class="step-label">System 2</p>${wiGridHTML(
        state.weightInData2,
        "data-wi2"
      )}`
    : "";
  _sys2Fields.classList.toggle("hidden", !state.isTwoSystems);
  _sys2PhotoRow.classList.toggle("hidden", !state.isTwoSystems);
  const _ntcEl = document.getElementById("wi-new-total-charge");
  if (_ntcEl) _ntcEl.textContent = _wiNewTotalTxt;

  // Step 7 — Notes & Photos
  document.getElementById("notes-input").value = state.notes || "";
  updatePriceDisplay();
  updateAccordionSummaries();
}

function updateAccordionSummaries() {
  const state = getState();
  if (!state) return;

  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text || "—";
  };

  const setDone = (id, done) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("acc-done", done);
    const icon = el.querySelector(".acc-state-icon");
    if (icon) icon.textContent = done ? "✓" : "○";
  };

  const svcParts = [...state.selectedServices, state.selectedThermostat].filter(
    Boolean
  );
  setText("#section-service .acc-summary", svcParts.join(" · ") || "—");
  setDone("section-service", svcParts.length > 0);

  const accParts = [
    ...state.selectedAccessories.map(
      (n) => ACCESSORY_DISPLAY[n] || n.toLowerCase()
    ),
    ...state.customAccessories.map(
      (a) => ACCESSORY_DISPLAY[a.name] || a.name.toLowerCase()
    ),
  ];
  setText("#section-accessories .acc-summary", accParts.join(" · ") || "—");
  setDone("section-accessories", accParts.length > 0);

  const fixParts = [
    ...state.selectedFixes.map((n) => FIX_DISPLAY[n] || n.toLowerCase()),
    ...state.customFixes.map(
      (f) => FIX_DISPLAY[f.name] || f.name.toLowerCase()
    ),
  ];
  setText("#section-fixes .acc-summary", fixParts.join(" · ") || "—");
  setDone("section-fixes", fixParts.length > 0);

  const hasWiData = Object.values(state.weightInData || {}).some(Boolean);
  setText("#section-weight-in .acc-summary", hasWiData ? "data entered" : "—");
  setDone("section-weight-in", hasWiData);

  const notes = state.notes || "";
  setText(
    "#section-notes .acc-summary",
    notes ? (notes.length > 30 ? notes.slice(0, 30) + "…" : notes) : "—"
  );
  setDone("section-notes", notes.length > 0);
}

function _updatePhotoCount() {
  const n = getPhotoCount();
  const btn = document.getElementById("btn-download-site-photos");
  btn.textContent = `Download All Photos (${n})`;
  btn.disabled = n === 0;
}

function _renderSitePhotoThumb(slug, label, file) {
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
  img.style.cssText =
    "width:60px;height:60px;object-fit:cover;border-radius:var(--radius-sm);";

  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  labelSpan.style.cssText =
    "font-size:var(--font-size-xs);color:var(--color-text-secondary);";

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
    const compressed = await compressImage(file);
    addSitePhoto(slug, label, compressed);
    saveProgress(_activeJob);
    _renderSitePhotoThumb(slug, label, compressed);
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
    const compressed = await compressImage(file);
    const slot = _makeSiteSlot(slug, label);
    container.insertBefore(slot, otherWrap);
    addSitePhoto(slug, label, compressed);
    saveProgress(_activeJob);
    _renderSitePhotoThumb(slug, label, compressed);
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
  if (sys !== 1) return;
  const el = document.getElementById("wi-new-total-charge");
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

function renderSettingsModal() {
  const s = getSettings();
  document.getElementById("theme-toggle").checked = s.theme === "light";
  document.getElementById("ai-provider-row").innerHTML = AI_PROVIDERS.map(
    ({ id, label }) =>
      `<button class="chip chip-sm${
        s.aiProvider === id ? " chip-primary" : ""
      }" data-provider="${id}">${label}</button>`
  ).join("");
  document.getElementById("ai-settings-key-input").value = s.aiApiKey || "";
  document.getElementById("ai-settings-status").textContent = s.aiApiKey
    ? "Key saved."
    : "";
  const prices = getPrices();
  document.querySelectorAll("[data-price-category]").forEach((inp) => {
    const cat = inp.dataset.priceCategory;
    const name = inp.dataset.priceName;
    inp.value =
      cat === "WEIGHT_IN_FINISH_ADDON"
        ? prices.WEIGHT_IN_FINISH_ADDON
        : prices[cat]?.[name] ?? "";
  });
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
      const disp = ACCESSORY_DISPLAY[name] || name.toLowerCase();
      return `<span class="chip chip-sm chip-secondary">${esc(
        disp
      )}<button type="button" class="chip-remove" data-remove-acc="${esc(
        name
      )}" aria-label="Remove">×</button></span>`;
    })
    .join("");
}

function _collapseAddJobForm() {
  _newJobAccChips = [];
  document.getElementById("new-job-acc-chips").innerHTML = "";
  document.getElementById("indoor-links").innerHTML = "";
  document.getElementById("outdoor-links").innerHTML = "";
  document.getElementById("indoor-links2").innerHTML = "";
  document.getElementById("outdoor-links2").innerHTML = "";
  document.getElementById("new-job-tstat-other").classList.add("hidden");
  document.getElementById("new-job-sys2").classList.add("hidden");
  document.getElementById("add-job-form").reset();
  document.getElementById("add-job-section").classList.add("hidden");
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
          ACCESSORY_DISPLAY[a] || a.toLowerCase()
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
      <label class="toggle-row"><span>2 Systems</span>
        <input type="checkbox" id="new-job-two-systems" name="two-systems">
      </label>
      <div class="form-row">
        <div>
          <label>Indoor unit
            <select name="furnace" id="new-job-furnace">
              <option value="">-- Select model --</option>${_indoorOptgroups()}
            </select>
          </label>
          <div id="indoor-links" class="series-links"></div>
        </div>
        <div>
          <label>Outdoor unit
            <select name="outdoor" id="new-job-outdoor">
              <option value="">-- Select model --</option>${_outdoorOptgroups()}
            </select>
          </label>
          <div id="outdoor-links" class="series-links"></div>
        </div>
      </div>
      <div id="new-job-sys2" class="hidden">
        <p class="step-label">System 2</p>
        <div class="form-row">
          <div>
            <label>Indoor unit 2
              <select name="furnace2" id="new-job-furnace2">
                <option value="">-- Select model --</option>${_indoorOptgroups()}
              </select>
            </label>
            <div id="indoor-links2" class="series-links"></div>
          </div>
          <div>
            <label>Outdoor unit 2
              <select name="outdoor2" id="new-job-outdoor2">
                <option value="">-- Select model --</option>${_outdoorOptgroups()}
              </select>
            </label>
            <div id="outdoor-links2" class="series-links"></div>
          </div>
        </div>
      </div>
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
    entry.FactoryCharge && `Factory: ${entry.FactoryCharge} oz`,
    entry.revisedCharge > 0 && `Revised: ${entry.revisedCharge} oz`,
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

function wireEvents() {
  // Tab buttons
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.addEventListener("click", () => openTab(b.dataset.tab)));

  // Header — modals & drawer
  document.getElementById("btn-settings").addEventListener("click", () => {
    renderSettingsModal();
    document.getElementById("settings-modal").showModal();
  });
  document
    .getElementById("settings-close")
    .addEventListener("click", () =>
      document.getElementById("settings-modal").close()
    );
  document
    .getElementById("btn-open-quick-calc")
    .addEventListener("click", () =>
      document.getElementById("quick-calc-modal").showModal()
    );
  document
    .getElementById("quick-calc-close")
    .addEventListener("click", () =>
      document.getElementById("quick-calc-modal").close()
    );
  document
    .getElementById("btn-open-troubleshoot")
    .addEventListener("click", () => {
      document.getElementById("ts-drawer").classList.add("open");
      document.getElementById("ts-drawer").setAttribute("aria-hidden", "false");
      document.getElementById("ts-overlay").classList.add("visible");
    });
  document.getElementById("ts-overlay").addEventListener("click", () => {
    document.getElementById("ts-drawer").classList.remove("open");
    document.getElementById("ts-drawer").setAttribute("aria-hidden", "true");
    document.getElementById("ts-overlay").classList.remove("visible");
  });

  // Accordion
  document.getElementById("workspace-form").addEventListener("click", (e) => {
    const header = e.target.closest(".step-header");
    if (!header) return;
    const section = header.closest(".step-section");
    const isOpen = section.classList.contains("acc-open");
    document
      .querySelectorAll("#workspace-form .step-section.acc-open")
      .forEach((s) => s.classList.remove("acc-open"));
    if (!isOpen) section.classList.add("acc-open");
  });

  // Jobs — list delegation
  document
    .getElementById("btn-add-job")
    .addEventListener("click", () =>
      document.getElementById("add-job-section").classList.remove("hidden")
    );
  document.getElementById("jobs-list").addEventListener("click", (e) => {
    const del = e.target.closest("[data-delete]");
    const start = e.target.closest("[data-start]");
    const edit = e.target.closest("[data-edit]");
    const maps = e.target.closest("[data-maps]");
    const item = e.target.closest(".job-item");

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
      toast("Edit not yet implemented", "info");
      return;
    }
    if (maps) {
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(maps.dataset.maps)}`,
        "_blank"
      );
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
    const tst = e.target.closest("[data-tstat]");
    const qty = e.target.closest("[data-qty]");
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
      if ("custom" in acc.dataset) {
        const p = prompt(`Price for ${acc.dataset.accessory}:`);
        if (p === null) return;
        toggleAccessory(acc.dataset.accessory, parseFloat(p) || 0);
      } else {
        toggleAccessory(acc.dataset.accessory);
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
      if ("custom" in fix.dataset) {
        const p = prompt(`Price for ${fix.dataset.fix}:`);
        if (p === null) return;
        toggleFix(fix.dataset.fix, parseFloat(p) || 0);
      } else {
        toggleFix(fix.dataset.fix);
      }
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
    if (e.target.dataset.wi === "factoryLineConfig") {
      const data = {};
      wsForm.querySelectorAll("[data-wi]").forEach((inp) => {
        data[inp.getAttribute("data-wi")] = inp.value;
      });
      const outdoor = getOutdoorModel(_activeJob?.system1?.outdoor);
      if (outdoor) {
        const lineConfig = e.target.value;
        const baseCharge = lineConfig.includes("revisedCharge")
          ? outdoor.revisedCharge
          : outdoor.FactoryCharge;
        const fcInput = wsForm.querySelector('[data-wi="factoryChargeOz"]');
        if (fcInput) {
          fcInput.value = String(baseCharge);
          data.factoryChargeOz = String(baseCharge);
        }
        const approxInput = wsForm.querySelector('[data-wi="approxAdjustOz"]');
        const result = calculateApproxAdjust(
          parseFloat(data.linesetLength),
          lineConfig
        );
        data.approxAdjustOz =
          result !== null ? result : baseCharge ? String(baseCharge) : "";
        if (approxInput) approxInput.value = data.approxAdjustOz;
      }
      setWeightInData(data, 1);
      _renderNewTotalCharge(data, 1);
      updatePriceDisplay();
      saveProgress(_activeJob);
    }
  });

  // Workspace — text inputs (notes + weight-in)
  wsForm.addEventListener("input", (e) => {
    const state = getState();
    if (!state) return;
    if (e.target.id === "notes-input") {
      setNotes(e.target.value);
      saveProgress(_activeJob);
      return;
    }
    if (e.target.dataset.wi || e.target.dataset.wi2) {
      const sys = e.target.dataset.wi ? 1 : 2;
      const attr = sys === 1 ? "data-wi" : "data-wi2";
      const data = {};
      wsForm.querySelectorAll(`[${attr}]`).forEach((inp) => {
        data[inp.getAttribute(attr)] = inp.value;
      });
      // Auto-calc subcooling
      const liq = parseFloat(data.liquidLineTemp);
      const csat = parseFloat(data.condenserSatTemp);
      if (!isNaN(liq) && !isNaN(csat)) {
        data.subcoolingValue = String(csat - liq);
        const scInput = wsForm.querySelector(`[${attr}="subcoolingValue"]`);
        if (scInput) scInput.value = data.subcoolingValue;
      }
      const scVal = parseFloat(data.subcoolingValue);
      const oemGoal = parseFloat(data.oemSubcoolingGoal);
      if (!isNaN(scVal) && !isNaN(oemGoal)) {
        data.subcoolingDeviation = String(Math.abs(scVal - oemGoal));
        const devInput = wsForm.querySelector(
          `[${attr}="subcoolingDeviation"]`
        );
        if (devInput) devInput.value = data.subcoolingDeviation;
      }
      const warnContainer = document.getElementById(
        sys === 1 ? "wi-fields-sys1" : "wi-fields-sys2"
      );
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
      if (sys === 1 && e.target.dataset.wi === "linesetLength") {
        const outdoor = getOutdoorModel(_activeJob?.system1?.outdoor);
        if (outdoor) {
          const lineConfig = data.factoryLineConfig || "";
          const result = calculateApproxAdjust(
            parseFloat(data.linesetLength),
            lineConfig
          );
          if (result !== null) {
            data.approxAdjustOz = result;
            const approxInput = wsForm.querySelector(
              '[data-wi="approxAdjustOz"]'
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
    .addEventListener("click", () => {
      if (!_activeJob) return;
      const completion = buildCompletion(_activeJob, getPrices());
      completion.reportText = generateReportText(completion);
      saveCompletion(completion);
      removeJob(_activeJob.id);
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
      deleteCompletion(del.dataset.delete);
      renderReports();
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
    getCompletions().forEach((c) => deleteCompletion(c.jobId));
    renderReports();
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
      const photos = getAllPhotos();
      if (!photos.length) return;
      const safeAddr = (_activeJob?.address || "SITE")
        .replace(/[^a-z0-9]/gi, "_")
        .toUpperCase();
      await _loadJSZip();
      const zip = new window.JSZip();
      for (const { file, label } of photos) {
        const name = `${safeAddr}_${label
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")}.jpg`;
        zip.file(name, file);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url,
        download: `${safeAddr}_PHOTOS.zip`,
      }).click();
      URL.revokeObjectURL(url);
      toast("Photos downloaded!", "success");
    });

  // Settings modal — theme, provider, key
  document.getElementById("theme-toggle").addEventListener("change", (e) => {
    const mode = e.target.checked ? "light" : "dark";
    setTheme(mode);
    document.documentElement.setAttribute("data-mode", mode);
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
    setAiApiKey(key);
    document.getElementById("ai-settings-status").textContent = key
      ? "Key saved."
      : "Key cleared.";
    toast("API key saved", "success");
  });
  document.getElementById("ai-settings-clear").addEventListener("click", () => {
    setAiApiKey("");
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
    .getElementById("new-job-two-systems")
    .addEventListener("change", (e) =>
      document
        .getElementById("new-job-sys2")
        .classList.toggle("hidden", !e.target.checked)
    );
  document
    .getElementById("new-job-furnace")
    .addEventListener("change", (e) =>
      _showEquipLinks(
        e.target.value,
        getIndoorModel,
        SERIES_LINKS,
        document.getElementById("indoor-links")
      )
    );
  document
    .getElementById("new-job-furnace2")
    .addEventListener("change", (e) =>
      _showEquipLinks(
        e.target.value,
        getIndoorModel,
        SERIES_LINKS,
        document.getElementById("indoor-links2")
      )
    );
  document
    .getElementById("new-job-outdoor")
    .addEventListener("change", (e) =>
      _showEquipLinks(
        e.target.value,
        getOutdoorModel,
        OUTDOOR_LINKS,
        document.getElementById("outdoor-links")
      )
    );
  document
    .getElementById("new-job-outdoor2")
    .addEventListener("change", (e) =>
      _showEquipLinks(
        e.target.value,
        getOutdoorModel,
        OUTDOOR_LINKS,
        document.getElementById("outdoor-links2")
      )
    );
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
    const fd = new FormData(e.target);
    const tstatVal = fd.get("tstat");
    const tstatModel =
      tstatVal === "Other"
        ? (fd.get("tstat-other") || "").trim()
        : tstatVal || "";
    const isTwoSystems = !!fd.get("two-systems");
    const job = createJob({
      address: fd.get("address").toUpperCase(),
      subdivision: (fd.get("subdivision") || "").toUpperCase(),
      builder: fd.get("builder") || "",
      details: fd.get("notes") || "",
      isTwoSystems,
      jobAccessories: [..._newJobAccChips],
      jobThermostat: tstatModel
        ? { model: tstatModel, qty: parseInt(fd.get("tstat-qty")) || 1 }
        : null,
      system1: {
        furnace: fd.get("furnace") || "",
        coil: "",
        outdoor: fd.get("outdoor") || "",
        links: {
          ...(SERIES_LINKS[getIndoorModel(fd.get("furnace"))?.series] ?? {}),
          ...(OUTDOOR_LINKS[getOutdoorModel(fd.get("outdoor"))?.series] ?? {}),
        },
      },
      system2: isTwoSystems
        ? {
            furnace: fd.get("furnace2") || "",
            coil: "",
            outdoor: fd.get("outdoor2") || "",
            links: {
              ...(SERIES_LINKS[getIndoorModel(fd.get("furnace2"))?.series] ??
                {}),
              ...(OUTDOOR_LINKS[getOutdoorModel(fd.get("outdoor2"))?.series] ??
                {}),
            },
          }
        : null,
    });
    precacheJobs([job]);
    _collapseAddJobForm();
    renderJobs();
    toast(`Job added: ${job.address}`, "success");
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

  const wid = c.weightInData || {};
  const wid2 = c.weightInData2 || {};

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
            <label class="em-check-label"><input type="checkbox" id="_em2sys"${
              c.isTwoSystems ? " checked" : ""
            }> 2 Systems</label>
            <label class="em-check-label"><input type="checkbox" id="_emtemp"${
              c.isTemporary ? " checked" : ""
            }> Temporarily</label>
          </div>
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
        ${wiSection(wid, 1)}
        ${c.isTwoSystems ? wiSection(wid2, 2) : ""}
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
    const new2sys = overlay.querySelector("#_em2sys").checked;
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

    const newWid = {},
      newWid2 = {};
    overlay.querySelectorAll("[data-wi='1']").forEach((el) => {
      newWid[el.dataset.key] = el.value.trim();
    });
    overlay.querySelectorAll("[data-wi='2']").forEach((el) => {
      newWid2[el.dataset.key] = el.value.trim();
    });
    const updatedWid2 = overlay.querySelector("[data-wi='2']")
      ? newWid2
      : c.weightInData2 || {};

    // Service items — mirrors _buildServiceItems in workspace.js
    const hasAC = selSvcs.includes(SERVICES.AC);
    const hasHeat = selSvcs.includes(SERVICES.HEAT);
    const hasFinish = selSvcs.includes(SERVICES.FINISH);
    const hasPrestart = selSvcs.includes(SERVICES.PRESTART);
    const hasDriveRun = selSvcs.includes(SERVICES.DRIVE_RUN);
    const hasCancel = selSvcs.includes(SERVICES.CANCEL);

    const svcItems = [];
    if (hasCancel) {
      svcItems.push({
        name: SERVICES.CANCEL,
        displayName: "service canceled",
        price: 0,
      });
    } else {
      let name,
        dn,
        price = 0;
      if (hasFinish) {
        name = SERVICES.FINISH;
        const combo =
          hasAC && hasHeat ? "AC & Heat" : hasAC ? "AC" : hasHeat ? "Heat" : "";
        dn = combo ? `Finish/ ${combo} started` : "Finish";
        price = prices.SERVICE[SERVICES.FINISH] ?? 0;
      } else if (hasAC && hasHeat) {
        name = SERVICES.AC_HEAT;
        dn = "AC & Heat started";
        price = prices.SERVICE[SERVICES.AC_HEAT] ?? 0;
      } else if (hasAC) {
        name = SERVICES.AC;
        dn = newTemp ? "AC (Temporarily) started" : "AC started";
        price = prices.SERVICE[SERVICES.AC] ?? 0;
      } else if (hasHeat) {
        name = SERVICES.HEAT;
        dn = newTemp ? "Heat (Temporarily) started" : "Heat started";
        price = prices.SERVICE[SERVICES.HEAT] ?? 0;
      } else if (hasPrestart) {
        name = SERVICES.PRESTART;
        dn = "System Prestarted";
        price = prices.SERVICE[SERVICES.PRESTART] ?? 0;
      } else if (hasDriveRun) {
        name = SERVICES.DRIVE_RUN;
        dn = "Drive Run";
        price = prices.SERVICE[SERVICES.DRIVE_RUN] ?? 0;
      }
      if (name) {
        if (new2sys) {
          price *= 2;
          dn += " (2 Systems)";
        }
        if (newTstat) {
          const ql = newTstatQty === 1 ? "tstat" : "tstats";
          dn += ` ${newTstatQty} ${newTstat.name} ${ql}`;
        }
        svcItems.push({ name, displayName: dn, price });
      }
    }

    const svcTotal = svcItems.reduce((s, i) => s + i.price, 0);
    const accTotal = newAccs.reduce((s, i) => s + i.price, 0);
    const fixTotal = newFixes.reduce((s, i) => s + i.price, 0);

    const updated = {
      ...c,
      notes: newNotes,
      isTwoSystems: new2sys,
      isTemporary: newTemp,
      selectedThermostat: newTstat,
      thermostatQuantity: newTstatQty,
      services: svcItems,
      accessories: newAccs,
      fixes: newFixes,
      weightInData: newWid,
      weightInData2: updatedWid2,
      totals: {
        service: svcTotal,
        accessory: accTotal,
        fix: fixTotal,
        total: svcTotal + accTotal + fixTotal,
      },
    };
    updated.reportText = generateReportText(updated);

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
    }
  }

  buildAddJobSection();
  wireEvents();
  renderJobs();
  renderWorkspace();
  updateActiveJobBar();
  precacheJobs(getAllJobs()); // background, no await
}

document.addEventListener("DOMContentLoaded", init);
