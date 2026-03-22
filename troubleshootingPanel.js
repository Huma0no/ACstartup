// ============================================================
// troubleshootingPanel.js — Troubleshooting Drawer Controller
// Wires the UI drawer to the Level 1 engine and Level 2 Claude API
// ============================================================

import { getState } from "./state.js";
import { getJobs, getActiveJobAddress } from "./jobs.js";
import { TSTAT_DATA, normalizeTstatKey } from "./tstatData.js";
import {
  SYMPTOM,
  SYMPTOM_LABELS,
  buildContext,
  diagnose,
} from "./troubleshootingEngine.js";
import {
  MAIN_PROVIDERS,
  EXTENDED_PROVIDERS,
  askAI,
  saveProviderKey,
  getProviderKey,
  clearProviderKey,
  hasProviderKey,
  getActiveProvider,
  setActiveProvider,
} from "./aiProviders.js";
import { buildUserMessage } from "./claudeAssist.js";

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
    // No jobs — show generic mode badge and allow troubleshooting anyway
    container.appendChild(buildGenericModeBadge("No jobs registered"));
    el.symptomSection().classList.remove("hidden");
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
    // Jobs exist but none selected — show picker + generic mode option
    container.appendChild(buildJobPicker(jobs));
    container.appendChild(buildGenericModeBadge("Or continue without selecting a job"));
    el.symptomSection().classList.remove("hidden");
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
  if (job.thermostat?.type) {
    const tstatKey = normalizeTstatKey(job.thermostat.type);
    if (tstatKey) {
      // Interactive chip with submenu
      const chip = document.createElement("span");
      chip.className = "ts-active-job-chip ts-chip-tstat ts-chip-tstat-menu";
      chip.title = "Tap for wiring, programming & manual";
      chip.textContent = job.thermostat.type + " ▾";
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        openTstatMenu(e, tstatKey, job.builder || "");
      });
      meta.appendChild(chip);
    } else {
      addChip(job.thermostat.type, "ts-chip-tstat");
    }
  }
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

function buildGenericModeBadge(subtitle) {
  const badge = document.createElement("div");
  badge.className = "ts-generic-badge";
  badge.innerHTML = `
    <span class="ts-generic-icon">⚡</span>
    <div>
      <div class="ts-generic-title">Generic Mode</div>
      <div class="ts-generic-sub">${subtitle} — diagnosis will not be equipment-specific</div>
    </div>
  `;
  return badge;
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
  refreshDrawerProviderStatus();
}

function refreshDrawerProviderStatus() {
  const p      = getActiveProvider();
  const hasKey = hasProviderKey(p.id);
  const bar    = document.getElementById("ts-provider-status-bar");
  if (!bar) return;
  bar.style.setProperty("--pc", p.color);
  bar.innerHTML = hasKey
    ? `<span style="color:var(--pc)">${p.icon} ${p.label}</span> <span style="color:#30d158">✓ Ready</span>`
    : `<span style="color:var(--pc)">${p.icon} ${p.label}</span> <span style="color:#ff9f0a">⚠ No key</span>
       <button onclick="document.getElementById('ai-settings-modal').style.display='flex'"
         style="background:none;border:none;font-size:10px;color:inherit;opacity:0.6;cursor:pointer;
                text-decoration:underline;margin-left:4px">Configure →</button>`;
}

// ─────────────────────────────────────────────
// PROVIDER SELECTOR UI
// ─────────────────────────────────────────────
function renderProviderSelector() {
  const mainRow     = document.getElementById("ts-provider-main");
  const extRow      = document.getElementById("ts-provider-extended");
  const moreBtn     = document.getElementById("ts-provider-more");
  if (!mainRow) return;

  const active = getActiveProvider();

  const makeChip = (p) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ts-provider-chip" + (p.id === active.id ? " active" : "");
    chip.dataset.provider = p.id;
    chip.style.setProperty("--pc", p.color);
    chip.innerHTML = `<span class="ts-provider-icon">${p.icon}</span>${p.label}`;
    chip.addEventListener("click", () => selectProvider(p.id));
    return chip;
  };

  mainRow.innerHTML = "";
  MAIN_PROVIDERS.forEach(p => mainRow.appendChild(makeChip(p)));

  extRow.innerHTML = "";
  EXTENDED_PROVIDERS.forEach(p => extRow.appendChild(makeChip(p)));

  moreBtn?.addEventListener("click", () => {
    const hidden = extRow.classList.toggle("hidden");
    moreBtn.textContent = hidden ? "More ▾" : "Less ▴";
  });
}

function selectProvider(id) {
  setActiveProvider(id);
  // Update chip active states
  document.querySelectorAll(".ts-provider-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.provider === id);
  });
  // Update key panel placeholder + note
  const p = getActiveProvider();
  const input = el.apiKeyInput();
  const note  = document.getElementById("ts-api-key-note");
  if (input) {
    const saved = getProviderKey(id);
    input.value = saved ? "••••••••••••••••" : "";
    input.placeholder = p.keyPlaceholder;
  }
  if (note) {
    const hasKey = hasProviderKey(id);
    note.innerHTML = hasKey
      ? `✓ Key saved for ${p.label} · <a href="${p.keyHintUrl}" target="_blank" style="color:inherit">${p.keyHint}</a>`
      : `⚠️ No key saved · <a href="${p.keyHintUrl}" target="_blank" style="color:inherit">${p.keyHint}</a>`;
  }
  // Update button label
  const btnText = el.claudeBtnText();
  if (btnText) btnText.textContent = `✨ Ask ${p.label}`;
}

// ─────────────────────────────────────────────
// API KEY MANAGEMENT UI
// ─────────────────────────────────────────────
function toggleApiKeyPanel() {
  const panel = el.apiKeyPanel();
  const isHidden = panel.classList.toggle("hidden");
  if (!isHidden) {
    const p   = getActiveProvider();
    const key = getProviderKey(p.id);
    el.apiKeyInput().value = key ? "••••••••••••••••" : "";
    el.apiKeyInput().placeholder = key
      ? "Key saved — type new key to replace"
      : p.keyPlaceholder;
    el.apiKeyInput().focus();
  }
}

function saveKey() {
  const val = el.apiKeyInput().value.trim();
  if (!val || val.startsWith("•")) {
    el.apiKeyPanel().classList.add("hidden");
    return;
  }
  const p = getActiveProvider();
  saveProviderKey(p.id, val);
  el.apiKeyPanel().classList.add("hidden");
  selectProvider(p.id); // refresh note
  showToastLocal(`${p.label} key saved ✓`);
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
// LEVEL 2 — AI ASSIST
// ─────────────────────────────────────────────
function handleAskClaude() {
  if (isStreaming) return;

  const provider = getActiveProvider();

  if (!hasProviderKey(provider.id)) {
    el.apiKeyPanel().classList.remove("hidden");
    el.apiKeyInput().focus();
    return;
  }

  if (!activeSymptom) {
    showToastLocal("Select a symptom first");
    return;
  }

  isStreaming = true;
  el.askClaudeBtn().disabled = true;
  el.claudeBtnText().textContent = "Asking…";
  el.claudeSpinner().classList.remove("hidden");

  const responseEl = el.claudeResponse();
  responseEl.textContent = "";
  responseEl.classList.remove("hidden");

  const symptomLabel = SYMPTOM_LABELS[activeSymptom] || activeSymptom;
  const detail = activeSymptom === SYMPTOM.FAULT_CODE ? activeFaultCode : "";
  const jobLabel = selectedJob
    ? `${symptomLabel} — ${selectedJob.address}`
    : symptomLabel;

  const userMessage = buildUserMessage(jobLabel, detail, currentContext, currentL1Result);

  askAI({
    providerId: provider.id,
    userMessage,
    onChunk: (chunk) => {
      responseEl.textContent += chunk;
      responseEl.scrollTop = responseEl.scrollHeight;
    },
    onDone: () => {
      isStreaming = false;
      el.askClaudeBtn().disabled = false;
      el.claudeBtnText().textContent = `✨ Ask ${provider.label}`;
      el.claudeSpinner().classList.add("hidden");
    },
    onError: (err) => {
      isStreaming = false;
      el.askClaudeBtn().disabled = false;
      el.claudeBtnText().textContent = `✨ Ask ${provider.label}`;
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

  initAISettingsModal();
  renderProviderSelector();
  selectProvider(getActiveProvider().id); // init button label + note

  el.apiKeyToggle()?.addEventListener("click", toggleApiKeyPanel);
  el.saveKeyBtn()?.addEventListener("click", saveKey);
  el.clearKeyBtn()?.addEventListener("click", () => {
    const p = getActiveProvider();
    clearProviderKey(p.id);
    el.apiKeyInput().value = "";
    selectProvider(p.id);
    showToastLocal(`${p.label} key cleared`);
  });

  el.askClaudeBtn()?.addEventListener("click", handleAskClaude);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ─────────────────────────────────────────────
// AI SETTINGS MODAL (header button)
// ─────────────────────────────────────────────
function initAISettingsModal() {
  const modal    = document.getElementById("ai-settings-modal");
  const openBtn  = document.getElementById("btn-ai-settings");
  const closeBtn = document.getElementById("ai-settings-close");
  const mainRow  = document.getElementById("ai-settings-main-row");
  const extRow   = document.getElementById("ai-settings-ext-row");
  const moreBtn  = document.getElementById("ai-settings-more");
  const keyInput = document.getElementById("ai-settings-key-input");
  const saveBtn  = document.getElementById("ai-settings-save");
  const clearBtn = document.getElementById("ai-settings-clear");
  const status   = document.getElementById("ai-settings-status");

  if (!modal || !openBtn) return;

  // Build provider chips
  const makeChip = (p) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ts-provider-chip";
    chip.dataset.provider = p.id;
    chip.style.setProperty("--pc", p.color);
    chip.innerHTML = `<span class="ts-provider-icon">${p.icon}</span>${p.label}`;
    chip.addEventListener("click", () => refreshSettingsModal(p.id));
    return chip;
  };

  MAIN_PROVIDERS.forEach(p => mainRow?.appendChild(makeChip(p)));
  EXTENDED_PROVIDERS.forEach(p => extRow?.appendChild(makeChip(p)));

  moreBtn?.addEventListener("click", () => {
    const hidden = extRow.classList.toggle("hidden");
    moreBtn.textContent = hidden ? "More ▾" : "Less ▴";
  });

  function refreshSettingsModal(providerId) {
    setActiveProvider(providerId);
    // Sync chips in this modal
    modal.querySelectorAll(".ts-provider-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.provider === providerId);
    });
    // Sync chips in the drawer too
    document.querySelectorAll("#ts-provider-main .ts-provider-chip, #ts-provider-extended .ts-provider-chip")
      .forEach(c => c.classList.toggle("active", c.dataset.provider === providerId));

    const p   = MAIN_PROVIDERS.concat(EXTENDED_PROVIDERS).find(x => x.id === providerId);
    const key = getProviderKey(providerId);
    keyInput.value = key ? "••••••••••••••••" : "";
    keyInput.placeholder = p?.keyPlaceholder || "API Key...";

    const hasKey = hasProviderKey(providerId);
    status.innerHTML = hasKey
      ? `✓ Key saved for <strong>${p?.label}</strong> &nbsp;·&nbsp; <a href="${p?.keyHintUrl}" target="_blank" style="color:inherit;opacity:0.7">${p?.keyHint}</a>`
      : `No key saved &nbsp;·&nbsp; <a href="${p?.keyHintUrl}" target="_blank" style="color:inherit;opacity:0.7">${p?.keyHint}</a>`;

    // Update drawer button label
    selectProvider(providerId);
  }

  saveBtn?.addEventListener("click", () => {
    const val = keyInput.value.trim();
    if (!val || val.startsWith("•")) return;
    const p = getActiveProvider();
    saveProviderKey(p.id, val);
    refreshSettingsModal(p.id);
    showToastLocal(`${p.label} key saved ✓`);
  });

  clearBtn?.addEventListener("click", () => {
    const p = getActiveProvider();
    clearProviderKey(p.id);
    keyInput.value = "";
    refreshSettingsModal(p.id);
    showToastLocal(`${p.label} key cleared`);
  });

  keyInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveBtn.click();
  });

  openBtn.addEventListener("click", () => {
    refreshSettingsModal(getActiveProvider().id);
    modal.style.display = "flex";
    setTimeout(() => keyInput?.focus(), 100);
  });

  closeBtn?.addEventListener("click", () => modal.style.display = "none");
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.style.display === "flex") modal.style.display = "none";
  });
}

// ─────────────────────────────────────────────
// TSTAT SUBMENU
// ─────────────────────────────────────────────

function openTstatMenu(e, tstatKey, builder) {
  closeTstatMenu();
  const data = TSTAT_DATA[tstatKey];
  if (!data) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.id = "_tstat-menu";
  menu.style.cssText = `
    position:fixed;
    top:${rect.bottom + 6}px;
    left:${rect.left}px;
    z-index:10000;
    background:var(--container-bg,#1a1a2e);
    border:1px solid rgba(56,190,255,0.25);
    border-radius:10px;
    box-shadow:0 12px 40px rgba(0,0,0,0.55);
    overflow:hidden;
    min-width:220px;
    animation:fadeIn 0.12s ease;
  `;

  const items = [
    { icon: "🔌", label: "How to Wire",           action: () => openTstatWiring(tstatKey) },
    { icon: "⚙️",  label: "How to Program",        action: () => openTstatProgramming(tstatKey, builder) },
    { icon: "📄", label: "Installation Manual",    action: () => window.open(data.manualUrl, "_blank") },
  ];

  items.forEach(({ icon, label, action }) => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      display:flex;align-items:center;gap:10px;
      width:100%;padding:11px 16px;border:none;cursor:pointer;
      background:transparent;color:var(--text-color,#eee);
      font-size:13px;font-weight:500;text-align:left;
      transition:background 0.12s;
    `;
    btn.innerHTML = `<span style="font-size:16px">${icon}</span><span>${label}</span>`;
    btn.onmouseenter = () => btn.style.background = "rgba(56,190,255,0.1)";
    btn.onmouseleave = () => btn.style.background = "transparent";
    btn.onclick = () => closeTstatMenuThen(action);
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  // Adjust if overflows right edge
  const mr = menu.getBoundingClientRect();
  if (mr.right > window.innerWidth - 8) {
    menu.style.left = `${window.innerWidth - mr.width - 8}px`;
  }

  setTimeout(() => document.addEventListener("click", closeTstatMenu, { once: true }), 0);
}

function closeTstatMenuThen(callback) {
  const menu = document.getElementById("_tstat-menu");
  if (!menu) { callback(); return; }
  menu.style.transition = "opacity 0.1s ease, transform 0.1s ease";
  menu.style.opacity = "0";
  menu.style.transform = "scale(0.95)";
  setTimeout(() => { menu.remove(); callback(); }, 110);
}

function closeTstatMenu() {
  const menu = document.getElementById("_tstat-menu");
  if (!menu) return;
  menu.style.transition = "opacity 0.1s ease";
  menu.style.opacity = "0";
  setTimeout(() => menu.remove(), 110);
}

// ─── Wiring modal ───────────────────────────

function openTstatWiring(tstatKey) {
  const data = TSTAT_DATA[tstatKey];
  if (!data) return;

  const stagesHtml = Object.entries(data.wiring.stages).map(([stageName, wires]) => `
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
                  color:rgba(56,190,255,0.8);margin-bottom:12px">${stageName}</div>
      ${buildWiringSVG(wires)}
    </div>
  `).join("");

  openTstatModal(`🔌 ${data.label} — Wiring`, `
    ${stagesHtml}
    <div style="font-size:11px;color:var(--text-muted,#888);
                background:rgba(255,214,10,0.07);border:1px solid rgba(255,214,10,0.2);
                border-radius:6px;padding:8px 12px;margin-top:4px">
      ⚠️ ${data.wiring.notes}
    </div>
  `);
}

function buildWiringSVG(wires) {
  // Terminal block on left, tstat board on right
  // Colors per HVAC convention
  const wireColor = { Y: "#FFD600", R: "#E53935", C: "#1E88E5", G: "#43A047", W: "#FFFFFF" };
  const wireLabel = { Y: "Cooling", R: "Power 24V", C: "Common", G: "Fan", W: "Heat/Stage 1" };

  const rowH = 44;
  const svgH = wires.length * rowH + 20;
  const W = 320;

  const rows = wires.map((wire, i) => {
    const y = 20 + i * rowH;
    const color = wireColor[wire] || "#aaa";
    const desc = wireLabel[wire] || "";
    return `
      <!-- Equipment terminal -->
      <rect x="12" y="${y - 10}" width="36" height="22" rx="4"
            fill="#1a2438" stroke="${color}" stroke-width="1.5"/>
      <text x="30" y="${y + 5}" text-anchor="middle"
            font-family="monospace" font-size="12" font-weight="700" fill="${color}">${wire}</text>

      <!-- Wire line -->
      <line x1="48" y1="${y + 1}" x2="${W - 48}" y2="${y + 1}"
            stroke="${color}" stroke-width="2.5" stroke-dasharray="${wire === "C" ? "6,3" : "none"}"/>

      <!-- Tstat terminal -->
      <rect x="${W - 48}" y="${y - 10}" width="36" height="22" rx="4"
            fill="#1a2438" stroke="${color}" stroke-width="1.5"/>
      <text x="${W - 30}" y="${y + 5}" text-anchor="middle"
            font-family="monospace" font-size="12" font-weight="700" fill="${color}">${wire}</text>

      <!-- Label -->
      <text x="${W / 2}" y="${y - 14}" text-anchor="middle"
            font-family="sans-serif" font-size="9" fill="rgba(255,255,255,0.4)">${desc}</text>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${svgH}" width="100%" style="max-width:320px;display:block;margin:0 auto"
         xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${W}" height="${svgH}" rx="8" fill="#0d1420"/>

      <!-- Headers -->
      <text x="30" y="12" text-anchor="middle" font-family="sans-serif" font-size="9"
            font-weight="700" fill="rgba(255,255,255,0.35)" letter-spacing="1">UNIT</text>
      <text x="${W - 30}" y="12" text-anchor="middle" font-family="sans-serif" font-size="9"
            font-weight="700" fill="rgba(255,255,255,0.35)" letter-spacing="1">TSTAT</text>

      ${rows}
    </svg>
  `;
}

// ─── Programming modal ──────────────────────

function openTstatProgramming(tstatKey, builder) {
  const data = TSTAT_DATA[tstatKey];
  if (!data) return;

  const prog = data.programming;

  // Find matching builder rule (case-insensitive partial match)
  const matchedBuilder = Object.keys(prog.builders).find(
    b => builder.toLowerCase().includes(b.toLowerCase()) ||
         b.toLowerCase().includes(builder.toLowerCase())
  );
  const rule = matchedBuilder ? prog.builders[matchedBuilder] : null;

  const builderBadge = rule
    ? `<div style="display:inline-flex;align-items:center;gap:8px;
                   background:rgba(48,209,88,0.1);border:1px solid rgba(48,209,88,0.3);
                   border-radius:6px;padding:8px 14px;margin-bottom:16px">
        <span style="font-size:18px">🏗️</span>
        <div>
          <div style="font-size:10px;color:rgba(48,209,88,0.8);font-weight:700;letter-spacing:1px">BUILDER RULE — ${matchedBuilder.toUpperCase()}</div>
          <div style="font-size:13px;color:#fff;font-weight:600;margin-top:2px">
            ❄️ Cool: <strong>${rule.cool}°F</strong> &nbsp;·&nbsp; 🔥 Heat: <strong>${rule.heat}°F</strong>
            ${rule.notes ? `<span style="color:rgba(255,255,255,0.5);font-size:11px"> — ${rule.notes}</span>` : ""}
          </div>
        </div>
       </div>`
    : builder
      ? `<div style="background:rgba(255,159,10,0.1);border:1px solid rgba(255,159,10,0.3);
                     border-radius:6px;padding:8px 14px;margin-bottom:16px;font-size:12px;color:#ff9f0a">
          ⚠️ No specific rule found for builder "<strong>${builder}</strong>" — use default settings.
         </div>`
      : `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                     border-radius:6px;padding:8px 14px;margin-bottom:16px;font-size:12px;color:#888">
          No builder assigned to this job.
         </div>`;

  const allRulesHtml = `
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07)">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,0.3);
                  text-transform:uppercase;margin-bottom:8px">All Builder Rules</div>
      ${Object.entries(prog.builders).map(([b, r]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:6px 10px;border-radius:5px;margin-bottom:4px;
                    background:${matchedBuilder === b ? "rgba(56,190,255,0.08)" : "rgba(255,255,255,0.03)"};
                    border:1px solid ${matchedBuilder === b ? "rgba(56,190,255,0.2)" : "transparent"}">
          <span style="font-size:12px;color:${matchedBuilder === b ? "var(--neon-primary,#38beff)" : "#aaa"};font-weight:${matchedBuilder === b ? "700" : "400"}">${b}</span>
          <span style="font-size:12px;color:#ddd">❄️ ${r.cool}° &nbsp; 🔥 ${r.heat}°</span>
        </div>`).join("")}
    </div>
  `;

  const stepsHtml = `
    <div style="margin-top:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,0.3);
                  text-transform:uppercase;margin-bottom:8px">Programming Steps</div>
      <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
        ${prog.steps.map(s => `<li style="font-size:13px;color:#ccc;line-height:1.4">${s}</li>`).join("")}
      </ol>
    </div>
  `;

  openTstatModal(`⚙️ ${data.label} — Programming`, builderBadge + stepsHtml + allRulesHtml);
}

// ─── Generic modal shell ────────────────────

function openTstatModal(title, bodyHtml) {
  document.getElementById("_tstat-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "_tstat-modal";
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9998;
    background:rgba(0,0,0,0.65);
    display:flex;align-items:center;justify-content:center;
    padding:16px;
    -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
    animation:fadeIn 0.15s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background:var(--container-bg,#0f1520);
      border:1px solid rgba(56,190,255,0.2);
      border-radius:14px;
      width:100%;max-width:380px;
      max-height:85dvh;
      display:flex;flex-direction:column;
      box-shadow:0 24px 64px rgba(0,0,0,0.6);
      overflow:hidden;
    ">
      <!-- Header -->
      <div style="
        padding:14px 18px;
        border-bottom:1px solid rgba(56,190,255,0.12);
        display:flex;justify-content:space-between;align-items:center;
        background:rgba(56,190,255,0.05);flex-shrink:0;
      ">
        <div style="font-size:14px;font-weight:700;color:var(--text-color,#eee)">${title}</div>
        <button id="_tstat-modal-close" style="
          background:none;border:none;color:rgba(255,255,255,0.45);
          cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px;
        ">✕</button>
      </div>
      <!-- Body -->
      <div style="padding:18px;overflow-y:auto;flex:1;color:var(--text-color,#eee)">
        ${bodyHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector("#_tstat-modal-close").onclick = () => overlay.remove();
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}
