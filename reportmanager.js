import {
  createReportCard,
  generateReportText,
  generateReportData,
  exportToCSV,
  shareReportVia,
} from "./reports.js";
import { calculateFinancials } from "./pricing.js";
import { STORAGE_KEYS, ACCESSORIES, FIXES, SERVICES } from "./constants.js";
import {
  validateState,
  hideValidationErrors,
  showValidationErrors,
} from "./validation.js";
import { getActiveJobAddress, getJobByAddress } from "./jobs.js";
import { unidadesExteriores } from "./weightInData.js";
import { showUndoToast } from "./ui.js";

export function initReportManager(context) {
  const {
    UI,
    getState,
    saveToLocalStorage, // Para guardar estado global si es necesario
    resetSelections,
    removeJobFromList,
    getCurrentImages,
  } = context;

  // State local para reportes
  const reportImagesMap = new Map(); // Key: reportId, Value: { weight: File, fan: File }
  let selectedReportId = null;

  // --- Helpers del DOM ---
  const getReportWrappers = () =>
    Array.from(UI.reportContent.querySelectorAll(".report-wrapper"));

  const getSelectedReport = () =>
    selectedReportId
      ? UI.reportContent.querySelector(
          `.report-wrapper[data-report-id="${selectedReportId}"]`
        )
      : null;

  const getSelectedReportText = () => {
    const selected = getSelectedReport();
    if (!selected) return "";
    const entry = selected.querySelector(".report-entry");
    return entry ? entry.textContent.trim() : "";
  };

  const getAllReportsText = () => {
    const entries = UI.reportContent.querySelectorAll(".report-entry");
    return Array.from(entries)
      .map((entry) => entry.textContent.trim())
      .filter(Boolean)
      .join("\n");
  };

  // --- Lógica de Selección y UI ---
  function clearSelection() {
    getReportWrappers().forEach((wrap) => wrap.classList.remove("selected"));
    selectedReportId = null;
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
      UI.reportExportCsvButton.classList.toggle("hidden", !hasReports);
    }
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

  function updateDeleteAllButton() {
    const reportCount =
      UI.reportContent.querySelectorAll(".report-wrapper").length;

    if (reportCount > 1) {
      if (!document.getElementById("delete-all-reports")) {
        const deleteAllBtn = document.createElement("button");
        deleteAllBtn.type = "button";
        deleteAllBtn.id = "delete-all-reports";
        deleteAllBtn.classList.add("btn", "btn-delete-all");
        deleteAllBtn.textContent = "🗑️ Delete All";
        deleteAllBtn.style.marginTop = "20px";
        deleteAllBtn.style.width = "100%";

        deleteAllBtn.addEventListener("click", () => {
          if (confirm("¿Seguro que quieres eliminar TODOS los reportes?")) {
            // Guardar estado para deshacer
            const children = Array.from(UI.reportContent.children);
            const savedImages = new Map(reportImagesMap);

            UI.reportContent.innerHTML = "";
            UI.reportContainer.classList.add("hidden");
            reportImagesMap.clear();
            deleteAllBtn.remove();
            clearReportsFromLocalStorage();
            clearSelection();

            showUndoToast("Todos los reportes eliminados", () => {
              children.forEach((child) => UI.reportContent.appendChild(child));
              UI.reportContainer.classList.remove("hidden");
              savedImages.forEach((val, key) => {
                reportImagesMap.set(key, val);
              });
              updateDeleteAllButton();
              saveReportsToLocalStorage();
            });
          }
        });

        // Insertar al final del contenedor
        UI.reportContainer.appendChild(deleteAllBtn);
      }
    } else {
      const deleteAllBtn = document.getElementById("delete-all-reports");
      if (deleteAllBtn) deleteAllBtn.remove();
    }
    refreshReportActions();
  }

  // --- Persistencia ---
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

  function clearReportsFromLocalStorage() {
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
  }

  // --- Acciones de Reporte ---
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
      reportImagesMap.delete(reportWrapper.dataset.reportId);
      if (UI.reportContent.children.length === 0) {
        UI.reportContainer.classList.add("hidden");
      }
      updateDeleteAllButton();
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
        updateDeleteAllButton();
        saveReportsToLocalStorage();
        if (wasSelected) selectReport(reportId);
        else refreshReportActions();
      });
    }
  }

  // --- Event Listeners ---
  UI.generateReportButton.addEventListener("click", (e) => {
    e.preventDefault();
    hideValidationErrors();

    const state = getState();
    const isOtroAccessoryActive = UI.accessoryButtons
      .querySelector(`[data-accessory="${ACCESSORIES.OTRO}"]`)
      ?.classList.contains("active");
    const isOtroFixActive = UI.fixesSection
      .querySelector(`[data-fix="${FIXES.OTRO}"]`)
      ?.classList.contains("active");

    const { blockingErrors } = validateState(
      state,
      isOtroAccessoryActive,
      isOtroFixActive
    );

    if (blockingErrors.length > 0) {
      showValidationErrors(blockingErrors);
      return;
    }

    executeReportGeneration();
  });

  function executeReportGeneration() {
    const state = getState();
    const reportText = generateReportText(state);
    const reportData = generateReportData(state);
    const totals = reportData.totals;
    const currentImages = getCurrentImages();

    const outdoorData = unidadesExteriores[state.outdoorModel];
    const refrigerant = outdoorData ? outdoorData.freon : "";

    const currentJob = getJobByAddress(state.address);
    const builder = currentJob ? currentJob.builder : "";
    const subdivision = currentJob ? currentJob.subdivision : "";

    const reportWrapper = createReportCard({
      reportText,
      address: state.address.trim().toUpperCase(),
      totals,
      services: reportData.services,
      accessories: reportData.accessories,
      fixes: reportData.fixes,
      thermostat: reportData.thermostat,
      weightInText: reportData.weightInText,
      notes: state.notes,
      timestamp: new Date().toISOString(),
      refrigerant,
      outdoorModel: state.outdoorModel,
      heaterModel: state.heaterModel,
      outdoorModel2: state.outdoorModel2,
      heaterModel2: state.heaterModel2,
      weightInData: state.weightInData,
      weightInData2: state.weightInData2,
      builder,
      subdivision,
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

    if (currentImages.weight || currentImages.fan) {
      reportImagesMap.set(reportWrapper.dataset.reportId, { ...currentImages });
    }

    saveReportsToLocalStorage();
    refreshReportActions();
    updateDeleteAllButton();

    const activeJobAddress = getActiveJobAddress();
    if (activeJobAddress && activeJobAddress === state.address) {
      removeJobFromList(activeJobAddress);
    }

    resetSelections();
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
      clearReportsFromLocalStorage();
    }
    updateDeleteAllButton();
    refreshReportActions();
  });

  UI.reportShareButton.addEventListener("click", () => {
    if (!getReportWrappers().length) {
      alert("No hay reportes para compartir");
      return;
    }
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
        shareReportVia(getSelectedReportText() || getAllReportsText(), method);
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

  return {
    loadReportsFromLocalStorage: (savedReports) => {
      if (!savedReports) return;
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
              ? { ...item, timestamp: item.timestamp || null }
              : null,
            callbacks: {
              onSelect: selectReport,
              onEdit: editReport,
              onDelete: deleteReport,
            },
          });
          UI.reportContent.appendChild(wrapper);
        });
        refreshReportActions();
        updateDeleteAllButton();
      } catch (e) {
        console.error("Error parsing savedReports:", e);
      }
    },
  };
}
