import { showLightbox, toggleWorkspace, switchToTab, createChip } from "../ui.js";
import { heaters, unidadesExteriores, outdoorUnitLinks, normalizeAddress, STORAGE_KEYS } from "./data.js";

// --- State ---
let jobsArray = [];
let activeJobAddress = null;
let activeFilter = null;

const heaterImageMap = Object.keys(heaters || {}).reduce((acc, key) => {
  if (heaters[key].imagen) acc[key] = heaters[key].imagen;
  return acc;
}, {});
const outdoorDataMap = unidadesExteriores || {};

// --- Core CRUD ---
const findJobIndex = (address) =>
  jobsArray.findIndex((job) => job.address === normalizeAddress(address));

export const getJobs = () => jobsArray;
export const getActiveJobAddress = () => activeJobAddress;
export const setActiveJobAddress = (address) => { activeJobAddress = address; };
export const getJobByAddress = (address) =>
  jobsArray.find((job) => job.address === normalizeAddress(address));
export const setJobs = (newJobs) => { jobsArray = newJobs; };

export const addJob = (jobData) => {
  const normalized = normalizeAddress(jobData.address);
  if (findJobIndex(normalized) === -1) {
    jobsArray.push({ ...jobData, address: normalized, savedState: null });
    return true;
  }
  return false;
};

export const updateJob = (index, updatedJob) => {
  if (index >= 0 && index < jobsArray.length) {
    jobsArray[index] = { ...jobsArray[index], ...updatedJob };
    return true;
  }
  return false;
};

export const deleteJobByIndex = (index) => {
  if (index > -1) {
    jobsArray.splice(index, 1);
    return true;
  }
  return false;
};

export const saveJobState = (address, state) => {
  const index = findJobIndex(address);
  if (index !== -1) {
    jobsArray[index].savedState = JSON.parse(JSON.stringify(state));
  }
};

// --- Equipment Card ---
const createEquipCard = (labelText, modelValue, heaterImgMap, outerDataMap, secondaryModel = null) => {
  const card = document.createElement("div");
  card.classList.add("equip-card");

  const heading = document.createElement("div");
  heading.classList.add("equip-heading");
  heading.textContent = labelText;

  const model = document.createElement("div");
  model.classList.add("equip-model");
  if (secondaryModel) {
    model.innerHTML = `
      <span style="display:inline-block; margin-right:6px;"><strong>In:</strong> ${modelValue || "N/A"}</span>
      <span style="display:inline-block;"><strong>Out:</strong> ${secondaryModel}</span>
    `;
  } else {
    model.textContent = modelValue || "No equipment selected";
  }

  const imgBox = document.createElement("div");
  imgBox.classList.add("equip-image");
  const imgSrc = heaterImgMap[modelValue];

  if (imgSrc) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = imgSrc;
    img.alt = `${labelText} ${modelValue}`;
    img.onerror = () => { imgBox.textContent = "Image unavailable"; };
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      showLightbox(imgSrc, img.alt);
    });
    imgBox.appendChild(img);
  } else {
    imgBox.textContent = modelValue ? "Image unavailable" : "—";
  }

  card.appendChild(heading);
  card.appendChild(model);
  card.appendChild(imgBox);

  const techModel = secondaryModel;
  if (techModel) {
    const data = outerDataMap[techModel];
    if (data) {
      const info = document.createElement("div");
      info.classList.add("equip-info");
      info.style.display = "flex";
      info.style.flexWrap = "wrap";
      info.style.gap = "4px";
      info.style.marginTop = "6px";

      const ton = data.btu ? (data.btu / 12000).toFixed(1) : null;
      const chargeOz = data.FactoryCharge;
      const chargeLb = chargeOz ? (chargeOz / 16).toFixed(2) : null;
      const cfmTotal = data.btu && !Number.isNaN(data.btu) ? (data.btu / 12000) * 400 : null;
      const cfmMin = cfmTotal ? cfmTotal * 0.85 : null;

      const items = [
        ton ? `Ton ${ton}` : null,
        data.freon ? `${data.freon}` : null,
        chargeOz ? `${chargeOz} oz (${chargeLb} lb)` : null,
        data.overCharged !== undefined ? `Over: ${data.overCharged} oz` : null,
        cfmTotal ? `Max CFM ${Math.round(cfmTotal)}` : null,
        cfmMin ? `Min CFM ${Math.round(cfmMin)}` : null,
      ].filter(Boolean);

      items.forEach((txt) => {
        const sp = document.createElement("span");
        sp.className = "chip";
        sp.style.border = "1px solid #9ca3af";
        sp.textContent = txt;
        info.appendChild(sp);
      });
      card.appendChild(info);
    }
  }
  return card;
};

// --- Job List Rendering ---
export function renderJobsList(container, callbacks, heaterImgMap, outerDataMap) {
  jobsArray.sort((a, b) => {
    const aIP = !!a.savedState;
    const bIP = !!b.savedState;
    if (aIP && !bIP) return -1;
    if (!aIP && bIP) return 1;
    return 0;
  });

  let displayJobs = jobsArray;
  if (activeFilter) {
    displayJobs = jobsArray.filter((job) => {
      if (activeFilter.type === "builder") return job.builder === activeFilter.value;
      if (activeFilter.type === "subdivision") return job.subdivision === activeFilter.value;
      return true;
    });
  }

  const listElement = document.getElementById("jobs-list");
  listElement.innerHTML = "";

  if (jobsArray.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  // Load Sheet Summary
  const tstatCounts = {};
  const accCounts = {};
  jobsArray.forEach((job) => {
    const multiplier = job.isTwoSystems ? 2 : 1;
    if (job.thermostat && job.thermostat.type) {
      const type = job.thermostat.type;
      const qty = parseInt(job.thermostat.qty) || 1;
      tstatCounts[type] = (tstatCounts[type] || 0) + qty;
    }
    if (job.extractedAccessories && job.extractedAccessories.length > 0) {
      job.extractedAccessories.forEach((acc) => {
        accCounts[acc] = (accCounts[acc] || 0) + multiplier;
      });
    }
  });

  let summaryDiv = null;
  if (Object.keys(tstatCounts).length > 0 || Object.keys(accCounts).length > 0) {
    summaryDiv = document.createElement("details");
    summaryDiv.className = "load-sheet-summary";
    const title = document.createElement("summary");
    title.innerHTML = "<strong>📦 Load Sheet Summary</strong> (All Jobs)";
    title.style.fontSize = "0.9em";
    summaryDiv.appendChild(title);

    const chipsDiv = document.createElement("div");
    chipsDiv.style.marginTop = "8px";
    chipsDiv.style.display = "flex";
    chipsDiv.style.flexWrap = "wrap";
    chipsDiv.style.gap = "6px";

    Object.entries(tstatCounts).forEach(([type, count]) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.border = "1px solid #60a5fa";
      chip.style.backgroundColor = "#eff6ff";
      chip.style.color = "#1e40af";
      chip.textContent = `${count}x ${type}`;
      chipsDiv.appendChild(chip);
    });
    Object.entries(accCounts).forEach(([name, count]) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.border = "1px solid #34d399";
      chip.style.backgroundColor = "#ecfdf5";
      chip.style.color = "#065f46";
      chip.textContent = `${count}x ${name}`;
      chipsDiv.appendChild(chip);
    });
    summaryDiv.appendChild(chipsDiv);
  }

  // Filter Bar
  if (activeFilter) {
    const filterBar = document.createElement("div");
    filterBar.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-bottom:10px;background-color:var(--button-bg);border:1px solid var(--button-bg-active);border-radius:8px;color:var(--text-color)";
    const filterText = document.createElement("span");
    filterText.innerHTML = `Filter: <strong>${activeFilter.value}</strong>`;
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear ✕";
    clearBtn.className = "btn";
    clearBtn.style.cssText = "padding:4px 10px;font-size:0.8em;min-height:auto";
    clearBtn.onclick = () => {
      activeFilter = null;
      renderJobsList(container, callbacks, heaterImgMap, outerDataMap);
    };
    filterBar.appendChild(filterText);
    filterBar.appendChild(clearBtn);
    listElement.appendChild(filterBar);
  }

  const fragment = document.createDocumentFragment();

  const pushChip = (cont, value, variant = "default") => {
    if (!value) return;
    const chip = document.createElement("span");
    chip.className = `chip chip-${variant}`;
    chip.textContent = value;
    cont.appendChild(chip);
  };

  displayJobs.forEach((job) => {
    const index = jobsArray.indexOf(job);
    const address = job.address;
    const details = job.details || "";
    const subdivision = job.subdivision || "";
    const builder = job.builder || "";
    const heaterModel = job.heaterModel || "";
    const outdoorModel = job.outdoorModel || "";
    const heaterModel2 = job.heaterModel2 || "";
    const outdoorModel2 = job.outdoorModel2 || "";

    const jobItem = document.createElement("div");
    jobItem.classList.add("job-item");
    if (activeJobAddress === address) jobItem.classList.add("active-job");

    const buttonGroup = document.createElement("div");
    buttonGroup.classList.add("job-buttons");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.classList.add("btn", "btn-delete");
    deleteButton.textContent = "";
    deleteButton.title = "Delete address";
    deleteButton.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onDelete(address); });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.classList.add("btn", "btn-edit");
    editButton.textContent = "✏️";
    editButton.title = "Edit address";
    editButton.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onEdit(address, index); });

    const mapsButton = document.createElement("button");
    mapsButton.type = "button";
    mapsButton.classList.add("btn", "btn-maps");
    mapsButton.textContent = "📍";
    mapsButton.title = "Open in Google Maps";
    mapsButton.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onMaps(address); });

    buttonGroup.appendChild(deleteButton);
    buttonGroup.appendChild(editButton);
    buttonGroup.appendChild(mapsButton);

    const topRow = document.createElement("div");
    topRow.classList.add("job-top");
    topRow.style.cssText = "display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;gap:4px;align-items:start;min-width:0";

    const addressContainer = document.createElement("div");
    addressContainer.style.cssText = "grid-column:1/2;grid-row:1/2;min-width:0";
    const label = document.createElement("strong");
    label.textContent = address;
    label.title = address;
    label.style.cssText = "font-size:1.1em;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    addressContainer.appendChild(label);
    topRow.appendChild(addressContainer);

    const spacer = document.createElement("div");
    spacer.style.cssText = "grid-column:2/3;grid-row:1/2;min-width:24px";
    topRow.appendChild(spacer);

    const metaContainer = document.createElement("div");
    metaContainer.style.cssText = "grid-column:2/3;grid-row:2/3;display:flex;flex-direction:column;align-items:flex-end;gap:4px";
    topRow.appendChild(metaContainer);

    const leftChipsContainer = document.createElement("div");
    leftChipsContainer.style.cssText = "grid-column:1/2;grid-row:2/3;display:flex;flex-wrap:wrap;gap:8px";
    topRow.appendChild(leftChipsContainer);

    if (builder) {
      const bChip = document.createElement("span");
      bChip.className = "chip";
      bChip.style.fontSize = "0.8em";
      bChip.textContent = `🏗️ ${builder}`;
      bChip.style.cursor = "pointer";
      if (activeFilter?.type === "builder" && activeFilter.value === builder) {
        bChip.style.border = "1px solid var(--button-bg-active)";
        bChip.style.backgroundColor = "var(--button-bg-hover)";
      }
      bChip.onclick = (e) => {
        e.stopPropagation();
        activeFilter = (activeFilter?.type === "builder" && activeFilter.value === builder)
          ? null : { type: "builder", value: builder };
        renderJobsList(container, callbacks, heaterImgMap, outerDataMap);
      };
      metaContainer.appendChild(bChip);
    }

    if (subdivision) {
      const sChip = document.createElement("span");
      sChip.className = "chip";
      sChip.style.fontSize = "0.8em";
      sChip.textContent = `🏘️ ${subdivision}`;
      sChip.style.cursor = "pointer";
      if (activeFilter?.type === "subdivision" && activeFilter.value === subdivision) {
        sChip.style.border = "1px solid var(--button-bg-active)";
        sChip.style.backgroundColor = "var(--button-bg-hover)";
      }
      sChip.onclick = (e) => {
        e.stopPropagation();
        activeFilter = (activeFilter?.type === "subdivision" && activeFilter.value === subdivision)
          ? null : { type: "subdivision", value: subdivision };
        renderJobsList(container, callbacks, heaterImgMap, outerDataMap);
      };
      metaContainer.appendChild(sChip);
    }

    if (job.thermostat && job.thermostat.type) {
      const tChip = document.createElement("span");
      tChip.className = "chip";
      tChip.style.cssText = "font-size:0.8em;border:1px solid #60a5fa;background-color:#eff6ff;color:#1e40af";
      tChip.textContent = `🌡️ ${job.thermostat.qty > 1 ? job.thermostat.qty + "x " : ""}${job.thermostat.type}`;
      leftChipsContainer.appendChild(tChip);
    }

    if (job.extractedAccessories && job.extractedAccessories.length > 0) {
      job.extractedAccessories.forEach((acc) => {
        const aChip = document.createElement("span");
        aChip.className = "chip";
        aChip.style.cssText = "font-size:0.8em;border:1px solid #34d399;background-color:#ecfdf5;color:#065f46";
        aChip.textContent = `📦 ${acc}`;
        leftChipsContainer.appendChild(aChip);
      });
    }

    if (job.savedState) {
      const draftBadge = document.createElement("span");
      draftBadge.className = "chip";
      draftBadge.style.cssText = "background-color:#fffbeb;color:#d97706;border:1px solid #fcd34d";
      draftBadge.textContent = "⚠️ In Progress";
      metaContainer.appendChild(draftBadge);
    }
    if (job.isTwoSystems) {
      const sysBadge = document.createElement("span");
      sysBadge.className = "chip";
      sysBadge.textContent = "2️⃣ Systems";
      leftChipsContainer.appendChild(sysBadge);
    }

    const bottomRow = document.createElement("div");
    bottomRow.classList.add("job-actions");
    bottomRow.appendChild(buttonGroup);

    const cardContent = document.createElement("div");
    cardContent.classList.add("job-face");
    cardContent.appendChild(topRow);
    cardContent.appendChild(bottomRow);

    const chipRow = document.createElement("div");
    chipRow.classList.add("job-chip-row");
    chipRow.style.display = "none";

    pushChip(chipRow, heaterModel, "primary");
    pushChip(chipRow, outdoorModel, "secondary");

    const addTechChips = (model, prefix = "") => {
      if (!model) return;
      const data = outerDataMap[model];
      if (data) {
        const ton = data.btu ? (data.btu / 12000).toFixed(1) : null;
        const chargeOz = data.FactoryCharge;
        const chargeLb = chargeOz ? (chargeOz / 16).toFixed(2) : null;
        const cfmTotal = data.btu && !Number.isNaN(data.btu) ? (data.btu / 12000) * 400 : null;
        const cfmMin = cfmTotal ? cfmTotal * 0.85 : null;
        [
          ton ? `${prefix}Ton ${ton}` : null,
          data.freon ? `${prefix}${data.freon}` : null,
          chargeOz ? `${prefix}${chargeOz} oz (${chargeLb} lb)` : null,
          data.overCharged !== undefined ? `${prefix}Over: ${data.overCharged} oz` : null,
          cfmTotal ? `${prefix}Max CFM ${Math.round(cfmTotal)}` : null,
          cfmMin ? `${prefix}Min CFM ${Math.round(cfmMin)}` : null,
        ].filter(Boolean).forEach((txt) => pushChip(chipRow, txt, "outline"));
      }
    };
    addTechChips(outdoorModel);

    if (chipRow.children.length > 0) cardContent.appendChild(chipRow);

    if (details) {
      const detailDiv = document.createElement("div");
      detailDiv.classList.add("job-detail");
      detailDiv.textContent = details;
      detailDiv.style.cssText = "font-size:9pt;margin-top:4px;color:var(--text-color)";
      cardContent.appendChild(detailDiv);
    }

    const equipGrid = document.createElement("div");
    equipGrid.classList.add("equip-grid");
    equipGrid.style.cssText = "display:none;margin-top:15px";

    equipGrid.appendChild(createEquipCard("System 1", heaterModel, heaterImgMap, outerDataMap, outdoorModel));
    if (job.isTwoSystems && (heaterModel2 || outdoorModel2)) {
      equipGrid.appendChild(createEquipCard("System 2", heaterModel2, heaterImgMap, outerDataMap, outdoorModel2));
    }
    cardContent.appendChild(equipGrid);
    jobItem.appendChild(cardContent);

    const startContainer = document.createElement("div");
    startContainer.style.display = "none";

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "btn btn-start-job";
    startBtn.innerHTML = job.savedState ? "▶️ Resume Completion" : "📝 Start Completion";
    startBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onStart(address);
    };
    startContainer.appendChild(startBtn);
    cardContent.appendChild(startContainer);

    if (job.addressHistory && job.addressHistory.length > 0) {
      const historyToggle = document.createElement("button");
      historyToggle.type = "button";
      historyToggle.className = "btn-history-toggle";
      historyToggle.textContent = `🕐 Historial (${job.addressHistory.length})`;

      const historyPanel = document.createElement("div");
      historyPanel.className = "job-history-panel";
      historyPanel.style.display = "none";

      job.addressHistory.forEach((h) => {
        const entry = document.createElement("div");
        entry.className = "job-history-entry";
        entry.textContent = h;
        historyPanel.appendChild(entry);
      });

      historyToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = historyPanel.style.display !== "none";
        historyPanel.style.display = open ? "none" : "block";
        historyToggle.textContent = open
          ? `🕐 Historial (${job.addressHistory.length})`
          : `🔼 Historial (${job.addressHistory.length})`;
      });

      cardContent.appendChild(historyToggle);
      cardContent.appendChild(historyPanel);
    }

    jobItem.addEventListener("click", (e) => {
      if (document.body.classList.contains("focus-mode")) return;
      if (e.target.closest(".btn") || e.target.closest(".btn-start-job")) return;

      const isExpanded = jobItem.classList.contains("expanded");
      document.querySelectorAll(".job-item.expanded").forEach((el) => {
        if (el === jobItem) return;
        el.classList.remove("expanded");
        const sc = el.querySelector(".btn-start-job").parentNode;
        if (sc) sc.style.display = "none";
        const c = el.querySelector(".job-chip-row");
        if (c) c.style.display = "none";
        const eg = el.querySelector(".equip-grid");
        if (eg) eg.style.display = "none";
      });

      if (!isExpanded) {
        jobItem.classList.add("expanded");
        startContainer.style.display = "block";
        equipGrid.style.display = "grid";
        const cr = cardContent.querySelector(".job-chip-row");
        if (cr) cr.style.display = "flex";
      } else {
        jobItem.classList.remove("expanded");
        startContainer.style.display = "none";
        equipGrid.style.display = "none";
        const cr = cardContent.querySelector(".job-chip-row");
        if (cr) cr.style.display = "none";
      }
    });

    if (activeJobAddress === address) {
      jobItem.classList.add("expanded");
      startContainer.style.display = "block";
      equipGrid.style.display = "grid";
      const cr = cardContent.querySelector(".job-chip-row");
      if (cr && cr.children.length > 0) cr.style.display = "flex";
    }

    fragment.appendChild(jobItem);
  });

  listElement.appendChild(fragment);
  if (summaryDiv) listElement.appendChild(summaryDiv);
}

// --- Job Manager ---
export function initJobManager(context) {
  const {
    UI,
    getState,
    setState,
    resetSelections,
    restoreUIFromState,
    saveToLocalStorage,
  } = context;

  function saveJobsToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobsArray));
  }

  function loadJobsFromLocalStorage() {
    const savedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        const loadedJobs = Array.isArray(parsed)
          ? parsed.map((item) =>
              typeof item === "string"
                ? { address: normalizeAddress(item), details: "" }
                : {
                    address: normalizeAddress(item.address),
                    details: item.details || "",
                    subdivision: item.subdivision || "",
                    builder: item.builder || "",
                    heaterModel: item.heaterModel || "",
                    outdoorModel: item.outdoorModel || "",
                    heaterModel2: item.heaterModel2 || "",
                    outdoorModel2: item.outdoorModel2 || "",
                    isTwoSystems: item.isTwoSystems || false,
                    thermostat: item.thermostat || null,
                    extractedAccessories: item.extractedAccessories || [],
                    allHeaters: item.allHeaters || [],
                    allUnits: item.allUnits || [],
                    savedState: item.savedState || null,
                    addressHistory: item.addressHistory || [],
                  }
            )
          : [];
        setJobs(loadedJobs);
      } catch (e) {
        console.error("Error parsing jobsArray:", e);
      }
    }
    _renderJobsList();
  }

  function _renderJobsList() {
    const callbacks = {
      onDelete: (addr) => deleteJob(addr),
      onEdit: (addr, idx) => editJob(addr, idx),
      onMaps: (addr) => openInMaps(addr),
      onStart: (addr) => startJob(addr),
    };
    renderJobsList(UI.jobsListContainer, callbacks, heaterImageMap, outdoorDataMap);
    if (UI.btnRouteAll) {
      UI.btnRouteAll.classList.toggle("hidden", jobsArray.length === 0);
    }
  }

  function _removeJob(address) {
    const index = jobsArray.findIndex((job) => job.address === normalizeAddress(address));
    if (index !== -1 && deleteJobByIndex(index)) {
      if (activeJobAddress === address) {
        exitFocusMode();
        UI.addressInput.value = "";
        setState({ address: "" });
      }
      _renderJobsList();
      saveJobsToLocalStorage();
      return true;
    }
    return false;
  }

  async function addJobs() {
    const addressesInput = UI.addressInput.value.trim();
    const detailsInput = UI.addressDetailsInput ? UI.addressDetailsInput.value.trim() : "";
    const subdivisionInput = UI.subdivisionInput ? UI.subdivisionInput.value.trim() : "";
    const builderInput = UI.builderInput ? UI.builderInput.value.trim() : "";
    const selectedHeater = UI.heaterModelSelect ? UI.heaterModelSelect.value : "";
    const selectedHeater2 = UI.heaterModelSelect2 ? UI.heaterModelSelect2.value : "";
    const selectedOutdoor = UI.outdoorModelSelect ? UI.outdoorModelSelect.value : "";
    const selectedOutdoor2 = UI.outdoorModelSelect2 ? UI.outdoorModelSelect2.value : "";
    const selectedTstat = UI.jobTstatSelect ? UI.jobTstatSelect.value : "";
    const selectedTstatQty = UI.jobTstatQty ? UI.jobTstatQty.value : "1";
    const selectedAcc = UI.jobAccChipsContainer
      ? Array.from(UI.jobAccChipsContainer.children).map((c) => c.dataset.value)
      : [];
    const isTwoSystems = UI.jobTwoSystemsToggle ? UI.jobTwoSystemsToggle.checked : false;

    if (!addressesInput) { alert("Por favor ingresa al menos una dirección"); return; }

    const addresses = addressesInput.split(/[\n,]+/).map((a) => a.trim()).filter(Boolean);
    if (addresses.length === 0) { alert("No se encontraron direcciones válidas"); return; }

    let historyMap = {};
    try {
      const resp = await fetch("/api/jobs/batch-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: addresses.map(normalizeAddress) }),
      });
      if (resp.ok) historyMap = await resp.json();
    } catch (_) {}

    for (const address of addresses) {
      const normalized = normalizeAddress(address);
      const history = historyMap[normalized] || [];
      const latest = history[0] || null;
      const tstatFromHistory = latest?.items?.find((i) => i.category === "Thermostat") || null;

      addJob({
        address: normalized,
        details: detailsInput,
        subdivision: subdivisionInput,
        builder: builderInput,
        heaterModel: selectedHeater || latest?.indoor_model || "",
        outdoorModel: selectedOutdoor || latest?.outdoor_model || "",
        heaterModel2: isTwoSystems ? selectedHeater2 : "",
        outdoorModel2: isTwoSystems ? selectedOutdoor2 : "",
        isTwoSystems,
        thermostat: selectedTstat
          ? { type: selectedTstat, qty: selectedTstatQty }
          : tstatFromHistory
          ? { type: tstatFromHistory.item_name, qty: tstatFromHistory.quantity }
          : null,
        extractedAccessories: selectedAcc,
        addressHistory: history,
        savedState: null,
      });
    }

    UI.addressInput.value = "";
    setState({ address: "" });
    if (UI.addressDetailsInput) UI.addressDetailsInput.value = "";
    if (UI.subdivisionInput) UI.subdivisionInput.value = "";
    if (UI.builderInput) UI.builderInput.value = "";
    if (UI.heaterModelSelect) UI.heaterModelSelect.value = "";
    if (UI.heaterModelSelect2) UI.heaterModelSelect2.value = "";
    if (UI.outdoorModelSelect) UI.outdoorModelSelect.value = "";
    if (UI.outdoorModelSelect2) UI.outdoorModelSelect2.value = "";
    [UI.heaterSeriesSelect, UI.outdoorSeriesSelect, UI.heaterSeriesSelect2, UI.outdoorSeriesSelect2].forEach((sel) => {
      if (sel) { sel.value = ""; sel.dispatchEvent(new Event("change")); }
    });
    if (UI.jobTstatSelect) UI.jobTstatSelect.value = "";
    if (UI.jobTstatQty) UI.jobTstatQty.value = "1";
    if (UI.jobAccSelect) UI.jobAccSelect.value = "";
    if (UI.jobAccChipsContainer) UI.jobAccChipsContainer.innerHTML = "";
    if (UI.jobTwoSystemsToggle) {
      UI.jobTwoSystemsToggle.checked = false;
      UI.jobTwoSystemsToggle.dispatchEvent(new Event("change"));
    }

    _renderJobsList();
    saveJobsToLocalStorage();
  }

  function deleteJob(address) {
    if (confirm(`¿Seguro que quieres eliminar esta dirección?\n\n${address}`)) {
      if (_removeJob(address)) saveToLocalStorage();
    }
  }

  function editJob(oldAddress, index) {
    const newAddress = prompt("Editar dirección:", oldAddress);
    if (newAddress && newAddress.trim() !== "") {
      const trimmedAddress = normalizeAddress(newAddress);
      if (
        jobsArray.findIndex((job) => job.address === trimmedAddress) !== -1 &&
        trimmedAddress !== normalizeAddress(oldAddress)
      ) {
        alert("Esta dirección ya existe en la lista");
        return;
      }
      updateJob(index, { address: trimmedAddress });
      if (activeJobAddress === oldAddress) {
        setActiveJobAddress(trimmedAddress);
        UI.addressInput.value = trimmedAddress;
        setState({ address: trimmedAddress });
      }
      _renderJobsList();
      saveJobsToLocalStorage();
      saveToLocalStorage();
    }
  }

  function openInMaps(address) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  }

  function openRouteAll() {
    if (jobsArray.length === 0) return;
    const addresses = jobsArray.map((j) => encodeURIComponent(normalizeAddress(j.address))).join("/");
    window.open(`https://www.google.com/maps/dir/Current+Location/${addresses}`, "_blank");
  }

  function startJob(address) {
    setActiveJobAddress(address);
    const job = getJobByAddress(address);
    if (!job) { console.error("[startJob] job not found:", address); return; }

    if (job.savedState) {
      const savedState = JSON.parse(JSON.stringify(job.savedState));
      savedState.address = address;
      setState(savedState);
    } else {
      resetSelections();
      const newState = {
        address,
        heaterModel: job.heaterModel || "",
        outdoorModel: job.outdoorModel || "",
        heaterModel2: job.heaterModel2 || "",
        outdoorModel2: job.outdoorModel2 || "",
        isTwoSystems: job.isTwoSystems || false,
      };

      if (job.thermostat && job.thermostat.type) {
        let tstatName = job.thermostat.type;
        if (UI.thermostatButtons) {
          const btn = Array.from(UI.thermostatButtons.querySelectorAll("[data-thermostat]"))
            .find((b) => b.dataset.thermostat.toLowerCase() === tstatName.toLowerCase());
          if (btn) tstatName = btn.dataset.thermostat;
        }
        newState.selectedThermostat = { name: tstatName };
        newState.thermostatQuantity = parseInt(job.thermostat.qty) || 1;
      }

      if (job.extractedAccessories && job.extractedAccessories.length > 0) {
        const accList = [];
        job.extractedAccessories.forEach((accName) => {
          let price = 0;
          let normalizedName = accName;
          if (UI.accessoryButtons) {
            const btn = Array.from(UI.accessoryButtons.querySelectorAll("[data-accessory]"))
              .find((b) => b.dataset.accessory.toLowerCase() === accName.toLowerCase());
            if (btn) { price = parseFloat(btn.dataset.price) || 0; normalizedName = btn.dataset.accessory; }
          }
          accList.push({ name: normalizedName, basePrice: price });
        });
        newState.selectedAccessories = accList;
      }

      setState(newState);
    }

    toggleWorkspace(true);
    restoreUIFromState();
    _renderJobsList();
    switchToTab("workspace");
    window.scrollTo({ top: 0, behavior: "smooth" });
    saveToLocalStorage();
  }

  function exitFocusMode() {
    saveToLocalStorage();
    setActiveJobAddress(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
    toggleWorkspace(false);
    _renderJobsList();
    switchToTab("jobs");
  }

  async function exportJobs() {
    const jobs = getJobs();
    try {
      const resp = await fetch("/api/jobs/batch-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: jobs.map((j) => j.address) }),
      });
      if (resp.ok) {
        const historyMap = await resp.json();
        jobs.forEach((job) => {
          const history = historyMap[job.address] || [];
          if (history.length > 0) {
            const latest = history[0];
            if (!job.heaterModel && latest.indoor_model) job.heaterModel = latest.indoor_model;
            if (!job.outdoorModel && latest.outdoor_model) job.outdoorModel = latest.outdoor_model;
            if (!job.thermostat && latest.items) {
              const tstatItem = latest.items.find((i) => i.category === "Thermostat");
              if (tstatItem) job.thermostat = { type: tstatItem.item_name, qty: tstatItem.quantity };
            }
          }
          job.addressHistory = history.map((r) => {
            const parts = [];
            if (r.date) parts.push(r.date);
            if (r.address) parts.push(r.address);
            if (r.notes && r.notes.trim()) parts.push(r.notes.trim());
            (r.items || []).forEach((item) => {
              const lbl = item.quantity && Number(item.quantity) !== 1 ? `${item.quantity}x ${item.item_name}` : item.item_name;
              parts.push(lbl);
            });
            try {
              const wi = r.weight_in_json ? JSON.parse(r.weight_in_json) : null;
              const wi2 = r.weight_in_2_json ? JSON.parse(r.weight_in_2_json) : null;
              const hasWi = wi && Object.values(wi).some((v) => v && String(v).trim());
              const hasWi2 = wi2 && Object.values(wi2).some((v) => v && String(v).trim());
              if (hasWi && hasWi2) parts.push("weigh-in data recorded (2 Systems)");
              else if (hasWi) parts.push("weigh-in data recorded");
              else if (hasWi2) parts.push("Sys2 weigh-in data recorded");
            } catch (_) {}
            return parts.join(", ");
          });
        });
      }
    } catch (_) {}

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "jobs_backup_" + new Date().toISOString().slice(0, 10) + ".json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function importJobs(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedJobs = JSON.parse(event.target.result);
        if (Array.isArray(importedJobs)) {
          const currentJobs = getJobs();
          const currentAddresses = new Set(currentJobs.map((j) => normalizeAddress(j.address)));
          let addedCount = 0;
          importedJobs.forEach((job) => {
            if (job.address && !currentAddresses.has(normalizeAddress(job.address))) {
              currentJobs.push(job);
              addedCount++;
            }
          });
          setJobs(currentJobs);
          saveJobsToLocalStorage();
          _renderJobsList();
          alert(`Importación completada. ${addedCount} trabajos nuevos agregados.`);
        } else {
          alert("Formato de archivo inválido. Se esperaba un array JSON.");
        }
      } catch (e) {
        console.error(e);
        alert("Error al procesar el archivo JSON.");
      }
    };
    reader.readAsText(file);
  }

  if (UI.addJobsButton) UI.addJobsButton.addEventListener("click", addJobs);
  if (UI.btnRouteAll) UI.btnRouteAll.addEventListener("click", openRouteAll);
  loadJobsFromLocalStorage();

  return {
    saveJobsToLocalStorage,
    exitFocusMode,
    refreshJobList: _renderJobsList,
    removeJobFromList: _removeJob,
    exportJobs,
    importJobs,
    openRouteAll,
  };
}
