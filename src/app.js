// src/app.js — Entry point: init, tab routing, event wiring, UI updates.

import {
  initSettings, getSettings, setTheme, setAiProvider, setAiApiKey, getPrices,
} from "./settings.js";
import {
  createJob, removeJob, getJobById, getAllJobs, sortJobs, groupBySubdivision,
} from "./jobs.js";
import { saveCompletion, getCompletions, getActiveJobId, setActiveJobId, deleteCompletion } from "./storage.js";
import {
  initWorkspace, initWeighInPhotos, getState, clearWorkspace, setOption,
  toggleService, setThermostat, toggleAccessory, toggleFix,
  setWeightInData, setNotes, addPhoto, removePhoto,
  addSitePhoto, removeSitePhoto, getSitePhotos, getSitePhotoCount, initSitePhotos,
  calculateTotals, saveProgress, buildCompletion,
} from "./workspace.js";
import { generateReportText, generateDailyReport, exportJSON, exportCSV } from "./reports.js";
import { ouncesToPoundsAndOunces, calculateApproxAdjust, compressImage } from "./utils.js";
import { getLinksForJob, isAvailableOffline, downloadDiagram, precacheJobs } from "./diagrams.js";
import { initChat } from "./ai.js";
import {
  SERVICES, ACCESSORIES, FIXES, THERMOSTATS, BUILDERS,
  ACCESSORY_DISPLAY, FIX_DISPLAY,
  CUSTOM_PRICE_ACCESSORIES, CUSTOM_PRICE_FIXES, TWO_SYSTEMS_ACCESSORIES,
  getIndoorSeriesGroups, getOutdoorSeriesGroups,
  getIndoorModel, getOutdoorModel,
  SERIES_LINKS, OUTDOOR_LINKS,
} from "./data.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _activeJob = null;
let _newJobAccChips = [];

const SITE_PRESETS = [
  { label: "No P-Drain",        slug: "no_p_drain" },
  { label: "No Gas Meter",      slug: "no_gas_meter" },
  { label: "Gas Closed",        slug: "gas_closed" },
  { label: "No Electric Meter", slug: "no_electric_meter" },
  { label: "Breakers Missing",  slug: "breakers_missing" },
];

let _jsZipPromise = null;
function _loadJSZip() {
  if (_jsZipPromise) return _jsZipPromise;
  _jsZipPromise = new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = (e) => { _jsZipPromise = null; reject(e); };
    document.head.appendChild(s);
  });
  return _jsZipPromise;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    case "whatsapp": window.open(`https://api.whatsapp.com/send?text=${enc}`, "_blank"); break;
    case "sms":      window.location.href = `sms:?body=${enc}`; break;
    case "email":    window.location.href = `mailto:?subject=${encodeURIComponent("Service Report")}&body=${enc}`; break;
    case "copy":     navigator.clipboard.writeText(text).then(() => toast("Copied!", "success")); break;
  }
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

function openTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name)
  );
  document.querySelectorAll(".tab-panel").forEach((p) => {
    const on = p.id === `tab-${name}`;
    p.classList.toggle("active", on);
    p.classList.toggle("hidden", !on);
  });
  if (name === "reports") renderReports();
  if (name === "lv")      renderLV();
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

  list.innerHTML = groupBySubdivision(jobs)
    .flatMap(({ colorIndex, jobs: gj }) => gj.map((j) => jobCardHTML(j, colorIndex)))
    .join("");
}

function jobCardHTML(job, ci) {
  const inProg = !!job.savedState;
  const badge  = inProg ? `<span class="badge badge-warning">⚠ In Progress</span>` : "";
  const ts     = job.timeSensitive ? `<span class="badge badge-danger">⚡ Urgent</span>` : "";
  const s1     = job.system1 || {};
  const s2     = job.system2;

  // Col 1 Row 2 of job-top grid — always visible
  const techChips = [
    job.jobThermostat?.model && (() => {
      const qty = job.jobThermostat.qty || 1;
      return `<span class="chip chip-sm chip-primary">🌡 ${esc(qty > 1 ? `${qty}× ${job.jobThermostat.model}` : job.jobThermostat.model)}</span>`;
    })(),
    ...(job.jobAccessories || []).map((a) =>
      `<span class="chip chip-sm chip-accessory">📦 ${esc(ACCESSORY_DISPLAY[a] || a.toLowerCase())}</span>`
    ),
    job.isTwoSystems && `<span class="chip chip-sm chip-secondary">2️⃣ Systems</span>`,
  ].filter(Boolean).join("");

  // Expand-only: model + tech chips for one system
  const _sysRow = (furnace, outdoor, prefix = "") => {
    const chips = [
      furnace && `<span class="chip chip-sm chip-primary">${esc(prefix + furnace)}</span>`,
      outdoor && `<span class="chip chip-sm chip-secondary">${esc(prefix + outdoor)}</span>`,
    ];
    const d = outdoor ? getOutdoorModel(outdoor) : null;
    if (d) {
      const ton    = d.btu ? (d.btu / 12000).toFixed(1) : null;
      const cfgMax = d.btu ? Math.round((d.btu / 12000) * 400) : null;
      const cfgMin = cfgMax ? Math.round(cfgMax * 0.85) : null;
      chips.push(
        ton                    && `<span class="chip chip-sm chip-outline">${prefix}Ton ${ton}</span>`,
        d.freon                && `<span class="chip chip-sm chip-outline">${prefix}${esc(d.freon)}</span>`,
        d.FactoryCharge        && `<span class="chip chip-sm chip-outline">${prefix}${esc(ouncesToPoundsAndOunces(d.FactoryCharge))}</span>`,
        d.revisedCharge > 0    && `<span class="chip chip-sm chip-outline">${prefix}Over: ${d.revisedCharge} oz</span>`,
        cfgMax                 && `<span class="chip chip-sm chip-outline">${prefix}Max CFM ${cfgMax}</span>`,
        cfgMin                 && `<span class="chip chip-sm chip-outline">${prefix}Min CFM ${cfgMin}</span>`,
      );
    }
    return chips.filter(Boolean).join("");
  };

  const expandChips = [
    _sysRow(s1.furnace, s1.outdoor),
    job.isTwoSystems && s2 ? _sysRow(s2.furnace, s2.outdoor, "2: ") : "",
  ].filter(Boolean).join("");

  const _equipCard = (furnace, label) => {
    if (!furnace) return "";
    const d = getIndoorModel(furnace);
    if (!d?.imagen) return "";
    return `<div class="equip-card">
      <div class="equip-heading">${esc(label)}</div>
      <div class="equip-model">${esc(furnace)}</div>
      <div class="equip-image"><img src="${esc(d.imagen)}" alt="${esc(furnace)}" loading="lazy" data-lightbox-src="${esc(d.imagen)}"></div>
    </div>`;
  };
  const equipCards = [
    _equipCard(s1.furnace, "System 1"),
    job.isTwoSystems && s2 ? _equipCard(s2.furnace, "System 2") : "",
  ].filter(Boolean).join("");

  return `
<li class="job-item${inProg ? " expanded" : ""}" data-id="${esc(job.id)}"
    style="border-left-color:var(--subdivision-${ci})">
  <button class="btn-delete" data-delete="${esc(job.id)}" aria-label="Delete"></button>
  <div class="job-face">
    <div class="job-top">
      <div class="job-top-addr"><strong>${esc(job.address)}</strong></div>
      <div class="job-top-spacer"></div>
      ${techChips ? `<div class="job-top-tech">${techChips}</div>` : ""}
      <div class="job-top-meta">
        <span class="chip chip-sm chip-secondary">🏗 ${esc(job.builder)}</span>
        <span class="chip chip-sm chip-secondary">🏘 ${esc(job.subdivision)}</span>
        ${badge}${ts}
      </div>
    </div>
    ${expandChips ? `<div class="job-chip-row">${expandChips}</div>` : ""}
    ${equipCards ? `<div class="equip-grid">${equipCards}</div>` : ""}
    <button class="btn-start-job" data-start="${esc(job.id)}">
      ${inProg ? "▶ Resume" : "▶ Start"}
    </button>
  </div>
  <div class="job-actions"><div class="job-buttons">
    <button class="btn btn-edit" data-edit="${esc(job.id)}">✏ Edit</button>
    <button class="btn btn-maps" data-maps="${esc(job.address)}">📍 Maps</button>
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
  _initSitePhotoPresets();
  initChat(job);
  openTab("workspace");
  renderWorkspace();
  initSitePhotos().then((stored) => {
    for (const [slug, { file, label }] of Object.entries(stored)) {
      _renderSitePhotoThumb(slug, label, file);
    }
    _updateSitePhotoCount();
  });
}

// ---------------------------------------------------------------------------
// Workspace rendering
// ---------------------------------------------------------------------------

const WI_FIELDS = [
  ["linesetLength",       "Lineset ft"],
  ["factoryChargeOz",     "Factory Charge oz"],
  ["factoryLineConfig",   "Line Config"],
  ["approxAdjustOz",      "Approx Adjust oz"],
  ["adjustedOz",          "Adjusted oz"],
  ["fanSpeedCfm",         "Fan CFM"],
  ["liquidLineTemp",      "Liquid Temp °F"],
  ["suctionLineTemp",     "Suction Temp °F"],
  ["condenserSatTemp",    "Condenser Sat °F"],
  ["subcoolingValue",     "Subcooling °F"],
  ["oemSubcoolingGoal",   "OEM SC Goal °F"],
  ["subcoolingDeviation", "SC Deviation °F"],
];

const LINE_CONFIG_OPTIONS = [
  "", "10ft (Trane)", "25ft Trane revisedCharge",
  "15ft Daikin", "15ft Goodman", "15ft Lennox", "30ft Lennox revisedCharge",
];

const FIX_GROUPS = [
  {
    label: "Fixed Leaks",
    id:    "leaks",
    fixes: [
      { key: FIXES.LEAKS_ECOIL, label: "at eCoil" },
      { key: FIXES.LEAKS_CUNIT, label: "at Cunit" },
      { key: FIXES.LEAKS_WALL,  label: "inside Wall" },
    ],
  },
  {
    label: "Extended LV Wire",
    id:    "ext-lv",
    fixes: [
      { key: FIXES.EXTENDED_WIRE_FURNACE, label: "Furnace" },
      { key: FIXES.EXTENDED_WIRE_CUNIT,   label: "Cunit" },
    ],
  },
];

function wiGridHTML(data, attr) {
  return `<div class="wi-grid">${WI_FIELDS.map(([key, lbl]) => {
    let field;
    if (key === "factoryLineConfig") {
      const val  = data?.[key] ?? "";
      const opts = LINE_CONFIG_OPTIONS.map((o) =>
        `<option value="${esc(o)}"${o === val ? " selected" : ""}>${esc(o) || "—"}</option>`
      ).join("");
      field = `<select ${attr}="${key}">${opts}</select>`;
    } else {
      field = `<input type="text" inputmode="decimal" ${attr}="${key}" value="${esc(data?.[key] ?? "")}">`;
    }
    return `<label class="wi-field"><span>${lbl}</span>${field}</label>`;
  }).join("")}</div>`;
}

function renderWorkspace() {
  const job   = _activeJob;
  const state = getState();
  const on    = !!(job && state);

  document.getElementById("workspace-empty").classList.toggle("hidden", on);
  document.getElementById("workspace-form").classList.toggle("hidden", !on);
  if (!on) return;

  // Stepper
  const STEPS = [
    ["address","Addr"],["services","Svc"],["thermostat","Tstat"],
    ["accessories","Acc"],["fixes","Fixes"],["weight-in","W-In"],["notes","Notes"],
  ];
  document.getElementById("stepper").innerHTML = STEPS.map(([id, lbl], i) =>
    `<button class="step-dot" data-scroll="section-${id}" title="${lbl}">${i + 1}</button>`
  ).join("");

  // Step 1 — Address & Equipment
  const addr = document.getElementById("address-input");
  addr.value    = job.address;
  addr.readOnly = true;
  const s1 = job.system1 || {};
  document.getElementById("heater-model-row").textContent =
    [s1.furnace, s1.coil].filter(Boolean).join(" · ") || "—";
  document.getElementById("outdoor-model-row").textContent = s1.outdoor || "—";

  // Step 2 — Services
  const sel = state.selectedServices;
  const SVC_BTNS = [
    SERVICES.AC, SERVICES.HEAT, SERVICES.FINISH,
    SERVICES.PRESTART, SERVICES.DRIVE_RUN, SERVICES.CANCEL,
  ];
  document.getElementById("service-type-buttons").innerHTML = SVC_BTNS.map((n) =>
    `<button class="chip chip-sm${sel.includes(n) ? " chip-primary" : ""}" data-service="${esc(n)}">${esc(n)}</button>`
  ).join("");
  document.getElementById("ac-heat-options").innerHTML = `
    <label class="toggle-row"><span>2 Systems</span>
      <input type="checkbox" id="ws-two-systems"${state.isTwoSystems ? " checked" : ""}></label>
    <label class="toggle-row"><span>Temporarily</span>
      <input type="checkbox" id="ws-temporarily"${state.isTemporary ? " checked" : ""}></label>`;

  // Step 3 — Thermostat
  const tsel = state.selectedThermostat;
  document.getElementById("thermostat-buttons").innerHTML =
    THERMOSTATS.map((n) =>
      `<button class="chip chip-sm${tsel === n ? " chip-primary" : ""}" data-tstat="${esc(n)}">${esc(n)}</button>`
    ).join("") +
    (tsel ? `<span class="qty-ctrl">
      <button data-qty="-1">−</button>
      <span>${state.thermostatQuantity}</span>
      <button data-qty="+1">+</button>
    </span>` : "");

  // Step 4 — Accessories
  document.getElementById("accessory-buttons").innerHTML = Object.values(ACCESSORIES).map((n) => {
    const active = state.selectedAccessories.includes(n) || state.customAccessories.some((a) => a.name === n);
    const isTwoSys = state.isTwoSystems && TWO_SYSTEMS_ACCESSORIES.includes(n);
    const disp     = (ACCESSORY_DISPLAY[n] || n.toLowerCase()) + (isTwoSys ? " (2 sys)" : "");
    const custom = CUSTOM_PRICE_ACCESSORIES.includes(n) ? " data-custom" : "";
    return `<button class="chip chip-sm${active ? " chip-accessory" : ""}" data-accessory="${esc(n)}"${custom}>${esc(disp)}</button>`;
  }).join("");

  // Step 5 — Fixes
  const _groupedKeys = new Set(FIX_GROUPS.flatMap((g) => g.fixes.map((f) => f.key)));
  const _groupsHTML  = FIX_GROUPS.map((group) => {
    const count   = group.fixes.filter((f) => state.selectedFixes.includes(f.key)).length;
    const badge   = count > 0 ? ` <span class="chip-badge">${count}</span>` : "";
    const subHTML = group.fixes.map((f) => {
      const active = state.selectedFixes.includes(f.key);
      return `<button class="chip chip-sm${active ? " chip-accessory" : ""}" data-fix="${esc(f.key)}">${esc(f.label)}</button>`;
    }).join("");
    return `<div class="fix-group">
      <button class="chip chip-sm${count > 0 ? " chip-primary" : ""}" data-group-toggle="${esc(group.id)}">${esc(group.label)}${badge}</button>
      <div class="fix-suboptions${count > 0 ? "" : " hidden"}" id="fix-group-${esc(group.id)}">${subHTML}</div>
    </div>`;
  }).join("");
  const _standaloneHTML = Object.values(FIXES)
    .filter((n) => !_groupedKeys.has(n) && n !== FIXES.EXTENDED_WIRE)
    .map((n) => {
      const active = state.selectedFixes.includes(n) || state.customFixes.some((f) => f.name === n);
      const disp   = FIX_DISPLAY[n] || n.toLowerCase();
      const custom = CUSTOM_PRICE_FIXES.includes(n) ? " data-custom" : "";
      return `<button class="chip chip-sm${active ? " chip-accessory" : ""}" data-fix="${esc(n)}"${custom}>${esc(disp)}</button>`;
    }).join("");
  document.getElementById("fixes-list").innerHTML =
    _groupsHTML + `<div class="fix-chips-row">${_standaloneHTML}</div>`;

  // Step 6 — Weight-In
  let wiData1 = state.weightInData || {};
  const _wiOutdoor = getOutdoorModel(s1.outdoor);
  if (_wiOutdoor) {
    const _needFc  = !wiData1.factoryChargeOz && _wiOutdoor.FactoryCharge;
    const _needAdj = !wiData1.approxAdjustOz;
    if (_needFc || _needAdj) {
      if (_needFc) wiData1 = { ...wiData1, factoryChargeOz: String(_wiOutdoor.FactoryCharge) };
      if (_needAdj) {
        const _lc = wiData1.factoryLineConfig || "";
        const _adj = _lc.includes("revisedCharge") ? _wiOutdoor.revisedCharge : _wiOutdoor.FactoryCharge;
        if (_adj) wiData1 = { ...wiData1, approxAdjustOz: String(_adj) };
      }
      setWeightInData(wiData1, 1);
    }
  }
  const _wiLc = wiData1.factoryLineConfig || "";
  const _wiBc = _wiOutdoor ? (_wiLc.includes("revisedCharge") ? _wiOutdoor.revisedCharge : _wiOutdoor.FactoryCharge) : 0;
  const _wiAdj = parseFloat(wiData1.adjustedOz);
  const _wiNewTotalTxt = _wiBc && !isNaN(_wiAdj) ? ouncesToPoundsAndOunces(_wiBc + _wiAdj) : "—";
  document.getElementById("wi-fields-sys1").innerHTML = wiGridHTML(wiData1, "data-wi");
  const _sys2Fields   = document.getElementById("wi-fields-sys2");
  const _sys2PhotoRow = document.getElementById("wi-photo-row-2");
  _sys2Fields.innerHTML = state.isTwoSystems
    ? `<p class="step-label">System 2</p>${wiGridHTML(state.weightInData2, "data-wi2")}`
    : "";
  _sys2Fields.classList.toggle("hidden", !state.isTwoSystems);
  _sys2PhotoRow.classList.toggle("hidden", !state.isTwoSystems);
  const _ntcEl = document.getElementById("wi-new-total-charge");
  if (_ntcEl) _ntcEl.textContent = _wiNewTotalTxt;

  // Step 7 — Notes & Photos
  document.getElementById("notes-input").value = state.notes || "";
  renderPhotoList(state.photos);
  updatePriceDisplay();
}

function renderPhotoList(photos) {
  document.getElementById("photo-list").innerHTML = (photos || []).map((p, i) =>
    `<div class="photo-thumb">
       <img src="${p.dataUrl}" alt="Photo ${i + 1}" data-lightbox="${i}">
       <button class="btn-delete-photo" data-photo="${i}" aria-label="Remove">×</button>
     </div>`
  ).join("");
}

function _updateSitePhotoCount() {
  const n   = getSitePhotoCount();
  const btn = document.getElementById("btn-download-site-photos");
  btn.textContent = `💾 Download All Photos (${n})`;
  btn.disabled    = n === 0;
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
  const thumb     = document.createElement("div");
  thumb.id        = `site-thumb-${slug}`;
  thumb.style.cssText = "display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-1);";

  const img = document.createElement("img");
  img.src = objectUrl;
  img.style.cssText = "width:60px;height:60px;object-fit:cover;border-radius:var(--radius-sm);";

  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  labelSpan.style.cssText = "font-size:var(--font-size-xs);color:var(--color-text-secondary);";

  const removeBtn = document.createElement("button");
  removeBtn.type      = "button";
  removeBtn.className = "btn";
  removeBtn.textContent = "✕";
  removeBtn.style.cssText = "padding:2px 6px;font-size:var(--font-size-xs);";
  removeBtn.onclick = () => {
    URL.revokeObjectURL(objectUrl);
    thumb.remove();
    removeSitePhoto(slug);
    saveProgress();
    _updateSitePhotoCount();
  };

  thumb.appendChild(img);
  thumb.appendChild(labelSpan);
  thumb.appendChild(removeBtn);
  slot.appendChild(thumb);
}

function _makeSiteSlot(slug, label) {
  const slot = document.createElement("div");
  slot.id = `site-slot-${slug}`;
  slot.style.cssText = "display:inline-flex;flex-direction:column;margin:var(--space-1);";

  const fileInput    = document.createElement("input");
  fileInput.type     = "file";
  fileInput.accept   = "image/*";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = "";
    const compressed = await compressImage(file);
    addSitePhoto(slug, label, compressed);
    saveProgress();
    _renderSitePhotoThumb(slug, label, compressed);
    _updateSitePhotoCount();
  });

  const btn       = document.createElement("button");
  btn.type        = "button";
  btn.className   = "btn-secondary";
  btn.textContent = label;
  btn.onclick     = () => fileInput.click();

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
  otherWrap.id    = "site-other-wrap";
  otherWrap.style.cssText = "display:inline-flex;flex-direction:column;gap:var(--space-1);margin:var(--space-1);";

  const otherFileInput  = document.createElement("input");
  otherFileInput.type   = "file";
  otherFileInput.accept = "image/*";
  otherFileInput.style.display = "none";

  const otherLabelInput       = document.createElement("input");
  otherLabelInput.type        = "text";
  otherLabelInput.placeholder = "Label…";
  otherLabelInput.style.cssText = "display:none;width:140px;";

  let _pendingLabel = "";

  const otherBtn       = document.createElement("button");
  otherBtn.type        = "button";
  otherBtn.className   = "btn-secondary";
  otherBtn.textContent = "+ Other";
  otherBtn.onclick     = () => {
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
    const slug  = label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
    otherFileInput.value = "";
    _pendingLabel = "";
    const compressed = await compressImage(file);
    const slot = _makeSiteSlot(slug, label);
    container.insertBefore(slot, otherWrap);
    addSitePhoto(slug, label, compressed);
    saveProgress();
    _renderSitePhotoThumb(slug, label, compressed);
    _updateSitePhotoCount();
  });

  otherWrap.appendChild(otherBtn);
  otherWrap.appendChild(otherLabelInput);
  otherWrap.appendChild(otherFileInput);
  container.appendChild(otherWrap);
}

function updatePriceDisplay() {
  const t = calculateTotals(getState(), getPrices());
  document.getElementById("price-display").innerHTML =
    `Svc <strong>$${t.service}</strong> · Acc <strong>$${t.accessory}</strong> · Fixes <strong>$${t.fix}</strong> &nbsp; Total <strong>$${t.total}</strong>`;
}

function _renderNewTotalCharge(data, sys) {
  if (sys !== 1) return;
  const el = document.getElementById("wi-new-total-charge");
  if (!el) return;
  const fc  = parseFloat(data?.factoryChargeOz);
  const adj = parseFloat(data?.adjustedOz);
  el.textContent = !isNaN(fc) && !isNaN(adj) ? ouncesToPoundsAndOunces(fc + adj) : "—";
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------

function renderReports() {
  const list    = document.getElementById("reports-list");
  const empty   = document.getElementById("reports-empty");
  const actions = document.getElementById("reports-global-actions");
  const all     = getCompletions();

  if (!all.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    actions.classList.add("hidden");
    return;
  }
  empty.classList.add("hidden");
  actions.classList.remove("hidden");
  list.innerHTML = all.map((c) => `
    <li class="report-item" style="position:relative;">
      <button class="btn" data-delete="${esc(c.jobId)}" style="position:absolute;top:6px;right:6px;padding:2px 7px;font-size:var(--font-size-xs);">✕</button>
      <div class="report-addr">
        <strong>${esc(c.address)}</strong>
        <span class="chip chip-sm chip-primary">$${c.totals.total}</span>
      </div>
      <p class="report-text">${esc(c.reportText || "")}</p>
      <div class="btn-row">
        <button class="btn btn-copy" data-copy="${esc(c.reportText || "")}">Copy</button>
        <button class="btn" data-share-toggle="${esc(c.jobId)}">📤 Share</button>
      </div>
      <div id="share-panel-${esc(c.jobId)}" class="hidden">
        <div class="btn-row">
          <button class="btn" data-share-method="whatsapp" data-share-text="${esc(c.reportText || "")}">📱 WhatsApp</button>
          <button class="btn" data-share-method="sms"      data-share-text="${esc(c.reportText || "")}">💬 SMS</button>
          <button class="btn" data-share-method="email"    data-share-text="${esc(c.reportText || "")}">📧 Email</button>
          <button class="btn" data-share-method="copy"     data-share-text="${esc(c.reportText || "")}">📋 Copy</button>
        </div>
      </div>
    </li>`).join("");
}

// ---------------------------------------------------------------------------
// LV (Diagrams) tab
// ---------------------------------------------------------------------------

async function renderLV() {
  const container = document.getElementById("lv-container");
  if (!_activeJob) {
    container.innerHTML = `<p class="empty-state">Select a job to view diagrams</p>`;
    return;
  }
  const links = getLinksForJob(_activeJob);
  if (!links.length) {
    container.innerHTML = `<p class="empty-state">No diagram links for this job</p>`;
    return;
  }
  const rows = await Promise.all(links.map(async ({ label, url }) => {
    const cached = await isAvailableOffline(url);
    return `<div class="lv-item">
      <span class="lv-label">${esc(label)}</span>
      <span class="badge ${cached ? "badge-success" : "badge-secondary"}">${cached ? "Cached" : "Online only"}</span>
      <div class="btn-row">
        <a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn-outline">Open</a>
        <button class="btn" data-dl="${esc(url)}">↓ Cache</button>
      </div>
    </div>`;
  }));
  container.innerHTML = rows.join("");
}

// ---------------------------------------------------------------------------
// Settings modal
// ---------------------------------------------------------------------------

const AI_PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai",    label: "OpenAI"    },
  { id: "google",    label: "Google"    },
];

function renderSettingsModal() {
  const s = getSettings();
  document.getElementById("theme-toggle").checked = s.theme === "light";
  document.getElementById("ai-provider-row").innerHTML = AI_PROVIDERS.map(({ id, label }) =>
    `<button class="chip chip-sm${s.aiProvider === id ? " chip-primary" : ""}" data-provider="${id}">${label}</button>`
  ).join("");
  document.getElementById("ai-settings-key-input").value = s.aiApiKey || "";
  document.getElementById("ai-settings-status").textContent = s.aiApiKey ? "Key saved." : "";
}

// ---------------------------------------------------------------------------
// Add Job — helpers
// ---------------------------------------------------------------------------

function _indoorOptgroups() {
  return getIndoorSeriesGroups().map(({ series, models }) =>
    `<optgroup label="${esc(series)}">${models.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</optgroup>`
  ).join("");
}

function _outdoorOptgroups() {
  return getOutdoorSeriesGroups().map(({ series, models }) =>
    `<optgroup label="${esc(series)}">${models.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</optgroup>`
  ).join("");
}

const _LINK_SKIP   = new Set(["linkText", "supplyLinkText", "blowerSpeedText", "blowerSpeedImage"]);
const _LINK_LABELS = {
  serviceManual: "Service Manual", installManual: "Install Manual",
  lennoxPros:    "LennoxPros Docs", trane:         "Trane Technologies",
  traneSupply:   "Trane Supply",    goodman:       "Goodman",
  daikin:        "Daikin Comfort",
};

function _showEquipLinks(model, getFn, linksMap, container) {
  if (!model) { container.innerHTML = ""; return; }
  const entry = getFn(model);
  const links = entry ? linksMap[entry.series] : null;
  if (!links)  { container.innerHTML = ""; return; }
  const items = Object.entries(links)
    .filter(([k]) => !_LINK_SKIP.has(k))
    .map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${_LINK_LABELS[k] || k}</a>`);
  if (links.blowerSpeedImage)
    items.push(`<a href="${esc(links.blowerSpeedImage)}" target="_blank" rel="noopener">${links.blowerSpeedText || "Blower Speed"}</a>`);
  container.innerHTML = items.join(" · ");
}

function _renderNewJobAccChips() {
  document.getElementById("new-job-acc-chips").innerHTML = _newJobAccChips
    .map((name) => {
      const disp = ACCESSORY_DISPLAY[name] || name.toLowerCase();
      return `<span class="chip chip-sm chip-secondary">${esc(disp)}<button type="button" class="chip-remove" data-remove-acc="${esc(name)}" aria-label="Remove">×</button></span>`;
    })
    .join("");
}

function _collapseAddJobForm() {
  _newJobAccChips = [];
  document.getElementById("new-job-acc-chips").innerHTML  = "";
  document.getElementById("indoor-links").innerHTML       = "";
  document.getElementById("outdoor-links").innerHTML      = "";
  document.getElementById("indoor-links2").innerHTML      = "";
  document.getElementById("outdoor-links2").innerHTML     = "";
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
    .map((a) => `<option value="${esc(a)}">${esc(ACCESSORY_DISPLAY[a] || a.toLowerCase())}</option>`)
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
          <datalist id="builders-list">${BUILDERS.map((b) => `<option value="${esc(b)}">`).join("")}</datalist>
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
            ${THERMOSTATS.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
            <option value="Other">Other</option>
          </select>
        </label>
        <label style="flex: 0 0 4.5rem">Qty
          <select name="tstat-qty">${[1,2,3,4,5].map((n) => `<option>${n}</option>`).join("")}</select>
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
  document.getElementById("tab-jobs").insertBefore(section, document.getElementById("jobs-list"));
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function wireEvents() {
  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.addEventListener("click", () => openTab(b.dataset.tab))
  );

  // Header — modals & drawer
  document.getElementById("btn-settings").addEventListener("click", () => {
    renderSettingsModal();
    document.getElementById("settings-modal").showModal();
  });
  document.getElementById("settings-close").addEventListener("click", () =>
    document.getElementById("settings-modal").close()
  );
  document.getElementById("btn-open-quick-calc").addEventListener("click", () =>
    document.getElementById("quick-calc-modal").showModal()
  );
  document.getElementById("quick-calc-close").addEventListener("click", () =>
    document.getElementById("quick-calc-modal").close()
  );
  document.getElementById("btn-open-troubleshoot").addEventListener("click", () => {
    document.getElementById("ts-drawer").classList.add("open");
    document.getElementById("ts-drawer").setAttribute("aria-hidden", "false");
    document.getElementById("ts-overlay").classList.add("visible");
  });
  document.getElementById("ts-overlay").addEventListener("click", () => {
    document.getElementById("ts-drawer").classList.remove("open");
    document.getElementById("ts-drawer").setAttribute("aria-hidden", "true");
    document.getElementById("ts-overlay").classList.remove("visible");
  });

  // Stepper scroll
  document.getElementById("stepper").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-scroll]");
    if (btn) document.getElementById(btn.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
  });

  // Jobs — list delegation
  document.getElementById("btn-add-job").addEventListener("click", () =>
    document.getElementById("add-job-section").classList.remove("hidden")
  );
  document.getElementById("jobs-list").addEventListener("click", (e) => {
    const del   = e.target.closest("[data-delete]");
    const start = e.target.closest("[data-start]");
    const edit  = e.target.closest("[data-edit]");
    const maps  = e.target.closest("[data-maps]");
    const item  = e.target.closest(".job-item");

    if (del) {
      const dj = getJobById(del.dataset.delete);
      if (!confirm(`Delete ${dj ? dj.address : "this job"}?`)) return;
      removeJob(del.dataset.delete);
      renderJobs();
      return;
    }
    if (start) { const j = getJobById(start.dataset.start); if (j) openWorkspace(j); return; }
    if (edit)  { toast("Edit not yet implemented", "info"); return; }
    if (maps)  { window.open(`https://maps.google.com/?q=${encodeURIComponent(maps.dataset.maps)}`, "_blank"); return; }
    const lbImg = e.target.closest("[data-lightbox-src]");
    if (lbImg) {
      document.getElementById("lightbox-img").src = lbImg.dataset.lightboxSrc;
      document.getElementById("lightbox").classList.remove("hidden");
      return;
    }
    if (item && !e.target.closest("button")) item.classList.toggle("expanded");
  });

  // Workspace — click delegation
  const wsForm = document.getElementById("workspace-form");
  wsForm.addEventListener("click", (e) => {
    const state = getState();
    if (!state) return;

    const svc   = e.target.closest("[data-service]");
    const tst   = e.target.closest("[data-tstat]");
    const qty   = e.target.closest("[data-qty]");
    const acc   = e.target.closest("[data-accessory]");
    const grp   = e.target.closest("[data-group-toggle]");
    const fix   = e.target.closest("[data-fix]");
    const photo = e.target.closest("[data-photo]");
    const lb    = e.target.closest("[data-lightbox]");

    if (svc) {
      toggleService(svc.dataset.service);
      saveProgress(); renderWorkspace(); return;
    }
    if (tst) {
      const n = tst.dataset.tstat;
      setThermostat(state.selectedThermostat === n ? null : n, state.thermostatQuantity);
      saveProgress(); renderWorkspace(); return;
    }
    if (qty) {
      setThermostat(state.selectedThermostat, Math.max(1, state.thermostatQuantity + parseInt(qty.dataset.qty)));
      saveProgress(); renderWorkspace(); return;
    }
    if (acc) {
      if ("custom" in acc.dataset) {
        const p = prompt(`Price for ${acc.dataset.accessory}:`);
        if (p === null) return;
        toggleAccessory(acc.dataset.accessory, parseFloat(p) || 0);
      } else {
        toggleAccessory(acc.dataset.accessory);
      }
      saveProgress(); renderWorkspace(); return;
    }
    if (grp) {
      const groupEl = document.getElementById(`fix-group-${grp.dataset.groupToggle}`);
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
      saveProgress(); renderWorkspace(); return;
    }
    if (photo) {
      removePhoto(parseInt(photo.dataset.photo));
      renderPhotoList(getState().photos);
      saveProgress(); return;
    }
    if (lb) {
      const img = getState().photos[parseInt(lb.dataset.lightbox)];
      if (img) {
        document.getElementById("lightbox-img").src = img.dataUrl;
        document.getElementById("lightbox").classList.remove("hidden");
      }
      return;
    }
  });

  // Workspace — checkboxes + Line Config select
  wsForm.addEventListener("change", (e) => {
    const state = getState();
    if (!state) return;
    if (e.target.id === "ws-two-systems") { setOption("isTwoSystems", e.target.checked); saveProgress(); renderWorkspace(); return; }
    if (e.target.id === "ws-temporarily") { setOption("isTemporary",  e.target.checked); saveProgress(); return; }
    if (e.target.dataset.wi === "factoryLineConfig") {
      const data = {};
      wsForm.querySelectorAll("[data-wi]").forEach((inp) => { data[inp.getAttribute("data-wi")] = inp.value; });
      const outdoor = getOutdoorModel(_activeJob?.system1?.outdoor);
      if (outdoor) {
        const lineConfig  = e.target.value;
        const baseCharge  = lineConfig.includes("revisedCharge") ? outdoor.revisedCharge : outdoor.FactoryCharge;
        const fcInput = wsForm.querySelector('[data-wi="factoryChargeOz"]');
        if (fcInput) { fcInput.value = String(baseCharge); data.factoryChargeOz = String(baseCharge); }
        const approxInput = wsForm.querySelector('[data-wi="approxAdjustOz"]');
        const result      = calculateApproxAdjust(parseFloat(data.linesetLength), lineConfig);
        data.approxAdjustOz = result !== null ? result : (baseCharge ? String(baseCharge) : "");
        if (approxInput) approxInput.value = data.approxAdjustOz;
      }
      setWeightInData(data, 1);
      _renderNewTotalCharge(data, 1);
      updatePriceDisplay(); saveProgress();
    }
  });

  // Workspace — text inputs (notes + weight-in)
  wsForm.addEventListener("input", (e) => {
    const state = getState();
    if (!state) return;
    if (e.target.id === "notes-input") {
      setNotes(e.target.value); saveProgress(); return;
    }
    if (e.target.dataset.wi || e.target.dataset.wi2) {
      const sys  = e.target.dataset.wi ? 1 : 2;
      const attr = sys === 1 ? "data-wi" : "data-wi2";
      const data = {};
      wsForm.querySelectorAll(`[${attr}]`).forEach((inp) => { data[inp.getAttribute(attr)] = inp.value; });
      // Auto-calc subcooling
      const liq  = parseFloat(data.liquidLineTemp);
      const csat = parseFloat(data.condenserSatTemp);
      if (!isNaN(liq) && !isNaN(csat)) {
        data.subcoolingValue = String(csat - liq);
        const scInput = wsForm.querySelector(`[${attr}="subcoolingValue"]`);
        if (scInput) scInput.value = data.subcoolingValue;
      }
      const scVal   = parseFloat(data.subcoolingValue);
      const oemGoal = parseFloat(data.oemSubcoolingGoal);
      if (!isNaN(scVal) && !isNaN(oemGoal)) {
        data.subcoolingDeviation = String(Math.abs(scVal - oemGoal));
        const devInput = wsForm.querySelector(`[${attr}="subcoolingDeviation"]`);
        if (devInput) devInput.value = data.subcoolingDeviation;
      }
      // Recalc approxAdjustOz when linesetLength changes
      if (sys === 1 && e.target.dataset.wi === "linesetLength") {
        const outdoor = getOutdoorModel(_activeJob?.system1?.outdoor);
        if (outdoor) {
          const lineConfig = data.factoryLineConfig || "";
          const result     = calculateApproxAdjust(parseFloat(data.linesetLength), lineConfig);
          if (result !== null) {
            data.approxAdjustOz = result;
            const approxInput = wsForm.querySelector('[data-wi="approxAdjustOz"]');
            if (approxInput) approxInput.value = result;
          }
        }
      }
      setWeightInData(data, sys);
      _renderNewTotalCharge(data, sys);
      updatePriceDisplay(); saveProgress();
    }
  });

  // Generate Report
  document.getElementById("btn-generate-report").addEventListener("click", () => {
    if (!_activeJob) return;
    const completion    = buildCompletion(_activeJob, getPrices());
    completion.reportText = generateReportText(completion);
    saveCompletion(completion);
    removeJob(_activeJob.id);
    clearWorkspace();
    setActiveJobId(null);
    _activeJob = null;
    toast("Report saved!", "success");
    renderJobs();
    openTab("reports");
  });

  // Reports — per-card actions
  document.getElementById("reports-list").addEventListener("click", (e) => {
    const copy   = e.target.closest("[data-copy]");
    const del    = e.target.closest("[data-delete]");
    const toggle = e.target.closest("[data-share-toggle]");
    const share  = e.target.closest("[data-share-method]");
    if (copy)   navigator.clipboard.writeText(copy.dataset.copy).then(() => toast("Copied!", "success"));
    if (del && confirm("Delete this report?")) { deleteCompletion(del.dataset.delete); renderReports(); }
    if (toggle) { const p = document.getElementById(`share-panel-${toggle.dataset.shareToggle}`); if (p) p.classList.toggle("hidden"); }
    if (share)  _shareVia(share.dataset.shareMethod, share.dataset.shareText);
  });

  // Reports — global actions
  document.getElementById("btn-share-all").addEventListener("click", () =>
    document.getElementById("share-all-panel").classList.toggle("hidden")
  );
  document.getElementById("share-all-panel").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-share-all-method]");
    if (!btn) return;
    _shareVia(btn.dataset.shareAllMethod, generateDailyReport(getCompletions()));
    document.getElementById("share-all-panel").classList.add("hidden");
  });
  document.getElementById("btn-delete-all").addEventListener("click", () => {
    if (!confirm("Delete all reports?")) return;
    getCompletions().forEach((c) => deleteCompletion(c.jobId));
    renderReports();
  });
  document.getElementById("btn-export-json").addEventListener("click", () => {
    const date = new Date().toISOString().slice(0, 10);
    const url  = URL.createObjectURL(new Blob([exportJSON(getCompletions())], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: `dashboard_import_${date}.json` }).click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("btn-export-csv").addEventListener("click", () => {
    const d    = new Date();
    const date = `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-${String(d.getFullYear()).slice(2)}`;
    const url  = URL.createObjectURL(new Blob([exportCSV(getCompletions())], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `service_reports_${date}.csv` }).click();
    URL.revokeObjectURL(url);
  });

  // LV — cache download
  document.getElementById("lv-container").addEventListener("click", async (e) => {
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
  document.getElementById("lightbox-close").addEventListener("click", () =>
    document.getElementById("lightbox").classList.add("hidden")
  );
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
  });

  // Photo upload
  const fileInput = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  document.getElementById("btn-add-photo").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo = { dataUrl: ev.target.result, lat: null, lng: null, timestamp: new Date().toISOString() };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => { photo.lat = coords.latitude; photo.lng = coords.longitude; },
          () => {}
        );
      }
      addPhoto(photo);
      renderPhotoList(getState().photos);
      saveProgress();
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
  });

  // Site photos — download ZIP
  document.getElementById("btn-download-site-photos").addEventListener("click", async () => {
    const photos  = getSitePhotos();
    const entries = Object.entries(photos);
    if (!entries.length) return;
    const safeAddr = (_activeJob?.address || "SITE").replace(/[^a-z0-9]/gi, "_").toUpperCase();
    await _loadJSZip();
    const zip = new window.JSZip();
    for (const [, { file, label }] of entries) {
      const name = `${safeAddr}_${label.toUpperCase().replace(/[^A-Z0-9]/g, "_")}.jpg`;
      zip.file(name, file);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
      href: url, download: `${safeAddr}_SITE_PHOTOS.zip`,
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
    if (btn) { setAiProvider(btn.dataset.provider); renderSettingsModal(); }
  });
  document.getElementById("ai-settings-save").addEventListener("click", () => {
    const key = document.getElementById("ai-settings-key-input").value.trim();
    setAiApiKey(key);
    document.getElementById("ai-settings-status").textContent = key ? "Key saved." : "Key cleared.";
    toast("API key saved", "success");
  });
  document.getElementById("ai-settings-clear").addEventListener("click", () => {
    setAiApiKey("");
    document.getElementById("ai-settings-key-input").value = "";
    document.getElementById("ai-settings-status").textContent = "Key cleared.";
  });
  document.getElementById("ai-settings-more").addEventListener("click", () =>
    document.getElementById("ai-provider-ext-row").classList.toggle("hidden")
  );

  // Add Job form
  document.getElementById("add-job-cancel").addEventListener("click", _collapseAddJobForm);
  document.getElementById("new-job-two-systems").addEventListener("change", (e) =>
    document.getElementById("new-job-sys2").classList.toggle("hidden", !e.target.checked)
  );
  document.getElementById("new-job-furnace").addEventListener("change", (e) =>
    _showEquipLinks(e.target.value, getIndoorModel, SERIES_LINKS, document.getElementById("indoor-links"))
  );
  document.getElementById("new-job-furnace2").addEventListener("change", (e) =>
    _showEquipLinks(e.target.value, getIndoorModel, SERIES_LINKS, document.getElementById("indoor-links2"))
  );
  document.getElementById("new-job-outdoor").addEventListener("change", (e) =>
    _showEquipLinks(e.target.value, getOutdoorModel, OUTDOOR_LINKS, document.getElementById("outdoor-links"))
  );
  document.getElementById("new-job-outdoor2").addEventListener("change", (e) =>
    _showEquipLinks(e.target.value, getOutdoorModel, OUTDOOR_LINKS, document.getElementById("outdoor-links2"))
  );
  document.getElementById("new-job-tstat").addEventListener("change", (e) =>
    document.getElementById("new-job-tstat-other").classList.toggle("hidden", e.target.value !== "Other")
  );
  document.getElementById("new-job-acc-picker").addEventListener("change", (e) => {
    const name = e.target.value;
    e.target.value = "";
    if (!name || _newJobAccChips.includes(name)) return;
    _newJobAccChips.push(name);
    _renderNewJobAccChips();
  });
  document.getElementById("new-job-acc-chips").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-acc]");
    if (!btn) return;
    _newJobAccChips = _newJobAccChips.filter((a) => a !== btn.dataset.removeAcc);
    _renderNewJobAccChips();
  });
  document.getElementById("add-job-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd           = new FormData(e.target);
    const tstatVal     = fd.get("tstat");
    const tstatModel   = tstatVal === "Other" ? (fd.get("tstat-other") || "").trim() : tstatVal || "";
    const isTwoSystems = !!fd.get("two-systems");
    const job = createJob({
      address:        fd.get("address").toUpperCase(),
      subdivision:    (fd.get("subdivision") || "").toUpperCase(),
      builder:        fd.get("builder")  || "",
      details:        fd.get("notes")    || "",
      isTwoSystems,
      jobAccessories: [..._newJobAccChips],
      jobThermostat:  tstatModel ? { model: tstatModel, qty: parseInt(fd.get("tstat-qty")) || 1 } : null,
      system1: {
        furnace: fd.get("furnace")  || "",
        coil:    "",
        outdoor: fd.get("outdoor")  || "",
        links: {
          ...( SERIES_LINKS[getIndoorModel(fd.get("furnace"))?.series]   ?? {} ),
          ...( OUTDOOR_LINKS[getOutdoorModel(fd.get("outdoor"))?.series] ?? {} ),
        },
      },
      system2: isTwoSystems ? {
        furnace: fd.get("furnace2") || "",
        coil:    "",
        outdoor: fd.get("outdoor2") || "",
        links: {
          ...( SERIES_LINKS[getIndoorModel(fd.get("furnace2"))?.series]   ?? {} ),
          ...( OUTDOOR_LINKS[getOutdoorModel(fd.get("outdoor2"))?.series] ?? {} ),
        },
      } : null,
    });
    precacheJobs([job]);
    _collapseAddJobForm();
    renderJobs();
    toast(`Job added: ${job.address}`, "success");
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

  initSettings();
  const s = getSettings();
  document.documentElement.setAttribute("data-mode", s.theme);

  // Restore interrupted session
  const savedId = getActiveJobId();
  if (savedId) {
    const job = getJobById(savedId);
    if (job) { _activeJob = job; initWorkspace(job); initChat(job); }
  }

  buildAddJobSection();
  wireEvents();
  renderJobs();
  renderWorkspace();
  precacheJobs(getAllJobs()); // background, no await
}

document.addEventListener("DOMContentLoaded", init);
