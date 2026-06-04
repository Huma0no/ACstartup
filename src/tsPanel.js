// src/tsPanel.js — Troubleshooting drawer panel.
// Self-contained: imports directly from source modules, no app.js coupling.

import {
  diagnose,
  buildContext,
  SYMPTOM,
  SYMPTOM_LABELS,
} from "./troubleshootingEngine.js";
import { getJobById } from "./jobs.js";
import { getApiKey, getSettings } from "./settings.js";
import { getActiveJobId } from "./storage.js";
import { initChat } from "./ai.js";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _job     = null;
let _symptom = null;
let _result  = null;

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
  const id = getActiveJobId();
  _job = id ? getJobById(id) : null;

  // Header
  document.getElementById("ts-job-addr").textContent = _job ? _job.address : "Generic mode";
  const chipsEl = document.getElementById("ts-context-chips");
  chipsEl.innerHTML = "";
  if (_job) {
    const indoor  = _job.system1?.indoor;
    const outdoor = _job.system1?.outdoor;
    if (indoor)  chipsEl.appendChild(_chip(indoor));
    if (outdoor) chipsEl.appendChild(_chip(outdoor));
  }

  // Symptom grid
  const grid = document.getElementById("ts-symptom-grid");
  grid.innerHTML = "";
  for (const [key, label] of Object.entries(SYMPTOM_LABELS)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ts-symptom-btn";
    btn.dataset.symptom = key;
    btn.textContent = label;
    btn.addEventListener("click", () => selectSymptom(key));
    grid.appendChild(btn);
  }

  // Reset view
  document.getElementById("ts-fault-row").classList.add("hidden");
  document.getElementById("ts-results-section").classList.add("hidden");
  document.getElementById("ts-symptom-section").classList.remove("hidden");
  _symptom = null;
  _result  = null;
}

function _chip(text) {
  const s = document.createElement("span");
  s.className = "chip chip-sm chip-secondary";
  s.textContent = text;
  return s;
}

// ---------------------------------------------------------------------------
// Symptom selection
// ---------------------------------------------------------------------------

function selectSymptom(symptom) {
  _symptom = symptom;
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

function _buildJobContext(job) {
  if (!job) return buildContext({});
  return buildContext({
    heaterModel:         job.system1?.indoor                           || "",
    outdoorModel:        job.system1?.outdoor                         || "",
    selectedThermostat:  job.jobThermostat?.type                      || null,
    selectedAccessories: (job.jobAccessories || []).map(a => a.name ?? a),
    isTwoSystems:        job.isTwoSystems                             || false,
  });
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
  result.steps.forEach(s => {
    const li = document.createElement("li");
    li.className = "ts-step-item";

    const action = document.createElement("span");
    action.className = "ts-step-action";
    action.textContent = s.action;
    li.appendChild(action);

    if (s.tool) {
      const tool = document.createElement("div");
      tool.className = "ts-step-tool";
      tool.textContent = `🔧 ${s.tool}`;
      li.appendChild(tool);
    }

    if (s.branches) {
      li.appendChild(_buildBranchEl(s.branches));
    }

    list.appendChild(li);
  });

  const notes = document.getElementById("ts-equipment-notes");
  const filled = (result.equipmentNotes || []).filter(n => n.text);
  if (filled.length) {
    notes.innerHTML = filled
      .map(n => `<strong>${esc(n.label)}:</strong> ${esc(n.text)}`)
      .join("<br>");
    notes.classList.remove("hidden");
  } else {
    notes.classList.add("hidden");
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

  const sub = document.createElement("ol");
  sub.className = "ts-branch-substeps";
  sub.style.display = "none";

  function showBranch(side) {
    sub.innerHTML = "";
    sub.style.display = "";
    side.steps.forEach(s => {
      const li2 = document.createElement("li");
      li2.className = "ts-step-item";
      const a = document.createElement("span");
      a.className = "ts-step-action";
      a.textContent = s.action;
      li2.appendChild(a);
      if (s.tool) {
        const t = document.createElement("div");
        t.className = "ts-step-tool";
        t.textContent = `🔧 ${s.tool}`;
        li2.appendChild(t);
      }
      sub.appendChild(li2);
    });
  }

  const yBtn = document.createElement("button");
  yBtn.type = "button";
  yBtn.className = "btn-secondary ts-branch-yes";
  yBtn.textContent = `Yes — ${branches.yes.label}`;
  yBtn.addEventListener("click", () => showBranch(branches.yes));

  const nBtn = document.createElement("button");
  nBtn.type = "button";
  nBtn.className = "btn-secondary ts-branch-no";
  nBtn.textContent = `No — ${branches.no.label}`;
  nBtn.addEventListener("click", () => showBranch(branches.no));

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
  document.getElementById("ts-results-section").classList.add("hidden");
  document.getElementById("ts-symptom-section").classList.remove("hidden");
  document.getElementById("ts-fault-row").classList.add("hidden");
  document.getElementById("ts-steps-list").innerHTML = "";
  _symptom = null;
  _result  = null;
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
}
