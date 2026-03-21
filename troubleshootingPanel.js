// ============================================================
// troubleshootingPanel.js — Troubleshooting Drawer Controller
// Wires the UI drawer to the Level 1 engine and Level 2 Claude API
// ============================================================

import { getState } from "./state.js";
import { getJobs, getActiveJobAddress } from "./jobs.js";
import {
  SYMPTOM,
  SYMPTOM_LABELS,
  buildContext,
  diagnose,
} from "./troubleshootingEngine.js";
import {
  askClaude,
  saveApiKey,
  getApiKey,
  hasApiKey,
  clearApiKey,
} from "./claudeAssist.js";

// ─────────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────────
const el = {
  overlay:         () => document.getElementById("ts-overlay"),
  drawer:          () => document.getElementById("ts-drawer"),
  openBtn:         () => document.getElementById("btn-open-troubleshoot"),
  closeBtn:        () => document.getElementById("ts-drawer-close"),
  contextChips:    () => document.getElementById("ts-context-chips"),
  // Job section
  jobSection:      () => document.getElementById("ts-job-section"),
  jobDisplay:      () => document.getElementById("ts-job-display"),
  // Symptom section
  symptomSection:  () => document.getElementById("ts-symptom-section"),
  symptomBtns:     () => document.querySelectorAll(".ts-symptom-btn"),
  faultInput:      () => document.getElementById("ts-fault-input"),
  faultCodeField:  () => document.getElementById("ts-fault-code-value"),
  lookupBtn:       () => document.getElementById("ts-lookup-btn"),
  // Results section
  resultsSection:  () => document.getElementById("ts-results-section"),
  resultTitle:     () => document.getElementById("ts-result-title"),
  severityBadge:   () => document.getElementById("ts-severity-badge"),
  resultSummary:   () => document.getElementById("ts-result-summary"),
  stepsList:       () => document.getElementById("ts-steps-list"),
  equipmentNotes:  () => document.getElementById("ts-equipment-notes"),
  resetBtn:        () => document.getElementById("ts-reset-btn"),
  // Claude section
  claudeSection:   () => document.getElementById("ts-claude-section"),
  apiKeyToggle:    () => document.getElementById("ts-api-key-toggle"),
  apiKeyPanel:     () => document.getElementById("ts-api-key-panel"),
  apiKeyInput:     () => document.getElementById("ts-api-key-input"),
  saveKeyBtn:      () => document.getElementById("ts-save-key-btn"),
  clearKeyBtn:     () => document.getElementById("ts-clear-key-btn"),
  askClaudeBtn:    () => document.getElementById("ts-ask-claude-btn"),
  claudeBtnText:   () => document.getElementById("ts-claude-btn-text"),
  claudeSpinner:   () => document.getElementById("ts-claude-spinner"),
  claudeResponse:  () => document.getElementById("ts-claude-response"),
};

// ─────────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────────
let selectedJob     = null;   // Job object currently selected
let activeSymptom   = null;
let activeFaultCode = "";
let currentContext  = {};
let currentL1Result = null;
let isStreaming      = false;

// ─────────────────────────────────────────────
// BUILD CONTEXT FROM JOB OBJECT
// ─────────────────────────────────────────────
function buildContextFromJob(job) {
  if (!job) return buildContext(getState());

  // Prefer savedState (richer) if the completion was started
  if (job.savedState) return buildContext(job.savedState);

  // Otherwise build a minimal state from job fields
  return buildContext({
    heaterModel:         job.heaterModel        || "",
    outdoorModel:        job.outdoorModel       || "",
    heaterModel2:        job.heaterModel2       || "",
    outdoorModel2:       job.outdoorModel2      || "",
    selectedThermostat:  job.thermostat?.type   || null,
    selectedAccessories: job.extractedAccessories || [],
    isTwoSystems:        job.isTwoSystems       || false,
  });
}

function jobHasEquipment(job) {
  return !!(job?.heaterModel || job?.outdoorModel);
}

// ─────────────────────────────────────────────
// OPEN / CLOSE
// ─────────────────────────────────────────────
function openDrawer() {
  // Auto-select active job if one exists
  const jobs = getJobs();
  const activeAddr = getActiveJobAddress();

  if (!selectedJob) {
    if (activeAddr) {
      selectedJob = jobs.find(j => j.address === activeAddr) || null;
    }
    if (!selectedJob && jobs.length === 1) {
      selectedJob = jobs[0];
    }
  }

  currentContext = buildContextFromJob(selectedJob);

  renderJobSection();
  renderContextChips();

  el.overlay().classList.add("ts-open");
  el.drawer().classList.add("ts-open");
  el.drawer().removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  el.overlay().classList.remove("ts-open");
  el.drawer().classList.remove("ts-open");
  el.drawer().setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ─────────────────────────────────────────────
// JOB SECTION — Active job display or picker
// ─────────────────────────────────────────────
function renderJobSection() {
  const container = el.jobDisplay();
  container.innerHTML = "";

  const jobs = getJobs();

  if (jobs.length === 0) {
    container.innerHTML = `<p class="ts-no-jobs">Sin jobs registrados.<br>Agrega jobs en la pestaña Jobs primero.</p>`;
    el.symptomSection().classList.add("hidden");
    return;
  }

  // Show active job card
  if (selectedJob) {
    container.appendChild(buildActiveJobCard(selectedJob));

    // If no equipment on job → show warning but still allow diagnosis
    if (!jobHasEquipment(selectedJob)) {
      const warn = document.createElement("div");
      warn.className = "ts-no-equip-warning";
      warn.textContent = "⚠️ Este job no tiene equipo registrado. El diagnóstico será genérico.";
      container.appendChild(warn);
    }

    el.symptomSection().classList.remove("hidden");
  } else {
    // No job selected → show picker inline
    container.appendChild(buildJobPicker(jobs));
    el.symptomSection().classList.add("hidden");
  }
}

function buildActiveJobCard(job) {
  const card = document.createElement("div");
  card.className = "ts-active-job";

  const addr = document.createElement("div");
  addr.className = "ts-active-job-address";
  addr.textContent = job.address;
  card.appendChild(addr);

  const meta = document.createElement("div");
  meta.className = "ts-active-job-meta";

  const addChip = (text, variant = "") => {
    const chip = document.createElement("span");
    chip.className = `ts-active-job-chip${variant ? " " + variant : ""}`;
    chip.textContent = text;
    meta.appendChild(chip);
  };

  if (job.heaterModel)  addChip(job.heaterModel);
  if (job.outdoorModel) addChip(job.outdoorModel, "ts-chip-outdoor");

  const ctx = buildContextFromJob(job);
  if (ctx.isA2L)        addChip("A2L", "ts-chip-a2l");
  if (job.thermostat?.type) addChip(job.thermostat.type, "ts-chip-tstat");
  if (ctx.hasZoning)    addChip("Zoning", "ts-chip-acc");
  if (ctx.hasFloatSwitch) addChip("Float Switch", "ts-chip-acc");
  if (ctx.hasTraneHarness) addChip("Harness", "ts-chip-a2l");

  if (meta.children.length === 0) {
    addChip("Sin equipo");
  }

  card.appendChild(meta);

  // "Change job" link (only shown if there are multiple jobs)
  if (getJobs().length > 1) {
    const changeBtn = document.createElement("button");
    changeBtn.type = "button";
    changeBtn.className = "ts-job-change-btn";
    changeBtn.textContent = "Cambiar job →";
    changeBtn.addEventListener("click", () => {
      selectedJob = null;
      resetToSymptomSelection();
      renderJobSection();
      renderContextChips();
    });
    card.appendChild(changeBtn);
  }

  return card;
}

function buildJobPicker(jobs) {
  const wrapper = document.createElement("div");

  const label = document.createElement("p");
  label.className = "ts-section-label";
  label.style.marginBottom = "6px";
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

    const equipParts = [job.heaterModel, job.outdoorModel].filter(Boolean);
    const equipEl = document.createElement("div");
    equipEl.className = "ts-job-picker-equip";
    equipEl.textContent = equipParts.length > 0
      ? equipParts.join(" + ")
      : "Sin equipo registrado";

    item.appendChild(addrEl);
    item.appendChild(equipEl);

    item.addEventListener("click", () => {
      selectedJob = job;
      currentContext = buildContextFromJob(job);
      resetToSymptomSelection();
      renderJobSection();
      renderContextChips();
      el.symptomSection().classList.remove("hidden");
    });

    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}

// ─────────────────────────────────────────────
// CONTEXT CHIPS (equipment summary in header)
// ─────────────────────────────────────────────
function renderContextChips() {
  const container = el.contextChips();
  container.innerHTML = "";

  const addChip = (label) => {
    const span = document.createElement("span");
    span.className = "ts-context-chip";
    span.textContent = label;
    container.appendChild(span);
  };

  if (selectedJob) {
    if (currentContext.heaterModel)  addChip(currentContext.heaterModel);
    if (currentContext.outdoorModel) addChip(currentContext.outdoorModel);
    if (currentContext.tstatKey)     addChip(currentContext.tstatKey);
    if (currentContext.isA2L)        addChip("⚠️ A2L");
    if (currentContext.hasZoning)    addChip("Zoning");
    if (!currentContext.heaterModel && !currentContext.outdoorModel) {
      addChip(selectedJob.address.split(" ").slice(0, 3).join(" "));
    }
  } else {
    addChip("Selecciona un job");
  }
}

// ─────────────────────────────────────────────
// SYMPTOM SELECTION
// ─────────────────────────────────────────────
function selectSymptom(symptom) {
  if (!selectedJob && getJobs().length > 0) return; // Must select job first

  activeSymptom = symptom;
  activeFaultCode = "";

  el.symptomBtns().forEach(btn => {
    btn.classList.toggle("ts-active", btn.dataset.symptom === symptom);
  });

  const isFaultCode = symptom === SYMPTOM.FAULT_CODE;
  el.faultInput().classList.toggle("hidden", !isFaultCode);

  if (!isFaultCode) {
    runDiagnosis(symptom, "");
  }
}

function runDiagnosis(symptom, detail) {
  currentContext = buildContextFromJob(selectedJob);
  currentL1Result = diagnose({ symptom, detail, context: currentContext });
  renderResults(currentL1Result);
}

// ─────────────────────────────────────────────
// RENDER LEVEL 1 RESULTS
// ─────────────────────────────────────────────
function renderResults(result) {
  el.symptomSection().classList.remove("hidden");
  el.resultsSection().classList.remove("hidden");

  el.resultTitle().textContent = result.title;
  el.resultSummary().textContent = result.summary;

  const badge = el.severityBadge();
  badge.textContent = result.severity.toUpperCase();
  badge.className = `ts-severity-badge ts-${result.severity}`;

  const stepsContainer = el.stepsList();
  stepsContainer.innerHTML = "";

  if (result.steps.length === 0) {
    stepsContainer.innerHTML = `<p style="font-size:0.83em;opacity:0.6;">No hay pasos específicos para esta combinación.</p>`;
  } else {
    result.steps.forEach(s => {
      const item = document.createElement("div");
      item.className = "ts-step-item";
      item.innerHTML = `
        <div class="ts-step-num">${s.step}</div>
        <div class="ts-step-content">
          <div class="ts-step-action">${escapeHtml(s.action)}</div>
          ${s.detail ? `<div class="ts-step-detail">${escapeHtml(s.detail)}</div>` : ""}
          ${s.tool  ? `<span class="ts-step-tool">🔧 ${escapeHtml(s.tool)}</span>` : ""}
        </div>
      `;
      stepsContainer.appendChild(item);
    });
  }

  const notesContainer = el.equipmentNotes();
  notesContainer.innerHTML = "";
  if (result.equipmentNotes?.length > 0) {
    result.equipmentNotes.forEach(n => {
      if (!n.text) return;
      const note = document.createElement("div");
      note.className = "ts-note-item";
      note.innerHTML = `
        <div class="ts-note-label">${escapeHtml(n.label)}</div>
        <div class="ts-note-text">${escapeHtml(n.text)}</div>
      `;
      notesContainer.appendChild(note);
    });
  }

  el.claudeSection().classList.remove("hidden");
  el.claudeResponse().textContent = "";
  el.claudeResponse().classList.add("hidden");
}

// ─────────────────────────────────────────────
// API KEY MANAGEMENT UI
// ─────────────────────────────────────────────
function toggleApiKeyPanel() {
  const panel = el.apiKeyPanel();
  const isHidden = panel.classList.toggle("hidden");
  if (!isHidden) {
    const key = getApiKey();
    el.apiKeyInput().value = key ? "••••••••••••••••" : "";
    el.apiKeyInput().placeholder = key
      ? "API key guardada (ingresa nueva para cambiar)"
      : "sk-ant-api03-...";
    el.apiKeyInput().focus();
  }
}

function saveKey() {
  const val = el.apiKeyInput().value.trim();
  if (!val || val.startsWith("•")) {
    el.apiKeyPanel().classList.add("hidden");
    return;
  }
  if (!val.startsWith("sk-ant-")) {
    alert("La API key debe comenzar con 'sk-ant-'");
    return;
  }
  saveApiKey(val);
  el.apiKeyPanel().classList.add("hidden");
  showToastLocal("API key guardada ✓");
}

function showToastLocal(msg) {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
    background:#333; color:#fff; padding:8px 18px; border-radius:4px;
    font-size:0.85em; z-index:99999; white-space:nowrap;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ─────────────────────────────────────────────
// LEVEL 2 — CLAUDE ASSIST
// ─────────────────────────────────────────────
function handleAskClaude() {
  if (isStreaming) return;

  if (!hasApiKey()) {
    el.apiKeyPanel().classList.remove("hidden");
    el.apiKeyInput().focus();
    return;
  }

  if (!activeSymptom) {
    showToastLocal("Selecciona un síntoma primero");
    return;
  }

  isStreaming = true;
  el.askClaudeBtn().disabled = true;
  el.claudeBtnText().textContent = "Consultando…";
  el.claudeSpinner().classList.remove("hidden");

  const responseEl = el.claudeResponse();
  responseEl.textContent = "";
  responseEl.classList.remove("hidden");

  const symptomLabel = SYMPTOM_LABELS[activeSymptom] || activeSymptom;
  const detail = activeSymptom === SYMPTOM.FAULT_CODE ? activeFaultCode : "";

  // Include job address in the label for Claude context
  const jobLabel = selectedJob
    ? `${symptomLabel} — ${selectedJob.address}`
    : symptomLabel;

  askClaude({
    symptomLabel: jobLabel,
    detail,
    context:  currentContext,
    l1Result: currentL1Result,
    onChunk: (chunk) => {
      responseEl.textContent += chunk;
      responseEl.scrollTop = responseEl.scrollHeight;
    },
    onDone: () => {
      isStreaming = false;
      el.askClaudeBtn().disabled = false;
      el.claudeBtnText().textContent = "✨ Consultar Claude";
      el.claudeSpinner().classList.add("hidden");
    },
    onError: (err) => {
      isStreaming = false;
      el.askClaudeBtn().disabled = false;
      el.claudeBtnText().textContent = "✨ Consultar Claude";
      el.claudeSpinner().classList.add("hidden");
      responseEl.textContent = `Error: ${err.message}`;
    },
  });
}

// ─────────────────────────────────────────────
// RESET TO SYMPTOM SELECTION
// ─────────────────────────────────────────────
function resetToSymptomSelection() {
  activeSymptom   = null;
  activeFaultCode = "";
  currentL1Result = null;

  el.symptomBtns().forEach(btn => btn.classList.remove("ts-active"));
  el.faultInput().classList.add("hidden");
  if (el.faultCodeField()) el.faultCodeField().value = "";
  el.resultsSection().classList.add("hidden");
  el.claudeSection().classList.add("hidden");
  el.claudeResponse().classList.add("hidden");
  el.claudeResponse().textContent = "";
  el.apiKeyPanel().classList.add("hidden");
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function init() {
  el.openBtn()?.addEventListener("click", openDrawer);
  el.closeBtn()?.addEventListener("click", closeDrawer);
  el.overlay()?.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.drawer().classList.contains("ts-open")) {
      closeDrawer();
    }
  });

  el.symptomBtns().forEach(btn => {
    btn.addEventListener("click", () => selectSymptom(btn.dataset.symptom));
  });

  el.lookupBtn()?.addEventListener("click", () => {
    const code = el.faultCodeField().value.trim();
    if (!code) return;
    activeFaultCode = code;
    runDiagnosis(SYMPTOM.FAULT_CODE, code);
  });

  el.faultCodeField()?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") el.lookupBtn().click();
  });

  el.resetBtn()?.addEventListener("click", resetToSymptomSelection);

  el.apiKeyToggle()?.addEventListener("click", toggleApiKeyPanel);
  el.saveKeyBtn()?.addEventListener("click", saveKey);
  el.clearKeyBtn()?.addEventListener("click", () => {
    clearApiKey();
    el.apiKeyInput().value = "";
    showToastLocal("API key eliminada");
  });

  el.askClaudeBtn()?.addEventListener("click", handleAskClaude);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
