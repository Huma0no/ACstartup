import { showLightbox } from "./ui.js";
import { outdoorUnitLinks } from "./weightInData.js";
import { normalizeAddress } from "./utils.js";
import { getMode, startLlamada } from "./routeTracker.js";

let jobsArray = [];
let activeJobAddress = null;
let activeFilter = null;

// Helper to find job index
const findJobIndex = (address) =>
  jobsArray.findIndex((job) => job.address === normalizeAddress(address));

export const getJobs = () => jobsArray;

export const getActiveJobAddress = () => activeJobAddress;

export const setActiveJobAddress = (address) => {
  activeJobAddress = address;
};

export const getJobByAddress = (address) =>
  jobsArray.find((job) => job.address === normalizeAddress(address));

export const setJobs = (newJobs) => {
  jobsArray = newJobs;
};

export const addJob = (jobData) => {
  const normalized = normalizeAddress(jobData.address);
  if (findJobIndex(normalized) === -1) {
    jobsArray.push({
      ...jobData,
      address: normalized,
      savedState: null,
    });
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

// Helper for creating equipment cards
const createEquipCard = (
  labelText,
  modelValue,
  heaterImageMap,
  outdoorDataMap,
  secondaryModel = null
) => {
  const card = document.createElement("div");
  card.classList.add("equip-card");

  const heading = document.createElement("div");
  heading.classList.add("equip-heading");
  heading.textContent = labelText;

  const model = document.createElement("div");
  model.classList.add("equip-model");
  if (secondaryModel) {
    model.innerHTML = `
      <span style="display:inline-block; margin-right:6px;"><strong>In:</strong> ${
        modelValue || "N/A"
      }</span>
      <span style="display:inline-block;"><strong>Out:</strong> ${secondaryModel}</span>
    `;
  } else {
    model.textContent = modelValue || "No equipment selected";
  }

  const imgBox = document.createElement("div");
  imgBox.classList.add("equip-image");
  const imgSrc = heaterImageMap[modelValue];

  if (imgSrc) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = imgSrc;
    img.alt = `${labelText} ${modelValue}`;
    img.onerror = () => {
      imgBox.textContent = "Image unavailable";
    };
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
    const data = outdoorDataMap[techModel];
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
      const cfmTotal =
        data.btu && !Number.isNaN(data.btu) ? (data.btu / 12000) * 400 : null;
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

export function renderJobsList(
  container,
  callbacks,
  heaterImageMap,
  outdoorDataMap
) {
  // Ordenar: Trabajos "In Progress" primero
  jobsArray.sort((a, b) => {
    const aInProgress = !!a.savedState;
    const bInProgress = !!b.savedState;
    if (aInProgress && !bInProgress) return -1;
    if (!aInProgress && bInProgress) return 1;
    return 0;
  });

  // Filter logic
  let displayJobs = jobsArray;
  if (activeFilter) {
    displayJobs = jobsArray.filter((job) => {
      if (activeFilter.type === "builder")
        return job.builder === activeFilter.value;
      if (activeFilter.type === "subdivision")
        return job.subdivision === activeFilter.value;
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

  // --- Summary Section (Load Sheet) ---
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

  if (
    Object.keys(tstatCounts).length > 0 ||
    Object.keys(accCounts).length > 0
  ) {
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

  // Render Filter UI
  if (activeFilter) {
    const filterBar = document.createElement("div");
    filterBar.style.display = "flex";
    filterBar.style.justifyContent = "space-between";
    filterBar.style.alignItems = "center";
    filterBar.style.padding = "8px 12px";
    filterBar.style.marginBottom = "10px";
    filterBar.style.backgroundColor = "var(--button-bg)";
    filterBar.style.border = "1px solid var(--button-bg-active)";
    filterBar.style.borderRadius = "8px";
    filterBar.style.color = "var(--text-color)";

    const filterText = document.createElement("span");
    filterText.innerHTML = `Filter: <strong>${activeFilter.value}</strong>`;

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear ✕";
    clearBtn.className = "btn";
    clearBtn.style.padding = "4px 10px";
    clearBtn.style.fontSize = "0.8em";
    clearBtn.style.minHeight = "auto";
    clearBtn.onclick = () => {
      activeFilter = null;
      renderJobsList(container, callbacks, heaterImageMap, outdoorDataMap);
    };

    filterBar.appendChild(filterText);
    filterBar.appendChild(clearBtn);
    listElement.appendChild(filterBar);
  }

  const fragment = document.createDocumentFragment();

  const pushChip = (container, value, variant = "default") => {
    if (!value) return;
    const chip = document.createElement("span");
    chip.className = `chip chip-${variant}`;
    chip.textContent = value;
    container.appendChild(chip);
  };

  displayJobs.forEach((job) => {
    const index = jobsArray.indexOf(job); // Get original index for callbacks
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

    if (activeJobAddress === address) {
      jobItem.classList.add("active-job");
    }

    const buttonGroup = document.createElement("div");
    buttonGroup.classList.add("job-buttons");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.classList.add("btn", "btn-delete");
    deleteButton.textContent = "";
    deleteButton.title = "Delete address";
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onDelete(address);
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.classList.add("btn", "btn-edit");
    editButton.textContent = "✏️";
    editButton.title = "Edit address";
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onEdit(address, index);
    });

    const mapsButton = document.createElement("button");
    mapsButton.type = "button";
    mapsButton.classList.add("btn", "btn-maps");
    const isTraveling = getMode() === "trayecto";
    mapsButton.textContent = isTraveling ? "⏱" : "📍";
    mapsButton.title = isTraveling ? "En trayecto…" : "Open in Google Maps";
    if (isTraveling) mapsButton.classList.add("btn-maps--active");
    mapsButton.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onMaps(address);
    });

    buttonGroup.appendChild(deleteButton);
    buttonGroup.appendChild(editButton);
    buttonGroup.appendChild(mapsButton);

    const topRow = document.createElement("div");
    topRow.classList.add("job-top");
    topRow.style.display = "grid";
    topRow.style.gridTemplateColumns = "1fr auto";
    topRow.style.gridTemplateRows = "auto auto";
    topRow.style.gap = "4px";
    topRow.style.alignItems = "start";
    topRow.style.minWidth = "0";

    // Row 1, Col 1: Address
    const addressContainer = document.createElement("div");
    addressContainer.style.gridColumn = "1 / 2";
    addressContainer.style.gridRow = "1 / 2";
    addressContainer.style.minWidth = "0";
    const label = document.createElement("strong");
    label.textContent = address;
    label.title = address; // full address visible on hover/long-press
    label.style.fontSize = "1.1em";
    label.style.display = "block";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.whiteSpace = "nowrap";
    addressContainer.appendChild(label);
    topRow.appendChild(addressContainer);

    // Row 1, Col 2: Spacer for Delete Button
    const spacer = document.createElement("div");
    spacer.style.gridColumn = "2 / 3";
    spacer.style.gridRow = "1 / 2";
    spacer.style.minWidth = "24px";
    topRow.appendChild(spacer);

    // Row 2, Col 2: Meta Chips (Builder, Subdivision)
    const metaContainer = document.createElement("div");
    metaContainer.style.gridColumn = "2 / 3";
    metaContainer.style.gridRow = "2 / 3";
    metaContainer.style.display = "flex";
    metaContainer.style.flexDirection = "column";
    metaContainer.style.alignItems = "flex-end";
    metaContainer.style.gap = "4px";
    topRow.appendChild(metaContainer);

    // Row 2, Col 1: Technical Chips (Tstat, Acc, 2 Systems)
    const leftChipsContainer = document.createElement("div");
    leftChipsContainer.style.gridColumn = "1 / 2";
    leftChipsContainer.style.gridRow = "2 / 3";
    leftChipsContainer.style.display = "flex";
    leftChipsContainer.style.flexWrap = "wrap";
    leftChipsContainer.style.gap = "8px";
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
        if (
          activeFilter?.type === "builder" &&
          activeFilter.value === builder
        ) {
          activeFilter = null;
        } else {
          activeFilter = { type: "builder", value: builder };
        }
        renderJobsList(container, callbacks, heaterImageMap, outdoorDataMap);
      };
      metaContainer.appendChild(bChip); // Mover a la derecha
    }

    if (subdivision) {
      const sChip = document.createElement("span");
      sChip.className = "chip";
      sChip.style.fontSize = "0.8em";
      sChip.textContent = `🏘️ ${subdivision}`;
      sChip.style.cursor = "pointer";
      if (
        activeFilter?.type === "subdivision" &&
        activeFilter.value === subdivision
      ) {
        sChip.style.border = "1px solid var(--button-bg-active)";
        sChip.style.backgroundColor = "var(--button-bg-hover)";
      }
      sChip.onclick = (e) => {
        e.stopPropagation();
        if (
          activeFilter?.type === "subdivision" &&
          activeFilter.value === subdivision
        ) {
          activeFilter = null;
        } else {
          activeFilter = { type: "subdivision", value: subdivision };
        }
        renderJobsList(container, callbacks, heaterImageMap, outdoorDataMap);
      };
      metaContainer.appendChild(sChip); // Mover a la derecha
    }

    // Mostrar Tstat y Accesorios aquí (junto con builder) con colores diferenciados
    if (job.thermostat && job.thermostat.type) {
      const tChip = document.createElement("span");
      tChip.className = "chip";
      tChip.style.fontSize = "0.8em";
      // Estilo diferenciado (Azul suave)
      tChip.style.border = "1px solid #60a5fa";
      tChip.style.backgroundColor = "#eff6ff";
      tChip.style.color = "#1e40af";
      tChip.textContent = `🌡️ ${
        job.thermostat.qty > 1 ? job.thermostat.qty + "x " : ""
      }${job.thermostat.type}`;
      leftChipsContainer.appendChild(tChip); // Mantener a la izquierda
    }

    if (job.extractedAccessories && job.extractedAccessories.length > 0) {
      job.extractedAccessories.forEach((acc) => {
        const aChip = document.createElement("span");
        aChip.className = "chip";
        aChip.style.fontSize = "0.8em";
        // Estilo diferenciado (Verde suave)
        aChip.style.border = "1px solid #34d399";
        aChip.style.backgroundColor = "#ecfdf5";
        aChip.style.color = "#065f46";
        aChip.textContent = `📦 ${acc}`;
        leftChipsContainer.appendChild(aChip); // Mantener a la izquierda
      });
    }

    if (job.savedState) {
      const draftBadge = document.createElement("span");
      draftBadge.className = "chip";
      draftBadge.style.backgroundColor = "#fffbeb";
      draftBadge.style.color = "#d97706";
      draftBadge.style.border = "1px solid #fcd34d";
      draftBadge.textContent = "⚠️ In Progress";
      metaContainer.appendChild(draftBadge); // Mover a la derecha (stack)
    }
    if (job.isTwoSystems) {
      const sysBadge = document.createElement("span");
      sysBadge.className = "chip";
      sysBadge.textContent = "2️⃣ Systems";
      leftChipsContainer.appendChild(sysBadge); // Mover a la izquierda (Row 2 Col 1)
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
      const data = outdoorDataMap[model];
      if (data) {
        const ton = data.btu ? (data.btu / 12000).toFixed(1) : null;
        const chargeOz = data.FactoryCharge;
        const chargeLb = chargeOz ? (chargeOz / 16).toFixed(2) : null;
        const cfmTotal =
          data.btu && !Number.isNaN(data.btu) ? (data.btu / 12000) * 400 : null;
        const cfmMin = cfmTotal ? cfmTotal * 0.85 : null;
        const tonChip = ton ? `${prefix}Ton ${ton}` : null;
        const typeChip = data.freon ? `${prefix}${data.freon}` : null;
        const chargeChip = chargeOz
          ? `${prefix}${chargeOz} oz (${chargeLb} lb)`
          : null;
        const ocChip =
          data.overCharged !== undefined
            ? `${prefix}Over: ${data.overCharged} oz`
            : null;
        const maxCfmChip = cfmTotal
          ? `${prefix}Max CFM ${Math.round(cfmTotal)}`
          : null;
        const minCfmChip = cfmMin
          ? `${prefix}Min CFM ${Math.round(cfmMin)}`
          : null;
        [tonChip, typeChip, chargeChip, ocChip, maxCfmChip, minCfmChip]
          .filter(Boolean)
          .forEach((txt) => pushChip(chipRow, txt, "outline"));
      }
    };

    addTechChips(outdoorModel);

    if (chipRow.children.length > 0) {
      cardContent.appendChild(chipRow);
    }

    if (details) {
      const detailDiv = document.createElement("div");
      detailDiv.classList.add("job-detail");
      detailDiv.textContent = details;
      detailDiv.style.fontSize = "9pt";
      detailDiv.style.marginTop = "4px";
      detailDiv.style.color = "var(--text-color)";
      cardContent.appendChild(detailDiv);
    }

    const equipGrid = document.createElement("div");
    equipGrid.classList.add("equip-grid");
    equipGrid.style.display = "none";
    equipGrid.style.marginTop = "15px";

    equipGrid.appendChild(
      createEquipCard(
        "System 1",
        heaterModel,
        heaterImageMap,
        outdoorDataMap,
        outdoorModel
      )
    );
    if (job.isTwoSystems && (heaterModel2 || outdoorModel2)) {
      equipGrid.appendChild(
        createEquipCard(
          "System 2",
          heaterModel2,
          heaterImageMap,
          outdoorDataMap,
          outdoorModel2
        )
      );
    }
    cardContent.appendChild(equipGrid);
    jobItem.appendChild(cardContent);

    const startContainer = document.createElement("div");
    startContainer.style.display = "none";

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "btn btn-start-job";
    const inTrayecto = !job.savedState && getMode() === "trayecto";
    startBtn.innerHTML = job.savedState
      ? "▶️ Resume Completion"
      : inTrayecto
        ? "⏱ Iniciar Llamada"
        : "📝 Start Completion";
    startBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (inTrayecto) startLlamada();
      callbacks.onStart(address);
    };
    startContainer.appendChild(startBtn);
    cardContent.appendChild(startContainer);

    jobItem.addEventListener("click", (e) => {
      if (document.body.classList.contains("focus-mode")) return;
      if (e.target.closest(".btn") || e.target.closest(".btn-start-job"))
        return;

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

  if (summaryDiv) {
    listElement.appendChild(summaryDiv);
  }
}
