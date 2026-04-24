import {
  createReportCard,
  generateReportText,
  generateReportData,
  exportToCSV,
  shareReportVia,
} from "./reports.js";
import { STORAGE_KEYS, ACCESSORIES, FIXES, THERMOSTATS, PRICES } from "./constants.js";
import { validateState } from "./validation.js";
import { getActiveJobAddress, getJobByAddress } from "./jobs.js";
import { unidadesExteriores } from "./weightInData.js";
import {
  showUndoToast,
  showToast,
  switchToTab,
  hideValidationErrors,
  showValidationErrors,
} from "./ui.js";

export function initReportManager(context) {
  const {
    UI,
    getState,
    saveToLocalStorage,
    disablePostReportButtons,
    removeJobFromList,
    getCurrentImages,
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
  // --- Acciones de Reporte ---
  function editReport(reportWrapper) {
    if (!reportWrapper) return;

    const raw = reportWrapper.dataset.reportPayload;
    if (!raw) return;
    let p;
    try { p = JSON.parse(raw); } catch (e) { return; }

    document.getElementById("_edit-report-modal")?.remove();

    // Parse service state from payload
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

    const initAccs = (p.accessories || []).filter(a => a.name !== ACCESSORIES.WEIGHT_IN_DATA);
    const initFixes = p.fixes || [];

    // Escape for HTML attribute values
    const ea = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const accDisplayNames = {
      [ACCESSORIES.ZONING]: "zoning",
      [ACCESSORIES.HARMONY]: "Harmony Zone",
      [ACCESSORIES.E_BYPASS]: "Electronic Bypass Damper",
      [ACCESSORIES.BYPASS_CONTROL]: "bypass control",
      [ACCESSORIES.FRESH_AIR]: "air",
      [ACCESSORIES.FIN180P]: "fin180p wired and set",
      [ACCESSORIES.FIN6_MD]: "fin6-md wired and set",
      [ACCESSORIES.DEHUM]: "dehum wired",
      [ACCESSORIES.FA_INTAKE]: "f/a intake wired",
      [ACCESSORIES.DRAGONFLY]: "dragonfly",
      [ACCESSORIES.RDS]: "RDS Kit",
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

    const fixDisplayNames = {
      "Pressure Test": "pressure test",
      "Leaks": "fixed freon leaks",
      "Wires Jammed": "wires jammed",
      "Stuck Blower": "stuck blower",
      "Cut Sheetrock": "cut sheetrock",
      "Extended Wire": "extended wire",
      "PVC Work": "pvc work",
      "Open Ecoil": "opened ecoil to pull out sensor wire",
    };

    const catalogAccNames = Object.values(ACCESSORIES).filter(n => n !== ACCESSORIES.OTRO && n !== ACCESSORIES.WEIGHT_IN_DATA);
    const catalogFixNames = Object.values(FIXES).filter(n => n !== FIXES.OTRO);

    const makeAccRow = (acc) => {
      const isCatalog = catalogAccNames.includes(acc.name);
      return `<div class="_erow" data-kind="acc" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <select class="_esel" style="flex:1;min-width:0;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px">
          <option value="__other__"${!isCatalog ? " selected" : ""}>Other...</option>
          ${catalogAccNames.map(n => `<option value="${ea(n)}"${acc.name === n ? " selected" : ""}>${ea(n)}</option>`).join("")}
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
          ${catalogFixNames.map(n => `<option value="${ea(n)}"${fix.name === n ? " selected" : ""}>${ea(n)}</option>`).join("")}
        </select>
        <input type="text" class="_eother" placeholder="Name" value="${ea(!isCatalog ? fix.name : "")}" style="flex:1;display:${!isCatalog ? "block" : "none"};border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px" />
        <span style="white-space:nowrap;font-size:13px">$<input type="number" class="_eprice" value="${fix.price || 0}" min="0" style="width:52px;border-radius:6px;border:1px solid var(--border-color,#ccc);padding:5px;font-size:13px" /></span>
        <button type="button" class="_eremove" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:18px;padding:0 2px;line-height:1">✕</button>
      </div>`;
    };

    const tstatOpts = Object.values(THERMOSTATS).map(n => `<option value="${ea(n)}"${tstat && tstat.name === n ? " selected" : ""}>${ea(n)}</option>`).join("");

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
            ${sCheck("AC","AC",initSvc.ac)}
            ${sCheck("Heat","Heat",initSvc.heat)}
            ${sCheck("Finish","Finish",initSvc.finish)}
            ${sCheck("Prestart","Prestart",initSvc.prestart)}
            ${sCheck("Drive Run","Drive Run",initSvc.driveRun)}
            ${sCheck("Cancel","Cancel",initSvc.cancel)}
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
              <option value="">None</option>
              ${tstatOpts}
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

    // Toggle "other" text input when select changes
    overlay.addEventListener("change", (e) => {
      if (e.target.classList.contains("_esel")) {
        const row = e.target.closest("._erow");
        if (!row) return;
        const other = row.querySelector("._eother");
        if (other) other.style.display = e.target.value === "__other__" ? "block" : "none";
      }
    });

    // Remove row / close on backdrop click
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
      const selSvcs = Array.from(overlay.querySelectorAll('[name="_esvc"]:checked')).map(el => el.value);
      const new2sys = overlay.querySelector("#_e2sys").checked;
      const newTemp = overlay.querySelector("#_etemp").checked;
      const tstatVal = overlay.querySelector("#_etstat").value;
      const newTstat = tstatVal ? { name: tstatVal } : null;
      const newTstatQty = parseInt(overlay.querySelector("#_etqty").value) || 1;

      const collectRows = (listId) =>
        Array.from(overlay.querySelectorAll(`#${listId} ._erow`)).map(row => {
          const sel = row.querySelector("._esel").value;
          const name = sel === "__other__" ? row.querySelector("._eother").value.trim() : sel;
          const price = parseFloat(row.querySelector("._eprice").value) || 0;
          return name ? { name, price } : null;
        }).filter(Boolean);

      const newAccs = collectRows("_eacclist");
      const newFixes = collectRows("_efixlist");

      const newWid = {}, newWid2 = {};
      overlay.querySelectorAll('[data-wid="wid1"]').forEach(el => { newWid[el.dataset.key] = el.value.trim(); });
      overlay.querySelectorAll('[data-wid="wid2"]').forEach(el => { newWid2[el.dataset.key] = el.value.trim(); });

      // Build service items using same logic as generateReportData
      const hasAC = selSvcs.includes("AC");
      const hasHeat = selSvcs.includes("Heat");
      const hasFinish = selSvcs.includes("Finish");
      const hasPrestart = selSvcs.includes("Prestart");
      const hasDriveRun = selSvcs.includes("Drive Run");
      const hasCancel = selSvcs.includes("Cancel");

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
          if (newTstat) {
            const ql = newTstatQty === 1 ? "tstat" : "tstats";
            dn = `${dn} ${newTstatQty} ${newTstat.name} ${ql}`;
          }
          svcItems.push({ name: svcName, displayName: dn, price: svcPrice });
        }
      }

      // Accessories and fixes with display names
      const accItems = newAccs.map(a => ({
        name: a.name,
        displayName: accDisplayNames[a.name] || a.name.toLowerCase(),
        price: a.price,
      }));

      const fixItems = newFixes.map(f => ({
        name: f.name,
        displayName: fixDisplayNames[f.name] || f.name.toLowerCase(),
        price: f.price,
      }));

      // Auto-add weigh-in line if data present
      const hasWid1 = Object.values(newWid).some(v => v);
      const hasWid2v = Object.values(newWid2).some(v => v);
      if (hasWid1 || hasWid2v) {
        let widPrice = 10;
        if (hasFinish) widPrice += 10;
        if (new2sys) widPrice *= 2;
        const widSuffix = (hasWid1 && hasWid2v) ? " (2 Systems)" : hasWid2v ? " (Sys2)" : "";
        accItems.push({ name: ACCESSORIES.WEIGHT_IN_DATA, displayName: "weigh-in data" + widSuffix, price: widPrice });
      }

      // Totals
      const svcTotal = svcItems.reduce((s, i) => s + (i.price || 0), 0);
      const accTotal = accItems.reduce((s, i) => s + (i.price || 0), 0);
      const fixTotal = fixItems.reduce((s, i) => s + (i.price || 0), 0);
      const total = svcTotal + accTotal + fixTotal;

      // Build report text
      const parts = [p.address];
      if (newNotes) newNotes.split("\n").filter(n => n.trim()).forEach(n => parts.push(n.trim()));
      svcItems.forEach(s => parts.push(`${s.displayName} $${s.price}`));
      accItems.forEach(a => parts.push(`${a.displayName} $${a.price}`));
      fixItems.forEach(f => parts.push(`${f.displayName} $${f.price}`));
      parts.push(`total $${total}`);
      const newText = parts.join(", ");

      // Update DOM
      const entry = reportWrapper.querySelector(".report-entry");
      const rawEl = reportWrapper.querySelector(".report-raw");
      if (entry) entry.textContent = newText;
      if (rawEl) rawEl.textContent = newText;

      const totalBlock = reportWrapper.querySelector(".report-total");
      if (totalBlock) {
        const ta = totalBlock.querySelector(".total-amount");
        const tb = totalBlock.querySelector(".total-breakdown");
        if (ta) ta.textContent = `💵 $${total}`;
        if (tb) tb.textContent = [
          svcTotal ? `Svc $${svcTotal}` : "",
          accTotal ? `Acc $${accTotal}` : "",
          fixTotal ? `Fix $${fixTotal}` : "",
        ].filter(Boolean).join(" | ");
      }

      // weightInText metadata
      let weightInText = null;
      if (hasWid1 && hasWid2v) weightInText = "weigh-in data recorded (2 Systems)";
      else if (hasWid1) weightInText = "weigh-in data recorded";
      else if (hasWid2v) weightInText = "Sys2 weigh-in data recorded";

      // Update payload
      const newPayload = {
        ...p,
        reportText: newText,
        notes: newNotes,
        services: svcItems,
        accessories: accItems,
        fixes: fixItems,
        selectedThermostat: newTstat,
        thermostatQuantity: newTstatQty,
        isTwoSystems: new2sys,
        isTemporary: newTemp,
        weightInData: newWid,
        weightInData2: newWid2,
        weightInText,
        totals: { service: svcTotal, accessory: accTotal, fix: fixTotal, total },
      };
      reportWrapper.dataset.reportPayload = JSON.stringify(newPayload);

      saveReportsToLocalStorage();
      overlay.remove();
    });
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
      notes: reportData.notes.join("\n"),
      weightInData: state.weightInData,
      weightInData2: state.weightInData2,
      refrigerant,
      outdoorModel: state.outdoorModel,
      heaterModel: state.heaterModel,
      outdoorModel2: state.outdoorModel2,
      heaterModel2: state.heaterModel2,
      builder,
      subdivision,
      selectedThermostat: state.selectedThermostat || null,
      thermostatQuantity: state.thermostatQuantity || 1,
      isTwoSystems: state.isTwoSystems || false,
      isTemporary: state.isTemporary || false,
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
  UI.generateReportButton.addEventListener("click", async (e) => {
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

    const mgr = context.imageManager;
    const undownloaded = mgr ? mgr.getUndownloadedCount() : 0;
    if (undownloaded > 0) await mgr.downloadPhotos();
    generateReportProcess();
    if (undownloaded > 0) showToast(`📥 ${undownloaded} photo${undownloaded !== 1 ? "s" : ""} auto-downloaded`);
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

      const savedTechName = localStorage.getItem(STORAGE_KEYS.TECH_NAME) || "";
      const techName = prompt(
        "Nombre del técnico para este export:",
        savedTechName
      );
      if (techName === null) return;
      if (techName.trim()) {
        localStorage.setItem(STORAGE_KEYS.TECH_NAME, techName.trim());
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

        // Read thermostat directly from payload (new format)
        let tstat = r.selectedThermostat || null;
        let tstatQty = r.thermostatQuantity || 1;

        // Fallback: parse from displayName for old reports that lack the fields
        if (!tstat && r.services && Array.isArray(r.services)) {
          for (const s of r.services) {
            const name = s.displayName || s.name || "";
            // Match the number immediately before "tstat(s)" at end of string
            const match = name.match(/(\d+)\s+([\w-]+)\s+tstats?$/i);
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
          heaterModel2: r.heaterModel2 || "",
          outdoorModel2: r.outdoorModel2 || "",
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
