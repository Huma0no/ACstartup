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
import { getLinksForJob, isAvailableOffline, downloadDiagram, precacheJobs } from "./diagrams.js";
import { initChat } from "./ai.js";
import {
  SERVICES, ACCESSORIES, FIXES, THERMOSTATS, BUILDERS,
  ACCESSORY_DISPLAY, FIX_DISPLAY,
  CUSTOM_PRICE_ACCESSORIES, CUSTOM_PRICE_FIXES,
} from "./data.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _activeJob = null;

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

function renderJobs(filter = "") {
  const all    = sortJobs(getAllJobs());
  const jobs   = filter
    ? all.filter((j) => j.address.toLowerCase().includes(filter.toLowerCase()))
    : all;
  const list   = document.getElementById("jobs-list");

  if (!jobs.length) {
    list.innerHTML = `<li class="empty-state">${filter ? "No matches" : "No jobs"}</li>`;
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

  return `
<li class="job-item${inProg ? " expanded" : ""}" data-id="${esc(job.id)}"
    style="border-left-color:var(--subdivision-${ci})">
  <button class="btn-delete" data-delete="${esc(job.id)}" aria-label="Delete"></button>
  <div class="job-face">
    <div class="job-top">
      <div class="job-top-addr"><strong>${esc(job.address)}</strong></div>
      <div class="job-top-spacer"></div>
      <div class="job-top-meta">
        <span class="chip chip-sm chip-secondary">🏗 ${esc(job.builder)}</span>
        <span class="chip chip-sm chip-secondary">🏘 ${esc(job.subdivision)}</span>
        ${badge}${ts}
      </div>
    </div>
    <div class="equip-grid">
      <div class="equip-card">
        <div class="equip-heading">System 1</div>
        <div class="equip-model">${esc(s1.furnace || "—")} · ${esc(s1.outdoor || "—")}</div>
      </div>
      ${s2 ? `<div class="equip-card">
        <div class="equip-heading">System 2</div>
        <div class="equip-model">${esc(s2.furnace || "—")} · ${esc(s2.outdoor || "—")}</div>
      </div>` : ""}
    </div>
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
// Add Job dialog — built dynamically (no slot in index.html)
// ---------------------------------------------------------------------------

function buildAddJobDialog() {
  const dlg = document.createElement("dialog");
  dlg.id = "add-job-modal";
  dlg.className = "modal";
  dlg.innerHTML = `
    <div class="modal-header">
      <span>New Job</span>
      <button type="button" id="add-job-close" class="btn-icon" aria-label="Close"></button>
    </div>
    <form class="modal-body" id="add-job-form">
      <label>Address *<input name="address" required autocomplete="off" placeholder="32122 WATERLILY VIEW CT"></label>
      <label>Subdivision *<input name="subdivision" required autocomplete="off" placeholder="DELLROSE"></label>
      <label>Builder *<select name="builder">
        ${BUILDERS.map((b) => `<option value="${b}">${esc(b)}</option>`).join("")}
      </select></label>
      <label>Furnace / Air Handler<input name="furnace" autocomplete="off"></label>
      <label>Outdoor Unit<input name="outdoor" autocomplete="off"></label>
      <label>Coil<input name="coil" autocomplete="off"></label>
      <label>Contact<input name="contact" autocomplete="off"></label>
      <div class="btn-row">
        <button type="submit" class="btn-primary">Add Job</button>
        <button type="button" id="add-job-cancel" class="btn-secondary">Cancel</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
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

  // Jobs — search + list delegation
  document.getElementById("job-search").addEventListener("input", (e) =>
    renderJobs(e.target.value)
  );
  document.getElementById("btn-add-job").addEventListener("click", () =>
    document.getElementById("add-job-modal").showModal()
  );
  document.getElementById("jobs-list").addEventListener("click", (e) => {
    const del   = e.target.closest("[data-delete]");
    const start = e.target.closest("[data-start]");
    const edit  = e.target.closest("[data-edit]");
    const maps  = e.target.closest("[data-maps]");
    const item  = e.target.closest(".job-item");

    if (del)   { removeJob(del.dataset.delete); renderJobs(document.getElementById("job-search").value); return; }
    if (start) { const j = getJobById(start.dataset.start); if (j) openWorkspace(j); return; }
    if (edit)  { toast("Edit not yet implemented", "info"); return; }
    if (maps)  { window.open(`https://maps.google.com/?q=${encodeURIComponent(maps.dataset.maps)}`, "_blank"); return; }
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

  // Add Job dialog
  document.getElementById("add-job-close").addEventListener("click", () =>
    document.getElementById("add-job-modal").close()
  );
  document.getElementById("add-job-cancel").addEventListener("click", () =>
    document.getElementById("add-job-modal").close()
  );
  document.getElementById("add-job-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const job = createJob({
      address:     fd.get("address").toUpperCase(),
      subdivision: fd.get("subdivision").toUpperCase(),
      builder:     fd.get("builder"),
      contact:     fd.get("contact"),
      system1:     { furnace: fd.get("furnace"), coil: fd.get("coil"), outdoor: fd.get("outdoor") },
    });
    precacheJobs([job]);
    document.getElementById("add-job-modal").close();
    e.target.reset();
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

  buildAddJobDialog();
  wireEvents();
  renderJobs();
  renderWorkspace();
  precacheJobs(getAllJobs()); // background, no await
}

document.addEventListener("DOMContentLoaded", init);
