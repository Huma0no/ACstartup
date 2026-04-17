import { createChip } from "./ui.js";
import {
  SERVICES,
  ACCESSORIES,
  FIXES,
  TWO_SYSTEMS_ACCESSORIES,
  PRICES,
} from "./constants.js";
import { hasWeightInData as checkWeightData } from "./state.js";
import { calculateFinancials } from "./pricing.js";

export function generateReportData(state) {
  const data = {
    address: state.address.toUpperCase() || "NOT PROVIDED",
    notes: state.notes
      ? state.notes
          .split("\n")
          .map((note) => note.trim())
          .filter((note) => note)
      : [],
    services: [],
    accessories: [],
    fixes: [],
    weightInText: null,
    totalPrice: 0,
    totals: {
      service: 0,
      accessory: 0,
      fix: 0,
      total: 0,
    },
    thermostat: state.selectedThermostat
      ? {
          name: state.selectedThermostat.name,
          qty: state.thermostatQuantity,
        }
      : null,
  };

  // --- SERVICES ---
  const hasPrestart = state.selectedServices.some(
    (s) => s.name === SERVICES.PRESTART
  );
  const hasAC = state.selectedServices.some((s) => s.name === SERVICES.AC);
  const hasHeat = state.selectedServices.some((s) => s.name === SERVICES.HEAT);
  const hasFinish = state.selectedServices.some(
    (s) => s.name === SERVICES.FINISH || s.name === "Finish"
  );
  const hasDriveRun = state.selectedServices.some(
    (s) => s.name === SERVICES.DRIVE_RUN
  );
  const hasCancel = state.selectedServices.some(
    (s) => s.name === SERVICES.CANCEL
  );

  if (hasCancel) {
    data.services.push({
      name: SERVICES.CANCEL,
      displayName: "service canceled",
      price: 0,
    });
  } else if (state.selectedServices.length > 0) {
    const addService = (
      serviceName,
      basePrice,
      { respectMultipliers = true, appendStarted = true } = {}
    ) => {
      let price = basePrice;
      if (respectMultipliers && state.isTwoSystems) price *= 2;

      let displayService = serviceName;
      if (state.isTemporary) {
        displayService = `${displayService} (Temporarily)`;
      }
      let displayName = `${displayService}${appendStarted ? " started" : ""}${
        state.isTwoSystems ? " (2 Systems)" : ""
      }`;

      if (state.selectedThermostat) {
        const tstatName = state.selectedThermostat.name;
        const quantity = state.thermostatQuantity;
        const qtyLabel = quantity === 1 ? "tstat" : "tstats";
        displayName += ` ${quantity} ${tstatName} ${qtyLabel}`;
      }

      data.services.push({
        name: serviceName,
        displayName: displayName,
        price: price,
      });
    };

    if (hasFinish) {
      let serviceName = "Finish";
      if (hasAC && hasHeat) {
        serviceName = "Finish/ AC & Heat";
      } else if (hasAC) {
        serviceName = "Finish/ AC";
      } else if (hasHeat) {
        serviceName = "Finish/ Heat";
      }
      addService(serviceName, PRICES.SERVICE.FINISH);
    } else if (hasPrestart) {
      addService("Prestart System", PRICES.SERVICE.PRESTART, {
        appendStarted: false,
      });
    } else if (hasAC && hasHeat) {
      addService("AC & Heat", PRICES.SERVICE.AC_HEAT);
    } else if (hasAC || hasHeat || hasFinish || hasDriveRun) {
      const service = hasAC
        ? SERVICES.AC
        : hasHeat
        ? SERVICES.HEAT
        : hasFinish
        ? SERVICES.FINISH
        : SERVICES.DRIVE_RUN;
      const basePrice = hasFinish
        ? PRICES.SERVICE.FINISH
        : hasDriveRun
        ? PRICES.SERVICE.DRIVE_RUN
        : PRICES.SERVICE.STANDARD;
      addService(service, basePrice);
    }
  }

  // --- ACCESSORIES ---
  // Display names and ordering live here (report concern).
  // Prices come from calculateFinancials (single source of truth).
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
    [ACCESSORIES.LP_KIT_GOODMAN]:     "lp kit goodman",
    [ACCESSORIES.FLOAT_SWITCH]: "float switch",
    [ACCESSORIES.BYPASS]: "bypass damper",
    [ACCESSORIES.OUT_OF_TOWN]: "out of town fee",
    [ACCESSORIES.A2L]: "a2l",
    [ACCESSORIES.ECOIL_WIRE]: "Ecoil Wire Harness+Transformer wired",
  };

  const accessoryPriority = {
    UT3000: 1,
    HZ322: 2,
    [ACCESSORIES.HARMONY]: 3,
    [ACCESSORIES.ZONING]: 4,
    Zone: 4,
    DAPC: 5,
    [ACCESSORIES.E_BYPASS]: 6,
    Bypass: 7,
    [ACCESSORIES.BYPASS]: 7,
    [ACCESSORIES.BYPASS_CONTROL]: 8,
  };

  // Delegate all price totals to pricing.js — single source of truth
  const financials = calculateFinancials(state);

  // Build accessory list for display, injecting Weight-In if data is present
  let accessoriesList = [...state.selectedAccessories];
  const weightDataActive =
    checkWeightData(state.weightInData) ||
    (state.isTwoSystems && checkWeightData(state.weightInData2));

  if (
    weightDataActive &&
    !accessoriesList.some((a) => a.name === ACCESSORIES.WEIGHT_IN_DATA)
  ) {
    accessoriesList.push({
      name: ACCESSORIES.WEIGHT_IN_DATA,
      basePrice: PRICES.ACCESSORY.WEIGHT_IN_BASE,
    });
  }

  const sortedAccessories = [...accessoriesList].sort((a, b) => {
    const pA = accessoryPriority[a.name] || 99;
    const pB = accessoryPriority[b.name] || 99;
    return pA - pB;
  });

  const hasHarmony = state.selectedAccessories.some(
    (a) => a.name === ACCESSORIES.HARMONY
  );

  // Derive per-line prices using the same rules as pricing.js
  const deriveAccessoryPrice = (accessory) => {
    if (
      (accessory.name === ACCESSORIES.ZONING || accessory.name === "Zone") &&
      hasHarmony
    )
      return null; // skipped

    let price = accessory.basePrice;
    if (accessory.name === ACCESSORIES.HARMONY)
      price = PRICES.ACCESSORY.HARMONY;
    if (accessory.name === ACCESSORIES.ZONING || accessory.name === "Zone")
      price = PRICES.ACCESSORY.ZONING;
    if (accessory.name === ACCESSORIES.BYPASS || accessory.name === "Bypass")
      price = PRICES.ACCESSORY.BYPASS;
    if (accessory.name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish)
      price += PRICES.ACCESSORY.WEIGHT_IN_FINISH_ADDON;
    if (
      state.isTwoSystems &&
      (TWO_SYSTEMS_ACCESSORIES.includes(accessory.name) ||
        accessory.name === "Zone")
    )
      price *= 2;

    return price;
  };

  sortedAccessories.forEach((accessory) => {
    const price = deriveAccessoryPrice(accessory);
    if (price === null) return; // skipped (Zoning + Harmony)

    const skipInReport =
      accessory.name === ACCESSORIES.FRESH_AIR ||
      accessory.name === ACCESSORIES.A2L;
    if (skipInReport) return;

    const suffix =
      state.isTwoSystems &&
      (TWO_SYSTEMS_ACCESSORIES.includes(accessory.name) ||
        accessory.name === "Zone")
        ? " (2 Systems)"
        : "";

    const displayName =
      (accessoryDisplayNames[accessory.name] || accessory.name.toLowerCase()) +
      suffix;

    data.accessories.push({ name: accessory.name, displayName, price });
  });

  state.customAccessories.forEach((item) => {
    data.accessories.push({
      name: item.name,
      displayName: item.name.toLowerCase(),
      price: item.basePrice,
    });
  });

  // --- FIXES ---
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
    const price = fix.basePrice;
    const displayName = fixDisplayNames[fix.name] || fix.name.toLowerCase();
    const detail =
      fix.name === "Leaks" && state.leakDetail ? ` (${state.leakDetail})` : "";

    data.fixes.push({
      name: fix.name,
      displayName: displayName + detail,
      price: price,
      detail: detail.trim(),
    });
  });

  state.customFixes.forEach((item) => {
    const price = item.basePrice;
    data.fixes.push({
      name: item.name,
      displayName: item.name.toLowerCase(),
      price: price,
    });
  });

  // --- WEIGHT IN TEXT ---
  const hasWeightInData =
    state.weightInData &&
    Object.values(state.weightInData).some(
      (val) => typeof val === "string" && val.trim() !== ""
    );

  const hasWeightInData2 =
    state.weightInData2 &&
    Object.values(state.weightInData2).some(
      (val) => typeof val === "string" && val.trim() !== ""
    );

  if (hasWeightInData || hasWeightInData2) {
    let weightText = "weigh-in data recorded";
    if (hasWeightInData && hasWeightInData2) {
      weightText += " (2 Systems)";
    } else if (hasWeightInData2) {
      weightText = "Sys2 weigh-in data recorded";
    }
    data.weightInText = weightText;
  }

  // Extra photo labels → notes (e.g. "No Gas Meter", "No P-Drain")
  if (state.extraPhotos && state.extraPhotos.length > 0) {
    state.extraPhotos.forEach((photo) => {
      if (photo.label && photo.label !== "Other") {
        data.notes.push(photo.label);
      }
    });
  }

  // Use financials from pricing.js as the canonical totals
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

  data.services.forEach((s) =>
    reportItems.push(`${s.displayName} $${s.price}`)
  );
  data.accessories.forEach((a) =>
    reportItems.push(`${a.displayName} $${a.price}`)
  );
  data.fixes.forEach((f) => reportItems.push(`${f.displayName} $${f.price}`));

  reportItems.push(`total $${data.totalPrice}`);
  return reportItems.join(", ");
}

// Función para compartir reporte
export function shareReportVia(reportText, method) {
  if (!reportText) {
    alert("Selecciona un reporte primero");
    return;
  }
  const encodedText = encodeURIComponent(reportText);

  switch (method) {
    case "whatsapp":
      window.open(
        `https://api.whatsapp.com/send?text=${encodedText}`,
        "_blank"
      );
      break;
    case "sms":
      window.location.href = `sms:?body=${encodedText}`;
      break;
    case "email":
      const subject = encodeURIComponent("Service Report");
      window.location.href = `mailto:?subject=${subject}&body=${encodedText}`;
      break;
    case "copy":
      navigator.clipboard
        .writeText(reportText)
        .then(() => alert("Reporte copiado al portapapeles"))
        .catch(() => alert("Error al copiar"));
      break;
  }
}

// Función auxiliar para crear botones de share
function createShareButton(text, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("btn", "btn-share-option");
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}

export function createReportCard({
  reportText,
  address,
  totals,
  services = [],
  accessories = [],
  fixes = [],
  notes = "",
  timestamp = null,
  payload = null,
  weightInData = null,
  weightInData2 = null,
  refrigerant = "",
  outdoorModel = "",
  heaterModel = "",
  outdoorModel2 = "",
  heaterModel2 = "",
  builder = "",
  subdivision = "",
  selectedThermostat = null,
  thermostatQuantity = 1,
  isTwoSystems = false,
  isTemporary = false,
  callbacks = {}, // { onSelect, onEdit, onDelete }
}) {
  const ts = timestamp ? new Date(timestamp) : new Date();
  const timestampISO = ts.toISOString();
  const reportId = `report-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  const wrapper = document.createElement("div");
  wrapper.classList.add("report-wrapper", "report-card");
  wrapper.dataset.reportId = reportId;
  wrapper.dataset.timestamp = timestampISO;
  const payloadToStore = payload || {
    reportText,
    address,
    totals,
    services,
    accessories,
    fixes,
    notes,
    weightInData,
    weightInData2,
    refrigerant,
    outdoorModel,
    heaterModel,
    outdoorModel2,
    heaterModel2,
    builder,
    subdivision,
    selectedThermostat,
    thermostatQuantity,
    isTwoSystems,
    isTemporary,
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
    services.forEach((svc) =>
      group.appendChild(createChip(`${svc.name}`, "service"))
    );
    chipRow.appendChild(group);
  }

  if (accessories.length) {
    const group = document.createElement("div");
    group.className = "chip-group";
    group.appendChild(createChip("Accessories", "label"));
    accessories.forEach((acc) =>
      group.appendChild(createChip(`${acc.name}`, "accessory"))
    );
    chipRow.appendChild(group);
  }

  if (fixes.length) {
    const group = document.createElement("div");
    group.className = "chip-group";
    group.appendChild(createChip("Fixes", "label"));
    fixes.forEach((fix) =>
      group.appendChild(
        createChip(`${fix.name}${fix.detail ? ` (${fix.detail})` : ""}`, "fix")
      )
    );
    chipRow.appendChild(group);
  }

  if (chipRow.children.length) {
    body.appendChild(chipRow);
  }

  if (notes) {
    const notesEl = document.createElement("div");
    notesEl.className = "report-notes";
    notesEl.textContent = notes;
    body.appendChild(notesEl);
  }

  const totalBlock = document.createElement("div");
  totalBlock.className = "report-total";
  const totalValue =
    totals && totals.total !== "" && totals.total !== undefined
      ? `$${totals.total}`
      : "—";
  const breakdown = [
    totals.totalServicePrice ? `Svc $${totals.totalServicePrice}` : "",
    totals.totalAccessoryPrice ? `Acc $${totals.totalAccessoryPrice}` : "",
    totals.totalFixPrice ? `Fix $${totals.totalFixPrice}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  totalBlock.innerHTML = `
      <div class="total-amount">💵 ${totalValue}</div>
      <div class="total-breakdown">
        ${breakdown || ""}
      </div>
    `;

  const rawText = document.createElement("div");
  rawText.className = "report-raw";
  rawText.textContent = reportText;

  // Hidden entry for persistence/export
  const reportEntry = document.createElement("div");
  reportEntry.classList.add("report-entry");
  reportEntry.textContent = reportText;
  reportEntry.setAttribute("aria-hidden", "true");

  // Actions
  const actions = document.createElement("div");
  actions.className = "report-buttons";
  actions.classList.add("hidden");

  // Share options
  const shareOptionsContainer = document.createElement("div");
  shareOptionsContainer.classList.add("report-share-options", "hidden");
  const getText = () => reportEntry.textContent;
  const shareWhatsapp = createShareButton("📱 WhatsApp", () =>
    shareReportVia(getText(), "whatsapp")
  );
  const shareSms = createShareButton("💬 SMS", () =>
    shareReportVia(getText(), "sms")
  );
  const shareEmail = createShareButton("📧 Email", () =>
    shareReportVia(getText(), "email")
  );
  const shareCopy = createShareButton("📋 Copy", () =>
    shareReportVia(getText(), "copy")
  );
  shareOptionsContainer.append(shareWhatsapp, shareSms, shareEmail, shareCopy);

  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.classList.add("btn", "btn-report-share");
  shareBtn.textContent = "📤 Share";
  shareBtn.classList.remove("active");
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

  // Wire edit/delete
  if (callbacks.onEdit) {
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onEdit(wrapper, reportEntry.textContent);
    });
  }
  if (callbacks.onDelete) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onDelete(wrapper);
    });
  }

  // Selection handling
  wrapper.addEventListener("click", (event) => {
    if (event.target.closest(".btn")) return;
    if (callbacks.onSelect) {
      callbacks.onSelect(reportId);
    }
  });

  // Build
  wrapper.append(head, body, totalBlock, rawText, actions, reportEntry);
  return wrapper;
}

// Helper to escape CSV
const escapeCSV = (str) => {
  str = String(str ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Helper to parse text into structured data for CSV
function parseReportTextToData(reportText, address) {
  const parts = reportText.split(", ");
  const data = {
    service: "",
    thermostat: "",
    tstatQty: "",
    servicePrice: "",
    items: [], // { name, qty, price, type: 'acc' | 'fix', originalName }
    notes: [],
    total: "",
    weightInRecorded: "",
    weightInText: "",
  };

  // Helper to detect type based on name
  const isFix = (name) => {
    const lower = name.toLowerCase();
    return (
      [
        "pressure test",
        "leaks",
        "wires jammed",
        "stuck blower",
        "cut sheetrock",
        "extended wire",
        "pvc work",
        "opened ecoil",
      ].some((k) => lower.includes(k)) || lower.includes("fixed freon leaks")
    );
  };

  parts.forEach((part) => {
    const lower = part.toLowerCase();
    if (
      part === address ||
      (part === part.toUpperCase() && !part.includes("$"))
    )
      return;

    // Service
    if (
      lower.includes("ac started") ||
      lower.includes("heat started") ||
      lower.includes("ac & heat started") ||
      lower.includes("prestart system") ||
      lower.includes("finish started") ||
      lower.includes("drive run") ||
      lower.includes("service canceled")
    ) {
      data.service = part;
      const tstatMatch = part.match(
        /(\d+)\s+(t-\d+|t-4|t-6|t-10|t-8321|ecobee|daikin one|th2110|lennox|otro)\s+tstat/i
      );
      if (tstatMatch) {
        data.tstatQty = tstatMatch[1];
        data.thermostat = tstatMatch[2].toUpperCase();
      }
      const priceMatch = part.match(/\$(\d+)/);
      if (priceMatch) data.servicePrice = priceMatch[1];
      return;
    }

    // Total
    if (lower.startsWith("total $")) {
      data.total = part.replace(/total \$/i, "");
      return;
    }

    // Weight In
    if (lower.includes("weigh-in data recorded") || lower.includes("weight-in data recorded")) {
      data.weightInRecorded = "yes";
      data.weightInText = part;
      return;
    }

    // Items (Accessories & Fixes)
    const priceMatch = part.match(/\$(\d+)/);
    if (priceMatch) {
      const price = priceMatch[1];
      let name = part.replace(/\s*\$\d+/, "").trim();
      const originalName = name;
      let qty = "1";

      // Handle (2 systems)
      if (name.match(/\(2 systems\)/i)) {
        qty = "2";
        name = name.replace(/\(2 systems\)/i, "").trim();
      }

      // Normalize name for column header (remove details in parens if any, e.g. leaks)
      let cleanName = name;
      if (cleanName.includes("(")) {
        cleanName = cleanName.replace(/\s*\(.*?\)/, "").trim();
      }

      const type = isFix(cleanName) ? "fix" : "acc";
      data.items.push({
        name: cleanName,
        qty,
        price,
        type,
        originalName: originalName,
      });
    } else {
      data.notes.push(part);
    }
  });
  return data;
}

// Función para exportar reportes a CSV con columnas dinámicas
export function exportToCSV(wrappers) {
  if (wrappers.length === 0) {
    alert("No reports available to export");
    console.warn("No reports available to export");
    return;
  }

  // 1. Parse all data
  const parsedReports = wrappers.map((wrap) => {
    const entry = wrap.querySelector(".report-entry");
    const reportText = entry ? entry.textContent.trim() : "";
    const payloadRaw = wrap.dataset.reportPayload;
    let payload = null;
    try {
      payload = JSON.parse(payloadRaw);
    } catch (e) {}

    let data;
    // Prefer payload if it has the new structured format (arrays of objects with displayName)
    if (
      payload &&
      Array.isArray(payload.services) &&
      Array.isArray(payload.accessories)
    ) {
      data = {
        service: payload.services.map((s) => s.displayName).join(" + "),
        servicePrice: payload.totals?.service || 0,
        thermostat: "",
        tstatQty: "",
        items: [
          ...payload.accessories.map((a) => ({
            name: a.displayName,
            price: a.price,
            type: "acc",
            originalName: a.displayName,
          })),
          ...payload.fixes.map((f) => ({
            name: f.displayName,
            price: f.price,
            type: "fix",
            originalName: f.displayName,
          })),
        ],
        notes: payload.notes
          ? Array.isArray(payload.notes)
            ? payload.notes
            : [payload.notes]
          : [],
        total: payload.totals?.total || 0,
        weightInText: payload.weightInText || "",
      };

      // Try to extract thermostat info from payload if available, or parse from service name
      // Note: generateReportData puts thermostat info into service displayName
      // We can check if payload has explicit thermostat data (if we added it to generateReportData)
      // or fallback to parsing the service string.
      if (payload.thermostat) {
        data.thermostat = payload.thermostat.name;
        data.tstatQty = payload.thermostat.qty;
      } else {
        // Fallback parsing from service string
        const cleanService = data.service.replace(/\(2 Systems\)/gi, "");
        const tstatMatch = cleanService.match(/(\d+)\s+(.*?)\s+tstat/i);
        if (tstatMatch) {
          data.tstatQty = tstatMatch[1];
          data.thermostat = tstatMatch[2].toUpperCase();
        }
      }
    } else {
      // Fallback to text parsing for older reports
      const address = payload?.address || reportText.split(",")[0];
      data = parseReportTextToData(reportText, address);
    }

    // Add metadata
    data.date = payload?.timestamp
      ? new Date(payload.timestamp).toLocaleDateString()
      : "";
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

    // Use payload totals if available, otherwise calculate from parsed items
    if (payload && payload.totals && !data.totals) {
      data.totals = payload.totals;
    } else if (!data.totals) {
      const svcPrice = parseFloat(data.servicePrice) || 0;
      const accPrice = data.items
        .filter((i) => i.type === "acc")
        .reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
      const fixPrice = data.items
        .filter((i) => i.type === "fix")
        .reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
      data.totals = {
        totalServicePrice: svcPrice,
        totalAccessoryPrice: accPrice,
        totalFixPrice: fixPrice,
        total: data.total || svcPrice + accPrice + fixPrice,
      };
    }

    // Override notes from parser with the one from the payload, which is more reliable.
    if (payload && typeof payload.notes !== "undefined") {
      data.notes = payload.notes ? [payload.notes] : [];
    }

    return data;
  });

  // 2. Build Header
  let csv =
    "Date,Address,Subdivision,Builder,Service_Type,Service_Price,Thermostat,Tstat_Qty,Accessories,Accessories_Price,Fixes,Fixes_Price,Notes,Total," +
    "Indoor_Model,Outdoor_Model," +
    "Lineset_Length,Factory_Line_Config,Factory_Charge,Approx_Adjust,Adjusted_Charge,Fan_Speed," +
    "Liquid_Temp,Suction_Temp,Condenser_Sat_Temp,Subcooling,Subcooling_Goal,Subcooling_Deviation,Refrigerant," +
    "Indoor_Model_2,Outdoor_Model_2," +
    "Sys2_Lineset,Sys2_Line_Config,Sys2_Fact_Chg,Sys2_Appr_Adj,Sys2_Adj_Chg,Sys2_Fan_CFM," +
    "Sys2_Liq_Temp,Sys2_Suc_Temp,Sys2_Sat_Temp,Sys2_SC,Sys2_SC_Goal,Sys2_SC_Dev\n";

  // 3. Build Rows
  parsedReports.forEach((r) => {
    // Clean Service Name (remove price)
    let serviceName = r.service || "";
    serviceName = serviceName.replace(/\s*\$\d+(\.\d{2})?/, "").trim();

    // 1. Elimina la referencia a tstats y cantidad (ej: "2 Ecobee tstats")
    serviceName = serviceName.replace(/\s+\d+\s+.*?\s+tstats?$/i, "");

    // 2. Formato Prestart: "prestart system" -> "Prestart System"
    if (serviceName.toLowerCase().includes("prestart system")) {
      serviceName = serviceName.replace(/prestart system /i, "Prestart System");
    }

    // 3. Agregar "Finish" si está activo y no aparece en el texto
    const hasFinish =
      r.rawServices &&
      r.rawServices.some(
        (s) =>
          s.name === "Finish" ||
          s.name.startsWith("Finish") ||
          s.name === "AC & Heat"
      );
    if (
      hasFinish &&
      !serviceName.toLowerCase().startsWith("finish") &&
      !serviceName.toLowerCase().startsWith("ac & heat")
    ) {
      serviceName = "Finish " + serviceName;
    }

    // Agrupar Accesorios
    const accessories = r.items
      .filter((i) => i.type === "acc")
      .map((i) => `${i.originalName} $${i.price}`)
      .join("; ");

    // Agrupar Fixes
    const fixes = r.items
      .filter((i) => i.type === "fix")
      .map((i) => `${i.originalName} $${i.price}`)
      .join("; ");

    const w = r.weightData || {};
    const w2 = r.weightData2 || {};

    const row = [
      r.date,
      r.address,
      r.subdivision,
      r.builder,
      serviceName,
      r.totals.service ?? r.totals.totalServicePrice ?? "0",
      r.thermostat,
      r.tstatQty,
      accessories,
      r.totals.accessory ?? r.totals.totalAccessoryPrice ?? "0",
      fixes,
      r.totals.fix ?? r.totals.totalFixPrice ?? "0",
      r.notes.join("; "),
      r.totals.total || r.total,
      // Equipment
      r.heaterModel,
      r.outdoorModel,
      // Weight In Data Columns
      w.linesetLength || "",
      w.factoryLineConfig || "",
      w.factoryChargeOz || "",
      w.approxAdjustOz || "",
      w.adjustedOz || "",
      w.fanSpeedCfm || "",
      w.liquidLineTemp || "",
      w.suctionLineTemp || "",
      w.condenserSatTemp || "",
      w.subcoolingValue || "",
      w.oemSubcoolingGoal || "",
      w.subcoolingDeviation || "",
      r.refrigerant,
      // System 2 Equipment
      r.heaterModel2,
      r.outdoorModel2,
      // System 2 Weight Data
      w2.linesetLength || "",
      w2.factoryLineConfig || "",
      w2.factoryChargeOz || "",
      w2.approxAdjustOz || "",
      w2.adjustedOz || "",
      w2.fanSpeedCfm || "",
      w2.liquidLineTemp || "",
      w2.suctionLineTemp || "",
      w2.condenserSatTemp || "",
      w2.subcoolingValue || "",
      w2.oemSubcoolingGoal || "",
      w2.subcoolingDeviation || "",
    ].map(escapeCSV);

    csv += row.join(",") + "\n";
  });

  // Crear archivo y descargar
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Lógica para formato MM-DD-AA
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0"); // Mes (0-11) + 1
  const dd = String(now.getDate()).padStart(2, "0"); // Día
  const aa = String(now.getFullYear()).slice(-2); // Últimos 2 dígitos del año

  // Construye el string: 12-03-25
  const dateString = `${mm}-${dd}-${aa}`;

  // Nombre final: service_reports_12-03-25.csv
  const link = document.createElement("a");
  link.href = url;
  link.download = `service_reports_${dateString}.csv`;

  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
