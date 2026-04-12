import {
  getJobs,
  setJobs,
  addJob,
  updateJob,
  deleteJobByIndex,
  saveJobState,
  renderJobsList as renderJobsListModule,
  getActiveJobAddress,
  setActiveJobAddress,
  getJobByAddress,
} from "./jobs.js";
import { normalizeAddress, calculateCFM } from "./utils.js";
import { startTrayecto, getMode, getExportData, resetTracker } from "./routeTracker.js";
import { heaters, unidadesExteriores } from "./weightInData.js";
import { toggleWorkspace, switchToTab, createChip } from "./ui.js";
import { STORAGE_KEYS } from "./constants.js";

// Datos derivados para las tarjetas de equipos
const heaterImageMap = Object.keys(heaters || {}).reduce((acc, key) => {
  if (heaters[key].imagen) {
    acc[key] = heaters[key].imagen;
  }
  return acc;
}, {});
const outdoorDataMap = unidadesExteriores || {};

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
    const jobsArray = getJobs();
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
                  }
            )
          : [];
        setJobs(loadedJobs);
      } catch (e) {
        console.error("Error parsing jobsArray:", e);
      }
    }
    renderJobsList();
  }

  function renderJobsList() {
    // Usamos el módulo de renderizado de jobs.js que es más completo
    // (incluye filtros, resumen de carga, chips técnicos y notas)
    const callbacks = {
      onDelete: (addr) => deleteJob(addr),
      onEdit: (addr, idx) => editJob(addr, idx),
      onMaps: (addr) => openInMaps(addr),
      onStart: (addr) => startJob(addr),
    };

    renderJobsListModule(
      UI.jobsListContainer,
      callbacks,
      heaterImageMap,
      outdoorDataMap
    );

    // Mostrar/Ocultar botón de Ruta basado en si hay trabajos
    if (UI.btnRouteAll) {
      const jobs = getJobs();
      UI.btnRouteAll.classList.toggle("hidden", jobs.length === 0);
    }
  }

  // Función interna para centralizar la lógica de eliminación
  function _removeJob(address) {
    const jobs = getJobs();
    const index = jobs.findIndex(
      (job) => job.address === normalizeAddress(address)
    );

    if (index !== -1 && deleteJobByIndex(index)) {
      const activeJobAddress = getActiveJobAddress();
      if (activeJobAddress === address) {
        exitFocusMode();
        // Limpiar inputs si el trabajo activo fue eliminado
        UI.addressInput.value = "";
        setState({ address: "" });
      }
      renderJobsList();
      saveJobsToLocalStorage();
      return true;
    }
    return false;
  }

  function addJobs() {
    const addressesInput = UI.addressInput.value.trim();
    const detailsInput = UI.addressDetailsInput
      ? UI.addressDetailsInput.value.trim()
      : "";
    const subdivisionInput = UI.subdivisionInput
      ? UI.subdivisionInput.value.trim()
      : "";
    const builderInput = UI.builderInput ? UI.builderInput.value.trim() : "";
    const selectedHeater = UI.heaterModelSelect
      ? UI.heaterModelSelect.value
      : "";
    const selectedHeater2 = UI.heaterModelSelect2
      ? UI.heaterModelSelect2.value
      : "";
    const selectedOutdoor = UI.outdoorModelSelect
      ? UI.outdoorModelSelect.value
      : "";
    const selectedOutdoor2 = UI.outdoorModelSelect2
      ? UI.outdoorModelSelect2.value
      : "";
    const selectedTstat = UI.jobTstatSelect ? UI.jobTstatSelect.value : "";
    const selectedTstatQty = UI.jobTstatQty ? UI.jobTstatQty.value : "1";

    // Capturar accesorios desde los chips
    const selectedAcc = UI.jobAccChipsContainer
      ? Array.from(UI.jobAccChipsContainer.children).map((c) => c.dataset.value)
      : [];

    const isTwoSystems = UI.jobTwoSystemsToggle
      ? UI.jobTwoSystemsToggle.checked
      : false;

    if (!addressesInput) {
      alert("Por favor ingresa al menos una dirección");
      return;
    }

    const addresses = addressesInput
      .split(/[\n,]+/)
      .map((addr) => addr.trim())
      .filter((addr) => addr);

    if (addresses.length === 0) {
      alert("No se encontraron direcciones válidas");
      return;
    }

    addresses.forEach((address) => {
      const normalized = normalizeAddress(address);
      addJob({
        address: normalized,
        details: detailsInput,
        subdivision: subdivisionInput,
        builder: builderInput,
        heaterModel: selectedHeater,
        outdoorModel: selectedOutdoor,
        heaterModel2: isTwoSystems ? selectedHeater2 : "",
        outdoorModel2: isTwoSystems ? selectedOutdoor2 : "",
        isTwoSystems: isTwoSystems,
        thermostat: selectedTstat
          ? { type: selectedTstat, qty: selectedTstatQty }
          : null,
        extractedAccessories: selectedAcc, // Ya es un array
        savedState: null,
      });
    });

    UI.addressInput.value = "";
    setState({ address: "" });
    if (UI.addressDetailsInput) UI.addressDetailsInput.value = "";
    if (UI.subdivisionInput) UI.subdivisionInput.value = "";
    if (UI.builderInput) UI.builderInput.value = "";
    if (UI.heaterModelSelect) UI.heaterModelSelect.value = "";
    if (UI.heaterModelSelect2) UI.heaterModelSelect2.value = "";
    if (UI.outdoorModelSelect) UI.outdoorModelSelect.value = "";
    if (UI.outdoorModelSelect2) UI.outdoorModelSelect2.value = "";
    if (UI.heaterSeriesSelect) {
      UI.heaterSeriesSelect.value = "";
      UI.heaterSeriesSelect.dispatchEvent(new Event("change"));
    }
    if (UI.outdoorSeriesSelect) {
      UI.outdoorSeriesSelect.value = "";
      UI.outdoorSeriesSelect.dispatchEvent(new Event("change"));
    }
    if (UI.heaterSeriesSelect2) {
      UI.heaterSeriesSelect2.value = "";
      UI.heaterSeriesSelect2.dispatchEvent(new Event("change"));
    }
    if (UI.outdoorSeriesSelect2) {
      UI.outdoorSeriesSelect2.value = "";
      UI.outdoorSeriesSelect2.dispatchEvent(new Event("change"));
    }
    if (UI.jobTstatSelect) UI.jobTstatSelect.value = "";
    if (UI.jobTstatQty) UI.jobTstatQty.value = "1";
    if (UI.jobAccSelect) {
      UI.jobAccSelect.value = "";
    }
    if (UI.jobAccChipsContainer) UI.jobAccChipsContainer.innerHTML = "";
    if (UI.jobTwoSystemsToggle) {
      UI.jobTwoSystemsToggle.checked = false;
      UI.jobTwoSystemsToggle.dispatchEvent(new Event("change"));
    }

    renderJobsList();
    saveJobsToLocalStorage();
  }

  function deleteJob(address) {
    if (confirm(`¿Seguro que quieres eliminar esta dirección?\n\n${address}`)) {
      if (_removeJob(address)) {
        saveToLocalStorage(); // Actualizar estado global solo si es acción manual
      }
    }
  }

  function editJob(oldAddress, index) {
    const newAddress = prompt("Editar dirección:", oldAddress);
    if (newAddress && newAddress.trim() !== "") {
      const trimmedAddress = normalizeAddress(newAddress);
      const jobs = getJobs();
      if (
        jobs.findIndex((job) => job.address === trimmedAddress) !== -1 &&
        trimmedAddress !== normalizeAddress(oldAddress)
      ) {
        alert("Esta dirección ya existe en la lista");
        return;
      }
      updateJob(index, { address: trimmedAddress });
      const activeJobAddress = getActiveJobAddress();
      if (activeJobAddress === oldAddress) {
        setActiveJobAddress(trimmedAddress);
        UI.addressInput.value = trimmedAddress;
        setState({ address: trimmedAddress });
      }
      renderJobsList();
      saveJobsToLocalStorage();
      saveToLocalStorage();
    }
  }

  function openInMaps(address) {
    startTrayecto();
    renderJobsList();           // update Maps icon to ⏱ pulsing
    const encodedAddress = encodeURIComponent(address);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      "_blank"
    );
  }

  function openRouteAll() {
    const jobs = getJobs();
    if (jobs.length === 0) return;

    // Construir URL de Google Maps con múltiples destinos
    // Formato: https://www.google.com/maps/dir/Current+Location/Address1/Address2/Address3
    const addresses = jobs
      .map((j) => encodeURIComponent(normalizeAddress(j.address)))
      .join("/");

    const url = `https://www.google.com/maps/dir/Current+Location/${addresses}`;
    window.open(url, "_blank");
  }

  function startJob(address) {
    setActiveJobAddress(address);
    const job = getJobByAddress(address);

    if (!job) {
      console.error("[startJob] job not found for address:", address);
      return;
    }

    if (job.savedState) {
      const savedState = JSON.parse(JSON.stringify(job.savedState));
      savedState.address = address;
      setState(savedState);
    } else {
      resetSelections();

      const newState = {
        address: address,
        heaterModel: job.heaterModel || "",
        outdoorModel: job.outdoorModel || "",
        heaterModel2: job.heaterModel2 || "",
        outdoorModel2: job.outdoorModel2 || "",
        isTwoSystems: job.isTwoSystems || false,
      };

      // Autorrellenar Termostato
      if (job.thermostat && job.thermostat.type) {
        let tstatName = job.thermostat.type;
        // Normalizar nombre buscando en los botones de la UI (para coincidir mayúsculas/minúsculas)
        if (UI.thermostatButtons) {
          const btn = Array.from(
            UI.thermostatButtons.querySelectorAll("[data-thermostat]")
          ).find(
            (b) =>
              b.dataset.thermostat.toLowerCase() === tstatName.toLowerCase()
          );
          if (btn) tstatName = btn.dataset.thermostat;
        }
        newState.selectedThermostat = { name: tstatName };
        newState.thermostatQuantity = parseInt(job.thermostat.qty) || 1;
      }

      // Autorrellenar Accesorios
      if (job.extractedAccessories && job.extractedAccessories.length > 0) {
        const accList = [];
        job.extractedAccessories.forEach((accName) => {
          let price = 0;
          let normalizedName = accName;

          // Buscar precio y nombre normalizado en los botones de la UI
          if (UI.accessoryButtons) {
            const btn = Array.from(
              UI.accessoryButtons.querySelectorAll("[data-accessory]")
            ).find(
              (b) => b.dataset.accessory.toLowerCase() === accName.toLowerCase()
            );
            if (btn) {
              price = parseFloat(btn.dataset.price) || 0;
              normalizedName = btn.dataset.accessory;
            }
          }
          accList.push({ name: normalizedName, basePrice: price });
        });
        newState.selectedAccessories = accList;
      }

      setState(newState);
    }

    toggleWorkspace(true);
    restoreUIFromState();
    renderJobsList();
    switchToTab("workspace");
    window.scrollTo({ top: 0, behavior: "smooth" });
    saveToLocalStorage();
  }

  function exitFocusMode() {
    saveToLocalStorage();
    setActiveJobAddress(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_JOB);
    toggleWorkspace(false);
    renderJobsList();
    switchToTab("jobs");
  }

  // --- EXPORT / IMPORT LOGIC ---
  function exportJobs() {
    const jobs = getJobs();
    const { tiempoTrayecto, tiempoLlamadas } = getExportData();
    const payload = { tiempoTrayecto, tiempoLlamadas, jobs };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      "jobs_backup_" + new Date().toISOString().slice(0, 10) + ".json"
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    resetTracker();
  }

  function importJobs(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedJobs = JSON.parse(event.target.result);
        if (Array.isArray(importedJobs)) {
          const currentJobs = getJobs();
          const currentAddresses = new Set(
            currentJobs.map((j) => normalizeAddress(j.address))
          );
          let addedCount = 0;

          importedJobs.forEach((job) => {
            if (
              job.address &&
              !currentAddresses.has(normalizeAddress(job.address))
            ) {
              currentJobs.push(job);
              addedCount++;
            }
          });

          setJobs(currentJobs);
          saveJobsToLocalStorage();
          renderJobsList();
          alert(
            `Importación completada. ${addedCount} trabajos nuevos agregados.`
          );
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

  // Inicialización
  if (UI.addJobsButton) {
    UI.addJobsButton.addEventListener("click", addJobs);
  }
  if (UI.btnRouteAll) {
    UI.btnRouteAll.addEventListener("click", openRouteAll);
  }
  loadJobsFromLocalStorage();

  return {
    saveJobsToLocalStorage,
    exitFocusMode,
    refreshJobList: renderJobsList,
    removeJobFromList: _removeJob, // Usamos la función interna optimizada
    exportJobs,
    importJobs,
    openRouteAll,
  };
}
