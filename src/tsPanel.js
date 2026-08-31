// src/tsPanel.js — Troubleshooting drawer panel.
// Self-contained: imports directly from source modules, no app.js coupling.

import {
  diagnose,
  buildContext,
  SYMPTOM,
  SYMPTOM_LABELS,
} from "./troubleshootingEngine.js";
import { getJobById, getAllJobs } from "./jobs.js";
import { getApiKey, getSettings } from "./settings.js";
import { getActiveJobId } from "./storage.js";
import { initChat } from "./ai.js";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _job         = null;   // currently selected job object
let _systemIndex = 0;      // currently selected system index for multi-system jobs
let _symptom     = null;
let _result      = null;

// ---------------------------------------------------------------------------
// Drawer open / close
// ---------------------------------------------------------------------------

function _openDrawer() {
  _populate();
  const drawer  = document.getElementById("ts-drawer");
  const overlay = document.getElementById("ts-overlay");
  drawer.classList.add("ts-open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.add("ts-open");
}

function _closeDrawer() {
  const drawer  = document.getElementById("ts-drawer");
  const overlay = document.getElementById("ts-overlay");
  drawer.classList.remove("ts-open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.classList.remove("ts-open");
}

// ---------------------------------------------------------------------------
// Populate — called on every open
// ---------------------------------------------------------------------------

function _populate() {
  // Pre-select active job if none explicitly chosen
  if (!_job) {
    const id = getActiveJobId();
    _job = id ? getJobById(id) : null;
  }

  _renderJobSection();
  _renderContextChips();

  // Symptom grid
  const grid = document.getElementById("ts-symptom-grid");
  grid.innerHTML = "";
  const entries = Object.entries(SYMPTOM_LABELS);
  entries.forEach(([key, label], i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ts-symptom-btn";
    btn.dataset.symptom = key;
    btn.textContent = label;
    // Last button spans 2 columns when count is odd
    if (i === entries.length - 1 && entries.length % 2 !== 0) {
      btn.style.gridColumn = "span 2";
    }
    btn.addEventListener("click", () => selectSymptom(key));
    grid.appendChild(btn);
  });

  // Reset view
  document.getElementById("ts-fault-row").classList.add("hidden");
  document.getElementById("ts-results-section").classList.add("hidden");
  document.getElementById("ts-symptom-section").classList.remove("hidden");
  _symptom = null;
  _result  = null;
}

// ---------------------------------------------------------------------------
// Job section — picker or active card
// ---------------------------------------------------------------------------

function _renderJobSection() {
  const section = document.getElementById("ts-job-section");
  section.innerHTML = "";

  const jobs = getAllJobs();

  if (_job) {
    section.appendChild(_buildJobCard(_job, jobs.length > 1));
  } else if (jobs.length > 0) {
    section.appendChild(_buildJobPicker(jobs));
  }

  section.appendChild(_buildGenericBadge(
    jobs.length === 0
      ? "No jobs registered — diagnosis will not be equipment-specific"
      : "Or continue without selecting a job"
  ));
}

function _buildJobCard(job, showChangeBtn) {
  const card = document.createElement("div");
  card.className = "ts-active-job";

  const addr = document.createElement("div");
  addr.className = "ts-active-job-address";
  addr.textContent = job.address;
  card.appendChild(addr);

  const systems = Array.isArray(job.systems) && job.systems.length > 0
    ? job.systems
    : [
        { indoor: job.system1?.indoor || "", outdoor: job.system1?.outdoor || "" },
        ...((job.system2 || job.isTwoSystems) ? [{ indoor: job.system2?.indoor || "", outdoor: job.system2?.outdoor || "" }] : [])
      ];

  if (_systemIndex >= systems.length) _systemIndex = 0;

  if (systems.length > 1) {
    const sysTabs = document.createElement("div");
    sysTabs.className = "ts-system-tabs";
    sysTabs.style.cssText = "display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;";
    systems.forEach((sys, sIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn btn-sm ${sIdx === _systemIndex ? "btn-primary" : "btn-secondary"}`;
      btn.style.cssText = "font-size:11px;padding:3px 8px;";
      btn.textContent = `System ${sIdx + 1}${sys.indoor || sys.outdoor ? ` (${sys.indoor || sys.outdoor})` : ""}`;
      btn.addEventListener("click", () => {
        _systemIndex = sIdx;
        _renderJobSection();
        _renderContextChips();
        if (_symptom) {
          _runDiagnosis();
        }
      });
      sysTabs.appendChild(btn);
    });
    card.appendChild(sysTabs);
  }

  const meta = document.createElement("div");
  meta.className = "ts-active-job-meta";

  const ctx = _buildJobContext(job);
  const targetSys = systems[_systemIndex] || systems[0] || {};

  if (targetSys.indoor)          meta.appendChild(_chip(targetSys.indoor));
  if (targetSys.outdoor)         meta.appendChild(_chip(targetSys.outdoor, "outdoor"));
  if (ctx.isA2L)                 meta.appendChild(_chip("A2L", "a2l"));
  if (job.jobThermostat?.type)   meta.appendChild(_chip(job.jobThermostat.type, "tstat"));
  if (ctx.hasZoning)             meta.appendChild(_chip("Zoning", "acc"));
  if (ctx.hasFloatSwitch)        meta.appendChild(_chip("Float Switch", "acc"));
  if (ctx.hasTraneHarness)       meta.appendChild(_chip("Harness", "a2l"));
  if (meta.children.length === 0) {
    const warn = document.createElement("span");
    warn.className = "ts-no-equip-warning";
    warn.textContent = "⚠️ Sin equipo registrado";
    meta.appendChild(warn);
  }

  card.appendChild(meta);

  if (showChangeBtn) {
    const changeBtn = document.createElement("button");
    changeBtn.type = "button";
    changeBtn.className = "ts-job-change-btn";
    changeBtn.textContent = "Cambiar job →";
    changeBtn.addEventListener("click", () => {
      _job = null;
      _systemIndex = 0;
      _resetToSymptomSelection();
      _renderJobSection();
      _renderContextChips();
    });
    card.appendChild(changeBtn);
  }

  return card;
}

function _buildJobPicker(jobs) {
  const wrapper = document.createElement("div");

  const label = document.createElement("p");
  label.className = "ts-section-label";
  label.textContent = "Selecciona el job que estás trabajando:";
  wrapper.appendChild(label);

  const list = document.createElement("div");
  list.className = "ts-job-picker";

  jobs.forEach(job => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ts-job-picker-item";

    const addrEl = document.createElement("span");
    addrEl.className = "ts-job-picker-address";
    addrEl.textContent = job.address;

    const parts = Array.isArray(job.systems) && job.systems.length > 0
      ? job.systems.map(s => [s.indoor, s.outdoor].filter(Boolean).join("/")).filter(Boolean)
      : [job.system1?.indoor, job.system1?.outdoor].filter(Boolean);
    const equipEl = document.createElement("div");
    equipEl.className = "ts-job-picker-equip";
    equipEl.textContent = parts.length > 0 ? parts.join(" | ") : "Sin equipo registrado";

    item.appendChild(addrEl);
    item.appendChild(equipEl);

    item.addEventListener("click", () => {
      _job = job;
      _systemIndex = 0;
      _resetToSymptomSelection();
      _renderJobSection();
      _renderContextChips();
      document.getElementById("ts-symptom-section").classList.remove("hidden");
    });

    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function _buildGenericBadge(subtitle) {
  const badge = document.createElement("div");
  badge.className = "ts-generic-badge";
  badge.innerHTML = `
    <span class="ts-generic-icon">⚡</span>
    <div>
      <div class="ts-generic-title">Generic Mode</div>
      <div class="ts-generic-sub">${esc(subtitle)}</div>
    </div>
  `;
  return badge;
}

// ---------------------------------------------------------------------------
// Context chips (header)
// ---------------------------------------------------------------------------

function _renderContextChips() {
  const container = document.getElementById("ts-context-chips");
  container.innerHTML = "";
  document.getElementById("ts-job-addr").textContent = _job ? _job.address : "Generic mode";

  if (!_job) {
    container.appendChild(_chip("Selecciona un job"));
    return;
  }

  const systems = Array.isArray(_job.systems) && _job.systems.length > 0
    ? _job.systems
    : [
        { indoor: _job.system1?.indoor || "", outdoor: _job.system1?.outdoor || "" },
        ...((_job.system2 || _job.isTwoSystems) ? [{ indoor: _job.system2?.indoor || "", outdoor: _job.system2?.outdoor || "" }] : [])
      ];

  const ctx = _buildJobContext(_job);
  if (systems.length > 1) container.appendChild(_chip(`Sys ${_systemIndex + 1}`));
  if (ctx.heaterModel)  container.appendChild(_chip(ctx.heaterModel));
  if (ctx.outdoorModel) container.appendChild(_chip(ctx.outdoorModel, "outdoor"));
  if (ctx.isA2L)        container.appendChild(_chip("⚠️ A2L", "a2l"));
  if (ctx.hasZoning)    container.appendChild(_chip("Zoning", "acc"));
  if (!ctx.heaterModel && !ctx.outdoorModel) {
    container.appendChild(_chip(_job.address.split(" ").slice(0, 3).join(" ")));
  }
}

// ---------------------------------------------------------------------------
// Chip helper
// ---------------------------------------------------------------------------

function _chip(text, variant) {
  const s = document.createElement("span");
  s.className = "ts-job-chip" + (variant ? " ts-chip-" + variant : "");
  s.textContent = text;
  return s;
}

// ---------------------------------------------------------------------------
// Symptom selection
// ---------------------------------------------------------------------------

function selectSymptom(symptom) {
  _symptom = symptom;

  document.querySelectorAll(".ts-symptom-btn").forEach(btn => {
    btn.classList.toggle("ts-active", btn.dataset.symptom === symptom);
  });

  document.getElementById("ts-fault-row").classList.toggle(
    "hidden", symptom !== SYMPTOM.FAULT_CODE
  );
  if (symptom !== SYMPTOM.FAULT_CODE) {
    runDiagnosis(symptom, "");
  }
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

function runDiagnosis(symptom, faultCode) {
  const ctx = _buildJobContext(_job);
  _result = diagnose({ symptom, detail: faultCode, context: ctx });
  renderResults(_result);
}

function _runDiagnosis() {
  if (!_symptom) return;
  const faultCode = document.getElementById("ts-fault-input")?.value?.trim() || "";
  runDiagnosis(_symptom, faultCode);
}

export function buildContextFromJob(job, sysIdx = 0) {
  if (!job) return buildContext({});
  const systems = Array.isArray(job.systems) && job.systems.length > 0
    ? job.systems
    : [
        { indoor: job.system1?.indoor || "", outdoor: job.system1?.outdoor || "" },
        ...((job.system2 || job.isTwoSystems) ? [{ indoor: job.system2?.indoor || "", outdoor: job.system2?.outdoor || "" }] : [])
      ];
  const targetSys = systems[sysIdx] || systems[0] || {};
  return buildContext({
    heaterModel:         targetSys.indoor                           || "",
    outdoorModel:        targetSys.outdoor                          || "",
    selectedThermostat:  job.jobThermostat?.type                    || null,
    selectedAccessories: (job.jobAccessories || []).map(a => a.name ?? a),
    isTwoSystems:        systems.length === 2,
    systemsCount:        systems.length,
    systemIndex:         sysIdx,
  });
}

function _buildJobContext(job) {
  return buildContextFromJob(job, _systemIndex);
}

// ---------------------------------------------------------------------------
// Render results
// ---------------------------------------------------------------------------

function renderResults(result) {
  document.getElementById("ts-symptom-section").classList.add("hidden");
  document.getElementById("ts-results-section").classList.remove("hidden");

  const badge = document.getElementById("ts-severity-badge");
  badge.textContent = result.severity.toUpperCase();
  badge.className   = `ts-severity-badge ts-${result.severity}`;

  document.getElementById("ts-result-title").textContent   = result.title;
  document.getElementById("ts-result-summary").textContent = result.summary;

  const list = document.getElementById("ts-steps-list");
  list.innerHTML = "";

  if (result.steps.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "font-size:0.83em;opacity:0.6;";
    empty.textContent = "No hay pasos específicos para esta combinación.";
    list.appendChild(empty);
  } else {
    const header = document.createElement("div");
    header.className = "ts-steps-header";
    header.innerHTML = `
      <span class="ts-steps-label">Pasos — toca para marcar</span>
      <button type="button" class="ts-steps-reset" id="ts-steps-reset-btn">↺ Reset</button>
    `;
    list.appendChild(header);

    result.steps.forEach(s => {
      const item = document.createElement("div");
      item.className = "ts-step-item";

      const numEl = document.createElement("div");
      numEl.className = "ts-step-num";
      numEl.innerHTML = `<span class="ts-step-num-inner">${s.step}</span>`;

      const content = document.createElement("div");
      content.className = "ts-step-content";

      const action = document.createElement("div");
      action.className = "ts-step-action";
      action.textContent = s.action;
      content.appendChild(action);

      if (s.detail) {
        const detail = document.createElement("div");
        detail.className = "ts-step-detail";
        detail.textContent = s.detail;
        content.appendChild(detail);
      }

      if (s.tool) {
        const tool = document.createElement("span");
        tool.className = "ts-step-tool";
        tool.textContent = `🔧 ${s.tool}`;
        content.appendChild(tool);
      }

      if (s.branches) {
        content.appendChild(_buildBranchEl(s.branches));
      }

      item.appendChild(numEl);
      item.appendChild(content);

      item.addEventListener("click", e => {
        if (e.target.closest(".ts-branch-btn, .ts-branch-substeps")) return;
        item.classList.toggle("ts-checked");
      });

      list.appendChild(item);
    });

    document.getElementById("ts-steps-reset-btn").addEventListener("click", e => {
      e.stopPropagation();
      list.querySelectorAll(".ts-step-item").forEach(el => el.classList.remove("ts-checked"));
    });
  }

  // Equipment notes as cards
  const notesEl = document.getElementById("ts-equipment-notes");
  const filled  = (result.equipmentNotes || []).filter(n => n.text);
  if (filled.length) {
    notesEl.innerHTML = "";
    filled.forEach(n => {
      const card = document.createElement("div");
      card.className = "ts-note-item";
      card.innerHTML = `
        <div class="ts-note-label">${esc(n.label)}</div>
        <div class="ts-note-text">${esc(n.text)}</div>
      `;
      notesEl.appendChild(card);
    });
    notesEl.classList.remove("hidden");
  } else {
    notesEl.classList.add("hidden");
  }
}

// ---------------------------------------------------------------------------
// Branch — DOM-based Yes/No expansion
// ---------------------------------------------------------------------------

function _buildBranchEl(branches) {
  const wrap = document.createElement("div");
  wrap.className = "ts-branch-wrap";

  const q = document.createElement("p");
  q.className = "ts-branch-question";
  q.textContent = branches.question;
  wrap.appendChild(q);

  const btns = document.createElement("div");
  btns.className = "ts-branch-btns";

  const sub = document.createElement("div");
  sub.className = "ts-branch-substeps";
  sub.style.display = "none";

  function showBranch(chosen, other, stepsData) {
    // Toggle off if same branch clicked again
    if (chosen.classList.contains("ts-branch-active")) {
      chosen.classList.remove("ts-branch-active");
      sub.style.display = "none";
      sub.innerHTML = "";
      return;
    }
    yBtn.classList.remove("ts-branch-active");
    nBtn.classList.remove("ts-branch-active");
    chosen.classList.add("ts-branch-active");

    sub.innerHTML = stepsData.map(s => `
      <div class="ts-branch-step">
        <div class="ts-branch-step-num"><span>${s.step}</span></div>
        <div class="ts-branch-step-body">
          <div class="ts-branch-step-action">${esc(s.action)}</div>
          ${s.detail ? `<div class="ts-step-detail">${esc(s.detail)}</div>` : ""}
          ${s.tool   ? `<span class="ts-step-tool">🔧 ${esc(s.tool)}</span>` : ""}
        </div>
      </div>
    `).join("");
    sub.style.display = "flex";
    sub.querySelectorAll(".ts-branch-step").forEach(el => {
      el.addEventListener("click", () => el.classList.toggle("ts-checked"));
    });
  }

  const yBtn = document.createElement("button");
  yBtn.type = "button";
  yBtn.className = "ts-branch-btn ts-branch-yes";
  yBtn.textContent = `✓ ${branches.yes.label}`;
  yBtn.addEventListener("click", () => showBranch(yBtn, nBtn, branches.yes.steps));

  const nBtn = document.createElement("button");
  nBtn.type = "button";
  nBtn.className = "ts-branch-btn ts-branch-no";
  nBtn.textContent = `✗ ${branches.no.label}`;
  nBtn.addEventListener("click", () => showBranch(nBtn, yBtn, branches.no.steps));

  btns.appendChild(yBtn);
  btns.appendChild(nBtn);
  wrap.appendChild(btns);
  wrap.appendChild(sub);

  return wrap;
}

// ---------------------------------------------------------------------------
// Ask AI — pre-load diagnosis context and open AI panel
// ---------------------------------------------------------------------------

function _handleAskAi() {
  if (!_result) return;
  const msg = `Diagnosing: ${_result.title}. Severity: ${_result.severity}. Summary: ${_result.summary}.`;
  initChat(_job);
  const input = document.getElementById("ai-chat-input");
  if (input) input.value = msg;
  _closeDrawer();
  document.getElementById("ai-panel")?.classList.remove("hidden");
  document.getElementById("ai-fab")?.classList.add("hidden");
  input?.focus();
}

// ---------------------------------------------------------------------------
// Reset — return to symptom selection
// ---------------------------------------------------------------------------

function _handleReset() {
  _resetToSymptomSelection();
  document.getElementById("ts-symptom-section").classList.remove("hidden");
}

function _resetToSymptomSelection() {
  _symptom = null;
  _result  = null;
  document.querySelectorAll(".ts-symptom-btn").forEach(btn => btn.classList.remove("ts-active"));
  document.getElementById("ts-fault-row").classList.add("hidden");
  document.getElementById("ts-results-section").classList.add("hidden");
  document.getElementById("ts-steps-list").innerHTML = "";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Init — wire all drawer events once on app startup
// ---------------------------------------------------------------------------

export function initTsPanel() {
  document.getElementById("btn-open-troubleshoot").addEventListener("click", _openDrawer);
  document.getElementById("ts-drawer-close").addEventListener("click", _closeDrawer);
  document.getElementById("ts-overlay").addEventListener("click", _closeDrawer);
  document.getElementById("ts-lookup-btn").addEventListener("click", () => {
    const code = document.getElementById("ts-fault-input").value.trim();
    if (code) runDiagnosis(SYMPTOM.FAULT_CODE, code);
  });
  document.getElementById("ts-ask-ai-btn").addEventListener("click", _handleAskAi);
  document.getElementById("ts-reset-btn").addEventListener("click", _handleReset);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.getElementById("ts-drawer").classList.contains("ts-open")) {
      _closeDrawer();
    }
  });
}
