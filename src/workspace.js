// src/workspace.js — Workspace state: load job, register selections, calculate totals, build Completion.
// No UI rendering. All localStorage access via storage.js.

import {
  SERVICES, ACCESSORIES, FIXES,
  STANDALONE_SERVICES, TWO_SYSTEMS_ACCESSORIES, ACCESSORY_COMPANIONS, ZONE_BOARDS,
  CUSTOM_PRICE_ACCESSORIES, CUSTOM_PRICE_FIXES,
  DEFAULT_PRICES, ACCESSORY_DISPLAY, FIX_DISPLAY,
} from "./data.js";
import {
  saveWorkspaceState, getWorkspaceState, clearWorkspaceState,
  saveImageToDB, getImageFromDB, deleteImageFromDB, clearImagesFromDB,
} from "./storage.js";
import { compressImage, getGpsFromImage } from "./utils.js";
import { updateJob } from "./jobs.js";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _state = null;

let _photos = { weight: null, fan: null, weight2: null, fan2: null };
let _sitePhotos = {};
let _dbPrefix = "default";
let _photoRowsInitialized = false;
let _onWeighInPhotoChange = null;

// ---------------------------------------------------------------------------
// Init / teardown
// ---------------------------------------------------------------------------

export function initWorkspace(job) {
  const saved = getWorkspaceState();
  if (saved && saved.jobId === job.id) {
    _state = saved;
    return;
  }
  _state = {
    jobId:               job.id,
    isTwoSystems:        job.isTwoSystems || false,
    isTemporary:         false,
    selectedServices:    [],
    selectedThermostat:  null,
    thermostatQuantity:  1,
    selectedAccessories: [],
    customAccessories:   [], // [{ name, price }] for OTRO / OUT_OF_TOWN
    selectedFixes:       [],
    customFixes:         [], // [{ name, price }] for OTRO
    system2:             null,
    weightInData:        null,
    weightInData2:       null,
    notes:               "",
    sitePhotoMeta:       [],
  };
  for (const name of (job.jobAccessories || []))
    _state.selectedAccessories.push(name);
  if (job.jobThermostat?.model) {
    _state.selectedThermostat = job.jobThermostat.model;
    _state.thermostatQuantity = job.jobThermostat.qty || 1;
  }
}

export function getState() {
  return _state;
}

export function clearWorkspace() {
  _photos = { weight: null, fan: null, weight2: null, fan2: null };
  _sitePhotos = {};
  _dbPrefix = "default";
  _photoRowsInitialized = false;
  clearImagesFromDB();
  _state = null;
  clearWorkspaceState();
}

// ---------------------------------------------------------------------------
// Services
// Business rules §7.3: Prestart is mutually exclusive with AC/Heat/Finish
// Business rules §7.6: Cancel clears everything
// ---------------------------------------------------------------------------

export function toggleService(name) {
  const s = _state;
  const already = s.selectedServices.includes(name);

  if (name === SERVICES.CANCEL) {
    s.selectedServices = already ? [] : [SERVICES.CANCEL];
    return;
  }

  if (STANDALONE_SERVICES.includes(name)) {
    // Prestart / Drive Run replace all other services
    s.selectedServices = already ? [] : [name];
    return;
  }

  // AC, Heat, Finish — remove any standalone services that were set
  s.selectedServices = s.selectedServices.filter(
    (n) => !STANDALONE_SERVICES.includes(n)
  );

  if (already) {
    s.selectedServices = s.selectedServices.filter((n) => n !== name);
  } else {
    s.selectedServices.push(name);
  }
}

// ---------------------------------------------------------------------------
// Thermostat
// ---------------------------------------------------------------------------

export function setThermostat(name, qty = 1) {
  _state.selectedThermostat = name || null;
  _state.thermostatQuantity = qty;
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------

export function toggleAccessory(name, customPrice = null) {
  const s = _state;

  if (CUSTOM_PRICE_ACCESSORIES.includes(name)) {
    const exists = s.customAccessories.some((a) => a.name === name);
    if (exists) {
      s.customAccessories = s.customAccessories.filter((a) => a.name !== name);
    } else {
      s.customAccessories.push({ name, price: customPrice ?? 0 });
    }
    return;
  }

  const companions = ACCESSORY_COMPANIONS[name];
  if (s.selectedAccessories.includes(name)) {
    s.selectedAccessories = s.selectedAccessories.filter((n) => n !== name);
    if (companions) {
      s.selectedAccessories = s.selectedAccessories.filter((n) => !companions.includes(n));
    }
  } else {
    if (ZONE_BOARDS.includes(name)) {
      ZONE_BOARDS.forEach((board) => {
        if (board === name) return;
        s.selectedAccessories = s.selectedAccessories.filter((n) => n !== board);
        const boardCompanions = ACCESSORY_COMPANIONS[board];
        if (boardCompanions) {
          s.selectedAccessories = s.selectedAccessories.filter((n) => !boardCompanions.includes(n));
        }
      });
    }
    s.selectedAccessories.push(name);
    if (companions) {
      companions.forEach((c) => {
        if (!s.selectedAccessories.includes(c)) s.selectedAccessories.push(c);
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Fixes
// ---------------------------------------------------------------------------

export function toggleFix(name, customPrice = null) {
  const s = _state;

  if (CUSTOM_PRICE_FIXES.includes(name)) {
    const exists = s.customFixes.some((f) => f.name === name);
    if (exists) {
      s.customFixes = s.customFixes.filter((f) => f.name !== name);
    } else {
      s.customFixes.push({ name, price: customPrice ?? 0 });
    }
    return;
  }

  if (s.selectedFixes.includes(name)) {
    s.selectedFixes = s.selectedFixes.filter((n) => n !== name);
  } else {
    s.selectedFixes.push(name);
  }
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export function setOption(name, value) {
  if (name === "isTwoSystems") _state.isTwoSystems = value;
  if (name === "isTemporary")  _state.isTemporary  = value;
}

// ---------------------------------------------------------------------------
// System 2 models — set in-field when job had no system2 defined
// ---------------------------------------------------------------------------

export function setSystem2Models(furnace = "", coil = "", outdoor = "") {
  _state.system2 = { furnace, coil, outdoor };
}

// ---------------------------------------------------------------------------
// Weight-In data
// ---------------------------------------------------------------------------

export function setWeightInData(data, system = 1) {
  if (system === 1) _state.weightInData  = data;
  else              _state.weightInData2 = data;
}

// ---------------------------------------------------------------------------
// Notes & Photos
// ---------------------------------------------------------------------------

export function setNotes(text) { _state.notes = text; }

export function addSitePhoto(slug, label, file) {
  _sitePhotos[slug] = { file, label };
  if (!_state.sitePhotoMeta.some((m) => m.slug === slug))
    _state.sitePhotoMeta.push({ slug, label });
  saveImageToDB(_dbKey("site_" + slug), file, null);
}

export function removeSitePhoto(slug) {
  delete _sitePhotos[slug];
  _state.sitePhotoMeta = _state.sitePhotoMeta.filter((m) => m.slug !== slug);
  deleteImageFromDB(_dbKey("site_" + slug));
}

export function getSitePhotos() { return _sitePhotos; }

export function getSitePhotoCount() { return Object.keys(_sitePhotos).length; }

export function getPhotoCount() {
  const wi = ["weight", "fan", "weight2", "fan2"].filter((k) => _photos[k] !== null).length;
  return wi + Object.keys(_sitePhotos).length;
}

export function getAllPhotos() {
  const result = [];
  const labels = { weight: "Scale Sys1", fan: "FanSpeed Sys1", weight2: "Scale Sys2", fan2: "FanSpeed Sys2" };
  for (const [key, label] of Object.entries(labels)) {
    if (_photos[key]) result.push({ file: _photos[key].file, label });
  }
  for (const { file, label } of Object.values(_sitePhotos)) {
    result.push({ file, label });
  }
  return result;
}

export async function initSitePhotos() {
  _sitePhotos = {};
  for (const { slug, label } of (_state?.sitePhotoMeta || [])) {
    const data = await getImageFromDB(_dbKey("site_" + slug));
    if (data?.file) _sitePhotos[slug] = { file: data.file, label };
  }
  return _sitePhotos;
}

// ---------------------------------------------------------------------------
// Calculate totals — pure function, apply all business rules (data_dictionary §7)
// prices: DEFAULT_PRICES structure, merged with user settings by caller
// ---------------------------------------------------------------------------

export function calculateTotals(state = _state, prices = DEFAULT_PRICES) {
  const { selectedServices, selectedAccessories, customAccessories,
          selectedFixes, customFixes, isTwoSystems, weightInData, weightInData2 } = state;

  // Rule 6: Cancel → everything is $0
  if (selectedServices.includes(SERVICES.CANCEL)) {
    return { service: 0, accessory: 0, fix: 0, total: 0 };
  }

  // --- Service ---
  const hasFinish   = selectedServices.includes(SERVICES.FINISH);
  const hasAC       = selectedServices.includes(SERVICES.AC);
  const hasHeat     = selectedServices.includes(SERVICES.HEAT);
  const hasPrestart = selectedServices.includes(SERVICES.PRESTART);
  const hasDriveRun = selectedServices.includes(SERVICES.DRIVE_RUN);

  let service = 0;
  if (hasFinish) {
    // Rule 4: Finish replaces AC/Heat price — base is always FINISH price ($20)
    service = prices.SERVICE[SERVICES.FINISH];
  } else if (hasAC && hasHeat) {
    // Rule 1: AC + Heat combined = $30, not $60
    service = prices.SERVICE[SERVICES.AC_HEAT];
  } else if (hasAC) {
    service = prices.SERVICE[SERVICES.AC];
  } else if (hasHeat) {
    service = prices.SERVICE[SERVICES.HEAT];
  } else if (hasPrestart) {
    service = prices.SERVICE[SERVICES.PRESTART];
  } else if (hasDriveRun) {
    service = prices.SERVICE[SERVICES.DRIVE_RUN];
  }
  // Rule 2: 2 Systems doubles service price
  if (isTwoSystems) service *= 2;

  // --- Accessories ---
  const hasWeightInData =
    (weightInData  && Object.values(weightInData).some(Boolean)) ||
    (isTwoSystems && weightInData2 && Object.values(weightInData2).some(Boolean));
  const weightManuallySelected = selectedAccessories.includes(ACCESSORIES.WEIGHT_IN_DATA);

  let accessory = 0;
  for (const name of selectedAccessories) {
    let price = prices.ACCESSORY[name] ?? 0;
    // Rule 5: Weight-In + Finish adds $10 addon
    if (name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish) {
      price += prices.WEIGHT_IN_FINISH_ADDON;
    }
    // Rule 2: selected accessories double with 2 Systems
    if (isTwoSystems && TWO_SYSTEMS_ACCESSORIES.includes(name)) price *= 2;
    accessory += price;
  }

  // Auto-charge Weight-In if data entered but not manually selected
  if (hasWeightInData && !weightManuallySelected) {
    let price = prices.ACCESSORY[ACCESSORIES.WEIGHT_IN_DATA];
    if (hasFinish) price += prices.WEIGHT_IN_FINISH_ADDON;
    if (isTwoSystems) price *= 2;
    accessory += price;
  }

  for (const acc of customAccessories) accessory += acc.price || 0;

  // --- Fixes ---
  let fix = 0;
  for (const name of selectedFixes) fix += prices.FIX[name] ?? 0;
  for (const f of customFixes)       fix += f.price || 0;

  return { service, accessory, fix, total: service + accessory + fix };
}

// ---------------------------------------------------------------------------
// Save mid-job progress
// ---------------------------------------------------------------------------

export function saveProgress(job = null) {
  saveWorkspaceState(_state);
  if (job) {
    job.savedState = JSON.parse(JSON.stringify(_state));
    updateJob(job);
  }
}

// ---------------------------------------------------------------------------
// Build Completion object — called when finalizing a job
// job: full Job object; prices: merged user+default prices
// reportText is left empty — generated by reports.js
// ---------------------------------------------------------------------------

export function buildCompletion(job, prices = DEFAULT_PRICES) {
  const s = _state;
  const totals = calculateTotals(s, prices);

  return {
    jobId:              job.id,
    address:            job.address,
    subdivision:        job.subdivision,
    builder:            job.builder,
    timestamp:          new Date().toISOString(),
    isTwoSystems:       s.isTwoSystems,
    isTemporary:        s.isTemporary,
    refrigerant:        "",         // resolved by caller from equipment data
    outdoorModel:       job.system1?.outdoor || "",
    indoorModel:        job.system1?.furnace || "",
    outdoorModel2:      (s.system2 ?? job.system2)?.outdoor || null,
    indoorModel2:       (s.system2 ?? job.system2)?.furnace || null,
    services:           _buildServiceItems(s, totals.service),
    selectedThermostat: s.selectedThermostat ? { name: s.selectedThermostat } : null,
    thermostatQuantity: s.thermostatQuantity,
    accessories:        _buildAccessoryItems(s, prices),
    fixes:              _buildFixItems(s, prices),
    weightInData:       s.weightInData,
    weightInData2:      s.weightInData2,
    notes:              s.notes,
    sitePhotoMeta:      s.sitePhotoMeta,
    totals,
    reportText:         "", // generated by reports.js
  };
}

// ---------------------------------------------------------------------------
// Internal builders — only called by buildCompletion
// ---------------------------------------------------------------------------

function _buildServiceItems(s, serviceTotal) {
  if (s.selectedServices.includes(SERVICES.CANCEL)) {
    return [{ name: SERVICES.CANCEL, displayName: "service canceled", price: 0 }];
  }

  const hasFinish = s.selectedServices.includes(SERVICES.FINISH);
  const hasAC     = s.selectedServices.includes(SERVICES.AC);
  const hasHeat   = s.selectedServices.includes(SERVICES.HEAT);

  let name, displayName;

  if (hasFinish) {
    name = SERVICES.FINISH;
    const combo = hasAC && hasHeat ? "AC & Heat" : hasAC ? "AC" : hasHeat ? "Heat" : "";
    displayName = combo ? `Finish/ ${combo} started` : "Finish";
  } else if (hasAC && hasHeat) {
    name = SERVICES.AC_HEAT;
    displayName = "AC & Heat started";
  } else if (hasAC) {
    name = SERVICES.AC;
    // Rule 7: Temporarily modifies text only, not price
    displayName = s.isTemporary ? "AC (Temporarily) started" : "AC started";
  } else if (hasHeat) {
    name = SERVICES.HEAT;
    displayName = s.isTemporary ? "Heat (Temporarily) started" : "Heat started";
  } else if (s.selectedServices.includes(SERVICES.PRESTART)) {
    name = SERVICES.PRESTART;
    displayName = "System Prestarted";
  } else if (s.selectedServices.includes(SERVICES.DRIVE_RUN)) {
    name = SERVICES.DRIVE_RUN;
    displayName = "Drive Run";
  } else {
    return [];
  }

  if (s.isTwoSystems) displayName += " (2 Systems)";

  if (s.selectedThermostat) {
    const qty   = s.thermostatQuantity;
    const label = qty === 1 ? "tstat" : "tstats";
    displayName += ` ${qty} ${s.selectedThermostat} ${label}`;
  }

  return [{ name, displayName, price: serviceTotal }];
}

function _buildAccessoryItems(s, prices) {
  const items = [];
  const hasFinish = s.selectedServices.includes(SERVICES.FINISH);

  for (const name of s.selectedAccessories) {
    let price = prices.ACCESSORY[name] ?? 0;
    if (name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish) price += prices.WEIGHT_IN_FINISH_ADDON;
    if (s.isTwoSystems && TWO_SYSTEMS_ACCESSORIES.includes(name)) price *= 2;
    const displayName = (ACCESSORY_DISPLAY[name] || name.toLowerCase()) + (s.isTwoSystems && TWO_SYSTEMS_ACCESSORIES.includes(name) ? " (2 sys)" : "");
    items.push({ name, displayName, price });
  }

  const hasWeightInData =
    (s.weightInData  && Object.values(s.weightInData).some(Boolean)) ||
    (s.isTwoSystems && s.weightInData2 && Object.values(s.weightInData2).some(Boolean));

  if (hasWeightInData && !s.selectedAccessories.includes(ACCESSORIES.WEIGHT_IN_DATA)) {
    let price = prices.ACCESSORY[ACCESSORIES.WEIGHT_IN_DATA];
    if (hasFinish)        price += prices.WEIGHT_IN_FINISH_ADDON;
    if (s.isTwoSystems)  price *= 2;
    items.push({ name: ACCESSORIES.WEIGHT_IN_DATA, displayName: ACCESSORY_DISPLAY[ACCESSORIES.WEIGHT_IN_DATA], price });
  }

  for (const acc of s.customAccessories) {
    items.push({ name: acc.name, displayName: acc.name.toLowerCase(), price: acc.price });
  }

  return items;
}

function _buildFixItems(s, prices) {
  const items = [];
  for (const name of s.selectedFixes) {
    items.push({ name, displayName: FIX_DISPLAY[name] || name.toLowerCase(), price: prices.FIX[name] ?? 0 });
  }
  for (const fix of s.customFixes) {
    items.push({ name: fix.name, displayName: fix.name.toLowerCase(), price: fix.price });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Weigh-In photo capture — Phase 1
// ---------------------------------------------------------------------------

const _SLOT_LABELS = {
  weight: "📁 Scale", fan: "📁 Fan Speed",
  weight2: "📁 Scale", fan2: "📁 Fan Speed",
};

function _dbKey(key) {
  return `${_dbPrefix}_${key}`;
}

function _clearSlot(key, objectUrl, previewContainer) {
  URL.revokeObjectURL(objectUrl);
  previewContainer.innerHTML = "";
  _photos[key] = null;
  _onWeighInPhotoChange?.();
}

function _showPreview(key, file, gps) {
  const container = document.getElementById(`photo-preview-${key}`);
  if (!container) return;

  const prev = container.querySelector("img");
  if (prev?.src?.startsWith("blob:")) URL.revokeObjectURL(prev.src);

  const objectUrl = URL.createObjectURL(file);
  container.innerHTML = "";

  const img = document.createElement("img");
  img.src = objectUrl;
  img.style.cssText = "width:60px;height:60px;object-fit:cover;border-radius:var(--radius-sm);";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn";
  clearBtn.textContent = "✕";
  clearBtn.style.cssText = "padding:2px 6px;font-size:var(--font-size-xs);";
  clearBtn.onclick = () => _clearSlot(key, objectUrl, container);

  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-1);";
  wrap.appendChild(img);

  if (gps) {
    const chip = document.createElement("span");
    chip.textContent = "📍 EXIF";
    chip.style.cssText = "font-size:var(--font-size-xs);color:var(--color-text-secondary);";
    wrap.appendChild(chip);
  }

  wrap.appendChild(clearBtn);
  container.appendChild(wrap);
}

async function _handleFile(file, key) {
  try {
    const gps        = await getGpsFromImage(file);
    const compressed = await compressImage(file, 0.8, 1600);
    _photos[key]     = { file: compressed, gps };
    await saveImageToDB(_dbKey(key), compressed, gps);
    _showPreview(key, compressed, gps);
  } catch (e) {
    console.error("Error processing photo:", e);
    _photos[key] = null;
  }
  _onWeighInPhotoChange?.();
}

function _makeSlot(key) {
  const label = _SLOT_LABELS[key] || key;

  const wrap = document.createElement("div");
  wrap.id = `photo-slot-${key}`;
  wrap.style.cssText = "display:flex;flex-direction:column;";

  const galleryInput = document.createElement("input");
  galleryInput.type = "file";
  galleryInput.accept = "image/*";
  galleryInput.style.display = "none";
  galleryInput.addEventListener("change", (e) => {
    if (e.target.files?.[0]) _handleFile(e.target.files[0], key);
    e.target.value = "";
  });

  const cameraInput = document.createElement("input");
  cameraInput.type = "file";
  cameraInput.accept = "image/*";
  cameraInput.setAttribute("capture", "environment");
  cameraInput.style.display = "none";
  cameraInput.addEventListener("change", (e) => {
    if (e.target.files?.[0]) _handleFile(e.target.files[0], key);
    e.target.value = "";
  });

  const galleryBtn = document.createElement("button");
  galleryBtn.type = "button";
  galleryBtn.className = "btn";
  galleryBtn.textContent = label;
  galleryBtn.onclick = (e) => { e.preventDefault(); galleryInput.click(); };

  const cameraBtn = document.createElement("button");
  cameraBtn.type = "button";
  cameraBtn.className = "btn";
  cameraBtn.textContent = "📷";
  cameraBtn.title = "Capture from camera";
  cameraBtn.onclick = (e) => { e.preventDefault(); cameraInput.click(); };

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:var(--space-1);align-items:center;";
  btnRow.appendChild(galleryBtn);
  btnRow.appendChild(cameraBtn);
  btnRow.appendChild(galleryInput);
  btnRow.appendChild(cameraInput);

  const preview = document.createElement("div");
  preview.id = `photo-preview-${key}`;

  wrap.appendChild(btnRow);
  wrap.appendChild(preview);
  return wrap;
}

function _setupPhotoRow(containerId, keys, includeNTC) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:flex-start;gap:var(--space-3);margin-top:var(--space-2);flex-wrap:wrap;";

  for (const key of keys) row.appendChild(_makeSlot(key));

  if (includeNTC) {
    const ntc = document.createElement("div");
    ntc.style.cssText = "display:flex;flex-direction:column;justify-content:center;";
    ntc.innerHTML =
      `<span style="font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);color:var(--color-text-secondary);">New Total Charge</span>` +
      `<span id="wi-new-total-charge" style="font-size:var(--font-size-sm);font-weight:var(--font-weight-bold);color:var(--color-accent);">—</span>`;
    row.appendChild(ntc);
  }

  container.appendChild(row);
}

async function _restorePhotos() {
  for (const key of ["weight", "fan", "weight2", "fan2"]) {
    const data = await getImageFromDB(_dbKey(key));
    if (data?.file) {
      _photos[key] = { file: data.file, gps: data.gps };
      _showPreview(key, data.file, data.gps);
    }
  }
}

export function onWeighInPhotoChange(cb) { _onWeighInPhotoChange = cb; }

export function initWeighInPhotos(address) {
  if (_photoRowsInitialized) return;
  _dbPrefix = address.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 24);
  _setupPhotoRow("wi-photo-row-1", ["weight", "fan"], true);
  _setupPhotoRow("wi-photo-row-2", ["weight2", "fan2"], false);
  _restorePhotos();
  _photoRowsInitialized = true;
}
