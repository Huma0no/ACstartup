import { calculateFinancials } from "./pricing.js";
import { heaters, unidadesExteriores } from "./weightInData.js";
import {
  showLightbox,
  hideErrorDialog,
  showValidationErrors,
  hideValidationErrors,
  revealSection,
  hideSection,
  highlightInputErrors,
  toggleWorkspace,
  createChip,
  initTabs,
  initStepper,
  updateStepper,
  switchToTab,
  showUndoToast,
  showToast,
  initThemeSwitcher,
  populateSelect,
  setupDynamicModelVisibility,
} from "./ui.js";
import {
  generateReportText,
  generateReportData,
  createReportCard,
  exportToCSV,
  shareReportVia,
} from "./reports.js";
import { initQuickCalc } from "./quickCalc.js";
import {
  saveJobState,
  getActiveJobAddress,
  setActiveJobAddress,
  getJobByAddress,
} from "./jobs.js";
import {
  getState,
  setState,
  resetState,
  hasWeightInData,
  defaultWeightInData,
  subscribe,
} from "./state.js";
import { initWeightInLogic } from "./weightInLogic.js";
import {
  APP_ICON_URL,
  STORAGE_KEYS,
  SERVICES,
  ACCESSORIES,
  FIXES,
  OPTIONS,
} from "./constants.js";
import { debounce } from "./utils.js";
import { validateState } from "./validation.js";
import { Components } from "./components.js";
import { initImageManager } from "./imageManager.js";
import { initJobManager } from "./jobManager.js";

// Objeto central para referencias del DOM (Mejora de Mantenimiento y Escalado)
const UI = {};

const init = () => {
  let imageManager; // Declarar aquí para acceso en callbacks
  // DOM Elements
  // Agrupamos en el objeto UI para acceso global dentro del módulo si fuera necesario,
  // o fácil paso de parámetros.
  UI.addressInput = document.getElementById("address");
  UI.serviceTypeButtons = document.getElementById("service-type-buttons");
  UI.serviceOptionsDisplay = document.getElementById("service-options-display");
  UI.acHeatOptions = document.getElementById("ac-heat-options");
  UI.thermostatButtons = document.getElementById("thermostat-buttons");
  UI.thermostatQuantity = document.getElementById("thermostat-quantity");
  UI.thermostatOtro = document.getElementById("thermostat-otro");
  UI.thermostatOtroName = document.getElementById("thermostat-otro-name");
  UI.quantitySelector = document.getElementById("quantity-selector");
  UI.accessoryButtons = document.getElementById("accessory-buttons");
  UI.accessoryOtro = document.getElementById("accessory-otro");
  UI.otroNameInput = document.getElementById("otro-name");
  UI.otroPriceInput = document.getElementById("otro-price");
  UI.btnAddOtroAccessory = document.getElementById("btn-add-otro-accessory");
  UI.customAccessoriesList = document.getElementById("custom-accessories-list");
  UI.fixesSection = document.getElementById("fixes-section");
  UI.fixOtro = document.getElementById("fix-otro");
  UI.fixOtroNameInput = document.getElementById("fix-otro-name");
  UI.fixOtroPriceInput = document.getElementById("fix-otro-price");
  UI.btnAddOtroFix = document.getElementById("btn-add-otro-fix");
  UI.customFixesList = document.getElementById("custom-fixes-list");
  UI.weightInContent = document.getElementById("weight-in-content");
  UI.weightInSystem2 = document.getElementById("weight-in-system-2");

  const weightInFieldConfigs = [
    { key: "linesetLength", id: "weight-lineset-length", label: "Length (ft)" },
    { key: "factoryChargeOz", id: "weight-factory-charge", label: "Fact. Chg" },
    {
      key: "factoryLineConfig",
      id: "weight-liquid-diameter",
      label: "Line Dia.",
    },
    {
      key: "approxAdjustOz",
      id: "weight-approx-adjust",
      label: "Ref to add(oz)",
    },
    { key: "adjustedOz", id: "weight-adjusted", label: "Ref added(oz)" },
    { key: "fanSpeedCfm", id: "weight-fan-speed", label: "Fan CFM" },
    { key: "liquidLineTemp", id: "weight-liquid-temp", label: "Liq. Temp" },
    { key: "suctionLineTemp", id: "weight-suction-temp", label: "Suc. Temp" },
    {
      key: "condenserSatTemp",
      id: "weight-condenser-temp",
      label: "Sat. Temp",
    },
    {
      key: "subcoolingValue",
      id: "weight-subcooling-value",
      label: "SC Actual",
    },
    { key: "oemSubcoolingGoal", id: "weight-oem-goal", label: "SC Goal" },
    {
      key: "subcoolingDeviation",
      id: "weight-subcooling-deviation",
      label: "SC Dev",
    },
  ];
  const weightInInputs = weightInFieldConfigs.reduce(
    (acc, { key, id, label }) => {
      const el = document.getElementById(id);
      acc[key] = el;
      if (el) {
        // Abbreviate labels for better fit
        const labelEl = el.closest(".weight-in-field")?.querySelector("span");
        if (labelEl && label) {
          labelEl.textContent = label;
        }

        if (el.tagName === "INPUT" && key !== "factoryLineConfig") {
          el.type = "number";
          el.step = "any";
        }
        // Make calculated fields read-only to indicate autofill
        if (
          ["subcoolingValue", "subcoolingDeviation", "approxAdjustOz"].includes(
            key
          )
        ) {
          el.readOnly = true;
          el.classList.add("input-readonly");
        }
        const clearError = () => el.classList.remove("input-error");
        el.addEventListener("input", clearError);
        el.addEventListener("change", clearError);
      }
      return acc;
    },
    {}
  );

  UI.weightInInputs = weightInInputs;

  // --- SYSTEM 2 WEIGHT-IN INPUTS ---
  const weightInInputs2 = weightInFieldConfigs.reduce(
    (acc, { key, id, label }) => {
      // Asumimos que los IDs del sistema 2 tienen el sufijo "-2"
      const el = document.getElementById(id + "-2");
      acc[key] = el;
      if (el) {
        if (el.tagName === "INPUT" && key !== "factoryLineConfig") {
          el.type = "number";
          el.step = "any";
        }
        // Make calculated fields read-only
        if (
          ["subcoolingValue", "subcoolingDeviation", "approxAdjustOz"].includes(
            key
          )
        ) {
          el.readOnly = true;
          el.classList.add("input-readonly");
        }
        const clearError = () => el.classList.remove("input-error");
        el.addEventListener("input", clearError);
        el.addEventListener("change", clearError);
      }
      return acc;
    },
    {}
  );
  UI.weightInInputs2 = weightInInputs2;

  UI.notesInput = document.getElementById("notes");
  UI.notesSection = document.getElementById("notes-section");
  UI.generateReportButton = document.getElementById("generate-report");
  UI.reportContainer = document.getElementById("report-container");
  UI.reportContent = document.getElementById("report-content");
  UI.reportEditButton = document.getElementById("report-edit");
  UI.reportDeleteButton = document.getElementById("report-delete");
  UI.reportShareButton = document.getElementById("report-share");
  UI.reportExportCsvButton = document.getElementById("report-export-csv");
  UI.exportDbButton = document.getElementById("btn-export-db");
  UI.reportActions = document.getElementById("report-actions");
  UI.shareOptions = document.getElementById("share-options");
  UI.shareWhatsappButton = document.getElementById("share-whatsapp");
  UI.shareSmsButton = document.getElementById("share-sms");
  UI.shareEmailButton = document.getElementById("share-email");
  UI.shareCopyButton = document.getElementById("share-copy");
  UI.errorDialog = document.getElementById("error-dialog");
  UI.errorDialogClose = document.getElementById("error-dialog-close");
  UI.addJobsButton = document.getElementById("add-jobs-btn");
  UI.jobsListContainer = document.getElementById("jobs-list-container");
  UI.jobsList = document.getElementById("jobs-list");
  UI.addressDetailsInput = document.getElementById("address-details");
  UI.btnRouteAll = document.getElementById("btn-route-all");
  UI.subdivisionInput = document.getElementById("subdivision");
  UI.builderInput = document.getElementById("builder");

  // Auto-capitalize inputs
  const setupAutoCaps = (input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.toUpperCase();
      input.setSelectionRange(start, end);
    });
  };

  setupAutoCaps(UI.addressInput);
  setupAutoCaps(UI.subdivisionInput);
  setupAutoCaps(UI.builderInput);

  UI.heaterModelSelect = document.getElementById("job-heater-model");
  UI.outdoorModelSelect = document.getElementById("job-outdoor-model");
  UI.heaterSeriesSelect = document.getElementById("job-heater-series");
  UI.outdoorSeriesSelect = document.getElementById("job-outdoor-series");
  UI.heaterModelSelect2 = document.getElementById("job-heater-model-2");
  UI.outdoorModelSelect2 = document.getElementById("job-outdoor-model-2");
  UI.heaterSeriesSelect2 = document.getElementById("job-heater-series-2");
  UI.outdoorSeriesSelect2 = document.getElementById("job-outdoor-series-2");
  UI.btnHeaterModel = document.getElementById("btn-heater-model");
  UI.btnHeaterModel2 = document.getElementById("btn-heater-model-2");
  UI.btnResetHeater = document.getElementById("btn-reset-heater");
  UI.btnResetHeater2 = document.getElementById("btn-reset-heater-2");
  UI.btnOutdoorModel = document.getElementById("btn-outdoor-model");
  UI.btnOutdoorModel2 = document.getElementById("btn-outdoor-model-2");
  UI.btnResetOutdoor = document.getElementById("btn-reset-outdoor");
  UI.btnResetOutdoor2 = document.getElementById("btn-reset-outdoor-2");
  UI.jobTstatSelect = document.getElementById("job-tstat");
  UI.jobTstatQty = document.getElementById("job-tstat-qty");
  UI.jobAccSelect = document.getElementById("job-acc");
  UI.jobAccChipsContainer = document.getElementById("job-acc-chips");
  UI.themeSelector = document.getElementById("theme-toggle");
  UI.activeJobDisplay = document.getElementById("active-job-display");

  UI.extraPhotosList = document.getElementById("extra-photos-list");

  // Logic for Add Jobs Button state (Enable only if address is present)
  if (UI.addJobsButton && UI.addressInput) {
    const updateAddButtonState = () => {
      UI.addJobsButton.disabled = !UI.addressInput.value.trim();
    };
    updateAddButtonState(); // Initial check
    UI.addressInput.addEventListener("input", updateAddButtonState);
  }

  // Inject theme selector if missing (since we cannot modify index.html directly)
  if (!UI.themeSelector) {
    const appHeader = document.querySelector(".app-header");
    if (appHeader) {
      const label = document.createElement("label");
      label.className = "theme-switch";
      label.title = "Toggle Dark Mode";

      UI.themeSelector = document.createElement("input");
      UI.themeSelector.type = "checkbox";
      UI.themeSelector.id = "theme-toggle";

      const span = document.createElement("span");
      span.className = "slider";

      label.appendChild(UI.themeSelector);
      label.appendChild(span);
      appHeader.appendChild(label);
    }
  }

  UI.jobTwoSystemsToggle = document.getElementById("job-two-systems-toggle");
  UI.jobSystem2Container = document.getElementById("job-system-2-container");

  // Lógica para togglear campos del Sistema 2
  if (UI.jobTwoSystemsToggle && UI.jobSystem2Container) {
    UI.jobTwoSystemsToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        UI.jobSystem2Container.classList.remove("hidden");
      } else {
        UI.jobSystem2Container.classList.add("hidden");
        // Limpiar selecciones al ocultar
        if (UI.heaterModelSelect2) UI.heaterModelSelect2.value = "";
        if (UI.outdoorModelSelect2) UI.outdoorModelSelect2.value = "";
        // Resetear Series para restaurar la vista de dropdown
        if (UI.heaterSeriesSelect2) {
          UI.heaterSeriesSelect2.value = "";
          UI.heaterSeriesSelect2.dispatchEvent(new Event("change"));
        }
        if (UI.outdoorSeriesSelect2) {
          UI.outdoorSeriesSelect2.value = "";
          UI.outdoorSeriesSelect2.dispatchEvent(new Event("change"));
        }
      }
    });
  }

  setupDynamicModelVisibility(
    UI.heaterSeriesSelect,
    UI.btnHeaterModel,
    UI.btnResetHeater,
    UI.heaterModelSelect
  );
  setupDynamicModelVisibility(
    UI.heaterSeriesSelect2,
    UI.btnHeaterModel2,
    UI.btnResetHeater2,
    UI.heaterModelSelect2
  );
  setupDynamicModelVisibility(
    UI.outdoorSeriesSelect,
    UI.btnOutdoorModel,
    UI.btnResetOutdoor,
    UI.outdoorModelSelect
  );
  setupDynamicModelVisibility(
    UI.outdoorSeriesSelect2,
    UI.btnOutdoorModel2,
    UI.btnResetOutdoor2,
    UI.outdoorModelSelect2
  );

  // Lógica para "Add New" y Chips en Accesorios del Trabajo
  if (UI.jobAccSelect) {
    UI.jobAccSelect.addEventListener("change", (e) => {
      const select = e.target;
      let value = select.value;

      if (!value) return;

      if (value === "Add New") {
        const newAcc = prompt("Enter new accessory name:");
        if (newAcc && newAcc.trim()) {
          value = newAcc.trim();
          // Opcional: Agregar a la lista para futuro uso
          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = value;
          const addNewIdx = Array.from(select.options).findIndex(
            (o) => o.value === "Add New"
          );
          select.add(opt, addNewIdx);
        } else {
          select.value = "";
          return;
        }
      }

      // Agregar Chip si no existe
      const addChip = (val) => {
        if (val && UI.jobAccChipsContainer) {
          const existing = Array.from(UI.jobAccChipsContainer.children).find(
            (c) => c.dataset.value === val
          );
          if (!existing) {
            const chip = createChip(val, "accessory");
            chip.dataset.value = val;
            chip.style.cursor = "pointer";
            chip.title = "Click to remove";
            chip.innerHTML += " <span style='opacity:0.6'>&times;</span>";
            chip.addEventListener("click", () => chip.remove());
            UI.jobAccChipsContainer.appendChild(chip);
          }
        }
      };

      addChip(value);

      // Auto-add Bypass if HZ322 is selected
      if (value === "HZ322") {
        addChip("Bypass");
      }

      // Resetear select
      select.value = "";
    });
  }

  // --- EXTRA PHOTOS LOGIC ---
  const collapseAllGroups = () => {
    document.querySelectorAll(".photo-preset-suboptions").forEach((sub) => {
      sub.classList.add("hidden");
      const parentBtn = sub.previousElementSibling;
      if (parentBtn) {
        const arrow = parentBtn.querySelector(".preset-arrow");
        if (arrow) arrow.textContent = "▾";
        parentBtn.classList.remove("active");
      }
    });
  };

  document.querySelectorAll(".btn-photo-preset-group").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sub = document.getElementById(`group-${btn.dataset.group}`);
      if (!sub) return;
      const isOpen = !sub.classList.contains("hidden");
      collapseAllGroups();
      if (!isOpen) {
        sub.classList.remove("hidden");
        const arrow = btn.querySelector(".preset-arrow");
        if (arrow) arrow.textContent = "▴";
        btn.classList.add("active");
      }
    });
  });

  const presetButtons = document.querySelectorAll(".btn-photo-preset");
  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const label = btn.dataset.label;
      if (label === "Other") {
        const customLabel = prompt("Enter photo description:");
        if (customLabel && customLabel.trim()) {
          imageManager.addExtraPhoto(customLabel.trim());
        }
      } else {
        imageManager.addExtraPhoto(label);
        // Auto-collapse parent group after selection
        const parentSub = btn.closest(".photo-preset-suboptions");
        if (parentSub) collapseAllGroups();
      }
    });
  });

  // Renombrar botón Fresh Air a Air (Compatibilidad con HTML existente)
  if (UI.accessoryButtons) {
    const freshAirBtn = UI.accessoryButtons.querySelector(
      '[data-accessory="FreshAir"]'
    );
    if (freshAirBtn) {
      freshAirBtn.textContent = "Air";
      freshAirBtn.dataset.accessory = ACCESSORIES.FRESH_AIR;
    }
  }

  // Inyectar botón eBypass dinámicamente en la grilla de Zoning
  if (UI.accessoryButtons) {
    const dapcBtn = UI.accessoryButtons.querySelector(
      '[data-accessory="DAPC"]'
    );
    if (
      dapcBtn &&
      !UI.accessoryButtons.querySelector(
        `[data-accessory="${ACCESSORIES.E_BYPASS}"]`
      )
    ) {
      const eBypassBtn = document.createElement("button");
      eBypassBtn.type = "button";
      eBypassBtn.className = "btn zone-ebypass";
      eBypassBtn.dataset.accessory = ACCESSORIES.E_BYPASS;
      eBypassBtn.dataset.price = "5";
      eBypassBtn.textContent = "eBypass";
      dapcBtn.parentNode.insertBefore(eBypassBtn, dapcBtn.nextSibling);
    }
  }

  // Organizar botones restantes en "System Essentials" (Safety, Wiring, Hardware)
  if (UI.accessoryButtons) {
    // Verificar si ya existe para no duplicar
    if (!UI.accessoryButtons.querySelector(".system-essentials-grid")) {
      // Crear contenedor único para todos los esenciales
      const essentialsContainer = document.createElement("div");
      essentialsContainer.className = "system-essentials-grid";

      // Definir orden y estilo (Float, Trane, Ecoil, RDS, LP Kit, Other)
      const orderedItems = [
        { name: ACCESSORIES.FLOAT_SWITCH, style: "btn-hardware" },
        { name: ACCESSORIES.TRANE_HARNESS, style: "btn-wiring" },
        { name: ACCESSORIES.ECOIL_WIRE, style: "btn-wiring" },
        { name: ACCESSORIES.RDS, style: "btn-safety" },
        { name: ACCESSORIES.LP_KIT, style: "btn-hardware" },
        { name: ACCESSORIES.OTRO, style: "btn-hardware" },
        // Items restantes (al final para mantener visibilidad)
        { name: ACCESSORIES.A2L, style: "btn-safety" },
        { name: ACCESSORIES.HARNESS, style: "btn-wiring" },
        { name: ACCESSORIES.OUT_OF_TOWN, style: "btn-hardware" },
      ];

      orderedItems.forEach((item) => {
        const btn = UI.accessoryButtons.querySelector(
          `[data-accessory="${item.name}"]`
        );
        if (btn) {
          btn.classList.add(item.style);
          essentialsContainer.appendChild(btn);
        }
      });

      // Insertar en el DOM
      const splitLayout = UI.accessoryButtons.querySelector(
        ".accessories-split-layout"
      );
      if (splitLayout) {
        splitLayout.insertAdjacentElement("afterend", essentialsContainer);
      } else {
        UI.accessoryButtons.appendChild(essentialsContainer);
      }

      // Limpiar contenedores originales que quedaron vacíos tras la reorganización
      const potentialEmptyContainers = UI.accessoryButtons.querySelectorAll(
        ".accessory-subgroup, .a2l-group, .misc-core-grid"
      );
      potentialEmptyContainers.forEach((container) => {
        if (container.children.length === 0) {
          container.remove();
        }
      });
    }
  }

  // State para imágenes (No persiste en localStorage)
  const reportImagesMap = new Map(); // Key: reportId, Value: { weight: File, fan: File }

  // Referencia al JobManager
  let jobManager;

  // Configurar Icono de la WebApp (Favicon y Apple Touch)
  const setAppIcon = () => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = APP_ICON_URL;

    // Opcional: Para dispositivos Apple
    let appleLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement("link");
      appleLink.rel = "apple-touch-icon";
      document.head.appendChild(appleLink);
    }
    appleLink.href = APP_ICON_URL;
  };
  setAppIcon();

  initQuickCalc();

  initTabs();

  // Inicializar Stepper con validación al presionar "Next"
  initStepper(
    // Callback onNext
    (currentSectionId, nextSectionId) => {
      const state = getState();
      hideValidationErrors();

      // Validación para la sección de Servicio
      if (currentSectionId === "service-section") {
        if (state.selectedServices.length === 0) {
          showValidationErrors([
            "⚠️ Selecciona al menos un tipo de servicio (AC, Heat, etc.)",
          ]);
          return false; // Detener avance
        }
      }

      // Validación para la sección Weight-In
      if (currentSectionId === "weight-in-data-section") {
        const { confirmableErrors, missingWeightInFields } = validateState(
          state,
          false,
          false
        );
        if (confirmableErrors.length > 0) {
          // Resaltar campos faltantes
          const errorElements = missingWeightInFields
            .map((key) => UI.weightInInputs[key])
            .filter(Boolean);
          highlightInputErrors(errorElements);

          showValidationErrors(
            confirmableErrors,
            () => {
              revealSection(nextSectionId); // Continuar si el usuario confirma
            },
            "⚠️ Continue Anyway"
          );
          return false; // Detener avance hasta confirmación
        }

        // Aviso de imágenes guardadas
        const images = imageManager ? imageManager.getCurrentImages() : {};
        if (images.weight || images.fan) {
          showToast("📸 Imágenes guardadas automáticamente");
        }
      }

      return true; // Permitir avance
    },
    // Callback onStepClick (Navegación por barra superior)
    (targetSectionId) => {
      if (targetSectionId === "weight-in-data-section") {
        const { missingWeightInFields } = validateState(
          getState(),
          false,
          false
        );
        const errorElements = missingWeightInFields
          .map((key) => UI.weightInInputs[key])
          .filter(Boolean);
        highlightInputErrors(errorElements);
      }
    }
  );

  initWeightInLogic(
    weightInInputs,
    weightInInputs2,
    debounce(saveToLocalStorage, 800)
  );

  const getAllFixButtons = () =>
    UI.fixesSection.querySelectorAll(".btn[data-fix]");

  let selectedReportId = null;

  const getReportWrappers = () =>
    Array.from(UI.reportContent.querySelectorAll(".report-wrapper"));

  const getSelectedReport = () =>
    selectedReportId
      ? UI.reportContent.querySelector(
          `.report-wrapper[data-report-id="${selectedReportId}"]`
        )
      : null;

  function clearSelection() {
    getReportWrappers().forEach((wrap) => wrap.classList.remove("selected"));
    selectedReportId = null;

    // Ocultar y devolver opciones de compartir al contenedor principal
    if (UI.shareOptions) {
      UI.shareOptions.classList.add("hidden");
      UI.reportContainer.appendChild(UI.shareOptions);
    }
    if (UI.reportActions) {
      UI.reportActions.classList.add("hidden");
      UI.reportContainer.appendChild(UI.reportActions);
    }
    refreshReportActions();
  }

  function selectReport(reportId) {
    selectedReportId = reportId;
    getReportWrappers().forEach((wrap) => {
      wrap.classList.toggle("selected", wrap.dataset.reportId === reportId);
    });

    // Mover opciones de compartir justo debajo del reporte seleccionado
    const selectedWrapper = getSelectedReport();
    if (selectedWrapper) {
      if (UI.reportActions) {
        selectedWrapper.insertAdjacentElement("afterend", UI.reportActions);
        UI.reportActions.classList.remove("hidden");
      }
      if (UI.shareOptions) {
        const target = UI.reportActions || selectedWrapper;
        target.insertAdjacentElement("afterend", UI.shareOptions);
      }
    }
    refreshReportActions();
  }

  // Click outside to clear selection
  if (UI.reportContainer) {
    UI.reportContainer.addEventListener("click", (e) => {
      if (
        e.target.closest(".report-card") ||
        e.target.closest("button") ||
        e.target.closest(".btn") ||
        e.target.closest("#report-actions") ||
        e.target.closest("#share-options") ||
        e.target.closest(".report-share-options")
      ) {
        return;
      }
      clearSelection();
    });
  }

  // Catálogos completos (derivados de weightInData.js)
  const heatersData = heaters || {};
  const outdoorData = unidadesExteriores || {};

  const heaterModels = Object.keys(heatersData);
  const outdoorModels = Object.keys(outdoorData);

  window.showLightbox = showLightbox;

  function refreshReportActions() {
    const hasReports = getReportWrappers().length > 0;
    const hasSelection = !!getSelectedReport();
    if (UI.reportActions) {
      UI.reportActions.classList.toggle("hidden", !hasSelection);
    }
    [UI.reportEditButton, UI.reportDeleteButton].forEach((btn) => {
      if (!btn) return;
      btn.disabled = !hasSelection;
      btn.title = hasSelection ? "" : "Selecciona un reporte";
    });
    if (!hasSelection && UI.shareOptions) {
      UI.shareOptions.classList.add("hidden");
    }
    if (UI.reportExportCsvButton) {
      // Mostrar botón CSV solo si hay reportes (ahora está en el header)
      UI.reportExportCsvButton.classList.toggle("hidden", !hasReports);
    }
  }

  let state = getState();

  populateSelect(UI.heaterModelSelect, heaterModels);
  populateSelect(UI.outdoorModelSelect, outdoorModels);
  populateSelect(UI.heaterModelSelect2, heaterModels);
  populateSelect(UI.outdoorModelSelect2, outdoorModels);

  if (UI.errorDialogClose) {
    UI.errorDialogClose.addEventListener("click", hideErrorDialog);
  } else {
    console.error("Error dialog close button not found");
  }

  // Validate DOM elements
  if (
    !UI.addressInput ||
    !UI.serviceTypeButtons ||
    !UI.addJobsButton ||
    !UI.acHeatOptions ||
    !UI.thermostatButtons ||
    !UI.thermostatQuantity ||
    !UI.accessoryButtons ||
    !UI.accessoryOtro ||
    !UI.otroNameInput ||
    !UI.otroPriceInput ||
    !UI.fixesSection ||
    !UI.fixOtro ||
    !UI.fixOtroNameInput ||
    !UI.fixOtroPriceInput ||
    !UI.notesInput ||
    !UI.generateReportButton ||
    !UI.reportContainer ||
    !UI.reportContent ||
    !UI.reportEditButton ||
    !UI.reportDeleteButton ||
    !UI.reportActions ||
    !UI.reportShareButton ||
    !UI.reportExportCsvButton ||
    !UI.shareOptions ||
    !UI.shareWhatsappButton ||
    !UI.shareSmsButton ||
    !UI.shareEmailButton ||
    !UI.shareCopyButton ||
    !UI.errorDialog ||
    !UI.errorDialogClose
  ) {
    console.error("Missing DOM elements");
    return;
  }

  // LocalStorage Functions
  function saveToLocalStorage() {
    // 1. Si hay un trabajo activo, actualizar su estado en el array de jobs
    const activeJobAddress = getActiveJobAddress();
    if (activeJobAddress) {
      state = getState();
      saveJobState(activeJobAddress, state);
      if (jobManager) {
        jobManager.saveJobsToLocalStorage();
      }
    }

    // 2. Guardar el estado actual (backup/estado activo)
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_JOB, activeJobAddress || "");
    saveReportsToLocalStorage();
  }

  const saveToLocalStorageDebounced = debounce(saveToLocalStorage, 800);

  function loadFromLocalStorage() {
    const savedState = localStorage.getItem(STORAGE_KEYS.STATE);
    const savedReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
    setActiveJobAddress(localStorage.getItem(STORAGE_KEYS.ACTIVE_JOB));

    // Ocultar acciones legacy por defecto
    if (UI.reportActions) UI.reportActions.classList.add("hidden");
    if (UI.shareOptions) UI.shareOptions.classList.add("hidden");

    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        state = { ...state, ...parsedState };
        if (!("leakDetail" in state)) state.leakDetail = null;
        if (!("heaterModel" in state)) state.heaterModel = "";
        if (!("outdoorModel" in state)) state.outdoorModel = "";
        const savedWeightIn =
          state.weightInData && typeof state.weightInData === "object"
            ? state.weightInData
            : null;
        const savedWeightIn2 =
          state.weightInData2 && typeof state.weightInData2 === "object"
            ? state.weightInData2
            : null;
        state.weightInData = savedWeightIn
          ? { ...defaultWeightInData(), ...savedWeightIn }
          : defaultWeightInData();
        state.weightInData2 = savedWeightIn2
          ? { ...defaultWeightInData(), ...savedWeightIn2 }
          : defaultWeightInData();
        if (Array.isArray(state.selectedAccessories)) {
          state.selectedAccessories = state.selectedAccessories.map((acc) =>
            acc && acc.name === ACCESSORIES.WEIGHT_IN_DATA
              ? { ...acc, basePrice: 10 }
              : acc
          );
        }
        setState(state);
        // No restauramos la UI inmediatamente, esperamos a que el usuario seleccione un trabajo
      } catch (e) {
        console.error("Error parsing savedState:", e);
      }
    }

    if (savedReports) {
      try {
        const reports = JSON.parse(savedReports);
        reports.forEach((item) => {
          // Soportar datos antiguos (solo texto) y nuevos (objeto)
          const isObject = item && typeof item === "object" && item.reportText;
          const reportText = isObject ? item.reportText : item;
          const address =
            (isObject && item.address) ||
            (reportText && reportText.split(",")[0]) ||
            "Completion Report";
          const totals =
            isObject && item.totals
              ? item.totals
              : {
                  total: "",
                  totalServicePrice: "",
                  totalAccessoryPrice: "",
                  totalFixPrice: "",
                };
          const wrapper = createReportCard({
            reportText,
            address,
            totals,
            services: isObject && item.services ? item.services : [],
            accessories: isObject && item.accessories ? item.accessories : [],
            fixes: isObject && item.fixes ? item.fixes : [],
            notes: isObject && item.notes ? item.notes : "",
            timestamp: isObject && item.timestamp ? item.timestamp : null,
            payload: isObject
              ? {
                  ...item,
                  timestamp: item.timestamp || null,
                }
              : null,
            callbacks: {
              onSelect: selectReport,
              onEdit: editReport,
              onDelete: deleteReport,
            },
          });
          UI.reportContent.appendChild(wrapper);
        });
        if (reports.length > 0) {
          UI.reportContainer.classList.remove("hidden");
        }
      } catch (e) {
        console.error("Error parsing savedReports:", e);
      }
    }

    // Cargar jobs al final
    refreshReportActions();
    updateGlobalActions();

    // Inicialización: Ocultar el espacio de trabajo hasta que se seleccione un trabajo
    toggleWorkspace(false);
  }

  function clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEYS.STATE);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.JOBS);
    // localStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
  }

  // --- SUSCRIPCIÓN AL ESTADO (REACTIVIDAD) ---
  // Cada vez que setState() sea llamado en cualquier lugar, la UI se actualizará.
  subscribe(() => {
    // Usamos requestAnimationFrame implícito en updatePriceDisplay dentro de restoreUI
    // o podemos envolver todo aquí si notamos lentitud.
    if (UI.activeJobDisplay) {
      const currentAddr = getState().address;
      UI.activeJobDisplay.textContent = currentAddr || "None (Select a job)";
    }
    restoreUIFromState();
  });

  // Función auxiliar para restaurar UI (extraída de init)
  function restoreUIFromState() {
    state = getState();
    restoreUI(UI, state, {
      getAllFixButtons,
      updatePriceDisplay,
    });
    // Update Add Jobs button state when restoring UI
    if (UI.addJobsButton && UI.addressInput) {
      UI.addJobsButton.disabled = !UI.addressInput.value.trim();
    }
  }

  // Inicializar Job Manager (Maneja la lista de trabajos, edición, borrado, etc.)
  jobManager = initJobManager({
    UI,
    getState,
    setState,
    resetSelections,
    restoreUIFromState,
    saveToLocalStorage,
  });

  loadFromLocalStorage();

  // Initialize Theme Switcher
  initThemeSwitcher(UI.themeSelector);

  // --- INYECTAR INPUTS DE IMAGEN EN WEIGHT-IN DATA ---
  // Inicializar Image Manager (Maneja subida, compresión, GPS y ZIP)
  imageManager = initImageManager({ UI, getState, setState });

  UI.serviceTypeButtons.addEventListener("click", (e) => {
    // Solo manejar botones con data-service (evita capturar clicks en sub-botones)
    const btn = e.target.closest("[data-service]");
    if (!btn || !UI.serviceTypeButtons.contains(btn)) return;

    // Reactivar botones si estaban deshabilitados por un reporte anterior
    enablePostReportButtons();

    const service = btn.dataset.service;
    const basePrice = parseFloat(btn.dataset.price) || 0;

    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");

    if (service === SERVICES.CANCEL) {
      if (isActive) {
        // Cancel is exclusive: clear other selections and AC/Heat flags
        UI.serviceTypeButtons
          .querySelectorAll("[data-service]")
          .forEach((el) => {
            if (el !== btn) el.classList.remove("active");
          });
        state.selectedServices = [{ name: service, basePrice }];
        setState({
          selectedServices: state.selectedServices,
          isTwoSystems: false,
          isTemporary: false,
        });
        UI.acHeatOptions
          .querySelectorAll(".btn")
          .forEach((el) => el.classList.remove("active"));

        // Cancel Logic: Hide intermediate sections, show Notes
        [
          "thermostat-section",
          "accessory-section",
          "fixes-section",
          "weight-in-data-section",
        ].forEach(hideSection);
        revealSection("notes-section");
      } else {
        state.selectedServices = state.selectedServices.filter(
          (s) => s.name !== service
        );
        setState({ selectedServices: state.selectedServices });
      }
    } else {
      if (isActive) {
        const cancelBtn = UI.serviceTypeButtons.querySelector(
          `[data-service="${SERVICES.CANCEL}"]`
        );
        if (cancelBtn) cancelBtn.classList.remove("active");
        state.selectedServices = state.selectedServices.filter(
          (s) => ![SERVICES.CANCEL, service].includes(s.name)
        );
        state.selectedServices.push({ name: service, basePrice });
        setState({ selectedServices: state.selectedServices });
      } else {
        state.selectedServices = state.selectedServices.filter(
          (s) => s.name !== service
        );
        setState({ selectedServices: state.selectedServices });
      }
    }

    const showAcHeatOptions = state.selectedServices.some((s) =>
      [SERVICES.AC, SERVICES.HEAT, SERVICES.PRESTART, SERVICES.FINISH].includes(
        s.name
      )
    );
    UI.acHeatOptions.classList.toggle("hidden", !showAcHeatOptions);

    if (!showAcHeatOptions) {
      UI.acHeatOptions
        .querySelectorAll(".btn")
        .forEach((btn) => btn.classList.remove("active"));
      setState({
        isTwoSystems: false,
        isTemporary: false,
      });
    } else {
      const hasAcHeatOrPrestart = state.selectedServices.some((s) =>
        [SERVICES.AC, SERVICES.HEAT, SERVICES.PRESTART].includes(s.name)
      );
      const hasAcOrHeat = state.selectedServices.some((s) =>
        [SERVICES.AC, SERVICES.HEAT].includes(s.name)
      );
      if (!hasAcOrHeat) {
        const temporaryBtn = UI.acHeatOptions.querySelector(
          `[data-option="${OPTIONS.TEMPORARY}"]`
        );
        temporaryBtn.classList.remove("active");
        setState({ isTemporary: false });
      }
    }

    saveToLocalStorage();
  });

  UI.acHeatOptions.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn")) return;

    const option = e.target.dataset.option;

    if (
      !state.selectedServices.some((s) =>
        [
          SERVICES.AC,
          SERVICES.HEAT,
          SERVICES.PRESTART,
          SERVICES.FINISH,
        ].includes(s.name)
      )
    ) {
      console.error("No relevant service selected.");
      return;
    }

    if (option === OPTIONS.TEMPORARY) {
      const hasAcOrHeat = state.selectedServices.some((s) =>
        [SERVICES.AC, SERVICES.HEAT].includes(s.name)
      );
      if (!hasAcOrHeat) {
        return;
      }
    }

    e.target.classList.toggle("active");

    if (option === OPTIONS.TEMPORARY) {
      setState({ isTemporary: e.target.classList.contains("active") });
    } else if (option === OPTIONS.TWO_SYSTEMS) {
      setState({ isTwoSystems: e.target.classList.contains("active") });
    }

    saveToLocalStorage();
  });

  UI.thermostatButtons.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-thermostat]");
    if (!btn || !UI.thermostatButtons.contains(btn)) return;

    const thermostat = btn.dataset.thermostat;

    const wasActive = btn.classList.contains("active");
    UI.thermostatButtons
      .querySelectorAll(".btn")
      .forEach((el) => el.classList.remove("active"));

    if (wasActive) {
      setState({ selectedThermostat: null });
      UI.thermostatQuantity.classList.add("hidden");
      if (thermostat === "Otro" && UI.thermostatOtro) {
        UI.thermostatOtro.classList.add("hidden");
        UI.thermostatOtroName.value = "";
      }
    } else {
      btn.classList.add("active");

      if (thermostat === "Otro") {
        if (UI.thermostatOtro) {
          UI.thermostatOtro.classList.remove("hidden");
          const customName = UI.thermostatOtroName.value.trim();
          setState({ selectedThermostat: { name: customName || "Otro" } });
          setTimeout(() => UI.thermostatOtroName.focus(), 50);
        }
      } else {
        if (UI.thermostatOtro) {
          UI.thermostatOtro.classList.add("hidden");
          UI.thermostatOtroName.value = "";
        }
        setState({ selectedThermostat: { name: thermostat } });
      }

      UI.thermostatQuantity.classList.remove("hidden");
      // Update visual state of quantity buttons
      if (UI.quantitySelector) {
        updateQuantityButtons(state.thermostatQuantity || 1);
      }
    }

    saveToLocalStorage();
  });

  if (UI.thermostatOtroName) {
    UI.thermostatOtroName.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const otroBtn = UI.thermostatButtons.querySelector(
        '[data-thermostat="Otro"]'
      );
      if (otroBtn && otroBtn.classList.contains("active")) {
        setState({ selectedThermostat: { name: val || "Otro" } });
        saveToLocalStorageDebounced();
      }
    });

    UI.thermostatOtroName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        UI.thermostatOtroName.blur(); // Quitar foco para cerrar teclado móvil / confirmar visualmente
        saveToLocalStorage(); // Guardar inmediatamente
      }
    });
  }

  // Helper to update quantity buttons visual state
  function updateQuantityButtons(qty) {
    if (!UI.quantitySelector) return;
    const btns = UI.quantitySelector.querySelectorAll(".qty-btn");
    btns.forEach((btn) => {
      const btnQty = parseInt(btn.dataset.qty);
      btn.classList.toggle("active", btnQty === qty);
    });
  }

  if (UI.quantitySelector) {
    UI.quantitySelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".qty-btn");
      if (!btn) return;

      const quantity = parseInt(btn.dataset.qty);
      updateQuantityButtons(quantity);
      setState({ thermostatQuantity: quantity });
      saveToLocalStorageDebounced();
    });
  }

  UI.notesInput.addEventListener("input", () => {
    setState({ notes: UI.notesInput.value });
    saveToLocalStorageDebounced();
  });

  UI.accessoryButtons.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn")) return;

    const accessory = e.target.dataset.accessory;
    const basePrice = parseFloat(e.target.dataset.price) || 0;
    const toggleTarget = e.target.dataset.toggleTarget;

    e.target.classList.toggle("active");
    const isActive = e.target.classList.contains("active");

    const toggleSubgroup = (selector, show) => {
      if (!selector) return;
      const group = document.querySelector(selector);
      if (!group) return;
      if (group.classList.contains("accessory-subgroup")) {
        group.classList.toggle("expanded", show);
      } else {
        group.classList.toggle("hidden", !show);
      }
      if (!show) {
        group.querySelectorAll(".btn.active").forEach((btn) => {
          btn.classList.remove("active");
          const name = btn.dataset.accessory;
          state.selectedAccessories = state.selectedAccessories.filter(
            (a) => a.name !== name
          );
          setState({ selectedAccessories: state.selectedAccessories });
        });
      }
    };

    if (accessory === ACCESSORIES.OTRO) {
      if (isActive) {
        UI.accessoryOtro.classList.remove("hidden");
        setState({ isOtroAccessoryOpen: true });
      } else {
        UI.accessoryOtro.classList.add("hidden");
        setState({ isOtroAccessoryOpen: false });
        UI.otroNameInput.value = "";
        UI.otroPriceInput.value = "";
      }
      toggleSubgroup(toggleTarget, isActive);
    } else {
      // --- Lógica Inteligente del Zoning Core ---
      if (accessory === "UT3000") {
        const dapcBtn = UI.accessoryButtons.querySelector(
          '[data-accessory="DAPC"]'
        );
        const eBypassBtn = UI.accessoryButtons.querySelector(
          `[data-accessory="${ACCESSORIES.E_BYPASS}"]`
        );

        if (isActive) {
          if (dapcBtn && !dapcBtn.classList.contains("active")) dapcBtn.click();
          if (eBypassBtn && !eBypassBtn.classList.contains("active"))
            eBypassBtn.click();
        } else {
          if (dapcBtn && dapcBtn.classList.contains("active")) dapcBtn.click();
          if (eBypassBtn && eBypassBtn.classList.contains("active"))
            eBypassBtn.click();
        }
      }

      if (accessory === "HZ322") {
        const bypassBtn = UI.accessoryButtons.querySelector(
          '[data-accessory="Bypass"]'
        );
        if (bypassBtn) {
          if (isActive) {
            if (!bypassBtn.classList.contains("active")) bypassBtn.click();
          } else {
            if (bypassBtn.classList.contains("active")) bypassBtn.click();
          }
        }
      }

      // Exclusividad Mutua: UT3000 vs HZ322 vs Harmony
      if (isActive) {
        if (accessory === "UT3000") {
          ["HZ322", ACCESSORIES.HARMONY].forEach((name) => {
            const btn = UI.accessoryButtons.querySelector(
              `[data-accessory="${name}"]`
            );
            if (btn && btn.classList.contains("active")) btn.click();
          });
        }

        if (accessory === "HZ322") {
          ["UT3000", ACCESSORIES.HARMONY].forEach((name) => {
            const btn = UI.accessoryButtons.querySelector(
              `[data-accessory="${name}"]`
            );
            if (btn && btn.classList.contains("active")) btn.click();
          });
        }

        if (accessory === ACCESSORIES.HARMONY) {
          ["UT3000", "HZ322", "DAPC", "Bypass", ACCESSORIES.E_BYPASS].forEach(
            (name) => {
              const btn = UI.accessoryButtons.querySelector(
                `[data-accessory="${name}"]`
              );
              if (btn && btn.classList.contains("active")) btn.click();
            }
          );
        }
      }
      // ------------------------------------------

      if (isActive) {
        toggleSubgroup(toggleTarget, true);
        state.selectedAccessories.push({ name: accessory, basePrice });
        setState({ selectedAccessories: state.selectedAccessories });
      } else {
        toggleSubgroup(toggleTarget, false);
        state.selectedAccessories = state.selectedAccessories.filter(
          (a) => a.name !== accessory
        );
        setState({ selectedAccessories: state.selectedAccessories });
      }
    }

    saveToLocalStorage();
  });

  // ========================================
  // FUNCIÓN GENÉRICA PARA MANEJAR "OTRO" (CUSTOM ITEMS)
  // ========================================
  function setupCustomItemHandler(
    nameInput,
    priceInput,
    addButton,
    listContainer,
    stateKey,
    maxPrice = 1000
  ) {
    const addItem = () => {
      const name = nameInput.value.trim();
      let price = parseFloat(priceInput.value) || 0;

      if (!name) return;

      if (price < 0) {
        priceInput.value = 0;
        price = 0;
      }
      if (price > maxPrice) {
        priceInput.value = maxPrice;
        price = maxPrice;
        alert(`El precio máximo permitido es $${maxPrice}`);
      }

      const currentState = getState();
      const currentList = currentState[stateKey] || [];
      const newItem = { id: Date.now(), name, basePrice: price };

      const newState = {};
      newState[stateKey] = [...currentList, newItem];
      setState(newState);

      saveToLocalStorageDebounced();

      // Limpiar inputs y reenfocar
      nameInput.value = "";
      priceInput.value = "";
      nameInput.focus();
    };

    addButton.addEventListener("click", addItem);

    priceInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem();
      }
    });

    // Manejador para eliminar ítems de la lista
    if (listContainer) {
      listContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("chip-remove")) {
          const id = Number(e.target.dataset.id);
          const currentList = getState()[stateKey];
          const newState = {};
          newState[stateKey] = currentList.filter((item) => item.id !== id);
          setState(newState);
          saveToLocalStorageDebounced();
        }
      });
    }
  }

  // ========================================
  // CONFIGURAR MANEJADORES DE "OTRO"
  // ========================================
  setupCustomItemHandler(
    UI.otroNameInput,
    UI.otroPriceInput,
    UI.btnAddOtroAccessory,
    UI.customAccessoriesList,
    "customAccessories",
    500
  );
  setupCustomItemHandler(
    UI.fixOtroNameInput,
    UI.fixOtroPriceInput,
    UI.btnAddOtroFix,
    UI.customFixesList,
    "customFixes",
    300
  );

  // Fix-group expand/collapse (Leaks ▾)
  UI.fixesSection.querySelectorAll(".btn-fix-group").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sub = document.getElementById(`fix-group-${btn.dataset.fixGroup}`);
      if (!sub) return;
      const isOpen = !sub.classList.contains("hidden");
      sub.classList.toggle("hidden", isOpen);
      const arrow = btn.querySelector(".preset-arrow");
      if (arrow) arrow.textContent = isOpen ? "▾" : "▴";
    });
  });

  UI.fixesSection.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn[data-fix]");
    if (!btn || !UI.fixesSection.contains(btn)) return;

    const fix = btn.dataset.fix;
    const basePrice = parseFloat(btn.dataset.price) || 0;

    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");

    if (fix === FIXES.OTRO) {
      if (isActive) {
        UI.fixOtro.classList.remove("hidden");
        setState({ isOtroFixOpen: true });
      } else {
        UI.fixOtro.classList.add("hidden");
        setState({ isOtroFixOpen: false });
        UI.fixOtroNameInput.value = "";
        UI.fixOtroPriceInput.value = "";
      }
    } else {
      if (isActive) {
        state.selectedFixes.push({ name: fix, basePrice });
        setState({ selectedFixes: state.selectedFixes });
      } else {
        state.selectedFixes = state.selectedFixes.filter((f) => f.name !== fix);
        setState({ selectedFixes: state.selectedFixes });
      }
    }

    // Update Leaks group parent button visual state
    const leaksGroupBtn = UI.fixesSection.querySelector('[data-fix-group="leaks"]');
    if (leaksGroupBtn) {
      const anyLeaks = getState().selectedFixes.some((f) => f.name.startsWith("Leaks "));
      leaksGroupBtn.classList.toggle("active", anyLeaks);
    }

    saveToLocalStorage();
  });

  UI.generateReportButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Hide previous errors
    hideValidationErrors();

    // Determinar si los botones "Otro" están activos
    const isOtroAccessoryActive = UI.accessoryButtons
      .querySelector(`[data-accessory="${ACCESSORIES.OTRO}"]`)
      ?.classList.contains("active");

    const isOtroFixActive = UI.fixesSection
      .querySelector(`[data-fix="${FIXES.OTRO}"]`)
      ?.classList.contains("active");

    // Validate data
    const { blockingErrors } = validateState(
      state,
      isOtroAccessoryActive,
      isOtroFixActive
    );

    // Si hay errores bloqueantes, mostrar y detener
    if (blockingErrors.length > 0) {
      showValidationErrors(blockingErrors);
      return;
    }

    // Check for undownloaded images
    const undownloaded = imageManager ? imageManager.getUndownloadedCount() : 0;
    if (undownloaded > 0) {
      showImageWarningModal(undownloaded);
    } else {
      generateReportProcess();
    }
  });

  function showImageWarningModal(count) {
    const existing = document.getElementById("_img-warn-modal");
    if (existing) existing.remove();

    const photoWord = count === 1 ? "photo has" : "photos have";
    const overlay = document.createElement("div");
    overlay.id = "_img-warn-modal";
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.6);
      display:flex;align-items:center;justify-content:center;
      padding:16px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
      animation:fadeIn 0.15s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background:var(--container-bg,#fff);
        border:1px solid var(--border-color,#ddd);
        border-radius:12px;
        padding:28px 24px 22px;
        max-width:360px;width:100%;
        box-shadow:0 24px 64px rgba(0,0,0,0.5);
        text-align:center;
      ">
        <div style="font-size:36px;margin-bottom:10px">📷</div>
        <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:var(--text-color,#111)">
          ${count} ${photoWord} not been downloaded
        </div>
        <div style="font-size:13px;color:var(--text-muted,#666);margin-bottom:22px;line-height:1.5">
          Would you like to download the photos before generating the report?
        </div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <button id="_img-warn-dl" style="
            width:100%;padding:11px;border-radius:8px;border:none;cursor:pointer;
            background:var(--grad-primary,#0066ff);color:#fff;
            font-weight:700;font-size:13px;letter-spacing:0.4px;
            box-shadow:0 4px 16px rgba(56,190,255,0.35);
          ">💾 Download Photos &amp; Generate Report</button>
          <button id="_img-warn-skip" style="
            width:100%;padding:10px;border-radius:8px;cursor:pointer;
            background:transparent;
            border:1px solid var(--border-color,#ccc);
            color:var(--text-color,#333);font-size:13px;font-weight:600;
          ">Generate Without Downloading</button>
          <button id="_img-warn-cancel" style="
            width:100%;padding:8px;border-radius:8px;cursor:pointer;
            background:transparent;border:none;
            color:var(--text-muted,#888);font-size:12px;
          ">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = (cb) => {
      // pointer-events:none primero para bloquear tap-through en mobile
      overlay.style.pointerEvents = "none";
      setTimeout(() => {
        overlay.remove();
        if (cb) cb();
      }, 80);
    };

    overlay.querySelector("#_img-warn-dl").onclick = () => {
      closeModal(() => {
        imageManager.triggerDownload();
        setTimeout(generateReportProcess, 300);
      });
    };
    overlay.querySelector("#_img-warn-skip").onclick = () => {
      closeModal(generateReportProcess);
    };
    overlay.querySelector("#_img-warn-cancel").onclick = () => closeModal();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  }

  function generateReportProcess() {
    // If everything is OK, generate the report.
    const reportText = generateReportText(state);
    const reportData = generateReportData(state);

    const totals = reportData.totals; // Use totals from generateReportData for consistency
    const currentImages = imageManager ? imageManager.getCurrentImages() : {};

    const outdoorData = unidadesExteriores[state.outdoorModel];
    const refrigerant = outdoorData ? outdoorData.freon : "";

    const currentJob = getJobByAddress(state.address);
    const builder = currentJob ? currentJob.builder : "";
    const subdivision = currentJob ? currentJob.subdivision : "";

    const reportWrapper = createReportCard({
      reportText,
      address: state.address.trim().toUpperCase(),
      totals: totals,
      services: reportData.services,
      accessories: reportData.accessories,
      fixes: reportData.fixes,
      thermostat: reportData.thermostat,
      weightInText: reportData.weightInText,
      notes: state.notes,
      weightInData: state.weightInData,
      weightInData2: state.weightInData2,
      refrigerant,
      outdoorModel: state.outdoorModel,
      heaterModel: state.heaterModel,
      outdoorModel2: state.outdoorModel2,
      heaterModel2: state.heaterModel2,
      builder,
      subdivision,
      timestamp: new Date().toISOString(),
      callbacks: {
        onSelect: selectReport,
        onEdit: editReport,
        onDelete: deleteReport,
      },
    });

    UI.reportContent.appendChild(reportWrapper);
    UI.reportContainer.classList.remove("hidden");
    if (reportWrapper.dataset.reportId) {
      selectReport(reportWrapper.dataset.reportId);
    }

    // Guardar imágenes en el mapa global usando el ID del reporte
    if (currentImages.weight || currentImages.fan) {
      reportImagesMap.set(reportWrapper.dataset.reportId, { ...currentImages });
    }

    saveReportsToLocalStorage();
    refreshReportActions();

    // Actualizar botón "Delete All"
    updateGlobalActions();

    // NUEVO: Eliminar el job de la lista si está seleccionado
    const activeJobAddress = getActiveJobAddress();
    if (activeJobAddress && activeJobAddress === state.address) {
      if (jobManager) {
        jobManager.removeJobFromList(activeJobAddress);
      }
    }

    // En lugar de resetear y ocultar todo, deshabilitamos los controles
    // resetSelections();
    disablePostReportButtons();
    switchToTab("reports");
    saveToLocalStorage();
  }

  // Función para editar reporte
  function editReport(reportWrapper, currentText) {
    if (!reportWrapper) return;
    const reportDiv = reportWrapper.querySelector(".report-entry");
    const newText = prompt(
      "Editar reporte:",
      currentText || reportDiv.textContent
    );

    if (newText && newText.trim() !== "") {
      reportDiv.textContent = newText.trim();
      const raw = reportWrapper.querySelector(".report-raw");
      if (raw) raw.textContent = newText.trim();
      saveReportsToLocalStorage();
    }
  }

  // Función para eliminar reporte individual
  function deleteReport(reportWrapper) {
    if (!reportWrapper) return;
    const wasSelected =
      selectedReportId && reportWrapper.dataset.reportId === selectedReportId;
    if (confirm("¿Seguro que quieres eliminar este reporte?")) {
      // Guardar estado para deshacer
      const parent = reportWrapper.parentNode;
      const nextSibling = reportWrapper.nextSibling;
      const reportId = reportWrapper.dataset.reportId;
      const savedImages = reportImagesMap.get(reportId);

      reportWrapper.remove();

      // Si no quedan reportes, ocultar el contenedor
      reportImagesMap.delete(reportWrapper.dataset.reportId); // Limpiar imágenes de memoria
      if (UI.reportContent.children.length === 0) {
        UI.reportContainer.classList.add("hidden");
      }

      updateGlobalActions();
      saveReportsToLocalStorage();
      if (wasSelected) {
        clearSelection();
      } else {
        refreshReportActions();
      }

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

  // Función para actualizar visibilidad de botones globales (Share All / Delete All)
  function updateGlobalActions() {
    const reportCount =
      UI.reportContent.querySelectorAll(".report-wrapper").length;
    let container = document.getElementById("global-actions-container");

    if (reportCount > 1) {
      if (!container) {
        container = document.createElement("div");
        container.id = "global-actions-container";
        container.style.display = "flex";
        container.style.gap = "10px";
        container.style.marginTop = "20px";
        UI.reportContainer.appendChild(container);
      }

      // Delete All Button (Left, Red, Small)
      if (!document.getElementById("delete-all-reports")) {
        const deleteAllBtn = document.createElement("button");
        deleteAllBtn.type = "button";
        deleteAllBtn.id = "delete-all-reports";
        deleteAllBtn.classList.add("btn", "btn-delete-all");
        deleteAllBtn.textContent = "🗑️ Delete All";

        // Red styling
        deleteAllBtn.style.backgroundColor = "#fee2e2";
        deleteAllBtn.style.color = "#991b1b";
        deleteAllBtn.style.border = "1px solid #f87171";
        // Smaller size
        deleteAllBtn.style.fontSize = "0.8em";
        deleteAllBtn.style.padding = "4px 8px";
        deleteAllBtn.style.flex = "0 0 auto";

        deleteAllBtn.addEventListener("click", () => {
          if (confirm("¿Seguro que quieres eliminar TODOS los reportes?")) {
            // Guardar estado para deshacer
            const children = Array.from(UI.reportContent.children);
            const savedImages = new Map(reportImagesMap);

            UI.reportContent.innerHTML = "";
            UI.reportContainer.classList.add("hidden");
            reportImagesMap.clear(); // Limpiar todas las imágenes

            // Remove container instead of just button
            container.remove();

            clearReportsFromLocalStorage();
            clearSelection();

            showUndoToast("Todos los reportes eliminados", () => {
              children.forEach((child) => UI.reportContent.appendChild(child));
              UI.reportContainer.classList.remove("hidden");
              savedImages.forEach((val, key) => {
                reportImagesMap.set(key, val);
              });
              updateGlobalActions();
              saveReportsToLocalStorage();
            });
          }
        });

        container.appendChild(deleteAllBtn);
      }

      // Share All Button (Right, Regular, Big)
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
          // Ensure options are visible near the buttons
          container.insertAdjacentElement("afterend", UI.shareOptions);
        });
        container.appendChild(shareAllBtn);
      }
    } else {
      if (container) {
        container.remove();
      }
    }
    refreshReportActions();
  }

  // Función para guardar reportes en localStorage
  function saveReportsToLocalStorage() {
    const reports = Array.from(
      UI.reportContent.querySelectorAll(".report-wrapper")
    ).map((wrap) => {
      const payloadRaw = wrap.dataset.reportPayload;
      let payloadObj = null;
      if (payloadRaw) {
        try {
          payloadObj = JSON.parse(payloadRaw);
        } catch (e) {
          console.warn("No se pudo parsear payload, usando fallback");
        }
      }
      const entry = wrap.querySelector(".report-entry");
      const text = entry ? entry.textContent.trim() : "";
      const timestamp =
        wrap.dataset.timestamp ||
        (payloadObj && payloadObj.timestamp) ||
        new Date().toISOString();
      if (payloadObj) {
        payloadObj.timestamp = timestamp;
        return payloadObj;
      }
      return { reportText: text, address: text.split(",")[0] || "", timestamp };
    });
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  }

  // Función para limpiar reportes de localStorage
  function clearReportsFromLocalStorage() {
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
  }

  // Funciones para controlar el estado de los botones post-reporte
  function disablePostReportButtons() {
    const containers = [
      UI.acHeatOptions,
      UI.thermostatButtons,
      UI.thermostatQuantity,
      UI.thermostatOtro,
      UI.accessoryButtons,
      UI.fixesSection,
      UI.weightInContent,
      UI.accessoryOtro,
      UI.fixOtro,
    ];

    containers.forEach((container) => {
      if (!container) return;
      const elements = container.querySelectorAll(
        "button, input, select, textarea"
      );
      elements.forEach((el) => {
        // No deshabilitar los botones de colapso/expansión
        el.disabled = true;
        el.classList.add("disabled");
      });
    });
  }

  function enablePostReportButtons() {
    const containers = [
      UI.acHeatOptions,
      UI.thermostatButtons,
      UI.thermostatQuantity,
      UI.thermostatOtro,
      UI.accessoryButtons,
      UI.fixesSection,
      UI.weightInContent,
      UI.accessoryOtro,
      UI.fixOtro,
    ];

    containers.forEach((container) => {
      if (!container) return;
      const elements = container.querySelectorAll(
        "button, input, select, textarea"
      );
      elements.forEach((el) => {
        el.disabled = false;
        el.classList.remove("disabled");
      });
    });
  }

  function resetSelections() {
    enablePostReportButtons(); // Asegurar que los botones estén activos al resetear
    UI.addressInput.value = "";
    if (UI.addressDetailsInput) {
      UI.addressDetailsInput.value = "";
    }
    if (UI.addJobsButton) UI.addJobsButton.disabled = true; // Disable button on reset
    UI.notesInput.value = "";
    UI.otroNameInput.value = "";
    UI.otroPriceInput.value = "";
    UI.fixOtroNameInput.value = "";
    UI.fixOtroPriceInput.value = "";
    UI.serviceTypeButtons
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    UI.acHeatOptions
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    UI.thermostatButtons
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    UI.accessoryButtons
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    getAllFixButtons().forEach((btn) => btn.classList.remove("active"));
    resetState();
    state = getState();
    if (UI.heaterModelSelect) UI.heaterModelSelect.value = "";
    if (UI.outdoorModelSelect) UI.outdoorModelSelect.value = "";
    if (UI.heaterModelSelect2) UI.heaterModelSelect2.value = "";
    if (UI.outdoorModelSelect2) UI.outdoorModelSelect2.value = "";

    // Resetear Series y actualizar UI (Dropdown vs Botón)
    [
      UI.heaterSeriesSelect,
      UI.outdoorSeriesSelect,
      UI.heaterSeriesSelect2,
      UI.outdoorSeriesSelect2,
    ].forEach((select) => {
      if (select) {
        select.value = "";
        select.dispatchEvent(new Event("change"));
      }
    });

    weightInFieldConfigs.forEach(({ key }) => {
      const inputEl = weightInInputs[key];
      if (inputEl) inputEl.value = "";
    });
    weightInFieldConfigs.forEach(({ key }) => {
      const inputEl = weightInInputs2[key];
      if (inputEl) inputEl.value = "";
    });
    // Limpiar inputs de imagen y estado temporal
    if (imageManager) imageManager.resetImages();

    const leaksSubGroup = document.getElementById("fix-group-leaks");
    if (leaksSubGroup) leaksSubGroup.classList.add("hidden");
    const leaksGroupBtn = UI.fixesSection.querySelector('[data-fix-group="leaks"]');
    if (leaksGroupBtn) {
      leaksGroupBtn.classList.remove("active");
      const arrow = leaksGroupBtn.querySelector(".preset-arrow");
      if (arrow) arrow.textContent = "▾";
    }
    UI.thermostatQuantity.classList.add("hidden");
    if (UI.thermostatOtro) {
      UI.thermostatOtro.classList.add("hidden");
      UI.thermostatOtroName.value = "";
    }
    UI.accessoryOtro.classList.add("hidden");
    UI.fixOtro.classList.add("hidden");
    if (UI.customAccessoriesList) UI.customAccessoriesList.innerHTML = "";
    if (UI.customFixesList) UI.customFixesList.innerHTML = "";
    UI.shareOptions.classList.add("hidden");
    updateQuantityButtons(1);
    updatePriceDisplay();
    switchToTab("jobs");
    saveToLocalStorage();
  }

  UI.reportEditButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (!selected) {
      alert("Selecciona un reporte primero");
      return;
    }
    const text = getSelectedReportText();
    editReport(selected, text);
    refreshReportActions();
  });

  UI.reportDeleteButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (selected) {
      deleteReport(selected);
      return;
    }
    if (confirm("¿Seguro que quieres eliminar todos los reportes?")) {
      UI.reportContent.innerHTML = "";
      UI.reportContainer.classList.add("hidden");
      clearSelection();
      clearLocalStorage();
    }
    updateGlobalActions();
    refreshReportActions();
  });

  function getSelectedReportText() {
    const selected = getSelectedReport();
    if (!selected) return "";
    const entry = selected.querySelector(".report-entry");
    return entry ? entry.textContent.trim() : "";
  }

  function getAllReportsText() {
    const entries = UI.reportContent.querySelectorAll(".report-entry");
    return Array.from(entries)
      .map((entry) => entry.textContent.trim())
      .filter(Boolean)
      .join("\n");
  }

  let shareContext = "auto"; // 'auto' | 'all'

  UI.reportShareButton.addEventListener("click", () => {
    if (!getReportWrappers().length) {
      alert("No hay reportes para compartir");
      return;
    }
    shareContext = "auto";
    UI.shareOptions.classList.toggle("hidden");
  });

  // Configuración de botones de compartir (Refactorizado)
  [
    { btn: UI.shareWhatsappButton, method: "whatsapp" },
    { btn: UI.shareSmsButton, method: "sms" },
    { btn: UI.shareEmailButton, method: "email" },
    { btn: UI.shareCopyButton, method: "copy" },
  ].forEach(({ btn, method }) => {
    if (btn) {
      btn.addEventListener("click", () => {
        const text =
          shareContext === "all"
            ? getAllReportsText()
            : getSelectedReportText() || getAllReportsText();
        shareReportVia(text, method);
        UI.shareOptions.classList.add("hidden");
        shareContext = "auto";
      });
    }
  });

  if (UI.reportExportCsvButton) {
    UI.reportExportCsvButton.addEventListener("click", () => {
      if (confirm("Generate a CSV file with all reports?")) {
        exportToCSV(getReportWrappers());
      }
    });
  }

  if (UI.exportDbButton) {
    UI.exportDbButton.addEventListener("click", (e) => {
      e.preventDefault();

      const reportsRaw = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (!reportsRaw) {
        alert("No reports found to export.");
        return;
      }

      let reports = [];
      try {
        reports = JSON.parse(reportsRaw);
      } catch (err) {
        console.error("Error parsing reports", err);
        alert("Error parsing reports data.");
        return;
      }

      // Ask for tech name before export
      const savedTechName = localStorage.getItem("dashboard_tech_name") || "";
      const techName = prompt(
        "Nombre del técnico para este export:",
        savedTechName
      );
      if (techName === null) return; // cancelled
      if (techName.trim()) {
        localStorage.setItem("dashboard_tech_name", techName.trim());
      }

      if (
        !confirm(
          `¿Exportar ${reports.length} reportes completados para el Dashboard?`
        )
      ) {
        return;
      }

      const exportTechName = techName.trim() || "Sin nombre";
      const jobsToExport = reports.map((r) => {
        // Handle legacy string reports
        if (typeof r === "string") {
          return {
            address: r.split(",")[0] || "Unknown",
            savedState: {
              notes: r,
              date: new Date().toISOString().split("T")[0],
            },
          };
        }

        // Extract date
        let dateStr = new Date().toISOString().split("T")[0];
        if (r.timestamp) {
          try {
            dateStr = new Date(r.timestamp).toISOString().split("T")[0];
          } catch (e) {}
        }

        // Extract Thermostat from services text if not explicit
        let tstat = null;
        let tstatQty = 1;

        if (r.services && Array.isArray(r.services)) {
          for (const s of r.services) {
            const name = s.displayName || s.name || "";
            // Regex matches "1 T-6 tstat" or "2 Ecobee tstats"
            const match = name.match(/(\d+)\s+(.*?)\s+tstat/i);
            if (match) {
              tstatQty = parseInt(match[1]);
              tstat = { name: match[2] };
              break;
            }
          }
        }

        return {
          techName: exportTechName,
          address: r.address || "Unknown",
          subdivision: r.subdivision || "",
          builder: r.builder || "",
          heaterModel: r.heaterModel || "",
          outdoorModel: r.outdoorModel || "",
          refrigerant: r.refrigerant || "",
          savedState: {
            date: dateStr,
            notes: Array.isArray(r.notes) ? r.notes.join("\n") : r.notes || "",
            weightInData: r.weightInData || {},
            weightInData2: r.weightInData2 || {},
            selectedThermostat: tstat,
            thermostatQuantity: tstatQty,
            selectedServices: (r.services || []).map((s) => ({
              name: s.name,
              basePrice: s.price || s.basePrice || 0,
            })),
            selectedAccessories: (r.accessories || []).map((a) => ({
              name: a.name,
              basePrice: a.price,
            })),
            selectedFixes: (r.fixes || []).map((f) => ({
              name: f.name,
              basePrice: f.price,
            })),
          },
        };
      });

      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(jobsToExport, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute(
        "download",
        "dashboard_import_" +
          new Date().toISOString().slice(0, 10) +
          "_" +
          exportTechName.replace(/\s+/g, "_") +
          ".json"
      );
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  }

  // --- COLLAPSIBLE JOB FORM LOGIC ---
  // Agrupa y oculta el formulario de ingreso de trabajos para limpiar la pantalla
  const setupJobFormToggle = () => {
    if (!UI.addressInput || !UI.jobsListContainer) return;

    const listContainer = UI.jobsListContainer;
    const inputEl = UI.addressInput;
    let formContainer = null;

    // Determinar el contenedor del formulario
    if (inputEl.parentNode === listContainer.parentNode) {
      // Si son hermanos directos, envolvemos todo lo anterior a la lista
      const parent = listContainer.parentNode;
      formContainer = document.createElement("div");
      formContainer.id = "job-form-wrapper";
      formContainer.style.transition = "all 0.3s ease";

      // Mover elementos anteriores a la lista dentro del nuevo contenedor
      while (parent.firstChild && parent.firstChild !== listContainer) {
        formContainer.appendChild(parent.firstChild);
      }
      parent.insertBefore(formContainer, listContainer);
    } else {
      // Si el input ya está en un contenedor separado (ej. .section)
      // Buscamos el contenedor padre más cercano que sea hermano de la lista
      let current = inputEl;
      while (current && current.parentNode !== listContainer.parentNode) {
        current = current.parentNode;
      }
      if (current) {
        formContainer = current;
      }
    }

    if (formContainer) {
      // Crear botón de toggle
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn-toggle-form";
      toggleBtn.innerHTML = "➕ New Job Entry";
      toggleBtn.style.width = "100%";
      toggleBtn.style.marginBottom = "16px";
      toggleBtn.style.display = "flex";
      toggleBtn.style.justifyContent = "center";
      toggleBtn.style.alignItems = "center";
      toggleBtn.style.fontWeight = "bold";
      toggleBtn.style.padding = "10px";

      formContainer.parentNode.insertBefore(toggleBtn, formContainer);
      formContainer.classList.add("hidden"); // Ocultar por defecto

      // --- Backup/Restore Buttons ---
      const toolsDiv = document.createElement("div");
      toolsDiv.style.display = "flex";
      toolsDiv.style.gap = "8px";
      toolsDiv.style.marginTop = "0px";
      toolsDiv.style.marginBottom = "10px";
      toolsDiv.style.justifyContent = "flex-end";
      toolsDiv.style.padding = "0 4px";

      const exportBtn = document.createElement("button");
      exportBtn.textContent = "💾 Backup";
      exportBtn.className = "btn";
      exportBtn.style.fontSize = "0.8em";
      exportBtn.onclick = (e) => {
        e.preventDefault();
        if (jobManager) jobManager.exportJobs();
      };

      const importInput = document.createElement("input");
      importInput.type = "file";
      importInput.accept = ".json";
      importInput.style.display = "none";
      importInput.onchange = (e) => {
        if (jobManager && e.target.files[0]) {
          jobManager.importJobs(e.target.files[0]);
          e.target.value = "";
        }
      };

      const importBtn = document.createElement("button");
      importBtn.textContent = "📂 Restore";
      importBtn.className = "btn";
      importBtn.style.fontSize = "0.8em";
      importBtn.onclick = (e) => {
        e.preventDefault();
        importInput.click();
      };

      toolsDiv.appendChild(exportBtn);
      toolsDiv.appendChild(importBtn);
      toolsDiv.appendChild(importInput);

      formContainer.parentNode.insertBefore(toolsDiv, toggleBtn);
      // ------------------------------------

      toggleBtn.addEventListener("click", () => {
        const isHidden = formContainer.classList.contains("hidden");
        formContainer.classList.toggle("hidden");
        toggleBtn.innerHTML = isHidden ? "➖ Hide Form" : "➕ New Job Entry";
      });
    }
  };
  setupJobFormToggle();

  function updatePriceDisplay() {
    // Usamos requestAnimationFrame para evitar bloqueos en actualizaciones rápidas
    requestAnimationFrame(() => {
      if (!UI.serviceOptionsDisplay) return;

      const { totalServicePrice, totalAccessoryPrice, totalFixPrice, total } =
        calculateFinancials(state);

      UI.serviceOptionsDisplay.innerHTML = `
        <div style="text-align: center;">
          <strong style="font-size: 10pt; color: var(--button-bg-active);">
            💵 Total: $${total}
          </strong><br>
          <div style="font-size: 7pt; margin-top: 4px; color: var(--text-color);">
            ${totalServicePrice > 0 ? `🔧 Servicio: $${totalServicePrice}` : ""}
            ${
              totalAccessoryPrice > 0
                ? `📦 Accesorios: $${totalAccessoryPrice}`
                : ""
            }
            ${totalFixPrice > 0 ? `⚡ Extras: $${totalFixPrice}` : ""}
          </div>
        </div>
      `;
    });
  }
};

// Función extraída para restaurar la UI desde el estado (Mejora de Mantenimiento)
function restoreUI(UI, state, helpers) {
  Components.Address.render(UI, state);
  Components.Services.render(UI, state);
  Components.Thermostat.render(UI, state);
  Components.Accessories.render(UI, state);
  Components.Fixes.render(UI, state, helpers);
  Components.Equipment.render(UI, state);
  Components.WeightIn.render(UI, state, helpers);
  Components.Notes.render(UI, state);

  updateStepper(state);
  helpers.updatePriceDisplay();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        console.log("Service Worker registered successfully");
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") window.location.reload();
          });
        });
      })
      .catch((err) => console.error("SW error:", err));
  });
}
