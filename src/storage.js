// src/storage.js — Single access layer for localStorage.
// All reads and writes go through here. No other module touches localStorage directly.

import { STORAGE_KEYS } from "./data.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export function getJobs() {
  return read(STORAGE_KEYS.JOBS, []);
}

export function saveJob(job) {
  const jobs = getJobs();
  const i = jobs.findIndex((j) => j.id === job.id);
  if (i >= 0) jobs[i] = job;
  else jobs.push(job);
  write(STORAGE_KEYS.JOBS, jobs);
}

export function deleteJob(id) {
  write(STORAGE_KEYS.JOBS, getJobs().filter((j) => j.id !== id));
}

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

export function getCompletions() {
  return read(STORAGE_KEYS.REPORTS, []);
}

export function saveCompletion(completion) {
  const list = getCompletions();
  const i = list.findIndex((c) => c.jobId === completion.jobId);
  if (i >= 0) list[i] = completion;
  else list.push(completion);
  write(STORAGE_KEYS.REPORTS, list);
}

export function deleteCompletion(jobId) {
  write(STORAGE_KEYS.REPORTS, getCompletions().filter((c) => c.jobId !== jobId));
}

// ---------------------------------------------------------------------------
// Workspace state
// ---------------------------------------------------------------------------

export function getWorkspaceState() {
  return read(STORAGE_KEYS.STATE, null);
}

export function saveWorkspaceState(state) {
  write(STORAGE_KEYS.STATE, state);
}

export function clearWorkspaceState() {
  localStorage.removeItem(STORAGE_KEYS.STATE);
}

// ---------------------------------------------------------------------------
// Active job
// Assumption: tracked by job.id (uuid). Key name "lastActiveJobAddress" is legacy.
// ---------------------------------------------------------------------------

export function getActiveJobId() {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_JOB) || null;
}

export function setActiveJobId(id) {
  if (id) localStorage.setItem(STORAGE_KEYS.ACTIVE_JOB, id);
  else localStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function getSettings() {
  return read(STORAGE_KEYS.SETTINGS, null);
}

export function saveSettings(settings) {
  write(STORAGE_KEYS.SETTINGS, settings);
}

// ---------------------------------------------------------------------------
// Backup — full export / import
// ---------------------------------------------------------------------------

export function exportBackup() {
  return JSON.stringify({
    jobs:        getJobs(),
    completions: getCompletions(),
    settings:    getSettings(),
  }, null, 2);
}

export function importBackup(json) {
  const data = JSON.parse(json);
  if (Array.isArray(data.jobs))        write(STORAGE_KEYS.JOBS, data.jobs);
  if (Array.isArray(data.completions)) write(STORAGE_KEYS.REPORTS, data.completions);
  if (data.settings)                   write(STORAGE_KEYS.SETTINGS, data.settings);
}
