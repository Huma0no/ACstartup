// src/storage.js — single localStorage access layer
// All persistent reads/writes go through here. No other module accesses localStorage directly.

import { STORAGE_KEYS } from "./data.js";

// --- State / workspace ---
export const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.STATE);
  return raw ? JSON.parse(raw) : null;
};
export const saveState = (state) =>
  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
export const clearState = () => localStorage.removeItem(STORAGE_KEYS.STATE);

// --- Active job ---
export const loadActiveJob = () =>
  localStorage.getItem(STORAGE_KEYS.ACTIVE_JOB) || null;
export const saveActiveJob = (address) =>
  localStorage.setItem(STORAGE_KEYS.ACTIVE_JOB, address || "");
export const clearActiveJob = () =>
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);

// --- Jobs list ---
export const loadJobs = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
  return raw ? JSON.parse(raw) : [];
};
export const saveJobs = (jobs) =>
  localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
export const clearJobs = () => localStorage.removeItem(STORAGE_KEYS.JOBS);

// --- Reports / completions ---
export const loadReports = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
  return raw ? JSON.parse(raw) : [];
};
export const saveReports = (reports) =>
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
export const clearReports = () => localStorage.removeItem(STORAGE_KEYS.REPORTS);

// --- Tech name ---
export const loadTechName = () =>
  localStorage.getItem(STORAGE_KEYS.TECH_NAME) || "";
export const saveTechName = (name) =>
  localStorage.setItem(STORAGE_KEYS.TECH_NAME, name);

// --- Theme ---
export const loadTheme = () =>
  localStorage.getItem(STORAGE_KEYS.APP_THEME) || "light";
export const saveTheme = (theme) =>
  localStorage.setItem(STORAGE_KEYS.APP_THEME, theme);

// --- Clear all app data ---
export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.STATE);
  localStorage.removeItem(STORAGE_KEYS.REPORTS);
  localStorage.removeItem(STORAGE_KEYS.JOBS);
};

// --- Full backup export/import ---
export const exportBackup = () => {
  const backup = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) backup[key] = val;
  });
  return backup;
};

export const importBackup = (backup) => {
  if (!backup || typeof backup !== "object") return;
  Object.entries(backup).forEach(([key, val]) => {
    localStorage.setItem(key, val);
  });
};
