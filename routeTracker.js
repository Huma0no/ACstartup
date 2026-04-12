// Route Time Tracker — ES module
// Tracks travel time (trayecto) and call time (llamada) throughout the workday.
// State persists in localStorage so a page refresh doesn't lose the current segment.

import { STORAGE_KEYS } from "./constants.js";

const LS_KEY = STORAGE_KEYS.ROUTE_TRACKER;

let trackerState = {
  mode: null,         // null | 'trayecto' | 'llamada'
  segStart: null,     // Date.now() when current segment started
  totalTrayecto: 0,   // ms accumulated (closed segments)
  totalLlamadas: 0,   // ms accumulated (closed segments)
};

// ── Persistence ────────────────────────────────────────────────────────────────

function _save() {
  localStorage.setItem(LS_KEY, JSON.stringify(trackerState));
}

function _load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      trackerState = { ...trackerState, ...parsed };
    }
  } catch (_) {
    // corrupted state — start fresh
    localStorage.removeItem(LS_KEY);
  }
}

// ── Segment helpers ─────────────────────────────────────────────────────────────

/** Close the current open segment, adding elapsed ms to the right accumulator. */
function _closeSegment() {
  if (trackerState.segStart === null) return;
  const elapsed = Date.now() - trackerState.segStart;
  if (trackerState.mode === "trayecto") {
    trackerState.totalTrayecto += elapsed;
  } else if (trackerState.mode === "llamada") {
    trackerState.totalLlamadas += elapsed;
  }
  trackerState.segStart = null;
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Call once on app load — restores state and triggers UI update. */
export function initTracker() {
  _load();
  _updateUI();
}

/** Maps button was tapped — start (or resume) travel segment. */
export function startTrayecto() {
  _closeSegment();
  trackerState.mode = "trayecto";
  trackerState.segStart = Date.now();
  _save();
  _updateUI();
}

/** "Iniciar Llamada" was tapped — stop travel, start call segment. */
export function startLlamada() {
  _closeSegment();
  trackerState.mode = "llamada";
  trackerState.segStart = Date.now();
  _save();
  _updateUI();
}

/** Called automatically when technician generates a report. */
export function stopLlamada() {
  if (trackerState.mode !== "llamada") return;
  _closeSegment();
  trackerState.mode = null;
  _save();
  _updateUI();
}

/** Current mode string: null | 'trayecto' | 'llamada' */
export function getMode() {
  return trackerState.mode;
}

/** ms-level totals for JSON export. */
export function getExportData() {
  // Snapshot: include any currently-open segment in the totals
  let trayecto = trackerState.totalTrayecto;
  let llamadas = trackerState.totalLlamadas;
  if (trackerState.segStart !== null) {
    const elapsed = Date.now() - trackerState.segStart;
    if (trackerState.mode === "trayecto") trayecto += elapsed;
    else if (trackerState.mode === "llamada") llamadas += elapsed;
  }
  return { tiempoTrayecto: trayecto, tiempoLlamadas: llamadas };
}

/** Clear all state + localStorage after a successful export. */
export function resetTracker() {
  trackerState = { mode: null, segStart: null, totalTrayecto: 0, totalLlamadas: 0 };
  localStorage.removeItem(LS_KEY);
  _updateUI();
}

/**
 * Elapsed time of the current open segment as "mm:ss".
 * Returns "00:00" when no segment is active.
 */
export function getElapsedDisplay() {
  if (trackerState.segStart === null) return "00:00";
  const s = Math.floor((Date.now() - trackerState.segStart) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── UI helpers ──────────────────────────────────────────────────────────────────

function _updateUI() {
  const badge = document.getElementById("tracker-badge");
  if (!badge) return;

  const mode = trackerState.mode;
  if (mode === null && trackerState.totalTrayecto === 0 && trackerState.totalLlamadas === 0) {
    badge.style.display = "none";
    return;
  }

  badge.style.display = "inline-flex";
  // Icon reflects active segment
  const icon = mode === "trayecto" ? "🚗" : mode === "llamada" ? "📞" : "⏱";
  badge.textContent = `${icon} ${getElapsedDisplay()}`;
  badge.dataset.mode = mode || "idle";
}

// Update the badge every second when the app is visible
setInterval(() => {
  if (trackerState.mode !== null) _updateUI();
}, 1000);
