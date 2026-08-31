// src/importer.js — Import jobs from external sources (Dispatch).
// No UI rendering. No direct localStorage access.

import { getJobById, updateJob, isTimeSensitive } from "./jobs.js";

// Required fields per architecture.md §9
const REQUIRED_JOB_FIELDS = ["id", "date", "address", "subdivision", "builder"];

export function normalizeLegacyJob(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const today = new Date().toISOString().split("T")[0];

  const notes = (raw.notes ?? raw.importantNotes ?? "").toString().trim();
  const dispatchNote = (raw.dispatchNote ?? raw.dispatchNotes ?? "").toString().trim();

  // Dynamic systems normalization
  let systems = [];
  if (Array.isArray(raw.systems) && raw.systems.length > 0) {
    systems = raw.systems.map((s, idx) => ({
      id: s.id || `sys_${idx + 1}`,
      indoor: (s.indoor || s.heaterModel || s.furnaceModel || "").trim(),
      outdoor: (s.outdoor || s.outdoorModel || "").trim(),
      links: s.links || {},
      serviceType: s.serviceType || null,
      weightInData: s.weightInData || null,
      accessories: s.accessories || [],
    }));
  } else {
    const s1Indoor = (raw.system1?.indoor || raw.heaterModel || raw.furnaceModel || raw.indoor || "").trim();
    const s1Outdoor = (raw.system1?.outdoor || raw.outdoorModel || raw.outdoor || "").trim();
    const s1Links = raw.system1?.links || {};
    const s1WeightIn = raw.weightInData || raw.savedState?.weightInData || null;

    systems.push({
      id: "sys_1",
      indoor: s1Indoor,
      outdoor: s1Outdoor,
      links: s1Links,
      serviceType: raw.system1?.serviceType || raw.serviceType || null,
      weightInData: s1WeightIn,
      accessories: [],
    });

    const sys2Raw =
      raw.system2 && typeof raw.system2 === "object" && !Array.isArray(raw.system2)
        ? raw.system2
        : null;

    const hasSys2 = !!(
      raw.isTwoSystems ||
      raw.twoSystems ||
      raw.heaterModel2 ||
      raw.furnaceModel2 ||
      raw.outdoorModel2 ||
      sys2Raw?.indoor ||
      sys2Raw?.outdoor
    );

    if (hasSys2) {
      systems.push({
        id: "sys_2",
        indoor: (sys2Raw?.indoor || raw.heaterModel2 || raw.furnaceModel2 || raw.indoor2 || "").trim(),
        outdoor: (sys2Raw?.outdoor || raw.outdoorModel2 || raw.outdoor2 || "").trim(),
        links: sys2Raw?.links || {},
        serviceType: sys2Raw?.serviceType || null,
        weightInData: raw.weightInData2 || raw.savedState?.weightInData2 || null,
        accessories: [],
      });
    }
  }

  const jobThermostat =
    raw.jobThermostat ||
    raw.savedState?.selectedThermostat ||
    (raw.thermostat
      ? {
          model: raw.thermostat.type || raw.thermostat.model || "",
          qty: parseInt(raw.thermostat.qty, 10) || 1,
        }
      : null);

  const jobAccessories =
    raw.jobAccessories ||
    raw.savedState?.selectedAccessories?.map((a) =>
      typeof a === "string" ? a : a.name
    ) ||
    [];

  const combinedText = `${notes} ${dispatchNote}`;

  return {
    ...raw,
    id:             raw.id || crypto.randomUUID(),
    date:           raw.date || raw.routeDate || today,
    address:        String(raw.address || "").toUpperCase().trim(),
    subdivision:    String(raw.subdivision || "").toUpperCase().trim(),
    builder:        String(raw.builder || "").trim(),
    techName:       raw.techName || "",
    notes,
    dispatchNote,
    serviceTime:    raw.serviceTime || raw.scheduledTime || "",
    timeSensitive:
      raw.timeSensitive != null
        ? !!raw.timeSensitive
        : isTimeSensitive(combinedText),
    systems,
    isTwoSystems:   raw.isTwoSystems != null ? !!raw.isTwoSystems : (systems.length === 2),
    jobAccessories,
    jobThermostat,
    system1:        systems[0] || { indoor: "", outdoor: "", links: {} },
    system2:        systems[1] || null,
    savedState:     raw.savedState || null,
    addressHistory: raw.addressHistory || [],
    contactName:    raw.contactName || "",
    contactPhone:   raw.contactPhone || "",
    orderNumber:    raw.orderNumber || "",
    cityState:      raw.cityState || "",
  };
}

export function validateJob(job) {
  for (const field of REQUIRED_JOB_FIELDS) {
    if (job[field] == null || job[field] === "") {
      return `missing required field: ${field}`;
    }
  }
  if (!Array.isArray(job.systems) || job.systems.length === 0) {
    return "systems must be a non-empty array";
  }
  return null;
}

// ---------------------------------------------------------------------------
// importFromJSON
// Parses a JSON string from Dispatch — accepts an array of jobs or a single
// job object. Validates required fields per data_dictionary.md §2.
// Jobs whose id already exists in storage are skipped (no overwrite).
// Returns { imported, skipped, errors: [{ index, id, reason }] }
// ---------------------------------------------------------------------------

export function importFromJSON(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { imported: 0, skipped: 0, errors: [{ index: -1, id: null, reason: "invalid JSON: " + e.message }] };
  }

  const jobs = Array.isArray(parsed) ? parsed : [parsed];
  const result = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < jobs.length; i++) {
    const job = normalizeLegacyJob(jobs[i]);

    const validationError = validateJob(job);
    if (validationError) {
      result.errors.push({ index: i, id: job?.id ?? null, reason: validationError });
      continue;
    }

    if (getJobById(job.id)) {
      result.skipped++;
      continue;
    }

    updateJob(job);
    result.imported++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// importFromPDF
// PDF import is not yet implemented — scheduled for Phase 3.
// When implemented, will parse dispatch PDF files into Job objects and import
// them via importFromJSON.
// ---------------------------------------------------------------------------

export function importFromPDF(_file) {
  return { error: "PDF import is not yet implemented. Scheduled for Phase 3." };
}
