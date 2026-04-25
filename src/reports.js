import { createChip, showUndoToast, showToast, switchToTab, hideValidationErrors, showValidationErrors } from "../ui.js";
import { SERVICES, ACCESSORIES, FIXES, TWO_SYSTEMS_ACCESSORIES, PRICES, STORAGE_KEYS, THERMOSTATS, unidadesExteriores } from "./data.js";
import { hasWeightInData as checkWeightData } from "../state.js";
import { calculateFinancials } from "../pricing.js";
import { validateState } from "../validation.js";
import { getActiveJobAddress, getJobByAddress } from "./jobs.js";

// ============================================================
// REPORT GENERATION
// ============================================================

export function generateReportData(state) {
  const data = {
    address: state.address.toUpperCase() || "NOT PROVIDED",
    notes: state.notes
      ? state.notes.split("\n").map((n) => n.trim()).filter((n) => n)
      : [],
    services: [],
    accessories: [],
    fixes: [],
    weightInText: null,
    totalPrice: 0,
    totals: { service: 0, accessory: 0, fix: 0, total: 0 },
    thermostat: state.selectedThermostat
      ? { name: state.selectedThermostat.name, qty: state.thermostatQuantity }
      : null,
  };

  const hasPrestart = state.selectedServices.some((s) => s.name === SERVICES.PRESTART);
  const hasAC = state.selectedServices.some((s) => s.name === SERVICES.AC);
  const hasHeat = state.selectedServices.some((s) => s.name === SERVICES.HEAT);
  const hasFinish = state.selectedServices.some((s) => s.name === SERVICES.FINISH || s.name === "Finish");
  const hasDriveRun = state.selectedServices.some((s) => s.name === SERVICES.DRIVE_RUN);
  const hasCancel = state.selectedServices.some((s) => s.name === SERVICES.CANCEL);

  if (hasCancel) {
    data.services.push({ name: SERVICES.CANCEL, displayName: "service canceled", price: 0 });
  } else if (state.selectedServices.length > 0) {
    const addService = (serviceName, basePrice, { respectMultipliers = true, appendStarted = true } = {}) => {
      let price = basePrice;
      if (respectMultipliers && state.isTwoSystems) price *= 2;
      let displayService = serviceName;
      if (state.isTemporary) displayService = `${displayService} (Temporarily)`;
      let displayName = `${displayService}${appendStarted ? " started" : ""}${state.isTwoSystems ? " (2 Systems)" : ""}`;
      if (state.selectedThermostat) {
        const tstatName = state.selectedThermostat.name;
        const quantity = state.thermostatQuantity;
        displayName += ` ${quantity} ${tstatName} ${quantity === 1 ? "tstat" : "tstats"}`;
      }
      data.services.push({ name: serviceName, displayName, price });
    };

    if (hasFinish) {
      let serviceName = "Finish";
      if (hasAC && hasHeat) serviceName = "Finish/ AC & Heat";
      else if (hasAC) serviceName = "Finish/ AC";
      else if (hasHeat) serviceName = "Finish/ Heat";
      addService(serviceName, PRICES.SERVICE.FINISH);
    } else if (hasPrestart) {
      addService("Prestart System", PRICES.SERVICE.PRESTART, { appendStarted: false });
    } else if (hasAC && hasHeat) {
      addService("AC & Heat", PRICES.SERVICE.AC_HEAT);
    } else if (hasAC || hasHeat || hasFinish || hasDriveRun) {
      const service = hasAC ? SERVICES.AC : hasHeat ? SERVICES.HEAT : hasFinish ? SERVICES.FINISH : SERVICES.DRIVE_RUN;
      const basePrice = hasFinish ? PRICES.SERVICE.FINISH : hasDriveRun ? PRICES.SERVICE.DRIVE_RUN : PRICES.SERVICE.STANDARD;
      addService(service, basePrice);
    }
  }

  const accessoryDisplayNames = {
    [ACCESSORIES.ZONING]: "zoning",
    Zone: "zoning",
    HZ322: "HZ322 Zone",
    UT3000: "UT3000 Zone",
    DAPC: "DAPC",
    Bypass: "bypass damper",
    [ACCESSORIES.HARMONY]: "Harmony Zone",
    [ACCESSORIES.E_BYPASS]: "Electronic Bypass Damper",
    [ACCESSORIES.BYPASS_CONTROL]: "bypass control",
    [ACCESSORIES.FRESH_AIR]: "air",
    [ACCESSORIES.FIN180P]: "fin180p wired and set",
    [ACCESSORIES.FIN6_MD]: "fin6-md wired and set",
    [ACCESSORIES.DEHUM]: "dehum wired",
    [ACCESSORIES.FA_INTAKE]: "f/a intake wired",
    AprilAir: "AprilAire wired",
    RDS: "RDS Kit",
    [ACCESSORIES.WEIGHT_IN_DATA]: "weigh-in data",
    [ACCESSORIES.TRANE_HARNESS]: "trane harness wired",
    [ACCESSORIES.HARNESS]: "harness",
    [ACCESSORIES.LP_KIT_LENNOX_1STG]: "lp kit lennox 1stg",
    [ACCESSORIES.LP_KIT_LENNOX_2STG]: "lp kit lennox 2stg",
    [ACCESSORIES.LP_KIT_GOODMAN]: "lp kit goodman",
    [ACCESSORIES.FLOAT_SWITCH]: "float switch",
    [ACCESSORIES.BYPASS]: "bypass damper",
    [ACCESSORIES.OUT_OF_TOWN]: "out of town fee",
    [ACCESSORIES.A2L]: "a2l",
    [ACCESSORIES.ECOIL_WIRE]: "Ecoil Wire Harness+Transformer wired",
  };

  const accessoryPriority = {
    UT3000: 1, HZ322: 2, [ACCESSORIES.HARMONY]: 3,
    [ACCESSORIES.ZONING]: 4, Zone: 4, DAPC: 5,
    [ACCESSORIES.E_BYPASS]: 6, Bypass: 7, [ACCESSORIES.BYPASS]: 7,
    [ACCESSORIES.BYPASS_CONTROL]: 8,
  };

  const financials = calculateFinancials(state);

  let accessoriesList = [...state.selectedAccessories];
  const weightDataActive =
    checkWeightData(state.weightInData) ||
    (state.isTwoSystems && checkWeightData(state.weightInData2));

  if (weightDataActive && !accessoriesList.some((a) => a.name === ACCESSORIES.WEIGHT_IN_DATA)) {
    accessoriesList.push({ name: ACCESSORIES.WEIGHT_IN_DATA, basePrice: PRICES.ACCESSORY.WEIGHT_IN_BASE });
  }

  const sortedAccessories = [...accessoriesList].sort((a, b) => {
    return (accessoryPriority[a.name] || 99) - (accessoryPriority[b.name] || 99);
  });

  const hasHarmony = state.selectedAccessories.some((a) => a.name === ACCESSORIES.HARMONY);

  const deriveAccessoryPrice = (accessory) => {
    if ((accessory.name === ACCESSORIES.ZONING || accessory.name === "Zone") && hasHarmony) return null;
    let price = accessory.basePrice;
    if (accessory.name === ACCESSORIES.HARMONY) price = PRICES.ACCESSORY.HARMONY;
    if (accessory.name === ACCESSORIES.ZONING || accessory.name === "Zone") price = PRICES.ACCESSORY.ZONING;
    if (accessory.name === ACCESSORIES.BYPASS || accessory.name === "Bypass") price = PRICES.ACCESSORY.BYPASS;
    if (accessory.name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish) price += PRICES.ACCESSORY.WEIGHT_IN_FINISH_ADDON;
    if (state.isTwoSystems && (TWO_SYSTEMS_ACCESSORIES.includes(accessory.name) || accessory.name === "Zone")) price *= 2;
    return price;
  };

  sortedAccessories.forEach((accessory) => {
    const price = deriveAccessoryPrice(accessory);
    if (price === null) return;
    if (accessory.name === ACCESSORIES.FRESH_AIR || accessory.name === ACCESSORIES.A2L) return;
    const suffix = state.isTwoSystems && (TWO_SYSTEMS_ACCESSORIES.includes(accessory.name) || accessory.name === "Zone") ? " (2 Systems)" : "";
    const displayName = (accessoryDisplayNames[accessory.name] || accessory.name.toLowerCase()) + suffix;
    data.accessories.push({ name: accessory.name, displayName, price });
  });

  state.customAccessories.forEach((item) => {
    data.accessories.push({ name: item.name, displayName: item.name.toLowerCase(), price: item.basePrice });
  });

  const fixDisplayNames = {
    "Pressure Test": "pressure test",
    Leaks: "fixed freon leaks",
    "Leaks Ecoil": "fixed freon leaks (ecoil)",
    "Leaks Cunit": "fixed freon leaks (cunit)",
    "Leaks Wall": "fixed freon leaks (wall)",
    "Wires Jammed": "wires jammed",
    "Stuck Blower": "stuck blower",
    "Cut Sheetrock": "cut sheetrock",
    "Extended Wire": "extended wire",
    "PVC Work": "pvc work",
    "Open Ecoil": "opened ecoil to pull out sensor wire",
  };

  state.selectedFixes.forEach((fix) => {
    const displayName = fixDisplayNames[fix.name] || fix.name.toLowerCase();
    const detail = fix.name === "Leaks" && state.leakDetail ? ` (${state.leakDetail})` : "";
    data.fixes.push({ name: fix.name, displayName: displayName + detail, price: fix.basePrice, detail: detail.trim() });
  });
  state.customFixes.forEach((item) => {
    data.fixes.push({ name: item.name, displayName: item.name.toLowerCase(), price: item.basePrice });
  });

  const hasWeightInData = state.weightInData && Object.values(state.weightInData).some((v) => typeof v === "string" && v.trim() !== "");
  const hasWeightInData2 = state.weightInData2 && Object.values(state.weightInData2).some((v) => typeof v === "string" && v.trim() !== "");
  if (hasWeightInData || hasWeightInData2) {
    let weightText = "weigh-in data recorded";
    if (hasWeightInData && hasWeightInData2) weightText += " (2 Systems)";
    else if (hasWeightInData2) weightText = "Sys2 weigh-in data recorded";
    data.weightInText = weightText;
  }

  if (state.extraPhotos && state.extraPhotos.length > 0) {
    state.extraPhotos.forEach((photo) => {
      if (photo.label && photo.label !== "Other") data.notes.push(photo.label);
    });
  }

  data.totals.service = financials.totalServicePrice;
  data.totals.accessory = financials.totalAccessoryPrice;
  data.totals.fix = financials.totalFixPrice;
  data.totals.total = financials.total;
  data.totalPrice = financials.total;

  return data;
}

export function generateReportText(state) {
  const data = generateReportData(state);
  const reportItems = [];
  reportItems.push(data.address);
  if (data.notes.length) reportItems.push(...data.notes);
  data.services.forEach((s) => reportItems.push(`${s.displayName} $${s.price}`));
  data.accessories.forEach((a) => reportItems.push(`${a.displayName} $${a.price}`));
  data.fixes.forEach((f) => reportItems.push(`${f.displayName} $${f.price}`));
  reportItems.push(`total $${data.totalPrice}`);
  return reportItems.join(", ");
}

export function shareReportVia(reportText, method) {
  if (!reportText) { alert("Selecciona un reporte primero"); return; }
  const encodedText = encodeURIComponent(reportText);
  switch (method) {
    case "whatsapp":
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
      break;
    case "sms":
      window.location.href = `sms:?body=${encodedText}`;
      break;
    case "email":
      window.location.href = `mailto:?subject=${encodeURIComponent("Service Report")}&body=${encodedText}`;
      break;
    case "copy":
      navigator.clipboard.writeText(reportText)
        .then(() => alert("Reporte copiado al portapapeles"))
        .catch(() => alert("Error al copiar"));
      break;
  }
}

function createShareButton(text, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("btn", "btn-share-option");
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}

export function createReportCard({
  reportText, address, totals,
  services = [], accessories = [], fixes = [],
  notes = "", timestamp = null, payload = null,
  weightInData = null, weightInData2 = null, refrigerant = "",
  outdoorModel = "", heaterModel = "", outdoorModel2 = "", heaterModel2 = "",
  builder = "", subdivision = "",
  selectedThermostat = null, thermostatQuantity = 1,
  isTwoSystems = false, isTemporary = false,
  callbacks = {},
}) {
  const ts = timestamp ? new Date(timestamp) : new Date();
  const timestampISO = ts.toISOString();
  const reportId = `report-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const wrapper = document.createElement("div");
  wrapper.classList.add("report-wrapper", "report-card");
  wrapper.dataset.reportId = reportId;
  wrapper.dataset.timestamp = timestampISO;

  const payloadToStore = payload || {
    reportText, address, totals, services, accessories, fixes, notes,
    weightInData, weightInData2, refrigerant, outdoorModel, heaterModel,
    outdoorModel2, heaterModel2, builder, subdivision,
    selectedThermostat, thermostatQuantity, isTwoSystems, isTemporary,
    timestamp: timestampISO,
  };
  wrapper.dataset.reportPayload = JSON.stringify(payloadToStore);

  const head = document.createElement("div");
  head.className = "report-head";
  const title = document.createElement("h3");
  title.className = "report-title";
  title.textContent = address || "Completion Report";
  const meta = document.createElement("span");
  meta.className = "report-meta";
  meta.textContent = ts.toLocaleString();
  head.appendChild(title);
  head.appendChild(meta);

  const body = document.createElement("div");
  body.className = "report-body";
  const chipRow = document.createElement("div");
  chipRow.className = "report-chips";

  if (services.length) {
    const group = document.createElement("div");
    group.className = "chip-group";
    group.appendChild(createChip("Service", "label"));
    services.forEach((svc) => group.appendChild(createChip(`${svc.name}`, "service")));
    chipRow.appendChild(group);
  }
  if (accessories.length) {
    const group = document.createElement("div");
    group.className = "chip-group";
    group.appendChild(createChip("Accessories", "label"));
    accessories.forEach((acc) => group.appendChild(createChip(`${acc.name}`, "accessory")));
    chipRow.appendChild(group);
  }
  if (fixes.length) {
    const group = document.createElement("div");
    group.className = "chip-group";
    group.appendChild(createChip("Fixes", "label"));
    fixes.forEach((fix) => group.appendChild(createChip(`${fix.name}${fix.detail ? ` (${fix.detail})` : ""}`, "fix")));
    chipRow.appendChild(group);
  }
  if (chipRow.children.length) body.appendChild(chipRow);

  if (notes) {
    const notesEl = document.createElement("div");
    notesEl.className = "report-notes";
    notesEl.textContent = notes;
    body.appendChild(notesEl);
  }

  const totalBlock = document.createElement("div");
  totalBlock.className = "report-total";
  const totalValue = totals && totals.total !== "" && totals.total !== undefined ? `$${totals.total}` : "—";
  const breakdown = [
    totals.totalServicePrice ? `Svc $${totals.totalServicePrice}` : "",
    totals.totalAccessoryPrice ? `Acc $${totals.totalAccessoryPrice}` : "",
    totals.totalFixPrice ? `Fix $${totals.totalFixPrice}` : "",
  ].filter(Boolean).join(" | ");
  totalBlock.innerHTML = `<div class="total-amount">💵 ${totalValue}</div><div class="total-breakdown">${breakdown || ""}</div>`;

  const rawText = document.createElement("div");
  rawText.className = "report-raw";
  rawText.textContent = reportText;

  const reportEntry = document.createElement("div");
  reportEntry.classList.add("report-entry");
  reportEntry.textContent = reportText;
  reportEntry.setAttribute("aria-hidden", "true");

  const actions = document.createElement("div");
  actions.className = "report-buttons";
  actions.classList.add("hidden");

  const shareOptionsContainer = document.createElement("div");
  shareOptionsContainer.classList.add("report-share-options", "hidden");
  const getText = () => reportEntry.textContent;
  shareOptionsContainer.append(
    createShareButton("📱 WhatsApp", () => shareReportVia(getText(), "whatsapp")),
    createShareButton("💬 SMS", () => shareReportVia(getText(), "sms")),
    createShareButton("📧 Email", () => shareReportVia(getText(), "email")),
    createShareButton("📋 Copy", () => shareReportVia(getText(), "copy"))
  );

  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.classList.add("btn", "btn-report-share");
  shareBtn.textContent = "📤 Share";
  shareBtn.addEventListener("click", () => {
    shareBtn.classList.toggle("active");
    shareOptionsContainer.classList.toggle("hidden");
  });

  const shareGroup = document.createElement("div");
  shareGroup.className = "report-share-group";
  shareGroup.append(shareBtn, shareOptionsContainer);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.classList.add("btn", "btn-report-edit");
  editBtn.textContent = "✏️ Edit";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.classList.add("btn", "btn-report-delete");
  deleteBtn.textContent = "🗑️ Delete";

  actions.append(shareGroup, editBtn, deleteBtn);

  if (callbacks.onEdit) editBtn.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onEdit(wrapper, reportEntry.textContent); });
  if (callbacks.onDelete) deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onDelete(wrapper); });

  wrapper.addEventListener("click", (event) => {
    if (event.target.closest(".btn")) return;
    if (callbacks.onSelect) callbacks.onSelect(reportId);
  });

  wrapper.append(head, body, totalBlock, rawText, actions, reportEntry);
  return wrapper;
}

// ============================================================
// CSV EXPORT
// ============================================================

const escapeCSV = (str) => {
  str = String(str ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

function parseReportTextToData(reportText, address) {
  const parts = reportText.split(", ");
  const data = {
    service: "", thermostat: "", tstatQty: "", servicePrice: "",
    items: [], notes: [], total: "", weightInRecorded: "", weightInText: "",
  };

  const isFix = (name) => {
    const lower = name.toLowerCase();
    return [
      "pressure test", "leaks", "wires jammed", "stuck blower",
      "cut sheetrock", "extended wire", "pvc work", "opened ecoil",
    ].some((k) => lower.includes(k)) || lower.includes("fixed freon leaks");
  };

  parts.forEach((part) => {
    const lower = part.toLowerCase();
    if (part === address || (part === part.toUpperCase() && !part.includes("$"))) return;

    if (
      lower.includes("ac started") || lower.includes("heat started") ||
      lower.includes("ac & heat started") || lower.includes("prestart system") ||
      lower.includes("finish started") || lower.includes("drive run") ||
      lower.includes("service canceled")
    ) {
      data.service = part;
      const tstatMatch = part.match(/(\d+)\s+(t-\d+|t-4|t-6|t-10|t-8321|ecobee|daikin one|th2110|lennox|otro)\s+tstat/i);
      if (tstatMatch) { data.tstatQty = tstatMatch[1]; data.thermostat = tstatMatch[2].toUpperCase(); }
      const priceMatch = part.match(/\$(\d+)/);
      if (priceMatch) data.servicePrice = priceMatch[1];
      return;
    }

    if (lower.startsWith("total $")) { data.total = part.replace(/total \$/i, ""); return; }

    if (lower.includes("weigh-in data recorded") || lower.includes("weight-in data recorded")) {
      data.weightInRecorded = "yes";
      data.weightInText = part;
      return;
    }

    const priceMatch = part.match(/\$(\d+)/);
    if (priceMatch) {
      const price = priceMatch[1];
      let name = part.replace(/\s*\$\d+/, "").trim();
      const originalName = name;
      let qty = "1";
      if (name.match(/\(2 systems\)/i)) { qty = "2"; name = name.replace(/\(2 systems\)/i, "").trim(); }
      let cleanName = name;
      if (cleanName.includes("(")) cleanName = cleanName.replace(/\s*\(.*?\)/, "").trim();
      data.items.push({ name: cleanName, qty, price, type: isFix(cleanName) ? "fix" : "acc", originalName });
    } else {
      data.notes.push(part);
    }
  });
  return data;
}

export function exportToCSV(wrappers) {
  if (wrappers.length === 0) { alert("No reports available to export"); return; }

  const parsedReports = wrappers.map((wrap) => {
    const entry = wrap.querySelector(".report-entry");
    const reportText = entry ? entry.textContent.trim() : "";
    const payloadRaw = wrap.dataset.reportPayload;
    let payload = null;
    try { payload = JSON.parse(payloadRaw); } catch (e) {}

    let data;
    if (payload && Array.isArray(payload.services) && Array.isArray(payload.accessories)) {
      data = {
        service: payload.services.map((s) => s.displayName).join(" + "),
        servicePrice: payload.totals?.service || 0,
        thermostat: "", tstatQty: "",
        items: [
          ...payload.accessories.map((a) => ({ name: a.displayName, price: a.price, type: "acc", originalName: a.displayName })),
          ...payload.fixes.map((f) => ({ name: f.displayName, price: f.price, type: "fix", originalName: f.displayName })),
        ],
        notes: payload.notes ? (Array.isArray(payload.notes) ? payload.notes : [payload.notes]) : [],
        total: payload.totals?.total || 0,
        weightInText: payload.weightInText || "",
      };
      if (payload.thermostat) {
        data.thermostat = payload.thermostat.name;
        data.tstatQty = payload.thermostat.qty;
      } else {
        const cleanService = data.service.replace(/\(2 Systems\)/gi, "");
        const tstatMatch = cleanService.match(/(\d+)\s+(.*?)\s+tstat/i);
        if (tstatMatch) { data.tstatQty = tstatMatch[1]; data.thermostat = tstatMatch[2].toUpperCase(); }
      }
    } else {
      const address = payload?.address || reportText.split(",")[0];
      data = parseReportTextToData(reportText, address);
    }

    data.date = payload?.timestamp ? new Date(payload.timestamp).toLocaleDateString() : "";
    data.address = payload?.address || reportText.split(",")[0];
    data.subdivision = payload?.subdivision || "";
    data.builder = payload?.builder || "";
    data.weightData = payload?.weightInData || {};
    data.weightData2 = payload?.weightInData2 || {};
    data.refrigerant = payload?.refrigerant || "";
    data.outdoorModel = payload?.outdoorModel || "";
    data.heaterModel = payload?.heaterModel || "";
    data.outdoorModel2 = payload?.outdoorModel2 || "";
    data.heaterModel2 = payload?.heaterModel2 || "";
    data.rawServices = payload?.services || [];

    if (payload && payload.totals && !data.totals) {
      data.totals = payload.totals;
    } else if (!data.totals) {
      const svcPrice = parseFloat(data.servicePrice) || 0;
      const accPrice = data.items.filter((i) => i.type === "acc").reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
      const fixPrice = data.items.filter((i) => i.type === "fix").reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
      data.totals = { totalServicePrice: svcPrice, totalAccessoryPrice: accPrice, totalFixPrice: fixPrice, total: data.total || svcPrice + accPrice + fixPrice };
    }

    if (payload && typeof payload.notes !== "undefined") {
      data.notes = payload.notes ? [payload.notes] : [];
    }

    return data;
  });

  let csv = "Date,Address,Subdivision,Builder,Service_Type,Service_Price,Thermostat,Tstat_Qty,Accessories,Accessories_Price,Fixes,Fixes_Price,Notes,Total," +
    "Indoor_Model,Outdoor_Model," +
    "Lineset_Length,Factory_Line_Config,Factory_Charge,Approx_Adjust,Adjusted_Charge,Fan_Speed," +
    "Liquid_Temp,Suction_Temp,Condenser_Sat_Temp,Subcooling,Subcooling_Goal,Subcooling_Deviation,Refrigerant," +
    "Indoor_Model_2,Outdoor_Model_2," +
    "Sys2_Lineset,Sys2_Line_Config,Sys2_Fact_Chg,Sys2_Appr_Adj,Sys2_Adj_Chg,Sys2_Fan_CFM," +
    "Sys2_Liq_Temp,Sys2_Suc_Temp,Sys2_Sat_Temp,Sys2_SC,Sys2_SC_Goal,Sys2_SC_Dev\n";

  parsedReports.forEach((r) => {
    let serviceName = (r.service || "").replace(/\s*\$\d+(\.\d{2})?/, "").trim();
    serviceName = serviceName.replace(/\s+\d+\s+.*?\s+tstats?$/i, "");
    if (serviceName.toLowerCase().includes("prestart system")) {
      serviceName = serviceName.replace(/prestart system /i, "Prestart System");
    }
    const hasFinish = r.rawServices && r.rawServices.some((s) =>
      s.name === "Finish" || s.name.startsWith("Finish") || s.name === "AC & Heat"
    );
    if (hasFinish && !serviceName.toLowerCase().startsWith("finish") && !serviceName.toLowerCase().startsWith("ac & heat")) {
      serviceName = "Finish " + serviceName;
    }

    const accessories = r.items.filter((i) => i.type === "acc").map((i) => `${i.originalName} $${i.price}`).join("; ");
    const fixes = r.items.filter((i) => i.type === "fix").map((i) => `${i.originalName} $${i.price}`).join("; ");
    const w = r.weightData || {};
    const w2 = r.weightData2 || {};

    const row = [
      r.date, r.address, r.subdivision, r.builder, serviceName,
      r.totals.service ?? r.totals.totalServicePrice ?? "0",
      r.thermostat, r.tstatQty, accessories,
      r.totals.accessory ?? r.totals.totalAccessoryPrice ?? "0",
      fixes,
      r.totals.fix ?? r.totals.totalFixPrice ?? "0",
      r.notes.join("; "), r.totals.total || r.total,
      r.heaterModel, r.outdoorModel,
      w.linesetLength || "", w.factoryLineConfig || "", w.factoryChargeOz || "",
      w.approxAdjustOz || "", w.adjustedOz || "", w.fanSpeedCfm || "",
      w.liquidLineTemp || "", w.suctionLineTemp || "", w.condenserSatTemp || "",
      w.subcoolingValue || "", w.oemSubcoolingGoal || "", w.subcoolingDeviation || "",
      r.refrigerant, r.heaterModel2, r.outdoorModel2,
      w2.linesetLength || "", w2.factoryLineConfig || "", w2.factoryChargeOz || "",
      w2.approxAdjustOz || "", w2.adjustedOz || "", w2.fanSpeedCfm || "",
      w2.liquidLineTemp || "", w2.suctionLineTemp || "", w2.condenserSatTemp || "",
      w2.subcoolingValue || "", w2.oemSubcoolingGoal || "", w2.subcoolingDeviation || "",
    ].map(escapeCSV);

    csv += row.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateString = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getFullYear()).slice(-2)}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = `service_reports_${dateString}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================
// REPORT MANAGER
// ============================================================

export function initReportManager(context) {
  const {
    UI, getState, saveToLocalStorage, disablePostReportButtons,
    removeJobFromList, getCurrentImages,
  } = context;

  const reportImagesMap = new Map();
  let selectedReportId = null;
  let shareContext = "auto";

  const getReportWrappers = () => Array.from(UI.reportContent.querySelectorAll(".report-wrapper"));
  const getSelectedReport = () =>
    selectedReportId
      ? UI.reportContent.querySelector(`.report-wrapper[data-report-id="${selectedReportId}"]`)
      : null;
  const getSelectedReportText = () => {
    const sel = getSelectedReport();
    if (!sel) return "";
    const entry = sel.querySelector(".report-entry");
    return entry ? entry.textContent.trim() : "";
  };
  const getAllReportsText = () =>
    Array.from(UI.reportContent.querySelectorAll(".report-entry"))
      .map((e) => e.textContent.trim()).filter(Boolean).join("\n");

  function clearSelection() {
    getReportWrappers().forEach((wrap) => wrap.classList.remove("selected"));
    selectedReportId = null;
    if (UI.shareOptions) { UI.shareOptions.classList.add("hidden"); UI.reportContainer.appendChild(UI.shareOptions); }
    if (UI.reportActions) { UI.reportActions.classList.add("hidden"); UI.reportContainer.appendChild(UI.reportActions); }
    refreshReportActions();
  }

  function selectReport(reportId) {
    selectedReportId = reportId;
    getReportWrappers().forEach((wrap) => wrap.classList.toggle("selected", wrap.dataset.reportId === reportId));
    const selectedWrapper = getSelectedReport();
    if (selectedWrapper) {
      if (UI.reportActions) { selectedWrapper.insertAdjacentElement("afterend", UI.reportActions); UI.reportActions.classList.remove("hidden"); }
      if (UI.shareOptions) { const target = UI.reportActions || selectedWrapper; target.insertAdjacentElement("afterend", UI.shareOptions); }
    }
    refreshReportActions();
  }

  function refreshReportActions() {
    const hasReports = getReportWrappers().length > 0;
    const hasSelection = !!getSelectedReport();
    if (UI.reportActions) UI.reportActions.classList.toggle("hidden", !hasSelection);
    [UI.reportEditButton, UI.reportDeleteButton].forEach((btn) => {
      if (!btn) return;
      btn.disabled = !hasSelection;
      btn.title = hasSelection ? "" : "Selecciona un reporte";
    });
    if (!hasSelection && UI.shareOptions) UI.shareOptions.classList.add("hidden");
    if (UI.reportExportCsvButton) UI.reportExportCsvButton.classList.toggle("hidden", !hasReports);
  }

  if (UI.reportContainer) {
    UI.reportContainer.addEventListener("click", (e) => {
      if (
        e.target.closest(".report-card") || e.target.closest("button") ||
        e.target.closest(".btn") || e.target.closest("#report-actions") ||
        e.target.closest("#share-options") || e.target.closest(".report-share-options")
      ) return;
      clearSelection();
    });
  }

  function updateGlobalActions() {
    const reportCount = UI.reportContent.querySelectorAll(".report-wrapper").length;
    let container = document.getElementById("global-actions-container");

    if (reportCount > 1) {
      if (!container) {
        container = document.createElement("div");
        container.id = "global-actions-container";
        container.style.cssText = "display:flex;gap:10px;margin-top:20px";
        UI.reportContainer.appendChild(container);
      }

      if (!document.getElementById("delete-all-reports")) {
        const deleteAllBtn = document.createElement("button");
        deleteAllBtn.type = "button";
        deleteAllBtn.id = "delete-all-reports";
        deleteAllBtn.classList.add("btn", "btn-delete-all");
        deleteAllBtn.textContent = "🗑️ Delete All";
        deleteAllBtn.style.cssText = "background-color:#fee2e2;color:#991b1b;border:1px solid #f87171;font-size:0.8em;padding:4px 8px;flex:0 0 auto";
        deleteAllBtn.addEventListener("click", () => {
          if (confirm("¿Seguro que quieres eliminar TODOS los reportes?")) {
            const children = Array.from(UI.reportContent.children);
            const savedImages = new Map(reportImagesMap);
            UI.reportContent.innerHTML = "";
            UI.reportContainer.classList.add("hidden");
            reportImagesMap.clear();
            container.remove();
            clearReportsFromLocalStorage();
            clearSelection();
            showUndoToast("Todos los reportes eliminados", () => {
              children.forEach((child) => UI.reportContent.appendChild(child));
              UI.reportContainer.classList.remove("hidden");
              savedImages.forEach((val, key) => reportImagesMap.set(key, val));
              updateGlobalActions();
              saveReportsToLocalStorage();
            });
          }
        });
        container.appendChild(deleteAllBtn);
      }

      if (!document.getElementById("share-all-reports")) {
        const shareAllBtn = document.createElement("button");
        shareAllBtn.type = "button";
        shareAllBtn.id = "share-all-reports";
        shareAllBtn.className = "btn";
        shareAllBtn.textContent = "📤 Share All";
        shareAllBtn.style.flex = "1";
        shareAllBtn.addEventListener("click", () => {
          shareContext = "all";
          UI.shareOptions.classList.remove("hidden");
          container.insertAdjacentElement("afterend", UI.shareOptions);
        });
        container.appendChild(shareAllBtn);
      }
    } else {
      if (container) container.remove();
    }
    refreshReportActions();
  }

  function saveReportsToLocalStorage() {
    const reports = Array.from(UI.reportContent.querySelectorAll(".report-wrapper")).map((wrap) => {
      const payloadRaw = wrap.dataset.reportPayload;
      let payloadObj = null;
      if (payloadRaw) { try { payloadObj = JSON.parse(payloadRaw); } catch (e) {} }
      const entry = wrap.querySelector(".report-entry");
      const text = entry ? entry.textContent.trim() : "";
      const timestamp = wrap.dataset.timestamp || (payloadObj && payloadObj.timestamp) || new Date().toISOString();
      if (payloadObj) { payloadObj.timestamp = timestamp; return payloadObj; }
      return { reportText: text, address: text.split(",")[0] || "", timestamp };
    });
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  }

  function clearReportsFromLocalStorage() {
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
  }

  function editReport(reportWrapper) {
    if (!reportWrapper) return;
    const raw = reportWrapper.dataset.reportPayload;
    if (!raw) return;
    let p;
    try { p = JSON.parse(raw); } catch (e) { return; }

    document.getElementById("_edit-report-modal")?.remove();

    const svc0 = p.services && p.services[0];
    const svcName0 = svc0 ? (svc0.name || "") : "";
    const displayName0 = svc0 ? (svc0.displayName || "") : "";
    const isCanceled = displayName0 === "service canceled";
    const initSvc = {
      ac: !isCanceled && svcName0.includes("AC"),
      heat: !isCanceled && svcName0.includes("Heat"),
      finish: !isCanceled && svcName0.startsWith("Finish"),
      prestart: !isCanceled && svcName0 === "Prestart System",
      driveRun: !isCanceled && svcName0 === "Drive Run",
      cancel: isCanceled,
    };

    const isTwoSys = !!p.isTwoSystems;
    const isTemp = !!p.isTemporary;
    const tstat = p.selectedThermostat;
    const tstatQty = p.thermostatQuantity || 1;
    const notes = Array.isArray(p.notes) ? p.notes.join("\n") : (p.notes || "");
    const wid = p.weightInData || {};
    const wid2 = p.weightInData2 || {};
    const initAccs = (p.accessories || []).filter((a) => a.name !== ACCESSORIES.WEIGHT_IN_DATA);
    const initFixes = p.fixes || [];

    const ea = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const accDisplayNames = {
      [ACCESSORIES.ZONING]: "zoning", [ACCESSORIES.HARMONY]: "Harmony Zone",
      [ACCESSORIES.E_BYPASS]: "Electronic Bypass Damper", [ACCESSORIES.BYPASS_CONTROL]: "bypass control",
      [ACCESSORIES.FRESH_AIR]: "air", [ACCESSORIES.FIN180P]: "fin180p wired and set",
      [ACCESSORIES.FIN6_MD]: "fin6-md wired and set", [ACCESSORIES.DEHUM]: "dehum wired",
      [ACCESSORIES.FA_INTAKE]: "f/a intake wired", [ACCESSORIES.RDS]: "RDS Kit",
      [ACCESSORIES.TRANE_HARNESS]: "trane harness wired", [ACCESSORIES.HARNESS]: "harness",
      [ACCESSORIES.LP_KIT_LENNOX_1STG]: "lp kit lennox 1stg", [ACCESSORIES.LP_KIT_LENNOX_2STG]: "lp kit lennox 2stg",
      [ACCESSORIES.LP_KIT_GOODMAN]: "lp kit goodman", [ACCESSORIES.FLOAT_SWITCH]: "float switch",
      [ACCESSORIES.BYPASS]: "bypass damper", [ACCESSORIES.OUT_OF_TOWN]: "out of town fee",
      [ACCESSORIES.A2L]: "a2l", [ACCESSORIES.ECOIL_WIRE]: "Ecoil Wire Harness+Transformer wired",
    };
    const fixDisplayNamesEdit = {
      "Pressure Test": "pressure test", "Leaks": "fixed freon leaks",
      "Wires Jammed": "wires jammed", "Stuck Blower": "stuck blower",
      "Cut Sheetrock": "cut sheetrock", "Extended Wire": "extended wire",
      "PVC Work": "pvc work", "Open Ecoil": "opened ecoil to pull out sensor wire",
    };

    const catalogAccNames = Object.values(ACCESSORIES).filter((n) => n !== ACCESSORIES.OTRO && n !== ACCESSORIES.WEIGHT_IN_DATA);
    const catalogFixNames = Object.values(FIXES).filter((n) => n !== FIXES.OTRO);

    const makeAccRow = (acc) => {
      const isCatalog = catalogAccNames.includes(acc.name);
      return `<div class="_erow" data-kind="acc" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <select class="_esel" style="flex:1;min-width:0;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px">
          <option value="__other__"${!isCatalog ? " selected" : ""}>Other...</option>
          ${catalogAccNames.map((n) => `<option value="${ea(n)}"${acc.name === n ? " selected" : ""}>${ea(n)}</option>`).join("")}
        </select>
        <input type="text" class="_eother" placeholder="Name" value="${ea(!isCatalog ? acc.name : "")}" style="flex:1;display:${!isCatalog ? "block" : "none"};border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px" />
        <span style="white-space:nowrap;font-size:13px">$<input type="number" class="_eprice" value="${acc.price || 0}" min="0" style="width:52px;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px" /></span>
        <button type="button" class="_eremove" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:18px;padding:0 2px;line-height:1">✕</button>
      </div>`;
    };

    const makeFixRow = (fix) => {
      const isCatalog = catalogFixNames.includes(fix.name);
      return `<div class="_erow" data-kind="fix" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <select class="_esel" style="flex:1;min-width:0;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px">
          <option value="__other__"${!isCatalog ? " selected" : ""}>Other...</option>
          ${catalogFixNames.map((n) => `<option value="${ea(n)}"${fix.name === n ? " selected" : ""}>${ea(n)}</option>`).join("")}
        </select>
        <input type="text" class="_eother" placeholder="Name" value="${ea(!isCatalog ? fix.name : "")}" style="flex:1;display:${!isCatalog ? "block" : "none"};border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px" />
        <span style="white-space:nowrap;font-size:13px">$<input type="number" class="_eprice" value="${fix.price || 0}" min="0" style="width:52px;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px" /></span>
        <button type="button" class="_eremove" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:18px;padding:0 2px;line-height:1">✕</button>
      </div>`;
    };

    const tstatOpts = Object.values(THERMOSTATS).map((n) => `<option value="${ea(n)}"${tstat && tstat.name === n ? " selected" : ""}>${ea(n)}</option>`).join("");

    const widFieldDefs = [
      ["linesetLength","Lineset Length"],["factoryLineConfig","Line Config"],
      ["factoryChargeOz","Factory Oz"],["approxAdjustOz","Approx Adjust"],
      ["adjustedOz","Adjusted Oz"],["fanSpeedCfm","Fan CFM"],
      ["liquidLineTemp","Liquid Temp"],["suctionLineTemp","Suction Temp"],
      ["condenserSatTemp","Cond Sat Temp"],["subcoolingValue","Subcooling"],
      ["oemSubcoolingGoal","SC Goal"],["subcoolingDeviation","SC Dev"],
    ];

    const makeWidSection = (data, pfx, title) => `
      <details style="border:1px solid var(--border-color,#eee);border-radius:8px;padding:10px;margin-top:6px">
        <summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--text-color,#333)">${title}</summary>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
          ${widFieldDefs.map(([key, label]) => `
            <div>
              <label style="font-size:11px;color:var(--text-muted,#666)">${label}</label><br>
              <input type="text" data-wid="${pfx}" data-key="${key}" value="${ea(data[key] || "")}" style="width:100%;box-sizing:border-box;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:12px" />
            </div>
          `).join("")}
        </div>
      </details>`;

    const sCheck = (val, label, checked) =>
      `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:4px 8px;border:1px solid var(--border-color,#ddd);border-radius:6px">
        <input type="checkbox" name="_esvc" value="${val}"${checked ? " checked" : ""} style="margin:0"> ${label}
      </label>`;

    const notesEsc = notes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const overlay = document.createElement("div");
    overlay.id = "_edit-report-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)";

    overlay.innerHTML = `
      <div style="background:var(--container-bg,#fff);border:1px solid var(--border-color,#ddd);border-radius:12px;padding:20px 18px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.5)">
        <h3 style="margin:0 0 16px;font-size:15px;color:var(--text-color,#111);font-weight:700">${ea(p.address || "Edit Report")}</h3>
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Notes</div>
          <textarea id="_en" rows="3" style="width:100%;box-sizing:border-box;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:8px;font-size:13px;resize:vertical">${notesEsc}</textarea>
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Service</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            ${sCheck("AC","AC",initSvc.ac)}${sCheck("Heat","Heat",initSvc.heat)}${sCheck("Finish","Finish",initSvc.finish)}
            ${sCheck("Prestart","Prestart",initSvc.prestart)}${sCheck("Drive Run","Drive Run",initSvc.driveRun)}${sCheck("Cancel","Cancel",initSvc.cancel)}
          </div>
          <div style="display:flex;gap:12px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" id="_e2sys"${isTwoSys ? " checked" : ""}> 2 Systems</label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" id="_etemp"${isTemp ? " checked" : ""}> Temporarily</label>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Thermostat</div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="_etstat" style="flex:1;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:6px;font-size:13px">
              <option value="">None</option>${tstatOpts}
            </select>
            <input type="number" id="_etqty" value="${tstatQty}" min="1" max="99" style="width:56px;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:6px;text-align:center;font-size:13px" />
            <span style="font-size:12px;color:var(--text-muted,#666)">qty</span>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Accessories</div>
          <div id="_eacclist">${initAccs.map(makeAccRow).join("")}</div>
          <button type="button" id="_eaddacc" style="width:100%;margin-top:4px;background:none;border:1px dashed var(--border-color,#ccc);border-radius:6px;padding:7px;cursor:pointer;color:var(--text-muted,#666);font-size:12px">+ Add Accessory</button>
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px">Fixes</div>
          <div id="_efixlist">${initFixes.map(makeFixRow).join("")}</div>
          <button type="button" id="_eaddfix" style="width:100%;margin-top:4px;background:none;border:1px dashed var(--border-color,#ccc);border-radius:6px;padding:7px;cursor:pointer;color:var(--text-muted,#666);font-size:12px">+ Add Fix</button>
        </div>
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#666);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Weigh-In Data</div>
          ${makeWidSection(wid, "wid1", "System 1")}
          ${makeWidSection(wid2, "wid2", "System 2")}
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" id="_eapply" style="flex:1;padding:12px;border-radius:8px;border:none;cursor:pointer;background:#1d4ed8;color:#fff;font-weight:700;font-size:14px">Apply</button>
          <button type="button" id="_ecancel" style="padding:12px 18px;border-radius:8px;cursor:pointer;background:transparent;border:1px solid var(--border-color,#ccc);color:var(--text-color,#333);font-size:14px">Cancel</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener("change", (e) => {
      if (e.target.classList.contains("_esel")) {
        const row = e.target.closest("._erow");
        if (!row) return;
        const other = row.querySelector("._eother");
        if (other) other.style.display = e.target.value === "__other__" ? "block" : "none";
      }
    });
    overlay.addEventListener("click", (e) => {
      if (e.target.classList.contains("_eremove")) e.target.closest("._erow")?.remove();
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector("#_eaddacc").addEventListener("click", () => {
      overlay.querySelector("#_eacclist").insertAdjacentHTML("beforeend", makeAccRow({ name: "", price: 0 }));
    });
    overlay.querySelector("#_eaddfix").addEventListener("click", () => {
      overlay.querySelector("#_efixlist").insertAdjacentHTML("beforeend", makeFixRow({ name: "", price: 0 }));
    });
    overlay.querySelector("#_ecancel").addEventListener("click", () => overlay.remove());

    overlay.querySelector("#_eapply").addEventListener("click", () => {
      const newNotes = overlay.querySelector("#_en").value.trim();
      const selSvcs = Array.from(overlay.querySelectorAll('[name="_esvc"]:checked')).map((el) => el.value);
      const new2sys = overlay.querySelector("#_e2sys").checked;
      const newTemp = overlay.querySelector("#_etemp").checked;
      const tstatVal = overlay.querySelector("#_etstat").value;
      const newTstat = tstatVal ? { name: tstatVal } : null;
      const newTstatQty = parseInt(overlay.querySelector("#_etqty").value) || 1;

      const collectRows = (listId) =>
        Array.from(overlay.querySelectorAll(`#${listId} ._erow`)).map((row) => {
          const sel = row.querySelector("._esel").value;
          const name = sel === "__other__" ? row.querySelector("._eother").value.trim() : sel;
          const price = parseFloat(row.querySelector("._eprice").value) || 0;
          return name ? { name, price } : null;
        }).filter(Boolean);

      const newAccs = collectRows("_eacclist");
      const newFixes = collectRows("_efixlist");

      const newWid = {}, newWid2 = {};
      overlay.querySelectorAll('[data-wid="wid1"]').forEach((el) => { newWid[el.dataset.key] = el.value.trim(); });
      overlay.querySelectorAll('[data-wid="wid2"]').forEach((el) => { newWid2[el.dataset.key] = el.value.trim(); });

      const hasAC = selSvcs.includes("AC"), hasHeat = selSvcs.includes("Heat");
      const hasFinish = selSvcs.includes("Finish"), hasPrestart = selSvcs.includes("Prestart");
      const hasDriveRun = selSvcs.includes("Drive Run"), hasCancel = selSvcs.includes("Cancel");

      const svcItems = [];
      if (hasCancel) {
        svcItems.push({ name: "Cancel", displayName: "service canceled", price: 0 });
      } else if (selSvcs.length) {
        let svcName, svcPrice, appendStarted = true;
        if (hasFinish) {
          svcName = (hasAC && hasHeat) ? "Finish/ AC & Heat" : hasAC ? "Finish/ AC" : hasHeat ? "Finish/ Heat" : "Finish";
          svcPrice = PRICES.SERVICE.FINISH;
        } else if (hasPrestart) {
          svcName = "Prestart System"; svcPrice = PRICES.SERVICE.PRESTART; appendStarted = false;
        } else if (hasAC && hasHeat) {
          svcName = "AC & Heat"; svcPrice = PRICES.SERVICE.AC_HEAT;
        } else if (hasAC) {
          svcName = "AC"; svcPrice = PRICES.SERVICE.STANDARD;
        } else if (hasHeat) {
          svcName = "Heat"; svcPrice = PRICES.SERVICE.STANDARD;
        } else if (hasDriveRun) {
          svcName = "Drive Run"; svcPrice = PRICES.SERVICE.DRIVE_RUN;
        }
        if (svcName) {
          if (new2sys) svcPrice *= 2;
          let dn = svcName;
          if (newTemp) dn = `${dn} (Temporarily)`;
          if (appendStarted) dn = `${dn} started`;
          if (new2sys) dn = `${dn} (2 Systems)`;
          if (newTstat) { const ql = newTstatQty === 1 ? "tstat" : "tstats"; dn = `${dn} ${newTstatQty} ${newTstat.name} ${ql}`; }
          svcItems.push({ name: svcName, displayName: dn, price: svcPrice });
        }
      }

      const accItems = newAccs.map((a) => ({ name: a.name, displayName: accDisplayNames[a.name] || a.name.toLowerCase(), price: a.price }));
      const fixItems = newFixes.map((f) => ({ name: f.name, displayName: fixDisplayNamesEdit[f.name] || f.name.toLowerCase(), price: f.price }));

      const hasWid1 = Object.values(newWid).some((v) => v);
      const hasWid2v = Object.values(newWid2).some((v) => v);
      if (hasWid1 || hasWid2v) {
        let widPrice = 10;
        if (hasFinish) widPrice += 10;
        if (new2sys) widPrice *= 2;
        const widSuffix = (hasWid1 && hasWid2v) ? " (2 Systems)" : hasWid2v ? " (Sys2)" : "";
        accItems.push({ name: ACCESSORIES.WEIGHT_IN_DATA, displayName: "weigh-in data" + widSuffix, price: widPrice });
      }

      const svcTotal = svcItems.reduce((s, i) => s + (i.price || 0), 0);
      const accTotal = accItems.reduce((s, i) => s + (i.price || 0), 0);
      const fixTotal = fixItems.reduce((s, i) => s + (i.price || 0), 0);
      const total = svcTotal + accTotal + fixTotal;

      const parts = [p.address];
      if (newNotes) newNotes.split("\n").filter((n) => n.trim()).forEach((n) => parts.push(n.trim()));
      svcItems.forEach((s) => parts.push(`${s.displayName} $${s.price}`));
      accItems.forEach((a) => parts.push(`${a.displayName} $${a.price}`));
      fixItems.forEach((f) => parts.push(`${f.displayName} $${f.price}`));
      parts.push(`total $${total}`);
      const newText = parts.join(", ");

      const entry = reportWrapper.querySelector(".report-entry");
      const rawEl = reportWrapper.querySelector(".report-raw");
      if (entry) entry.textContent = newText;
      if (rawEl) rawEl.textContent = newText;

      const totalBlock = reportWrapper.querySelector(".report-total");
      if (totalBlock) {
        const ta = totalBlock.querySelector(".total-amount");
        const tb = totalBlock.querySelector(".total-breakdown");
        if (ta) ta.textContent = `💵 $${total}`;
        if (tb) tb.textContent = [svcTotal ? `Svc $${svcTotal}` : "", accTotal ? `Acc $${accTotal}` : "", fixTotal ? `Fix $${fixTotal}` : ""].filter(Boolean).join(" | ");
      }

      let weightInText = null;
      if (hasWid1 && hasWid2v) weightInText = "weigh-in data recorded (2 Systems)";
      else if (hasWid1) weightInText = "weigh-in data recorded";
      else if (hasWid2v) weightInText = "Sys2 weigh-in data recorded";

      const newPayload = {
        ...p, reportText: newText, notes: newNotes,
        services: svcItems, accessories: accItems, fixes: fixItems,
        selectedThermostat: newTstat, thermostatQuantity: newTstatQty,
        isTwoSystems: new2sys, isTemporary: newTemp,
        weightInData: newWid, weightInData2: newWid2, weightInText,
        totals: { service: svcTotal, accessory: accTotal, fix: fixTotal, total },
      };
      reportWrapper.dataset.reportPayload = JSON.stringify(newPayload);
      saveReportsToLocalStorage();
      overlay.remove();
    });
  }

  function deleteReport(reportWrapper) {
    if (!reportWrapper) return;
    const wasSelected = selectedReportId && reportWrapper.dataset.reportId === selectedReportId;
    if (confirm("¿Seguro que quieres eliminar este reporte?")) {
      const parent = reportWrapper.parentNode;
      const nextSibling = reportWrapper.nextSibling;
      const reportId = reportWrapper.dataset.reportId;
      const savedImages = reportImagesMap.get(reportId);

      reportWrapper.remove();
      reportImagesMap.delete(reportId);
      if (UI.reportContent.children.length === 0) UI.reportContainer.classList.add("hidden");
      updateGlobalActions();
      saveReportsToLocalStorage();
      if (wasSelected) clearSelection();
      else refreshReportActions();

      showUndoToast("Reporte eliminado", () => {
        if (nextSibling) parent.insertBefore(reportWrapper, nextSibling);
        else parent.appendChild(reportWrapper);
        if (savedImages) reportImagesMap.set(reportId, savedImages);
        UI.reportContainer.classList.remove("hidden");
        updateGlobalActions();
        saveReportsToLocalStorage();
        if (wasSelected) selectReport(reportId);
        else refreshReportActions();
      });
    }
  }

  function generateReportProcess() {
    const state = getState();
    const reportText = generateReportText(state);
    const reportData = generateReportData(state);
    const totals = reportData.totals;
    const currentImages = getCurrentImages ? getCurrentImages() : {};

    const outdoorData = unidadesExteriores[state.outdoorModel];
    const refrigerant = outdoorData ? outdoorData.freon : "";

    const currentJob = getJobByAddress(state.address);
    const builder = currentJob ? currentJob.builder : "";
    const subdivision = currentJob ? currentJob.subdivision : "";

    const reportWrapper = createReportCard({
      reportText,
      address: state.address.trim().toUpperCase(),
      totals, services: reportData.services, accessories: reportData.accessories,
      fixes: reportData.fixes, thermostat: reportData.thermostat,
      weightInText: reportData.weightInText,
      notes: reportData.notes.join("\n"),
      weightInData: state.weightInData, weightInData2: state.weightInData2,
      refrigerant, outdoorModel: state.outdoorModel, heaterModel: state.heaterModel,
      outdoorModel2: state.outdoorModel2, heaterModel2: state.heaterModel2,
      builder, subdivision,
      selectedThermostat: state.selectedThermostat || null,
      thermostatQuantity: state.thermostatQuantity || 1,
      isTwoSystems: state.isTwoSystems || false,
      isTemporary: state.isTemporary || false,
      timestamp: new Date().toISOString(),
      callbacks: { onSelect: selectReport, onEdit: editReport, onDelete: deleteReport },
    });

    UI.reportContent.appendChild(reportWrapper);
    UI.reportContainer.classList.remove("hidden");
    if (reportWrapper.dataset.reportId) selectReport(reportWrapper.dataset.reportId);

    if (currentImages.weight || currentImages.fan) {
      reportImagesMap.set(reportWrapper.dataset.reportId, { ...currentImages });
    }

    saveReportsToLocalStorage();
    refreshReportActions();
    updateGlobalActions();

    const activeJobAddress = getActiveJobAddress();
    if (activeJobAddress && activeJobAddress === state.address) {
      if (removeJobFromList) removeJobFromList(activeJobAddress);
    }

    if (disablePostReportButtons) disablePostReportButtons();
    switchToTab("reports");
    saveToLocalStorage();
  }

  // --- Event Listeners ---
  UI.generateReportButton.addEventListener("click", async (e) => {
    e.preventDefault();
    hideValidationErrors();
    const state = getState();
    const isOtroAccessoryActive = UI.accessoryButtons
      .querySelector(`[data-accessory="${ACCESSORIES.OTRO}"]`)?.classList.contains("active");
    const isOtroFixActive = UI.fixesSection
      .querySelector(`[data-fix="${FIXES.OTRO}"]`)?.classList.contains("active");

    const { blockingErrors } = validateState(state, isOtroAccessoryActive, isOtroFixActive);
    if (blockingErrors.length > 0) { showValidationErrors(blockingErrors); return; }

    const mgr = context.imageManager;
    const undownloaded = mgr ? mgr.getUndownloadedCount() : 0;
    if (undownloaded > 0) await mgr.downloadPhotos();
    generateReportProcess();
    if (undownloaded > 0) showToast(`📥 ${undownloaded} photo${undownloaded !== 1 ? "s" : ""} auto-downloaded`);
  });

  UI.reportEditButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (!selected) { alert("Selecciona un reporte primero"); return; }
    editReport(selected, getSelectedReportText());
    refreshReportActions();
  });

  UI.reportDeleteButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (selected) { deleteReport(selected); return; }
    if (confirm("¿Seguro que quieres eliminar todos los reportes?")) {
      UI.reportContent.innerHTML = "";
      UI.reportContainer.classList.add("hidden");
      clearSelection();
      clearReportsFromLocalStorage();
    }
    updateGlobalActions();
    refreshReportActions();
  });

  UI.reportShareButton.addEventListener("click", () => {
    if (!getReportWrappers().length) { alert("No hay reportes para compartir"); return; }
    shareContext = "auto";
    UI.shareOptions.classList.toggle("hidden");
  });

  [
    { btn: UI.shareWhatsappButton, method: "whatsapp" },
    { btn: UI.shareSmsButton, method: "sms" },
    { btn: UI.shareEmailButton, method: "email" },
    { btn: UI.shareCopyButton, method: "copy" },
  ].forEach(({ btn, method }) => {
    if (btn) {
      btn.addEventListener("click", () => {
        const text = shareContext === "all" ? getAllReportsText() : getSelectedReportText() || getAllReportsText();
        shareReportVia(text, method);
        UI.shareOptions.classList.add("hidden");
        shareContext = "auto";
      });
    }
  });

  if (UI.reportExportCsvButton) {
    UI.reportExportCsvButton.addEventListener("click", () => {
      if (confirm("Generate a CSV file with all reports?")) exportToCSV(getReportWrappers());
    });
  }

  if (UI.exportDbButton) {
    UI.exportDbButton.addEventListener("click", (e) => {
      e.preventDefault();
      const reportsRaw = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (!reportsRaw) { alert("No reports found to export."); return; }
      let reports = [];
      try { reports = JSON.parse(reportsRaw); } catch (err) { alert("Error parsing reports data."); return; }

      const savedTechName = localStorage.getItem(STORAGE_KEYS.TECH_NAME) || "";
      const techName = prompt("Nombre del técnico para este export:", savedTechName);
      if (techName === null) return;
      if (techName.trim()) localStorage.setItem(STORAGE_KEYS.TECH_NAME, techName.trim());
      if (!confirm(`¿Exportar ${reports.length} reportes completados para el Dashboard?`)) return;

      const exportTechName = techName.trim() || "Sin nombre";
      const jobsToExport = reports.map((r) => {
        if (typeof r === "string") {
          return { address: r.split(",")[0] || "Unknown", savedState: { notes: r, date: new Date().toISOString().split("T")[0] } };
        }
        let dateStr = new Date().toISOString().split("T")[0];
        if (r.timestamp) { try { dateStr = new Date(r.timestamp).toISOString().split("T")[0]; } catch (e) {} }
        let tstat = r.selectedThermostat || null;
        let tstatQty = r.thermostatQuantity || 1;
        if (!tstat && r.services && Array.isArray(r.services)) {
          for (const s of r.services) {
            const name = s.displayName || s.name || "";
            const match = name.match(/(\d+)\s+([\w-]+)\s+tstats?$/i);
            if (match) { tstatQty = parseInt(match[1]); tstat = { name: match[2] }; break; }
          }
        }
        return {
          techName: exportTechName, address: r.address || "Unknown",
          reportText: r.reportText || "", subdivision: r.subdivision || "",
          builder: r.builder || "", heaterModel: r.heaterModel || "",
          outdoorModel: r.outdoorModel || "", heaterModel2: r.heaterModel2 || "",
          outdoorModel2: r.outdoorModel2 || "", refrigerant: r.refrigerant || "",
          savedState: {
            date: dateStr, notes: Array.isArray(r.notes) ? r.notes.join("\n") : r.notes || "",
            weightInData: r.weightInData || {}, weightInData2: r.weightInData2 || {},
            selectedThermostat: tstat, thermostatQuantity: tstatQty,
            selectedServices: (r.services || []).map((s) => ({ name: s.name, basePrice: s.price || s.basePrice || 0 })),
            selectedAccessories: (r.accessories || []).map((a) => ({ name: a.name, basePrice: a.price })),
            selectedFixes: (r.fixes || []).map((f) => ({ name: f.name, basePrice: f.price })),
          },
        };
      });

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jobsToExport, null, 2));
      const a = document.createElement("a");
      a.setAttribute("href", dataStr);
      a.setAttribute("download", "dashboard_import_" + new Date().toISOString().slice(0, 10) + "_" + exportTechName.replace(/\s+/g, "_") + ".json");
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  return {
    loadReportsFromLocalStorage: (savedReports) => {
      if (!savedReports) return;
      try {
        const reports = JSON.parse(savedReports);
        reports.forEach((item) => {
          const isObject = item && typeof item === "object" && item.reportText;
          const reportText = isObject ? item.reportText : item;
          const address = (isObject && item.address) || (reportText && reportText.split(",")[0]) || "Completion Report";
          const totals = isObject && item.totals ? item.totals : { total: "", totalServicePrice: "", totalAccessoryPrice: "", totalFixPrice: "" };
          const wrapper = createReportCard({
            reportText, address, totals,
            services: isObject && item.services ? item.services : [],
            accessories: isObject && item.accessories ? item.accessories : [],
            fixes: isObject && item.fixes ? item.fixes : [],
            notes: isObject && item.notes ? item.notes : "",
            timestamp: isObject && item.timestamp ? item.timestamp : null,
            payload: isObject ? { ...item, timestamp: item.timestamp || null } : null,
            callbacks: { onSelect: selectReport, onEdit: editReport, onDelete: deleteReport },
          });
          UI.reportContent.appendChild(wrapper);
        });
        if (reports.length > 0) UI.reportContainer.classList.remove("hidden");
        refreshReportActions();
        updateGlobalActions();
      } catch (e) {
        console.error("Error parsing savedReports:", e);
      }
    },
  };
}
