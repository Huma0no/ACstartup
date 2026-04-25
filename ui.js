import { STORAGE_KEYS } from "./src/data.js";

// --- LIGHTBOX ---
let lightboxOverlay = null;
let lightboxImage = null;

function ensureLightbox() {
  if (lightboxOverlay) return;
  lightboxOverlay = document.createElement("div");
  lightboxOverlay.id = "image-lightbox";
  lightboxImage = document.createElement("img");
  lightboxImage.alt = "Equipment image";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn lightbox-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", hideLightbox);
  lightboxOverlay.appendChild(lightboxImage);
  lightboxOverlay.appendChild(closeBtn);
  lightboxOverlay.addEventListener("click", (e) => {
    if (e.target === lightboxOverlay) hideLightbox();
  });
  document.body.appendChild(lightboxOverlay);
}

export function showLightbox(src, alt = "") {
  ensureLightbox();
  lightboxImage.src = src;
  lightboxImage.alt = alt || "Equipment image";
  lightboxOverlay.classList.add("visible");
}

export function hideLightbox() {
  if (lightboxOverlay) lightboxOverlay.classList.remove("visible");
}

// --- DIALOGS ---
export function showErrorDialog() {
  const el = document.getElementById("error-dialog");
  if (el) el.classList.remove("hidden");
}

export function hideErrorDialog() {
  const el = document.getElementById("error-dialog");
  if (el) el.classList.add("hidden");
}

// --- VALIDATION ERRORS ---
let _validationErrorTimeout = null;

export function showValidationErrors(
  errors,
  onBypass = null,
  bypassLabel = "⚠️ Save Anyway"
) {
  // Clear any previous auto-hide timer before creating a new one
  if (_validationErrorTimeout) {
    clearTimeout(_validationErrorTimeout);
    _validationErrorTimeout = null;
  }

  // Create or get the error container
  let errorContainer = document.getElementById("validation-errors");
  const generateReportButton = document.getElementById("generate-report");

  if (!errorContainer && generateReportButton) {
    errorContainer = document.createElement("div");
    errorContainer.id = "validation-errors";
    errorContainer.className = "section";
    errorContainer.style.cssText = `
      background: #ffcccc;
      border-color: #ff0000 #800000 #800000 #ff0000;
      margin-bottom: 8px;
      padding: 8px;
    `;

    // insert before generateReportButton
    generateReportButton.parentNode.insertBefore(
      errorContainer,
      generateReportButton
    );
  }

  if (errorContainer) {
    // Mostrar errores
    errorContainer.innerHTML = `
    <h2 style="color: #cc0000; margin-bottom: 8px;">⛔ Errores de Validación</h2>
    <ul style="margin-left: 20px; color: #000000;">
      ${errors
        .map((error) => `<li style="margin-bottom: 4px;">${error}</li>`)
        .join("")}
    </ul>
  `;

    // Si hay una función de bypass, mostrar botón "Save Anyway"
    if (onBypass) {
      const bypassBtn = document.createElement("button");
      bypassBtn.type = "button";
      bypassBtn.className = "btn";
      bypassBtn.textContent = bypassLabel;
      bypassBtn.style.marginTop = "8px";
      bypassBtn.onclick = () => {
        errorContainer.remove();
        onBypass();
      };
      errorContainer.appendChild(bypassBtn);
    }

    // Scroll to errors
    errorContainer.scrollIntoView({ behavior: "smooth", block: "center" });

    // Auto-hide after 10 seconds — only one timer active at a time
    _validationErrorTimeout = setTimeout(() => {
      if (errorContainer && errorContainer.parentNode) {
        errorContainer.remove();
      }
      _validationErrorTimeout = null;
    }, 10000);
  }
}

export function hideValidationErrors() {
  const errorContainer = document.getElementById("validation-errors");
  if (errorContainer) {
    errorContainer.remove();
  }
}

export function highlightInputErrors(elements) {
  // Limpiar errores previos
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));

  if (!elements || elements.length === 0) return;

  // Aplicar clase de error
  elements.forEach((el) => el.classList.add("input-error"));

  // Scroll al primer error y enfocar
  elements[0].scrollIntoView({ behavior: "smooth", block: "center" });
  elements[0].focus({ preventScroll: true });
}

// Shared steps definition
const PROGRESSIVE_SECTIONS = [
  "service-section",
  "thermostat-section",
  "accessory-section",
  "fixes-section",
  "weight-in-data-section",
  "notes-section",
];

// --- SECTIONS & WORKSPACE ---
export function revealSection(sectionId, animate = true) {
  const steps = PROGRESSIVE_SECTIONS;

  // 1. Determinar dirección de la animación basada en el índice actual vs nuevo
  let currentIndex = -1;
  steps.forEach((id, index) => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains("hidden")) {
      currentIndex = index;
    }
  });

  const newIndex = steps.indexOf(sectionId);
  let animation = "fadeIn 0.5s ease-out"; // Animación por defecto (ej. primera carga)

  if (
    animate &&
    currentIndex !== -1 &&
    newIndex !== -1 &&
    currentIndex !== newIndex
  ) {
    // Si avanzamos (índice mayor), entra desde la derecha. Si retrocedemos, desde la izquierda.
    animation =
      newIndex > currentIndex
        ? "slideInRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both"
        : "slideInLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both";
  }

  steps.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === sectionId) {
        el.classList.remove("hidden");
        el.style.animation = "none"; // Resetear animación
        if (animate) {
          el.offsetHeight; /* Trigger reflow para reiniciar la animación */
          el.style.animation = animation;
        }
      } else {
        el.classList.add("hidden");
      }
    }
  });

  // Update Nav Bar Active State
  const navItems = document.querySelectorAll(".step-item");
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.target === sectionId);
  });
}

export function hideSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add("hidden");
  }
}

export function toggleWorkspace(show) {
  // Sections that are part of the progressive flow
  const progressiveSections = PROGRESSIVE_SECTIONS;

  // Reset to first step on show
  progressiveSections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
    }
  });

  if (show) {
    revealSection("service-section");
  }

  const generateBtn = document.getElementById("generate-report");
  if (generateBtn) {
    if (show) generateBtn.classList.remove("hidden");
    else generateBtn.classList.add("hidden");
  }
}

export function createChip(label, variant = "default") {
  const chip = document.createElement("span");
  chip.className = `chip chip-${variant}`;
  chip.textContent = label;
  return chip;
}

// --- TABS ---
export function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      switchToTab(target);
    });
  });
}

// --- STEPPER ---
export function initStepper(onNext, onStepClick) {
  const steps = document.querySelectorAll(".step-item");
  steps.forEach((step) => {
    step.addEventListener("click", () => {
      revealSection(step.dataset.target);
      if (onStepClick) onStepClick(step.dataset.target);
    });
  });

  // Next Buttons
  const nextBtns = document.querySelectorAll(".btn-next");
  nextBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentSection = btn.closest(".section");
      const nextId = btn.dataset.next;

      if (onNext) {
        // Si onNext devuelve false, detenemos la navegación
        if (onNext(currentSection ? currentSection.id : null, nextId) === false)
          return;
      }
      revealSection(nextId);
    });
  });
}

export function updateStepper(state) {
  const steps = document.querySelectorAll(".step-item");

  // Logic to mark steps as completed based on state
  const isServiceDone = state.selectedServices.length > 0;
  const isTstatDone = !!state.selectedThermostat;
  const isAccDone =
    state.selectedAccessories.length > 0 || state.customAccessories.length > 0;
  const isFixDone =
    state.selectedFixes.length > 0 || state.customFixes.length > 0;
  const isWeightDone =
    state.weightInData && Object.values(state.weightInData).some((v) => v);
  const isNotesDone = !!state.notes;

  // Lógica de Advertencia para Weight-In (Si hay selección pero faltan datos)
  let isWeightWarning = false;
  if (state.weightInData && state.weightInData.factoryLineConfig) {
    const w = state.weightInData;
    const requiredFields = [
      "linesetLength",
      "factoryChargeOz",
      "approxAdjustOz",
      "adjustedOz",
      "fanSpeedCfm",
      "liquidLineTemp",
      "suctionLineTemp",
      "condenserSatTemp",
      "subcoolingValue",
      "oemSubcoolingGoal",
      "subcoolingDeviation",
    ];
    if (requiredFields.some((k) => !w[k] || w[k].toString().trim() === "")) {
      isWeightWarning = true;
    }
  }

  const statusMap = [
    isServiceDone,
    isTstatDone,
    isAccDone,
    isFixDone,
    isWeightDone,
    isNotesDone,
  ];

  steps.forEach((step, index) => {
    step.classList.toggle("completed", statusMap[index]);

    if (step.dataset.target === "weight-in-data-section") {
      step.classList.toggle("warning", isWeightWarning);
    }
  });
}

export function switchToTab(tabName) {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = document.querySelectorAll(".tab-panel");

  const currentIndex = tabs.findIndex((btn) =>
    btn.classList.contains("active")
  );
  const newIndex = tabs.findIndex((btn) => btn.dataset.tab === tabName);

  let direction = "none";
  if (currentIndex !== -1 && newIndex !== -1 && currentIndex !== newIndex) {
    direction = newIndex > currentIndex ? "right" : "left";
  }

  tabs.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    const btnIndex = tabs.indexOf(btn);

    btn.classList.toggle("active", isActive);
    btn.classList.toggle("completed", newIndex > -1 && btnIndex < newIndex);
  });

  panels.forEach((panel) => {
    panel.classList.remove("slide-in-right", "slide-in-left", "fade-in");
    if (panel.id === `tab-${tabName}`) {
      panel.classList.add("active");
      if (direction === "right") panel.classList.add("slide-in-right");
      else if (direction === "left") panel.classList.add("slide-in-left");
      else panel.classList.add("fade-in");
    } else {
      panel.classList.remove("active");
    }
  });
}

// --- UNDO TOAST ---
export function showUndoToast(message, onUndo) {
  let toast = document.getElementById("undo-toast");
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.id = "undo-toast";
  toast.className = "undo-toast";
  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" class="btn-undo">UNDO</button>
  `;

  document.body.appendChild(toast);

  const btnUndo = toast.querySelector(".btn-undo");
  let timeout;

  const close = () => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => {
      if (toast.parentNode) toast.remove();
    });
  };

  btnUndo.addEventListener("click", () => {
    clearTimeout(timeout);
    onUndo();
    close();
  });

  timeout = setTimeout(close, 5000);
}

export function showToast(message, duration = 3000) {
  let toast = document.getElementById("simple-toast");
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.id = "simple-toast";
  toast.className = "undo-toast";
  toast.style.justifyContent = "center";
  toast.innerHTML = `<span>${message}</span>`;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => {
      if (toast.parentNode) toast.remove();
    });
  }, duration);
}

// --- THEME SWITCHER ---
export function initThemeSwitcher(themeToggleInput) {
  if (!themeToggleInput) return;

  // Cargar y aplicar tema
  let savedTheme = localStorage.getItem(STORAGE_KEYS.APP_THEME) || "paper";
  // Asegurar que sea uno de los dos temas soportados por el toggle
  if (savedTheme !== "darkMode" && savedTheme !== "paper") savedTheme = "paper";

  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggleInput.checked = savedTheme === "darkMode";

  themeToggleInput.addEventListener("change", () => {
    const newTheme = themeToggleInput.checked ? "darkMode" : "paper";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(STORAGE_KEYS.APP_THEME, newTheme);
  });
}

// --- FORM HELPERS ---

export function populateSelect(selectEl, options) {
  if (!selectEl || selectEl.options.length > 1) return;
  options.forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

export function setupDynamicModelVisibility(
  seriesSelect,
  modelBtn,
  resetBtn,
  modelHiddenSelect
) {
  if (!seriesSelect || !modelBtn) return;

  const updateVisibility = () => {
    const hasSeries = !!seriesSelect.value;
    // Swap: Si hay serie seleccionada, ocultamos el dropdown de serie y mostramos el botón de modelo
    seriesSelect.style.display = hasSeries ? "none" : "";
    modelBtn.style.display = hasSeries ? "" : "none";
    if (resetBtn) resetBtn.style.display = hasSeries ? "" : "none";
  };

  seriesSelect.addEventListener("change", updateVisibility);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      seriesSelect.value = "";
      seriesSelect.dispatchEvent(new Event("change"));
      modelBtn.textContent = "Select Model";
      if (modelHiddenSelect) {
        modelHiddenSelect.value = "";
        modelHiddenSelect.dispatchEvent(new Event("change"));
      }
    });
  }

  // Chequeo inicial
  updateVisibility();
}
