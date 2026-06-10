// src/importer.js — Import jobs from external sources (Dispatch).
// No UI rendering. No direct localStorage access.

import { getJobById, updateJob } from "./jobs.js";

// Required fields per architecture.md §9
const REQUIRED_JOB_FIELDS = ["id", "date", "address", "subdivision", "builder", "system1"];

function normalizeLegacyJob(raw) {
  if (raw.system1) return raw;
  const today = new Date().toISOString().split("T")[0];
  return {
    id:             raw.id || crypto.randomUUID(),
    date:           raw.savedState?.date || today,
    address:        raw.address       || "",
    subdivision:    raw.subdivision   || "",
    builder:        raw.builder       || "",
    techName:       raw.techName      || "",
    notes:          raw.savedState?.notes || raw.details || "",
    system1: {
      indoor:  raw.heaterModel  || "",
      outdoor: raw.outdoorModel || "",
    },
    system2: (raw.heaterModel2 || raw.outdoorModel2)
      ? { indoor: raw.heaterModel2 || "", outdoor: raw.outdoorModel2 || "" }
      : null,
    isTwoSystems:   !!(raw.isTwoSystems || raw.heaterModel2 || raw.outdoorModel2),
    jobThermostat:  raw.savedState?.selectedThermostat || null,
    jobAccessories: raw.savedState?.selectedAccessories?.map((a) => a.name) || [],
    addressHistory: raw.addressHistory || [],
    contactName:    raw.contactName   || "",
    contactPhone:   raw.contactPhone  || "",
    orderNumber:    raw.orderNumber   || "",
    scheduledTime:  raw.scheduledTime || "",
    cityState:      raw.cityState     || "",
  };
}

function validateJob(job) {
  for (const field of REQUIRED_JOB_FIELDS) {
    if (job[field] == null || job[field] === "") {
      return `missing required field: ${field}`;
    }
  }
  if (typeof job.system1 !== "object" || Array.isArray(job.system1)) {
    return "system1 must be an object";
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
