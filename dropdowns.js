// Dynamic Dropdown Logic for Equipment Series/Models
const heaterData = {
  "ML180UH SERIES": [
    { v: "ML180UH045E36A", t: "ML180UH045E36A" },
    { v: "ML180UH070E36A", t: "ML180UH070E36A" },
    { v: "ML180UH070E36B", t: "ML180UH070E36B" },
    { v: "ML180UH090E48B", t: "ML180UH090E48B" },
    { v: "ML180UH090E60C", t: "ML180UH090E60C" },
    { v: "ML180UH110E60C", t: "ML180UH110E60C" },
    { v: "ML180UH135E60D", t: "ML180UH135E60D" },
  ],
  "ML196UH SERIES(HIGH EFFICIENCY)": [
    { v: "ML196UH030XE36B", t: "ML196UH030XE36B" },
    { v: "ML196UH045XE36B", t: "ML196UH045XE36B" },
    { v: "ML196UH070XE36B", t: "ML196UH070XE36B" },
    { v: "ML196UH070XE48B", t: "ML196UH070XE48B" },
    { v: "ML196UH090XE36C", t: "ML196UH090XE36C" },
    { v: "ML196UH090XE48C", t: "ML196UH090XE48C" },
    { v: "ML196UH090XE60C", t: "ML196UH090XE60C" },
    { v: "ML196UH110XE60C", t: "ML196UH110XE60C" },
    { v: "ML196UH135XE60D", t: "ML196UH135XE60D" },
  ],
  "ML180UHV SERIES(DIP SWITCH)": [
    { v: "ML180UH030V36A", t: "ML180UH030V36A" },
    { v: "ML180UH045V36A", t: "ML180UH045V36A" },
    { v: "ML180UH070V36A", t: "ML180UH070V36A" },
    { v: "ML180UH070V48B", t: "ML180UH070V48B" },
    { v: "ML180UH090V48B", t: "ML180UH090V48B" },
    { v: "ML180UH110V60C", t: "ML180UH110V60C" },
  ],
  "ML296UHV SERIES": [
    { v: "ML296UH045XV36B", t: "ML296UH045XV36B" },
    { v: "ML296UH070XV36B", t: "ML296UH070XV36B" },
    { v: "ML296UH090XV48C", t: "ML296UH090XV48C" },
    { v: "ML296UH110XV60C", t: "ML296UH110XV60C" },
  ],
  "EL196UH SERIES": [
    { v: "EL196UH030XE36BK", t: "EL196UH030XE36BK" },
    { v: "EL196UH045XE36BK", t: "EL196UH045XE36BK" },
    { v: "EL196UH070XE36BK", t: "EL196UH070XE36BK" },
    { v: "EL196UH090XE48CK", t: "EL196UH090XE48CK" },
    { v: "EL196UH110XE60CK", t: "EL196UH110XE60CK" },
  ],
  "CBK45UHET SERIES": [
    { v: "CBK45UHET024", t: "CBK45UHET-024" },
    { v: "CBK45UHET030", t: "CBK45UHET-030" },
    { v: "CBK45UHET036", t: "CBK45UHET-036" },
    { v: "CBK45UHET042", t: "CBK45UHET-042" },
    { v: "CBK45UHET048", t: "CBK45UHET-048" },
    { v: "CBK45UHET060", t: "CBK45UHET-060" },
  ],
  "CBA25UH SERIES": [
    { v: "CBA25UH018", t: "CBA25UH-018" },
    { v: "CBA25UH024", t: "CBA25UH-024" },
    { v: "CBA25UH030", t: "CBA25UH-030" },
    { v: "CBA25UH036", t: "CBA25UH-036" },
    { v: "CBA25UH042", t: "CBA25UH-042" },
    { v: "CBA25UH048", t: "CBA25UH-048" },
    { v: "CBA25UH060", t: "CBA25UH-060" },
  ],
  "S8X1/S8X2-S8B1": [
    { v: "S8X1A040M3PSC", t: "S8X1A040M3PSC" },
    { v: "S8X1B040M2PSC", t: "S8X1B040M2PSC" },
    { v: "S8X1B060M4PSC", t: "S8X1B060M4PSC" },
    { v: "S8X1B080M4PSC", t: "S8X1B080M4PSC" },
    { v: "S8X1C080M5PSC", t: "S8X1C080M5PSC" },
    { v: "S8X1C100M5PSC", t: "S8X1C100M5PSC" },
    { v: "S8X1D120M5PSC", t: "S8X1D120M5PSC" },
  ],
  "GR9S80 SERIES": [
    { v: "GR9S800403AU", t: "GR9S800403AU" },
    { v: "GR9S800603AU", t: "GR9S800603AU" },
    { v: "GR9S800604BU", t: "GR9S800604BU" },
    { v: "GR9S800804BU", t: "GR9S800804BU" },
    { v: "GR9S800805CU", t: "GR9S800805CU" },
  ],
  "AMSTU1300 SERIES": [
    { v: "AMST24BU", t: "AMST24BU1300AA" },
    { v: "AMST30BU", t: "AMST30BU1300AA" },
    { v: "AMST36BU", t: "AMST36BU1300AA" },
    { v: "AMST36CU", t: "AMST36CU1300AA" },
    { v: "AMST42CU", t: "AMST42CU1300AA" },
    { v: "AMST48CU", t: "AMST48CU1300AA" },
    { v: "AMST48DU", t: "AMST48DU1300AA" },
    { v: "AMST60DU", t: "AMST60DU1300AA" },
  ],
};

const outdoorData = {
  "ML17XC1 SERIES": [
    { v: "ML17XC1-018-230A02", t: "ML17XC1-018-230A02" },
    { v: "ML17XC1-024-230A02", t: "ML17XC1-024-230A02" },
    { v: "ML17XC1-030-230A02", t: "ML17XC1-030-230A02" },
    { v: "ML17XC1-036-230A02", t: "ML17XC1-036-230A02" },
    { v: "ML17XC1-042-230A02", t: "ML17XC1-042-230A02" },
    { v: "ML17XC1-047-230A02", t: "ML17XC1-047-230A02" },
    { v: "ML17XC1-059-230A02", t: "ML17XC1-059-230A02" },
    { v: "ML18XC2-036-230A01", t: "ML18XC2-036-230A01" },
    { v: "ML18XC2-048-230A01", t: "ML18XC2-048-230A01" },
  ],
  "EL17XP1 SERIES": [
    { v: "EL17XP1-18", t: "EL17XP1-018-230A01" },
    { v: "EL17XP1-24", t: "EL17XP1-024-230A01" },
    { v: "EL17XP1-30", t: "EL17XP1-030-230A01" },
    { v: "EL17XP1-36", t: "EL17XP1-036-230A01" },
    { v: "EL17XP1-42", t: "EL17XP1-042-230A01" },
    { v: "EL17XP1-48", t: "EL17XP1-048-230A01" },
    { v: "EL17XP1-60", t: "EL17XP1-060-230A01" },
  ],
  "ML14KC1 SERIES": [
    { v: "ML14KC1-018-230A02", t: "ML14KC1-018-230A02" },
    { v: "ML14KC1-024-230A02", t: "ML14KC1-024-230A02" },
    { v: "ML14KC1-030-230A02", t: "ML14KC1-030-230A02" },
    { v: "ML14KC1-036-230A02", t: "ML14KC1-036-230A02" },
    { v: "ML14KC1-041-230A02", t: "ML14KC1-041-230A02" },
    { v: "ML14KC1-042-230A02", t: "ML14KC1-042-230A02" },
    { v: "ML14KC1-047-230A02", t: "ML14KC1-047-230A02" },
    { v: "ML14KC1-048-230A02", t: "ML14KC1-048-230A02" },
    { v: "ML14KC1-059-230A02", t: "ML14KC1-059-230A02" },
    { v: "ML14KC1-060-230A02", t: "ML14KC1-060-230A02" },
  ],
  "ML17KC2 SERIES": [
    { v: "ML17KC2-024-230A01", t: "ML17KC2-024-230A01" },
    { v: "ML17KC2-036-230A01", t: "ML17KC2-036-230A01" },
    { v: "ML17KC2-048-230A01", t: "ML17KC2-048-230A01" },
    { v: "ML17KC2-060-230A01", t: "ML17KC2-060-230A01" },
  ],
  "4TTR SERIES": [
    { v: "4TTR6024N1000AA", t: "4TTR6024N1000AA" },
    { v: "4TTR5042A1000AA", t: "4TTR5042A1000AA" },
    { v: "4TTR5048A1000AA", t: "4TTR5048A1000AA" },
    { v: "4TTR5060A1000AA", t: "4TTR5060A1000AA" },
  ],
  "5TTR SERIES": [
    { v: "5TTR5018", t: "5TTR5018A1000A" },
    { v: "5TTR5024", t: "5TTR5024A1000A" },
    { v: "5TTR5030", t: "5TTR5030A1000A/B" },
    { v: "5TTR5036", t: "5TTR5036A1000A/B" },
    { v: "5TTR5042", t: "5TTR5042A1000A" },
    { v: "5TTR5048", t: "5TTR5048A1000A/B" },
    { v: "5TTR5060", t: "5TTR5060A1000A/B" },
  ],
  "GLXS4BA SERIES": [
    { v: "GLXS4BA1810AA", t: "GLXS4BA1810AA" },
    { v: "GLXS4BA2410AA", t: "GLXS4BA2410AA" },
    { v: "GLXS4BA3010AA", t: "GLXS4BA3010AA" },
    { v: "GLXS4BA3610AA", t: "GLXS4BA3610AA" },
    { v: "GLXS4BA4210AA", t: "GLXS4BA4210AA" },
    { v: "GLXS4BA4810AA", t: "GLXS4BA4810AA" },
    { v: "GLXS4BA6010AA", t: "GLXS4BA6010AA" },
  ],
  "GLXS5BA SERIES": [
    { v: "GLXS5BA1810AA", t: "GLXS5BA1810AA" },
    { v: "GLXS5BA2410AA", t: "GLXS5BA2410AA" },
    { v: "GLXS5BA3010AA", t: "GLXS5BA3010AA" },
    { v: "GLXS5BA3610AA", t: "GLXS5BA3610AA" },
    { v: "GLXS5BA4210AA", t: "GLXS5BA4210AA" },
    { v: "GLXS5BA4810AA", t: "GLXS5BA4810AA" },
    { v: "GLXS5BA6010AA", t: "GLXS5BA6010AA" },
  ],
  "GLZS4BA SERIES": [
    { v: "GLZS4BA1810AA", t: "GLZS4BA1810AA" },
    { v: "GLZS4BA2410AA", t: "GLZS4BA2410AA" },
    { v: "GLZS4BA3010AA", t: "GLZS4BA3010AA" },
    { v: "GLZS4BA3610AA", t: "GLZS4BA3610AA" },
    { v: "GLZS4BA4210AA", t: "GLZS4BA4210AA" },
    { v: "GLZS4BA4810AA", t: "GLZS4BA4810AA" },
    { v: "GLZS4BA6010AA", t: "GLZS4BA6010AA" },
  ],
};

// Modal Logic
const modal = document.getElementById("model-selection-modal");
const modalList = document.getElementById("modal-list");
const modalTitleEl = document.getElementById("modal-title");
const modalCloseBtn = document.getElementById("modal-close-btn");

function openModelModal(title, items, onSelect) {
  modalTitleEl.textContent = title;
  modalList.innerHTML = "";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "model-list-item";
    div.textContent = item.t;
    div.onclick = () => {
      onSelect(item);
      closeModelModal();
    };
    modalList.appendChild(div);
  });

  modal.classList.add("active");
}

function closeModelModal() {
  modal.classList.remove("active");
}

modalCloseBtn.addEventListener("click", closeModelModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModelModal();
});

function setupDropdowns(
  seriesId,
  modelId,
  btnId,
  data,
  defaultSeriesText,
  modalTitle,
  linksData,
  linksContainerId,
  technicalData,
  imageLabel = "View Image"
) {
  const seriesSelect = document.getElementById(seriesId);
  const modelSelect = document.getElementById(modelId); // Hidden select
  const modelBtn = document.getElementById(btnId); // Trigger button
  const linksContainer = document.getElementById(linksContainerId);

  // Clear and set default option
  seriesSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultSeriesText;
  seriesSelect.appendChild(defaultOption);

  // Populate Series
  for (const series in data) {
    const option = document.createElement("option");
    option.value = series;
    option.textContent = series;
    seriesSelect.appendChild(option);
  }

  // Helper to find series by model
  const findSeries = (model) =>
    Object.keys(data).find((series) => data[series].some((m) => m.v === model));

  // Initialize state if model is already selected (e.g. from localStorage)
  setTimeout(() => {
    if (modelSelect.value) {
      const series = findSeries(modelSelect.value);
      if (series) {
        seriesSelect.value = series;
        modelBtn.disabled = false;
        // Find model text
        const modelItem = data[series].find((m) => m.v === modelSelect.value);
        if (modelItem) modelBtn.textContent = modelItem.t;
      }
    }
  }, 500);

  // Function to open modal logic
  const triggerModal = () => {
    const selectedSeries = seriesSelect.value;
    if (!selectedSeries || !data[selectedSeries]) return;

    openModelModal(modalTitle, data[selectedSeries], (item) => {
      modelSelect.value = item.v;
      modelBtn.textContent = item.t;
      modelSelect.dispatchEvent(new Event("change"));
    });
  };

  // Function to update links
  const updateLinks = (seriesName) => {
    if (!linksContainer || !linksData) return;
    linksContainer.innerHTML = "";

    if (!seriesName) return;

    // Intentar encontrar la clave correcta en linksData
    // 1. Coincidencia exacta
    // 2. Coincidencia parcial (ej: "ML17XC1 SERIES" -> "ML17XC1")
    let linkInfo = linksData[seriesName];
    if (!linkInfo) {
      const cleanName = seriesName.replace(" SERIES", "").trim();
      linkInfo = linksData[cleanName];
    }

    if (linkInfo) {
      const links = [];
      const createLink = (url, text) =>
        `<a href="${url}" target="_blank" style="margin-right: 12px; text-decoration: underline; color: var(--button-bg-active, #2563eb); font-weight: 500;">${text}</a>`;

      if (linkInfo.serviceManual)
        links.push(createLink(linkInfo.serviceManual, "📄 Service Manual"));
      if (linkInfo.installManual)
        links.push(createLink(linkInfo.installManual, "📄 Install Manual"));

      if (linkInfo.blowerSpeedImage) {
        links.push(
          createLink(
            linkInfo.blowerSpeedImage,
            `🖼️ ${linkInfo.blowerSpeedText || "Blower Speed"}`
          )
        );
      }

      const vendorUrl =
        linkInfo.lennoxPros ||
        linkInfo.trane ||
        linkInfo.goodman ||
        linkInfo.traneSupply;
      const vendorText =
        linkInfo.linkText || linkInfo.supplyLinkText || "Vendor Site";
      if (vendorUrl) links.push(createLink(vendorUrl, `🌐 ${vendorText}`));

      linksContainer.innerHTML = links.join("");
    }
  };

  // Function to update model specific links (e.g. Blower Speed Image)
  const updateModelLinks = () => {
    const model = modelSelect.value;
    // Remove existing model link if any
    const existingLink = linksContainer.querySelector(".model-spec-link");
    if (existingLink) existingLink.remove();

    if (
      model &&
      technicalData &&
      technicalData[model] &&
      technicalData[model].imagen
    ) {
      const link = document.createElement("a");
      link.href = "#";
      link.className = "model-spec-link";
      link.style.marginRight = "12px";
      link.style.textDecoration = "underline";
      link.style.color = "var(--button-bg-active, #2563eb)";
      link.style.fontWeight = "500";
      link.innerHTML = `🖼️ ${imageLabel}`;
      link.onclick = (e) => {
        e.preventDefault();
        if (window.showLightbox) {
          window.showLightbox(
            technicalData[model].imagen,
            `${imageLabel} - ${model}`
          );
        } else {
          window.open(technicalData[model].imagen, "_blank");
        }
      };
      linksContainer.appendChild(link);
    }
  };

  // Handle Change
  seriesSelect.addEventListener("change", function () {
    const selectedSeries = this.value;
    modelSelect.value = "";
    modelBtn.textContent = "Select Model";

    if (selectedSeries) {
      modelBtn.disabled = false;
      triggerModal(); // Auto-open modal
      updateLinks(selectedSeries);
    } else {
      modelBtn.disabled = true;
      updateLinks(null);
    }
    // Dispatch change to clear state
    modelSelect.dispatchEvent(new Event("change"));
  });

  // Listen for model changes to update model-specific links
  modelSelect.addEventListener("change", updateModelLinks);

  // Handle Button Click
  modelBtn.addEventListener("click", triggerModal);
}

document.addEventListener("DOMContentLoaded", () => {
  // Obtener datos globales de enlaces (definidos en weightInData.js)
  const sLinks = window.seriesLinks || {};
  const oLinks = window.outdoorUnitLinks || {};
  const heatersTech = window.heaters || {};
  const outdoorTech = window.unidadesExteriores || {};

  setupDropdowns(
    "job-heater-series",
    "job-heater-model",
    "btn-heater-model",
    heaterData,
    "Select Heater Series",
    "Select Heater Model",
    sLinks,
    "job-heater-links",
    heatersTech,
    "Blower Speed"
  );

  setupDropdowns(
    "job-outdoor-series",
    "job-outdoor-model",
    "btn-outdoor-model",
    outdoorData,
    "Select Outdoor Series",
    "Select Outdoor Unit",
    oLinks,
    "job-outdoor-links",
    outdoorTech,
    "Unit Specs"
  );
});
