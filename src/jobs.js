// src/jobs.js — Job CRUD, subdivision grouping, time-sensitive detection, sorting.

import { getJobs, saveJob, deleteJob } from "./storage.js";

// Keywords from dispatch PDFs that mark a job as time-sensitive
const TIME_SENSITIVE_KEYWORDS = ["URGENT", "MUST", "VISIT AM", "VISIT PM"];

// CSS exposes --subdivision-1 through --subdivision-8
const MAX_SUBDIVISION_COLORS = 8;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createJob(data) {
  const notes = (data.notes ?? data.importantNotes ?? "").toString().trim();
  const dispatchNote = (data.dispatchNote ?? data.dispatchNotes ?? "").toString().trim();
  const combinedText = `${notes} ${dispatchNote}`;

  // Normalize dynamic systems array
  let systems = [];
  if (Array.isArray(data.systems) && data.systems.length > 0) {
    systems = data.systems.map((s, idx) => ({
      id: s.id || `sys_${idx + 1}`,
      indoor: (s.indoor || s.heaterModel || "").trim(),
      outdoor: (s.outdoor || s.outdoorModel || "").trim(),
      links: s.links || {},
      serviceType: s.serviceType || null,
      weightInData: s.weightInData || null,
      accessories: s.accessories || [],
    }));
  } else if (data.system1) {
    systems.push({
      id: "sys_1",
      indoor: (data.system1.indoor || "").trim(),
      outdoor: (data.system1.outdoor || "").trim(),
      links: data.system1.links || {},
      serviceType: data.system1.serviceType || data.serviceType || null,
      weightInData: data.weightInData || null,
      accessories: [],
    });
    if (data.system2 || data.isTwoSystems) {
      systems.push({
        id: "sys_2",
        indoor: (data.system2?.indoor || "").trim(),
        outdoor: (data.system2?.outdoor || "").trim(),
        links: data.system2?.links || {},
        serviceType: data.system2?.serviceType || null,
        weightInData: data.weightInData2 || null,
        accessories: [],
      });
    }
  } else {
    systems.push({
      id: "sys_1",
      indoor: "",
      outdoor: "",
      links: {},
      serviceType: data.serviceType || null,
      weightInData: null,
      accessories: [],
    });
  }

  const job = {
    id:             data.id             || crypto.randomUUID(),
    date:           data.date           || new Date().toISOString().split("T")[0],
    address:        (data.address       || "").toUpperCase().trim(),
    subdivision:    (data.subdivision   || "").toUpperCase().trim(),
    builder:        (data.builder       || "").trim(),
    contact:        data.contact        || "",
    serviceTime:    data.serviceTime    || data.scheduledTime || "",
    timeSensitive:
      data.timeSensitive != null
        ? !!data.timeSensitive
        : isTimeSensitive(combinedText),
    systems,
    isTwoSystems:   data.isTwoSystems != null ? !!data.isTwoSystems : (systems.length === 2),
    notes,
    jobAccessories: data.jobAccessories || [],
    jobThermostat:  data.jobThermostat  || null,
    system1:        systems[0] || { indoor: "", outdoor: "", links: {} },
    system2:        systems[1] || null,
    savedState:     data.savedState     || null,
    addressHistory: data.addressHistory || [],
    dispatchNote,
  };
  saveJob(job);
  return job;
}

export function updateJob(job) {
  saveJob(job);
}

export function removeJob(id) {
  deleteJob(id);
}

export function getJobById(id) {
  return getJobs().find((j) => j.id === id) || null;
}

export function getAllJobs() {
  return getJobs();
}

// ---------------------------------------------------------------------------
// Sorting
// In-progress jobs (savedState != null) float to the top. No secondary order.
// ---------------------------------------------------------------------------

export function sortJobs(jobs) {
  return [...jobs].sort((a, b) => {
    const aActive = !!a.savedState;
    const bActive = !!b.savedState;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Subdivision grouping with auto-assigned color index (1–8)
// Color index is assigned by order of first appearance in the jobs array.
// Pass jobs pre-sorted if the order of color assignment matters.
// ---------------------------------------------------------------------------

export function groupBySubdivision(jobs) {
  const colorMap = new Map(); // subdivision → colorIndex
  let nextColor = 1;

  for (const job of jobs) {
    const sub = job.subdivision || "";
    if (!colorMap.has(sub) && nextColor <= MAX_SUBDIVISION_COLORS) {
      colorMap.set(sub, nextColor++);
    }
  }

  const groupMap = new Map(); // subdivision → { subdivision, colorIndex, jobs[] }

  for (const job of jobs) {
    const sub = job.subdivision || "";
    if (!groupMap.has(sub)) {
      groupMap.set(sub, {
        subdivision: sub,
        colorIndex:  colorMap.get(sub) || 1,
        jobs:        [],
      });
    }
    groupMap.get(sub).jobs.push(job);
  }

  return Array.from(groupMap.values());
}

// ---------------------------------------------------------------------------
// Time-sensitive detection
// Checks raw text (PDF extract or job.notes) for dispatch urgency keywords.
// ---------------------------------------------------------------------------

export function isTimeSensitive(text) {
  if (!text) return false;
  const upper = text.toUpperCase();
  return TIME_SENSITIVE_KEYWORDS.some((kw) => upper.includes(kw));
}
