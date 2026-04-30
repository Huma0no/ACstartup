// src/app.js — Entry point: init, tab routing, event wiring, UI updates.

import {
  initSettings, getSettings, setTheme, setAiProvider, setAiApiKey, getPrices,
} from "./settings.js";
import {
  createJob, updateJob, removeJob, getJobById, getAllJobs, sortJobs, groupBySubdivision,
} from "./jobs.js";
import { saveCompletion, getCompletions, getActiveJobId, setActiveJobId } from "./storage.js";
import {
  initWorkspace, getState, clearWorkspace, setOption,
  toggleService, setThermostat, toggleAccessory, toggleFix,
  setWeightInData, setNotes, addPhoto, removePhoto,
  calculateTotals, saveProgress, buildCompletion,
} from "./workspace.js";
import { generateReportText } from "./reports.js";
import { ouncesToPoundsAndOunces } from "./utils.js";
import { getLinksForJob, isAvailableOffline, downloadDiagram, precacheJobs } from "./diagrams.js";
import { initChat } from "./ai.js";
import {
  SERVICES, ACCESSORIES, FIXES, THERMOSTATS, BUILDERS,
  ACCESSORY_DISPLAY, FIX_DISPLAY,
  CUSTOM_PRICE_ACCESSORIES, CUSTOM_PRICE_FIXES,
  getIndoorSeriesGroups, getOutdoorSeriesGroups,
  getIndoorModel, getOutdoorModel,
  SERIES_LINKS, OUTDOOR_LINKS,
} from "./data.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _activeJob = null;
let _newJobAccChips = [];

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
  initChat(job);
  openTab("workspace");
  renderWorkspace();
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

function wiGridHTML(data, attr) {
  return `<div class="wi-grid">${WI_FIELDS.map(([key, lbl]) =>
    `<label class="wi-field"><span>${lbl}</span>
     <input type="text" inputmode="decimal" ${attr}="${key}" value="${esc(data?.[key] ?? "")}">
     </label>`
  ).join("")}</div>`;
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
    const disp   = ACCESSORY_DISPLAY[n] || n.toLowerCase();
    const custom = CUSTOM_PRICE_ACCESSORIES.includes(n) ? " data-custom" : "";
    return `<button class="chip chip-sm${active ? " chip-accessory" : ""}" data-accessory="${esc(n)}"${custom}>${esc(disp)}</button>`;
  }).join("");

  // Step 5 — Fixes
  document.getElementById("fixes-list").innerHTML = Object.values(FIXES).map((n) => {
    const active = state.selectedFixes.includes(n) || state.customFixes.some((f) => f.name === n);
    const disp   = FIX_DISPLAY[n] || n.toLowerCase();
    const custom = CUSTOM_PRICE_FIXES.includes(n) ? " data-custom" : "";
    return `<button class="chip chip-sm${active ? " chip-accessory" : ""}" data-fix="${esc(n)}"${custom}>${esc(disp)}</button>`;
  }).join("");

  // Step 6 — Weight-In
  document.getElementById("weight-in-fields").innerHTML =
    wiGridHTML(state.weightInData, "data-wi") +
    (state.isTwoSystems
      ? `<p class="step-label">System 2</p>${wiGridHTML(state.weightInData2, "data-wi2")}`
      : "");

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

function updatePriceDisplay() {
  const t = calculateTotals(getState(), getPrices());
  document.getElementById("price-display").innerHTML =
    `Svc <strong>$${t.service}</strong> · Acc <strong>$${t.accessory}</strong> · Fixes <strong>$${t.fix}</strong> &nbsp; Total <strong>$${t.total}</strong>`;
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------

function renderReports() {
  const list  = document.getElementById("reports-list");
  const empty = document.getElementById("reports-empty");
  const all   = getCompletions();

  if (!all.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.innerHTML = all.map((c) => `
    <li class="report-item">
      <div class="report-addr">
        <strong>${esc(c.address)}</strong>
        <span class="chip chip-sm chip-primary">$${c.totals.total}</span>
      </div>
      <p class="report-text">${esc(c.reportText || "")}</p>
      <div class="btn-row">
        <button class="btn btn-copy" data-copy="${esc(c.reportText || "")}">Copy</button>
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

  // Workspace — checkboxes
  wsForm.addEventListener("change", (e) => {
    const state = getState();
    if (!state) return;
    if (e.target.id === "ws-two-systems") { setOption("isTwoSystems", e.target.checked); saveProgress(); renderWorkspace(); }
    if (e.target.id === "ws-temporarily") { setOption("isTemporary",  e.target.checked); saveProgress(); }
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
      setWeightInData(data, sys);
      updatePriceDisplay(); saveProgress();
    }
  });

  // Generate Report
  document.getElementById("btn-generate-report").addEventListener("click", () => {
    if (!_activeJob) return;
    const completion    = buildCompletion(_activeJob, getPrices());
    completion.reportText = generateReportText(completion);
    saveCompletion(completion);
    updateJob({ ..._activeJob, savedState: null });
    clearWorkspace();
    setActiveJobId(null);
    _activeJob = null;
    toast("Report saved!", "success");
    renderJobs();
    openTab("reports");
  });

  // Reports — copy
  document.getElementById("reports-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (btn) navigator.clipboard.writeText(btn.dataset.copy).then(() => toast("Copied!", "success"));
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
      system1: { furnace: fd.get("furnace")  || "", coil: "", outdoor: fd.get("outdoor")  || "" },
      system2: isTwoSystems
        ? { furnace: fd.get("furnace2") || "", coil: "", outdoor: fd.get("outdoor2") || "" }
        : null,
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
