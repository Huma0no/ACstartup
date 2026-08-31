// src/workspace.js — Workspace state: load job, register selections, calculate totals, build Completion.
// No UI rendering. All localStorage access via storage.js.

import {
  SERVICES, ACCESSORIES, FIXES,
  STANDALONE_SERVICES, SCALABLE_ACCESSORIES, TWO_SYSTEMS_ACCESSORIES, TECH_SUPPLIED_ACCESSORIES, ACCESSORY_COMPANIONS, ZONE_BOARDS,
  CUSTOM_PRICE_ACCESSORIES, CUSTOM_PRICE_FIXES,
  DEFAULT_PRICES, ACCESSORY_DISPLAY, FIX_DISPLAY, FINISH_SERVICE_PRICE,
} from "./data.js";
import {
  saveWorkspaceState, getWorkspaceState, clearWorkspaceState,
  saveImageToDB, getImageFromDB, deleteImageFromDB, clearImagesFromDB,
} from "./storage.js";
import { processImageWithGps } from "./utils.js";
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

  // Normalize systems from job
  let systems = [];
  if (Array.isArray(job.systems) && job.systems.length > 0) {
    systems = job.systems.map((s, idx) => ({
      id: s.id || `sys_${idx + 1}`,
      indoor: s.indoor || "",
      outdoor: s.outdoor || "",
      coil: s.coil || "",
      links: s.links || {},
      serviceType: s.serviceType || null,
      weightInData: s.weightInData || (idx === 0 ? job.weightInData : idx === 1 ? job.weightInData2 : null) || null,
      accessories: s.accessories || [],
    }));
  } else if (job.system1) {
    systems.push({
      id: "sys_1",
      indoor: job.system1.indoor || "",
      outdoor: job.system1.outdoor || "",
      coil: "",
      links: job.system1.links || {},
      serviceType: job.system1.serviceType || job.serviceType || null,
      weightInData: job.weightInData || null,
      accessories: [],
    });
    if (job.system2 || job.isTwoSystems) {
      systems.push({
        id: "sys_2",
        indoor: job.system2?.indoor || "",
        outdoor: job.system2?.outdoor || "",
        coil: "",
        links: job.system2?.links || {},
        serviceType: job.system2?.serviceType || null,
        weightInData: job.weightInData2 || null,
        accessories: [],
      });
    }
  } else {
    systems.push({
      id: "sys_1",
      indoor: "",
      outdoor: "",
      coil: "",
      links: {},
      serviceType: job.serviceType || null,
      weightInData: null,
      accessories: [],
    });
  }

  _state = {
    jobId:               job.id,
    systems,
    isTwoSystems:        systems.length === 2,
    isTemporary:         false,
    selectedServices:    [],
    selectedThermostat:  null,
    thermostatQuantity:  1,
    selectedAccessories: [],
    customAccessories:   [], // [{ name, price }] for OTRO / OUT_OF_TOWN
    selectedFixes:       [],
    customFixes:         [], // [{ name, price }] for OTRO
    system2:             systems[1] || null,
    weightInData:        systems[0]?.weightInData || null,
    weightInData2:       systems[1]?.weightInData || null,
    notes:               job.notes || "",
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

export function setSystemService(systemIndex, serviceType) {
  if (!_state || !_state.systems || !_state.systems[systemIndex]) return;
  _state.systems[systemIndex].serviceType = serviceType || null;
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

  // Clear any per-system overrides so global selection applies across all systems by default
  if (Array.isArray(s.systems)) {
    s.systems.forEach((sys) => {
      sys.serviceType = null;
    });
  }

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
  if (name === "isTwoSystems") {
    _state.isTwoSystems = value;
    if (value && _state.systems.length < 2) {
      addSystem();
    } else if (!value && _state.systems.length > 1) {
      while (_state.systems.length > 1) {
        removeSystem(_state.systems.length - 1);
      }
    }
  }
  if (name === "isTemporary") _state.isTemporary = value;
}

// ---------------------------------------------------------------------------
// Dynamic Systems Management
// ---------------------------------------------------------------------------

function _syncLegacySystemFields() {
  if (!_state) return;
  _state.isTwoSystems = _state.systems.length === 2;
  _state.system2 = _state.systems[1] || null;
  _state.weightInData = _state.systems[0]?.weightInData || null;
  _state.weightInData2 = _state.systems[1]?.weightInData || null;
}

export function addSystem(data = {}) {
  if (!_state) return null;
  if (!Array.isArray(_state.systems)) _state.systems = [];
  const idx = _state.systems.length + 1;
  const sys = {
    id: data.id || `sys_${idx}`,
    indoor: data.indoor || "",
    outdoor: data.outdoor || "",
    coil: data.coil || "",
    links: data.links || {},
    weightInData: data.weightInData || null,
    accessories: data.accessories || [],
  };
  _state.systems.push(sys);
  _syncLegacySystemFields();
  return sys;
}

export function removeSystem(index) {
  if (!_state || !Array.isArray(_state.systems)) return;
  if (index > 0 && index < _state.systems.length) {
    _state.systems.splice(index, 1);
    _syncLegacySystemFields();
  }
}

export function updateSystem(index, data) {
  if (!_state || !Array.isArray(_state.systems)) return;
  if (_state.systems[index]) {
    Object.assign(_state.systems[index], data);
    _syncLegacySystemFields();
  }
}

export function setSystemModels(index, indoor = "", coil = "", outdoor = "") {
  if (!_state || !Array.isArray(_state.systems)) return;
  if (_state.systems[index]) {
    _state.systems[index].indoor = indoor;
    _state.systems[index].coil = coil;
    _state.systems[index].outdoor = outdoor;
    _syncLegacySystemFields();
  }
}

// Legacy alias for System 2
export function setSystem2Models(indoor = "", coil = "", outdoor = "") {
  if (!_state) return;
  if (_state.systems.length < 2) {
    addSystem({ indoor, coil, outdoor });
  } else {
    setSystemModels(1, indoor, coil, outdoor);
  }
}

// ---------------------------------------------------------------------------
// Weight-In data
// ---------------------------------------------------------------------------

export function setWeightInData(data, system = 1) {
  if (!_state) return;
  const idx = typeof system === "number" ? system - 1 : 0;
  if (_state.systems && _state.systems[idx]) {
    _state.systems[idx].weightInData = data;
  }
  if (idx === 0) _state.weightInData  = data;
  else if (idx === 1) _state.weightInData2 = data;
}

// ---------------------------------------------------------------------------
// Notes & Photos
// ---------------------------------------------------------------------------

export function setNotes(text) { _state.notes = text; }

export function addSitePhoto(slug, label, file, gps = null, gpsSource = null) {
  _sitePhotos[slug] = { file, label, gps, gpsSource };
  if (!_state.sitePhotoMeta.some((m) => m.slug === slug))
    _state.sitePhotoMeta.push({ slug, label });
  saveImageToDB(_dbKey("site_" + slug), file, gps);
}

export function removeSitePhoto(slug) {
  delete _sitePhotos[slug];
  _state.sitePhotoMeta = _state.sitePhotoMeta.filter((m) => m.slug !== slug);
  deleteImageFromDB(_dbKey("site_" + slug));
}

export function getSitePhotos() { return _sitePhotos; }

export function getSitePhotoCount() { return Object.keys(_sitePhotos).length; }

export function getPhotoCount() {
  const wi = Object.keys(_photos).filter((k) => _photos[k] !== null).length;
  return wi + Object.keys(_sitePhotos).length;
}

export function getAllPhotos() {
  const result = [];
  for (const [key, item] of Object.entries(_photos)) {
    if (item?.file) {
      let label = "Photo";
      if (key === "weight" || key === "weight_1") label = "Scale Sys1";
      else if (key === "fan" || key === "fan_1") label = "FanSpeed Sys1";
      else if (key === "weight2" || key === "weight_2") label = "Scale Sys2";
      else if (key === "fan2" || key === "fan_2") label = "FanSpeed Sys2";
      else if (key.startsWith("weight_")) label = `Scale Sys${key.replace("weight_", "")}`;
      else if (key.startsWith("fan_")) label = `FanSpeed Sys${key.replace("fan_", "")}`;
      result.push({ file: item.file, label, gps: item.gps, gpsSource: item.gpsSource });
    }
  }
  for (const { file, label, gps, gpsSource } of Object.values(_sitePhotos)) {
    if (file) result.push({ file, label, gps, gpsSource });
  }
  return result;
}

export async function initSitePhotos() {
  _sitePhotos = {};
  for (const { slug, label } of (_state?.sitePhotoMeta || [])) {
    const data = await getImageFromDB(_dbKey("site_" + slug));
    if (data?.file) _sitePhotos[slug] = { file: data.file, label, gps: data.gps, gpsSource: data.gps ? "exif" : null };
  }
  return _sitePhotos;
}

// ---------------------------------------------------------------------------
// Calculate totals — pure function, apply all business rules (data_dictionary §7)
// prices: DEFAULT_PRICES structure, merged with user settings by caller
// ---------------------------------------------------------------------------

// prices: DEFAULT_PRICES structure, merged with user settings by caller
// ---------------------------------------------------------------------------

export function calculateTotals(state = _state, prices = DEFAULT_PRICES) {
  const { selectedServices = [], selectedAccessories = [], customAccessories = [],
          selectedFixes = [], customFixes = [], systems = [], isTwoSystems } = state;
  const sysList = Array.isArray(systems) && systems.length > 0
    ? systems
    : [{ id: "sys_1" }, ...(isTwoSystems ? [{ id: "sys_2" }] : [])];
  const sysCount = sysList.length || (isTwoSystems ? 2 : 1);

  // Rule 6: Cancel → everything is $0
  if (selectedServices.includes(SERVICES.CANCEL)) {
    return { service: 0, accessory: 0, fix: 0, total: 0 };
  }

  const getSingleServicePrice = (svcName) => {
    if (!svcName) return 0;
    if (svcName === SERVICES.FINISH) return FINISH_SERVICE_PRICE;
    if (svcName === SERVICES.AC_HEAT) return prices.SERVICE[SERVICES.AC_HEAT] ?? 30;
    if (svcName === SERVICES.AC) return prices.SERVICE[SERVICES.AC] ?? 30;
    if (svcName === SERVICES.HEAT) return prices.SERVICE[SERVICES.HEAT] ?? 30;
    if (svcName === SERVICES.PRESTART) return prices.SERVICE[SERVICES.PRESTART] ?? 20;
    if (svcName === SERVICES.DRIVE_RUN) return prices.SERVICE[SERVICES.DRIVE_RUN] ?? 10;
    return prices.SERVICE[svcName] ?? 0;
  };

  const getGlobalSingleServicePrice = () => {
    const hasFinish   = selectedServices.includes(SERVICES.FINISH);
    const hasAC       = selectedServices.includes(SERVICES.AC);
    const hasHeat     = selectedServices.includes(SERVICES.HEAT);
    const hasPrestart = selectedServices.includes(SERVICES.PRESTART);
    const hasDriveRun = selectedServices.includes(SERVICES.DRIVE_RUN);

    if (hasFinish) {
      return (hasAC || hasHeat) ? FINISH_SERVICE_PRICE : 0;
    } else if (hasAC && hasHeat) {
      return prices.SERVICE[SERVICES.AC_HEAT] ?? 30;
    } else if (hasAC) {
      return prices.SERVICE[SERVICES.AC] ?? 30;
    } else if (hasHeat) {
      return prices.SERVICE[SERVICES.HEAT] ?? 30;
    } else if (hasPrestart) {
      return prices.SERVICE[SERVICES.PRESTART] ?? 20;
    } else if (hasDriveRun) {
      return prices.SERVICE[SERVICES.DRIVE_RUN] ?? 10;
    }
    return 0;
  };

  const hasExplicitPerSystem = sysList.some(s => s.serviceType);

  let service = 0;
  if (hasExplicitPerSystem) {
    for (const s of sysList) {
      if (s.serviceType) {
        service += getSingleServicePrice(s.serviceType);
      } else {
        service += getGlobalSingleServicePrice();
      }
    }
  } else {
    service = getGlobalSingleServicePrice() * sysCount;
  }

  // --- Accessories ---
  const hasFinish = selectedServices.includes(SERVICES.FINISH) || sysList.some(s => s.serviceType === SERVICES.FINISH);
  let accessory = 0;
  for (const name of selectedAccessories) {
    let price = prices.ACCESSORY[name] ?? 0;
    // Rule 5: Weight-In + Finish adds $10 addon
    if (name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish) {
      price += prices.WEIGHT_IN_FINISH_ADDON;
    }
    // Multi-system multiplier for scalable accessories
    if (sysCount > 1 && TWO_SYSTEMS_ACCESSORIES.includes(name)) price *= sysCount;
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
  const now = new Date();

  const systems = Array.isArray(s.systems) && s.systems.length > 0
    ? s.systems
    : (Array.isArray(job.systems) && job.systems.length > 0
        ? job.systems
        : [
            {
              id: "sys_1",
              indoor: job.system1?.indoor || "",
              outdoor: job.system1?.outdoor || "",
              links: job.system1?.links || {},
              serviceType: job.system1?.serviceType || null,
              weightInData: s.weightInData,
              accessories: [],
            },
            ...((s.isTwoSystems || s.system2)
              ? [{
                  id: "sys_2",
                  indoor: (s.system2 ?? job.system2)?.indoor || "",
                  outdoor: (s.system2 ?? job.system2)?.outdoor || "",
                  links: (s.system2 ?? job.system2)?.links || {},
                  serviceType: (s.system2 ?? job.system2)?.serviceType || null,
                  weightInData: s.weightInData2,
                  accessories: [],
                }]
              : [])
          ]);

  return {
    jobId:              job.id,
    address:            job.address,
    subdivision:        job.subdivision,
    builder:            job.builder,
    timestamp:          now.toISOString(),
    date:               now.toISOString().slice(0, 10),
    systems,
    isTwoSystems:       systems.length === 2,
    isTemporary:        s.isTemporary,
    refrigerant:        "",         // resolved by caller from equipment data
    outdoor:            systems[0]?.outdoor || job.system1?.outdoor || "",
    indoor:             systems[0]?.indoor  || job.system1?.indoor  || "",
    outdoor2:           systems[1]?.outdoor || (s.system2 ?? job.system2)?.outdoor || null,
    indoor2:            systems[1]?.indoor  || (s.system2 ?? job.system2)?.indoor  || null,
    services:           _buildServiceItems(s, totals.service, prices),
    selectedThermostat: s.selectedThermostat ? { name: s.selectedThermostat, techSupplied: true } : null,
    thermostatQuantity: s.thermostatQuantity,
    accessories:        _buildAccessoryItems(s, prices),
    fixes:              _buildFixItems(s, prices),
    weightInData:       systems[0]?.weightInData || s.weightInData,
    weightInData2:      systems[1]?.weightInData || s.weightInData2,
    notes:              s.notes,
    sitePhotoMeta:      s.sitePhotoMeta,
    totals,
    reportText:         "", // generated by reports.js
  };
}

// ---------------------------------------------------------------------------
// Internal builders — only called by buildCompletion
// ---------------------------------------------------------------------------

function _buildServiceItems(s, serviceTotal, prices = DEFAULT_PRICES) {
  if (s.selectedServices.includes(SERVICES.CANCEL)) {
    return [{ name: SERVICES.CANCEL, displayName: "service canceled", price: 0 }];
  }

  const systems = Array.isArray(s.systems) && s.systems.length > 0
    ? s.systems
    : [{ id: "sys_1" }, ...(s.isTwoSystems ? [{ id: "sys_2" }] : [])];
  const sysCount = systems.length || (s.isTwoSystems ? 2 : 1);

  const formatSingleService = (svcName) => {
    if (!svcName) return { name: "", label: "", price: 0 };
    if (svcName === SERVICES.FINISH) {
      return { name: SERVICES.FINISH, label: "Finish/", price: FINISH_SERVICE_PRICE };
    }
    if (svcName === SERVICES.AC_HEAT) {
      return { name: SERVICES.AC_HEAT, label: s.isTemporary ? "AC & Heat started (Temporarily)" : "AC & Heat started", price: prices.SERVICE[SERVICES.AC_HEAT] ?? 30 };
    }
    if (svcName === SERVICES.AC) {
      return { name: SERVICES.AC, label: s.isTemporary ? "AC (Temporarily) started" : "AC started", price: prices.SERVICE[SERVICES.AC] ?? 30 };
    }
    if (svcName === SERVICES.HEAT) {
      return { name: SERVICES.HEAT, label: s.isTemporary ? "Heat (Temporarily) started" : "Heat started", price: prices.SERVICE[SERVICES.HEAT] ?? 30 };
    }
    if (svcName === SERVICES.PRESTART) {
      return { name: SERVICES.PRESTART, label: "System Prestarted", price: prices.SERVICE[SERVICES.PRESTART] ?? 20 };
    }
    if (svcName === SERVICES.DRIVE_RUN) {
      return { name: SERVICES.DRIVE_RUN, label: "Drive Run", price: prices.SERVICE[SERVICES.DRIVE_RUN] ?? 10 };
    }
    return { name: svcName, label: svcName, price: prices.SERVICE[svcName] ?? 0 };
  };

  const getGlobalServiceInfo = () => {
    const hasFinish = s.selectedServices.includes(SERVICES.FINISH);
    const hasAC     = s.selectedServices.includes(SERVICES.AC);
    const hasHeat   = s.selectedServices.includes(SERVICES.HEAT);

    if (hasFinish) {
      const combo = hasAC && hasHeat ? "AC & Heat" : hasAC ? "AC" : hasHeat ? "Heat" : "";
      const label = combo
        ? `Finish/ ${combo} started${s.isTemporary ? " (Temporarily)" : ""}`
        : "Finish/";
      return { name: SERVICES.FINISH, label, price: (hasAC || hasHeat) ? FINISH_SERVICE_PRICE : 0 };
    } else if (hasAC && hasHeat) {
      return { name: SERVICES.AC_HEAT, label: s.isTemporary ? "AC & Heat started (Temporarily)" : "AC & Heat started", price: prices.SERVICE[SERVICES.AC_HEAT] ?? 30 };
    } else if (hasAC) {
      return { name: SERVICES.AC, label: s.isTemporary ? "AC (Temporarily) started" : "AC started", price: prices.SERVICE[SERVICES.AC] ?? 30 };
    } else if (hasHeat) {
      return { name: SERVICES.HEAT, label: s.isTemporary ? "Heat (Temporarily) started" : "Heat started", price: prices.SERVICE[SERVICES.HEAT] ?? 30 };
    } else if (s.selectedServices.includes(SERVICES.PRESTART)) {
      return { name: SERVICES.PRESTART, label: "System Prestarted", price: prices.SERVICE[SERVICES.PRESTART] ?? 20 };
    } else if (s.selectedServices.includes(SERVICES.DRIVE_RUN)) {
      return { name: SERVICES.DRIVE_RUN, label: "Drive Run", price: prices.SERVICE[SERVICES.DRIVE_RUN] ?? 10 };
    }
    return { name: "", label: "", price: 0 };
  };

  const globalInfo = getGlobalServiceInfo();
  const perSystemServices = systems.map((sys) => {
    if (sys.serviceType) {
      return formatSingleService(sys.serviceType);
    }
    return globalInfo;
  });

  if (perSystemServices.every(p => !p.name)) {
    return [];
  }

  const firstSvc = perSystemServices[0];
  const allIdentical = perSystemServices.every(p => p.name === firstSvc.name && p.label === firstSvc.label);

  let tstatSuffix = "";
  if (s.selectedThermostat) {
    const qty   = s.thermostatQuantity;
    const label = qty === 1 ? "tstat" : "tstats";
    tstatSuffix = ` ${qty} ${s.selectedThermostat} ${label}`;
  }

  if (allIdentical) {
    let displayName = firstSvc.label;
    if (sysCount > 1) displayName += ` (${sysCount} Systems)`;
    displayName += tstatSuffix;
    return [{ name: firstSvc.name, displayName, price: serviceTotal }];
  }

  // Mixed services: return sequential per-system service items
  const items = perSystemServices.map((svc, idx) => ({
    name: svc.name,
    displayName: `Sys ${idx + 1}: ${svc.label}`,
    price: svc.price,
    systemIndex: idx,
  }));

  if (tstatSuffix) {
    items[items.length - 1].displayName += tstatSuffix;
  }

  return items;
}

function _buildAccessoryItems(s, prices) {
  const items = [];
  const hasFinish = s.selectedServices.includes(SERVICES.FINISH);
  const sysCount = Array.isArray(s.systems) && s.systems.length > 0
    ? s.systems.length
    : (s.isTwoSystems ? 2 : 1);
  const scalable = SCALABLE_ACCESSORIES || TWO_SYSTEMS_ACCESSORIES;

  for (const name of s.selectedAccessories) {
    let price = prices.ACCESSORY[name] ?? 0;
    if (name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish) price += prices.WEIGHT_IN_FINISH_ADDON;
    const isScalable = scalable.includes(name);
    if (sysCount > 1 && isScalable) price *= sysCount;
    const suffix = (sysCount > 1 && isScalable) ? ` (${sysCount} sys)` : "";
    const displayName = (ACCESSORY_DISPLAY[name]?.report || name.toLowerCase()) + suffix;
    items.push({ name, displayName, price, techSupplied: TECH_SUPPLIED_ACCESSORIES.includes(name) });
  }

  for (const acc of s.customAccessories) {
    items.push({ name: acc.name, displayName: acc.name.toLowerCase(), price: acc.price, techSupplied: true });
  }

  return items;
}

function _buildFixItems(s, prices) {
  const items = [];
  for (const name of s.selectedFixes) {
    items.push({ name, displayName: FIX_DISPLAY[name]?.report || name.toLowerCase(), price: prices.FIX[name] ?? 0, techSupplied: false });
  }
  for (const fix of s.customFixes) {
    items.push({ name: fix.name, displayName: fix.name.toLowerCase(), price: fix.price, techSupplied: false });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Weigh-In photo capture — Phase 1
// ---------------------------------------------------------------------------

const _SLOT_LABELS = {
  weight: "Scale", fan: "Fan Speed",
  weight2: "Scale", fan2: "Fan Speed",
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

function _showPreview(key, file, gps, gpsSource) {
  const container = document.getElementById(`photo-preview-${key}`);
  if (!container) return;

  const prev = container.querySelector("img");
  if (prev?.src?.startsWith("blob:")) URL.revokeObjectURL(prev.src);

  const objectUrl = URL.createObjectURL(file);
  container.innerHTML = "";

  const img = document.createElement("img");
  img.src = objectUrl;
  img.setAttribute("data-lightbox-src", objectUrl);
  img.style.cssText = "width:60px;height:60px;object-fit:cover;border-radius:var(--radius-sm);cursor:pointer;";
  img.title = "Click to enlarge";

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
    chip.className = "img-gps-chip";
    chip.textContent = gpsSource === "device" ? "📍 GPS" : "📍 EXIF";
    chip.title = gpsSource === "device" ? `Device GPS: ${gps.lat}, ${gps.lon}` : `EXIF GPS: ${gps.lat}, ${gps.lon}`;
    chip.style.cssText = "font-size:var(--font-size-xs);color:var(--color-accent, #38bdf8);font-weight:600;";
    wrap.appendChild(chip);
  }

  wrap.appendChild(clearBtn);
  container.appendChild(wrap);
}

async function _handleFile(file, key) {
  try {
    const { file: processedFile, gps, gpsSource } = await processImageWithGps(file, 0.8, 1600);
    _photos[key]     = { file: processedFile, gps, gpsSource };
    await saveImageToDB(_dbKey(key), processedFile, gps);
    _showPreview(key, processedFile, gps, gpsSource);
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
    const ntcId = typeof includeNTC === "string" ? includeNTC : "wi-new-total-charge";
    const ntc = document.createElement("div");
    ntc.style.cssText = "display:flex;flex-direction:column;justify-content:center;";
    ntc.innerHTML =
      `<span style="font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);color:var(--color-text-secondary);">New Total Charge</span>` +
      `<span id="${ntcId}" style="font-size:var(--font-size-sm);font-weight:var(--font-weight-bold);color:var(--color-accent);">—</span>`;
    row.appendChild(ntc);
  }

  container.appendChild(row);
}

async function _restorePhotos() {
  const keysToRestore = Object.keys(_photos);
  for (let i = 1; i <= 8; i++) {
    keysToRestore.push(i === 1 ? "weight" : (i === 2 ? "weight2" : `weight_${i}`));
    keysToRestore.push(i === 1 ? "fan"    : (i === 2 ? "fan2"    : `fan_${i}`));
  }
  const uniqueKeys = [...new Set(keysToRestore)];
  for (const key of uniqueKeys) {
    const data = await getImageFromDB(_dbKey(key));
    if (data?.file) {
      const gpsSource = data.gps ? (data.gpsSource || "exif") : null;
      _photos[key] = { file: data.file, gps: data.gps, gpsSource };
      _showPreview(key, data.file, data.gps, gpsSource);
    }
  }
}

export function onWeighInPhotoChange(cb) { _onWeighInPhotoChange = cb; }

export function initWeighInPhotos(address, systemCount = 1) {
  _dbPrefix = address.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 24);
  const count = Math.max(1, systemCount || 1);
  for (let i = 1; i <= count; i++) {
    const kWeight = i === 1 ? "weight" : (i === 2 ? "weight2" : `weight_${i}`);
    const kFan    = i === 1 ? "fan"    : (i === 2 ? "fan2"    : `fan_${i}`);
    _SLOT_LABELS[kWeight] = "Scale";
    _SLOT_LABELS[kFan] = "Fan Speed";
    const ntcId = i === 1 ? "wi-new-total-charge" : `wi-new-total-charge-${i}`;
    _setupPhotoRow(`wi-photo-row-${i}`, [kWeight, kFan], ntcId);
  }
  _restorePhotos();
  _photoRowsInitialized = true;
}
