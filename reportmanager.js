import {
  createReportCard,
  generateReportText,
  generateReportData,
  exportToCSV,
  shareReportVia,
} from "./reports.js";
import { STORAGE_KEYS, ACCESSORIES, FIXES } from "./constants.js";
import { validateState } from "./validation.js";
import { getActiveJobAddress, getJobByAddress } from "./jobs.js";
import { unidadesExteriores } from "./weightInData.js";
import {
  showUndoToast,
  switchToTab,
  hideValidationErrors,
  showValidationErrors,
} from "./ui.js";

export function initReportManager(context) {
  const {
    UI,
    getState,
    saveToLocalStorage,
    clearLocalStorage,
    enablePostReportButtons,
    disablePostReportButtons,
    removeJobFromList,
    getCurrentImages,
    imageManager,
  } = context;

  // State local para reportes
  const reportImagesMap = new Map();
  let selectedReportId = null;
  let shareContext = "auto"; // 'auto' | 'all'

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

  // --- Global Actions (Delete All + Share All) ---
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

      if (!document.getElementById("delete-all-reports")) {
        const deleteAllBtn = document.createElement("button");
        deleteAllBtn.type = "button";
        deleteAllBtn.id = "delete-all-reports";
        deleteAllBtn.classList.add("btn", "btn-delete-all");
        deleteAllBtn.textContent = "🗑️ Delete All";
        deleteAllBtn.style.backgroundColor = "#fee2e2";
        deleteAllBtn.style.color = "#991b1b";
        deleteAllBtn.style.border = "1px solid #f87171";
        deleteAllBtn.style.fontSize = "0.8em";
        deleteAllBtn.style.padding = "4px 8px";
        deleteAllBtn.style.flex = "0 0 auto";

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

  // --- Modal: Download Photos Warning ---
  function showImageWarningModal(count, onConfirm) {
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
      overlay.style.pointerEvents = "none";
      setTimeout(() => {
        overlay.remove();
        if (cb) cb();
      }, 80);
    };

    overlay.querySelector("#_img-warn-dl").onclick = () => {
      closeModal(() => {
        if (imageManager) imageManager.triggerDownload();
        setTimeout(onConfirm, 300);
      });
    };
    overlay.querySelector("#_img-warn-skip").onclick = () => closeModal(onConfirm);
    overlay.querySelector("#_img-warn-cancel").onclick = () => closeModal();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
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
      const parent = reportWrapper.parentNode;
      const nextSibling = reportWrapper.nextSibling;
      const reportId = reportWrapper.dataset.reportId;
      const savedImages = reportImagesMap.get(reportId);

      reportWrapper.remove();
      reportImagesMap.delete(reportId);
      if (UI.reportContent.children.length === 0) {
        UI.reportContainer.classList.add("hidden");
      }
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
      totals,
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

    const undownloaded = imageManager ? imageManager.getUndownloadedCount() : 0;
    if (undownloaded > 0) {
      showImageWarningModal(undownloaded, generateReportProcess);
    } else {
      generateReportProcess();
    }
  });

  UI.reportEditButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (!selected) {
      alert("Selecciona un reporte primero");
      return;
    }
    editReport(selected, getSelectedReportText());
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
    updateGlobalActions();
    refreshReportActions();
  });

  UI.reportShareButton.addEventListener("click", () => {
    if (!getReportWrappers().length) {
      alert("No hay reportes para compartir");
      return;
    }
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

      const savedTechName = localStorage.getItem("dashboard_tech_name") || "";
      const techName = prompt(
        "Nombre del técnico para este export:",
        savedTechName
      );
      if (techName === null) return;
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
        if (typeof r === "string") {
          return {
            address: r.split(",")[0] || "Unknown",
            savedState: {
              notes: r,
              date: new Date().toISOString().split("T")[0],
            },
          };
        }

        let dateStr = new Date().toISOString().split("T")[0];
        if (r.timestamp) {
          try {
            dateStr = new Date(r.timestamp).toISOString().split("T")[0];
          } catch (e) {}
        }

        let tstat = null;
        let tstatQty = 1;
        if (r.services && Array.isArray(r.services)) {
          for (const s of r.services) {
            const name = s.displayName || s.name || "";
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
          reportText: r.reportText || "",
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

  return {
    loadReportsFromLocalStorage: (savedReports) => {
      if (!savedReports) return;
      try {
        const reports = JSON.parse(savedReports);
        reports.forEach((item) => {
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
        if (reports.length > 0) {
          UI.reportContainer.classList.remove("hidden");
        }
        refreshReportActions();
        updateGlobalActions();
      } catch (e) {
        console.error("Error parsing savedReports:", e);
      }
    },
  };
}
