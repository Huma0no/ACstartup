import { calculateFinancials } from "./pricing.js";

const init = () => {
  // DOM Elements
  const addressInput = document.getElementById("address");
  const serviceTypeButtons = document.getElementById("service-type-buttons");
  const serviceOptionsDisplay = document.getElementById(
    "service-options-display"
  );
  const acHeatOptions = document.getElementById("ac-heat-options");
  const thermostatButtons = document.getElementById("thermostat-buttons");
  const thermostatQuantity = document.getElementById("thermostat-quantity");
  const quantitySlider = document.getElementById("quantity-slider");
  const quantityValue = document.getElementById("quantity-value");
  const accessoryButtons = document.getElementById("accessory-buttons");
  const accessoryOtro = document.getElementById("accessory-otro");
  const otroNameInput = document.getElementById("otro-name");
  const otroPriceInput = document.getElementById("otro-price");
  const commonFixesSection = document.getElementById("common-fixes-section");
  const leaksOptions = document.getElementById("leaks-options");
  const commonFixesToggle = document.getElementById("common-fixes-toggle");
  const commonFixesExtra = document.getElementById("common-fixes-extra");
  const fixOtro = document.getElementById("fix-otro");
  const fixOtroNameInput = document.getElementById("fix-otro-name");
  const fixOtroPriceInput = document.getElementById("fix-otro-price");
  const weightInToggle = document.getElementById("weight-in-toggle");
  const weightInContent = document.getElementById("weight-in-content");
  const weightInFieldConfigs = [
    { key: "linesetLength", id: "weight-lineset-length" },
    { key: "factoryChargeOz", id: "weight-factory-charge" },
    { key: "liquidLineDiameter", id: "weight-liquid-diameter" },
    { key: "approxAdjustOz", id: "weight-approx-adjust" },
    { key: "adjustedOz", id: "weight-adjusted" },
    { key: "fanSpeedCfm", id: "weight-fan-speed" },
    { key: "liquidLineTemp", id: "weight-liquid-temp" },
    { key: "suctionLineTemp", id: "weight-suction-temp" },
    { key: "condenserSatTemp", id: "weight-condenser-temp" },
    { key: "subcoolingValue", id: "weight-subcooling-value" },
    { key: "oemSubcoolingGoal", id: "weight-oem-goal" },
    { key: "subcoolingDeviation", id: "weight-subcooling-deviation" },
  ];
  const weightInInputs = weightInFieldConfigs.reduce((acc, { key, id }) => {
    acc[key] = document.getElementById(id);
    return acc;
  }, {});
  const notesInput = document.getElementById("notes");
  const generateReportButton = document.getElementById("generate-report");
  const reportContainer = document.getElementById("report-container");
  const reportContent = document.getElementById("report-content");
  const reportEditButton = document.getElementById("report-edit");
  const reportDeleteButton = document.getElementById("report-delete");
  const reportShareButton = document.getElementById("report-share");
  const reportExportCsvButton = document.getElementById("report-export-csv");
  const reportActions = document.getElementById("report-actions");
  const shareOptions = document.getElementById("share-options");
  const shareWhatsappButton = document.getElementById("share-whatsapp");
  const shareSmsButton = document.getElementById("share-sms");
  const shareEmailButton = document.getElementById("share-email");
  const shareCopyButton = document.getElementById("share-copy");
  const errorDialog = document.getElementById("error-dialog");
  const errorDialogClose = document.getElementById("error-dialog-close");
  const addJobsButton = document.getElementById("add-jobs-btn");
  const jobsListContainer = document.getElementById("jobs-list-container");
  const jobsList = document.getElementById("jobs-list");
  const addressDetailsInput = document.getElementById("address-details");
  const pdfUploadInput = document.getElementById("pdf-upload");
  const pdfStatus = document.getElementById("pdf-status");
  const heaterModelSelect = document.getElementById("job-heater-model");
  const outdoorModelSelect = document.getElementById("job-outdoor-model");
  const quickPies = document.getElementById("quick-pies");
  const quickBrand = document.getElementById("quick-brand");
  const quickOvercharged = document.getElementById("quick-overcharged");
  const quickResultado = document.getElementById("quick-resultado");
  const quickCalcFab = document.getElementById("quick-calc-fab");
  const quickCalcModal = document.getElementById("quick-calc-modal");
  const quickCalcClose = document.getElementById("quick-calc-close");
  const sideNav = document.getElementById("side-nav");
  const quickDaikinTon = document.getElementById("quick-daikin-ton");
  const quickDaikinHe = document.getElementById("quick-daikin-he");
  const lblOvercharged = document.getElementById("lbl-overcharged");
  const lblDaikinHe = document.getElementById("lbl-daikin-he");
  let lightboxOverlay = null;
  let lightboxImage = null;

  // State para imágenes (No persiste en localStorage)
  const reportImagesMap = new Map(); // Key: reportId, Value: { weight: File, fan: File }
  let currentImages = { weight: null, fan: null };

  // URL del icono de la App
  const APP_ICON_URL = "images/icon.png";

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

  // Pantalla de Carga (Splash Screen)
  const initSplashScreen = () => {
    // Inyectar estilos CSS
    const style = document.createElement("style");
    style.innerHTML = `
      #splash-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--bg-color, #ffffff);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transition: opacity 0.5s ease-out, visibility 0.5s;
      }
      #splash-screen.hidden {
        opacity: 0;
        visibility: hidden;
      }
      .splash-icon {
        width: 80px;
        height: 80px;
        margin-bottom: 20px;
        object-fit: contain;
        animation: splashPulse 2s infinite ease-in-out;
      }
      .splash-progress-container {
        width: 200px;
        height: 4px;
        background-color: rgba(0,0,0,0.1);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }
      .splash-progress-bar {
        height: 100%;
        width: 0%;
        background-color: var(--button-bg-active, #3b82f6);
        border-radius: 2px;
        transition: width 0.1s linear;
      }
      @keyframes splashPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);

    // Crear elementos HTML
    const splash = document.createElement("div");
    splash.id = "splash-screen";

    const icon = document.createElement("img");
    icon.src = APP_ICON_URL;
    icon.className = "splash-icon";
    icon.alt = "App Icon";

    const progressContainer = document.createElement("div");
    progressContainer.className = "splash-progress-container";

    const progressBar = document.createElement("div");
    progressBar.className = "splash-progress-bar";

    progressContainer.appendChild(progressBar);
    splash.appendChild(icon);
    splash.appendChild(progressContainer);
    document.body.appendChild(splash);

    // Simular carga
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10; // Incremento aleatorio
      if (progress > 100) progress = 100;
      progressBar.style.width = `${progress}%`;

      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          splash.classList.add("hidden");
          setTimeout(() => {
            if (splash.parentNode) splash.parentNode.removeChild(splash);
          }, 500);
        }, 300);
      }
    }, 50); // Actualizar cada 50ms
  };
  initSplashScreen();

  // Utility: Debounce para optimizar eventos frecuentes
  const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };

  // Cargar JSZip dinámicamente (Movido al inicio para uso general)
  let jsZipPromise = null;
  const loadJSZip = () => {
    if (jsZipPromise) return jsZipPromise;
    jsZipPromise = new Promise((resolve, reject) => {
      if (window.JSZip) return resolve(window.JSZip);
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = () => resolve(window.JSZip);
      script.onerror = (e) => {
        jsZipPromise = null;
        reject(e);
      };
      document.head.appendChild(script);
    });
    return jsZipPromise;
  };

  // Cargar Piexifjs dinámicamente (Para inyectar EXIF)
  let piexifPromise = null;
  const loadPiexif = () => {
    if (piexifPromise) return piexifPromise;
    piexifPromise = new Promise((resolve, reject) => {
      if (window.piexif) return resolve(window.piexif);
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/piexifjs/1.0.6/piexif.js";
      script.onload = () => resolve(window.piexif);
      script.onerror = (e) => {
        piexifPromise = null;
        reject(e);
      };
      document.head.appendChild(script);
    });
    return piexifPromise;
  };

  // Función para inyectar GPS en EXIF de la imagen
  const addGpsToImage = async (file, lat, lon) => {
    if (!file || !file.type.includes("jpeg") || !lat || !lon) return file;
    try {
      await loadPiexif();
      const piexif = window.piexif;

      const toDMS = (deg) => {
        const d = Math.floor(Math.abs(deg));
        const minFloat = (Math.abs(deg) - d) * 60;
        const m = Math.floor(minFloat);
        const s = Math.round((minFloat - m) * 60 * 10000) / 10000;
        return [
          [d, 1],
          [m, 1],
          [Math.round(s * 10000), 10000],
        ];
      };

      const latDMS = toDMS(parseFloat(lat));
      const lonDMS = toDMS(parseFloat(lon));
      const latRef = parseFloat(lat) >= 0 ? "N" : "S";
      const lonRef = parseFloat(lon) >= 0 ? "E" : "W";

      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      let exifObj = { "0th": {}, Exif: {}, GPS: {} };
      try {
        exifObj = piexif.load(dataUrl);
      } catch (e) {}
      if (!exifObj["GPS"]) exifObj["GPS"] = {};

      exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latRef;
      exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = latDMS;
      exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lonRef;
      exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = lonDMS;

      const exifStr = piexif.dump(exifObj);
      const newJpeg = piexif.insert(exifStr, dataUrl);
      const byteString = atob(newJpeg.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++)
        ia[i] = byteString.charCodeAt(i);
      return new Blob([ab], { type: "image/jpeg" });
    } catch (e) {
      console.error("Error injecting GPS:", e);
      return file;
    }
  };

  // Función para extraer GPS del EXIF de la imagen original
  const getGpsFromImage = async (file) => {
    if (!file || (!file.type.includes("jpeg") && !file.type.includes("jpg")))
      return null;
    try {
      await loadPiexif();
      const piexif = window.piexif;

      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      const exifObj = piexif.load(dataUrl);
      const gps = exifObj["GPS"];

      // Verificar si existen tags de latitud y longitud
      if (
        !gps ||
        !gps[piexif.GPSIFD.GPSLatitude] ||
        !gps[piexif.GPSIFD.GPSLongitude]
      )
        return null;

      const convertDMSToDD = (dms, ref) => {
        const d = dms[0][0] / dms[0][1];
        const m = dms[1][0] / dms[1][1];
        const s = dms[2][0] / dms[2][1];
        let dd = d + m / 60 + s / 3600;
        if (ref === "S" || ref === "W") dd = dd * -1;
        return dd;
      };

      const lat = convertDMSToDD(
        gps[piexif.GPSIFD.GPSLatitude],
        gps[piexif.GPSIFD.GPSLatitudeRef]
      );
      const lon = convertDMSToDD(
        gps[piexif.GPSIFD.GPSLongitude],
        gps[piexif.GPSIFD.GPSLongitudeRef]
      );

      return { lat: lat.toFixed(6), lon: lon.toFixed(6) };
    } catch (e) {
      return null;
    }
  };

  // Función para comprimir imagen (Redimensionar y bajar calidad)
  const compressImage = async (file, quality = 0.7, maxWidth = 1600) => {
    if (!file.type.match(/image.*/)) return file;

    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file); // Fallback en error

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Cambiar extensión a .jpg
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              resolve(
                new File([blob], newName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      reader.readAsDataURL(file);
    });
  };

  // State para jobs
  let jobsArray = [];
  let activeJobAddress = null; // Reemplaza a selectedJobAddress para el modo foco

  const defaultWeightInData = () => ({
    linesetLength: "",
    factoryChargeOz: "",
    liquidLineDiameter: "",
    approxAdjustOz: "",
    adjustedOz: "",
    fanSpeedCfm: "",
    liquidLineTemp: "",
    suctionLineTemp: "",
    condenserSatTemp: "",
    subcoolingValue: "",
    oemSubcoolingGoal: "",
    subcoolingDeviation: "",
  });

  const hasWeightInData = (dataObj = state.weightInData) =>
    dataObj &&
    Object.values(dataObj).some(
      (val) => typeof val === "string" && val.trim() !== ""
    );

  // State
  let state = {
    address: "",
    selectedServices: [],
    isTwoSystems: false,
    isTwoStage: false,
    isTemporary: false,
    selectedThermostat: null,
    thermostatQuantity: 1,
    selectedAccessories: [],
    otroAccessory: null,
    selectedFixes: [],
    otroFix: null,
    leakDetail: null,
    heaterModel: "",
    outdoorModel: "",
    weightInData: defaultWeightInData(),
    notes: "",
  };

  const hiddenFixNames = [
    "Wires Jammed",
    "Stuck Blower",
    "Cut Sheetrock",
    "Extended Wire",
    "PVC Work",
    "Otro",
  ];

  const getAllFixButtons = () =>
    commonFixesSection.querySelectorAll(".btn[data-fix]");

  let selectedReportId = null;

  const getReportWrappers = () =>
    Array.from(reportContent.querySelectorAll(".report-wrapper"));

  const getSelectedReport = () =>
    selectedReportId
      ? reportContent.querySelector(
          `.report-wrapper[data-report-id="${selectedReportId}"]`
        )
      : null;

  function clearSelection() {
    getReportWrappers().forEach((wrap) => wrap.classList.remove("selected"));
    selectedReportId = null;
    refreshReportActions();
  }

  function selectReport(reportId) {
    selectedReportId = reportId;
    getReportWrappers().forEach((wrap) => {
      wrap.classList.toggle("selected", wrap.dataset.reportId === reportId);
    });
    refreshReportActions();
  }

  function getSelectedReportText() {
    const selected = getSelectedReport();
    if (!selected) return "";
    const entry = selected.querySelector(".report-entry");
    return entry ? entry.textContent.trim() : "";
  }

  function getAllReportsText() {
    const entries = reportContent.querySelectorAll(".report-entry");
    return Array.from(entries)
      .map((entry) => entry.textContent.trim())
      .filter(Boolean)
      .join("\n");
  }

  // Catálogos completos (derivados de weightInData.js)
  const heatersData = window.heaters || {};
  const outdoorData = window.unidadesExteriores || {};

  const heaterModels = Object.keys(heatersData);
  const outdoorModels = Object.keys(outdoorData);

  const heaterImageMap = Object.keys(heatersData).reduce((acc, key) => {
    if (heatersData[key].imagen) {
      acc[key] = heatersData[key].imagen;
    }
    return acc;
  }, {});

  const outdoorDataMap = outdoorData;

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

  function showLightbox(src, alt = "") {
    ensureLightbox();
    lightboxImage.src = src;
    lightboxImage.alt = alt || "Equipment image";
    lightboxOverlay.classList.add("visible");
  }
  window.showLightbox = showLightbox;

  function hideLightbox() {
    if (lightboxOverlay) lightboxOverlay.classList.remove("visible");
  }

  function populateSelect(selectEl, options) {
    if (!selectEl || selectEl.options.length > 1) return;
    options.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      selectEl.appendChild(opt);
    });
  }

  function refreshReportActions() {
    const hasReports = getReportWrappers().length > 0;
    const hasSelection = !!getSelectedReport();
    if (reportActions) {
      reportActions.classList.toggle("hidden", !hasReports);
    }
    [reportEditButton, reportDeleteButton].forEach((btn) => {
      if (!btn) return;
      btn.disabled = !hasSelection;
      btn.title = hasSelection ? "" : "Selecciona un reporte";
    });
    if (!hasSelection && shareOptions) {
      shareOptions.classList.add("hidden");
    }
    if (reportExportCsvButton) {
      reportExportCsvButton.disabled = !hasReports;
      reportExportCsvButton.title = hasReports
        ? ""
        : "Genera un reporte primero";
    }
  }

  const leaksButtons = () =>
    Array.from(leaksOptions.querySelectorAll("[data-leak-option]"));

  const getLeaksButton = () =>
    commonFixesSection.querySelector('[data-fix="Leaks"]');

  function hideLeakOptions() {
    leaksOptions.classList.add("hidden");
    leaksButtons().forEach((btn) => btn.classList.remove("active"));
    state.leakDetail = null;
  }

  let isCommonFixesExpanded = false;
  let isWeightInExpanded = false;

  function applyCommonFixesExpanded(expanded) {
    commonFixesExtra.classList.toggle("expanded", expanded);
    commonFixesToggle.textContent = expanded ? "Collapse ▲" : "Expand ▼";
  }

  function setCommonFixesExpanded(expanded) {
    isCommonFixesExpanded = expanded;
    applyCommonFixesExpanded(expanded);
  }

  function applyWeightInExpanded(expanded) {
    if (!weightInContent || !weightInToggle) return;
    weightInContent.classList.toggle("expanded", expanded);
    weightInToggle.textContent = expanded ? "Collapse ▲" : "Expand ▼";
  }

  function setWeightInExpanded(expanded) {
    isWeightInExpanded = expanded;
    applyWeightInExpanded(expanded);
  }

  function createChip(label, variant = "default") {
    const chip = document.createElement("span");
    chip.className = `chip chip-${variant}`;
    chip.textContent = label;
    return chip;
  }

  function createReportCard({
    reportText,
    address,
    totals,
    services = [],
    accessories = [],
    fixes = [],
    notes = "",
    timestamp = null,
    payload = null,
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
      weightInData: state.weightInData,
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
        group.appendChild(createChip(`${svc.name} $${svc.price}`, "service"))
      );
      chipRow.appendChild(group);
    }

    if (accessories.length) {
      const group = document.createElement("div");
      group.className = "chip-group";
      group.appendChild(createChip("Accessories", "label"));
      accessories.forEach((acc) =>
        group.appendChild(
          createChip(
            `${acc.name} ${acc.price ? `$${acc.price}` : ""}`.trim(),
            "accessory"
          )
        )
      );
      chipRow.appendChild(group);
    }

    if (fixes.length) {
      const group = document.createElement("div");
      group.className = "chip-group";
      group.appendChild(createChip("Fixes", "label"));
      fixes.forEach((fix) =>
        group.appendChild(
          createChip(
            `${fix.name}${fix.detail ? ` (${fix.detail})` : ""} $${fix.price}`,
            "fix"
          )
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
    shareOptionsContainer.append(
      shareWhatsapp,
      shareSms,
      shareEmail,
      shareCopy
    );

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
    editBtn.addEventListener("click", () =>
      editReport(wrapper, reportEntry.textContent)
    );
    deleteBtn.addEventListener("click", () => deleteReport(wrapper));

    // Selection handling
    wrapper.addEventListener("click", (event) => {
      if (event.target.closest(".btn")) return;
      selectReport(reportId);
    });

    // Build
    wrapper.append(head, body, totalBlock, rawText, actions, reportEntry);
    return wrapper;
  }

  populateSelect(heaterModelSelect, heaterModels);
  populateSelect(outdoorModelSelect, outdoorModels);

  if (heaterModelSelect) {
    heaterModelSelect.addEventListener("change", () => {
      state.heaterModel = heaterModelSelect.value;
    });
  }

  if (outdoorModelSelect) {
    outdoorModelSelect.addEventListener("change", () => {
      state.outdoorModel = outdoorModelSelect.value;

      // Auto-fill factory charge from data
      const data = outdoorDataMap[state.outdoorModel];
      if (data) {
        updateFactoryCharge();
        // Auto-fill Min CFM (85% of 400 CFM/ton)
        if (data.btu && weightInInputs.fanSpeedCfm) {
          const minCfm = Math.round((data.btu / 12000) * 400 * 0.85);
          weightInInputs.fanSpeedCfm.value = minCfm;
          state.weightInData.fanSpeedCfm = String(minCfm);
        }
        // Auto-fill Subcooling
        if (data.subcooling && weightInInputs.oemSubcoolingGoal) {
          weightInInputs.oemSubcoolingGoal.value = data.subcooling;
          state.weightInData.oemSubcoolingGoal = String(data.subcooling);
          calculateSubcoolingAndDeviation();
        }
        saveToLocalStorageDebounced();
      }
    });
  }

  // Error Dialog Handling
  function showErrorDialog() {
    errorDialog.classList.remove("hidden");
  }

  function hideErrorDialog() {
    errorDialog.classList.add("hidden");
  }

  if (errorDialogClose) {
    errorDialogClose.addEventListener("click", hideErrorDialog);
  } else {
    console.error("Error dialog close button not found");
  }

  // Validate DOM elements
  if (
    !addressInput ||
    !serviceTypeButtons ||
    !addJobsButton ||
    !acHeatOptions ||
    !thermostatButtons ||
    !thermostatQuantity ||
    !quantitySlider ||
    !quantityValue ||
    !accessoryButtons ||
    !accessoryOtro ||
    !otroNameInput ||
    !otroPriceInput ||
    !commonFixesSection ||
    !leaksOptions ||
    !fixOtro ||
    !fixOtroNameInput ||
    !fixOtroPriceInput ||
    !notesInput ||
    !generateReportButton ||
    !reportContainer ||
    !reportContent ||
    !reportEditButton ||
    !reportDeleteButton ||
    !reportActions ||
    !reportShareButton ||
    !reportExportCsvButton ||
    !shareOptions ||
    !shareWhatsappButton ||
    !shareSmsButton ||
    !shareEmailButton ||
    !shareCopyButton ||
    !errorDialog ||
    !errorDialogClose ||
    !commonFixesToggle ||
    !commonFixesExtra
  ) {
    console.error("Missing DOM elements");
    return;
  }

  // PDF Upload helpers
  function setPdfStatus(message, isError = false) {
    if (!pdfStatus) return;
    pdfStatus.textContent = message;
    pdfStatus.style.color = isError ? "#a60000" : "var(--text-color)";
  }

  function extractAddressesFromText(text) {
    if (!text) return [];
    const addressRegex =
      /\b\d{3,6}\s+[A-Za-z0-9.'-]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Court|Ct\.?|Way|Trail|Trl\.?|Terrace|Ter\.?|Place|Pl\.?|Parkway|Pkwy\.?)(?:\s+[A-Za-z0-9.'-]+)*/gi;
    const matches = text.match(addressRegex) || [];
    const normalized = matches.map((addr) => addr.replace(/\s+/g, " ").trim());
    return Array.from(new Set(normalized));
  }

  const normalizeAddress = (addr) => addr.trim().toUpperCase();

  const findJobIndex = (address) =>
    jobsArray.findIndex((job) => job.address === normalizeAddress(address));

  const getJobByAddress = (address) =>
    jobsArray.find((job) => job.address === normalizeAddress(address));

  async function handlePdfUpload(file) {
    if (!file) return;

    if (!window.pdfjsLib) {
      setPdfStatus("No se pudo cargar el lector de PDF.", true);
      return;
    }

    // Configurar worker para evitar advertencias de pdf.js
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    setPdfStatus("Leyendo PDF...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
        .promise;
      const pagesText = []; // Optimización: Array join en lugar de concatenación

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        pagesText.push(textContent.items.map((item) => item.str).join(" "));
      }
      const fullText = pagesText.join("\n");

      const addresses = extractAddressesFromText(fullText);

      if (addresses.length === 0) {
        setPdfStatus("No se encontraron direcciones en el PDF.", true);
        return;
      }

      let newCount = 0;
      addresses.forEach((address) => {
        const upperAddress = normalizeAddress(address);
        if (findJobIndex(upperAddress) === -1) {
          jobsArray.push({ address: upperAddress, details: "" });
          newCount++;
        }
      });

      renderJobsList();
      saveJobsToLocalStorage();

      if (addresses.length > 0) {
        // No seleccionamos automáticamente para mantener la lista limpia
      }

      setPdfStatus(
        `Se extrajeron ${addresses.length} direcciones (${newCount} nuevas).`
      );
      pdfUploadInput.value = "";
    } catch (err) {
      console.error("Error al procesar el PDF", err);
      setPdfStatus("Error al procesar el PDF.", true);
    }
  }

  // LocalStorage Functions
  function saveToLocalStorage() {
    // 1. Si hay un trabajo activo, actualizar su estado en el array de jobs
    if (activeJobAddress) {
      const jobIndex = findJobIndex(activeJobAddress);
      if (jobIndex !== -1) {
        jobsArray[jobIndex].savedState = JSON.parse(JSON.stringify(state));
        saveJobsToLocalStorage(); // Guardar el array actualizado
      }
    }

    // 2. Guardar el estado actual (backup/estado activo)
    localStorage.setItem("completionState", JSON.stringify(state));
    localStorage.setItem("lastActiveJobAddress", activeJobAddress || "");
    saveReportsToLocalStorage();
  }

  const saveToLocalStorageDebounced = debounce(saveToLocalStorage, 800);

  function loadFromLocalStorage() {
    const savedState = localStorage.getItem("completionState");
    const savedReports = localStorage.getItem("completionReports");
    activeJobAddress = localStorage.getItem("lastActiveJobAddress");

    // Ocultar acciones legacy por defecto
    if (reportActions) reportActions.classList.add("hidden");
    if (shareOptions) shareOptions.classList.add("hidden");

    if (savedState) {
      try {
        state = JSON.parse(savedState);
        if (!("leakDetail" in state)) state.leakDetail = null;
        if (!("heaterModel" in state)) state.heaterModel = "";
        if (!("outdoorModel" in state)) state.outdoorModel = "";
        const savedWeightIn =
          state.weightInData && typeof state.weightInData === "object"
            ? state.weightInData
            : null;
        state.weightInData = savedWeightIn
          ? { ...defaultWeightInData(), ...savedWeightIn }
          : defaultWeightInData();
        if (Array.isArray(state.selectedAccessories)) {
          state.selectedAccessories = state.selectedAccessories.map((acc) =>
            acc && acc.name === "Weight-In-Data"
              ? { ...acc, basePrice: 10 }
              : acc
          );
        }
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
          });
          reportContent.appendChild(wrapper);
        });
        if (reports.length > 0) {
          reportContainer.classList.remove("hidden");
        }
      } catch (e) {
        console.error("Error parsing savedReports:", e);
      }
    }

    // Cargar jobs al final
    loadJobsFromLocalStorage();
    refreshReportActions();
    updateDeleteAllButton();

    // Inicialización: Ocultar el espacio de trabajo hasta que se seleccione un trabajo
    toggleWorkspace(false);
  }

  // ========================================
  // FUNCIONES PARA GESTIÓN DE JOBS
  // ========================================

  function addJobs() {
    const addressesInput = addressInput.value.trim();
    const detailsInput = addressDetailsInput
      ? addressDetailsInput.value.trim()
      : "";
    const selectedHeater = heaterModelSelect ? heaterModelSelect.value : "";
    const selectedOutdoor = outdoorModelSelect ? outdoorModelSelect.value : "";

    if (!addressesInput) {
      console.warn("⚠️ addJobs: Input de dirección vacío");
      alert("Por favor ingresa al menos una dirección");
      return;
    }

    // Separar direcciones por comas o saltos de línea
    const addresses = addressesInput
      .split(/[\n,]+/)
      .map((addr) => addr.trim())
      .filter((addr) => addr);

    if (addresses.length === 0) {
      alert("No se encontraron direcciones válidas");
      return;
    }

    // Agregar direcciones al array de jobs (evitar duplicados)
    addresses.forEach((address) => {
      const normalized = normalizeAddress(address);
      if (findJobIndex(normalized) === -1) {
        jobsArray.push({
          address: normalized,
          details: detailsInput,
          heaterModel: selectedHeater,
          outdoorModel: selectedOutdoor,
          savedState: null, // Inicializar estado vacío
        });
      }
    });

    // Limpiar el input
    addressInput.value = "";
    state.address = ""; // Sync state
    if (addressDetailsInput) {
      addressDetailsInput.value = "";
    }
    if (heaterModelSelect) heaterModelSelect.value = "";
    if (outdoorModelSelect) outdoorModelSelect.value = "";

    // Actualizar la visualización
    renderJobsList();

    // Guardar en localStorage
    saveJobsToLocalStorage();
  }

  // Helper for creating equipment cards (moved out of render loop)
  const createEquipCard = (labelText, modelValue) => {
    const card = document.createElement("div");
    card.classList.add("equip-card");

    const heading = document.createElement("div");
    heading.classList.add("equip-heading");
    heading.textContent = labelText;

    const model = document.createElement("div");
    model.classList.add("equip-model");
    model.textContent = modelValue || "No equipment selected";

    const imgBox = document.createElement("div");
    imgBox.classList.add("equip-image");
    const imgSrc = labelText === "Heater" ? heaterImageMap[modelValue] : null;

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

    if (labelText === "Outdoor Unit" && modelValue) {
      const data = outdoorDataMap[modelValue];
      if (data) {
        const info = document.createElement("div");
        info.classList.add("equip-info");
        const ton = data.btu ? (data.btu / 12000).toFixed(1) : null;
        const chargeOz = data.FactoryCharge;
        const chargeLb = chargeOz ? (chargeOz / 16).toFixed(2) : null;
        const rows = [
          ton ? `Ton: ${ton}` : null,
          data.freon ? `Type: ${data.freon}` : null,
          chargeOz ? `Factory Charge: ${chargeOz} oz (${chargeLb} lb)` : null,
          data.uType ? `Unit: ${data.uType}` : null,
          data.overCharged !== undefined
            ? `Overcharged: ${data.overCharged} oz`
            : null,
        ].filter(Boolean);
        info.textContent = rows.join(" · ");
        card.appendChild(info);
      }
    }
    return card;
  };

  function renderJobsList() {
    // Ordenar: Trabajos "In Progress" primero
    jobsArray.sort((a, b) => {
      const aInProgress = !!a.savedState;
      const bInProgress = !!b.savedState;
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;
      return 0;
    });

    // Limpiar la lista
    jobsList.innerHTML = "";

    if (jobsArray.length === 0) {
      jobsListContainer.classList.add("hidden");
      return;
    }

    // Mostrar el contenedor
    jobsListContainer.classList.remove("hidden");

    const fragment = document.createDocumentFragment();

    // Helper definido fuera del bucle para evitar recreación
    const pushChip = (container, value, variant = "default") => {
      if (!value) return;
      const chip = document.createElement("span");
      chip.className = `chip chip-${variant}`;
      chip.textContent = value;
      container.appendChild(chip);
    };

    // Crear item para cada job
    jobsArray.forEach((job, index) => {
      const address = job.address;
      const details = job.details || "";
      const heaterModel = job.heaterModel || "";
      const outdoorModel = job.outdoorModel || "";
      const jobItem = document.createElement("div");
      jobItem.classList.add("job-item");

      // Marcar si es el trabajo activo (para modo foco)
      if (activeJobAddress === address) {
        jobItem.classList.add("active-job");
      }

      // Contenedor para los botones
      const buttonGroup = document.createElement("div");
      buttonGroup.classList.add("job-buttons");

      // Botón de Eliminar
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.classList.add("btn", "btn-delete");
      deleteButton.textContent = "🗑️";
      deleteButton.title = "Delete address";

      deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteJob(address);
      });

      // Botón de Editar
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.classList.add("btn", "btn-edit");
      editButton.textContent = "✏️";
      editButton.title = "Edit address";

      editButton.addEventListener("click", (e) => {
        e.stopPropagation();
        editJob(address, index);
      });

      // Botón de Maps
      const mapsButton = document.createElement("button");
      mapsButton.type = "button";
      mapsButton.classList.add("btn", "btn-maps");
      mapsButton.textContent = "📍";
      mapsButton.title = "Open in Google Maps";

      mapsButton.addEventListener("click", (e) => {
        e.stopPropagation();
        openInMaps(address);
      });

      // Agregar botones al grupo
      buttonGroup.appendChild(deleteButton);
      buttonGroup.appendChild(editButton);
      buttonGroup.appendChild(mapsButton);

      // Contenedor para address (sin radio button ahora)
      const topRow = document.createElement("div");
      topRow.classList.add("job-top");
      const label = document.createElement("strong");
      label.textContent = address;
      label.style.fontSize = "1.1em";
      topRow.appendChild(label);

      // NEW: Badge de "In Progress" si hay estado guardado
      if (job.savedState) {
        const draftBadge = document.createElement("span");
        draftBadge.className = "chip";
        draftBadge.style.backgroundColor = "#fffbeb"; // light yellow
        draftBadge.style.color = "#d97706"; // dark orange
        draftBadge.style.border = "1px solid #fcd34d";
        draftBadge.textContent = "⚠️ In Progress";
        topRow.appendChild(draftBadge);
      }

      // Botones debajo
      const bottomRow = document.createElement("div");
      bottomRow.classList.add("job-actions");
      bottomRow.appendChild(buttonGroup);

      // Contenedor principal de la tarjeta (reemplaza a las caras frontal/trasera)
      const cardContent = document.createElement("div");
      cardContent.classList.add("job-face"); // Mantenemos clase para estilos base
      cardContent.appendChild(topRow);
      cardContent.appendChild(bottomRow);

      // Detalles: solo primera línea en la lista; completos si está seleccionado
      if (details) {
        const detailDiv = document.createElement("div");
        detailDiv.classList.add("job-detail");
        detailDiv.textContent = details;
        detailDiv.style.fontSize = "9pt";
        detailDiv.style.marginTop = "4px";
        detailDiv.style.color = "var(--text-color)";
        detailDiv.style.whiteSpace = "pre-line";
        detailDiv.style.display = "none"; // Oculto inicialmente
        cardContent.appendChild(detailDiv);
      }

      // Chips de equipo
      const chipRow = document.createElement("div");
      chipRow.classList.add("job-chip-row");
      chipRow.style.display = "none"; // Oculto inicialmente

      pushChip(chipRow, heaterModel, "primary");
      pushChip(chipRow, outdoorModel, "secondary");

      if (outdoorModel) {
        const data = outdoorDataMap[outdoorModel];
        if (data) {
          const ton = data.btu ? (data.btu / 12000).toFixed(1) : null;
          const chargeOz = data.FactoryCharge;
          const chargeLb = chargeOz ? (chargeOz / 16).toFixed(2) : null;
          const cfmTotal =
            data.btu && !Number.isNaN(data.btu)
              ? (data.btu / 12000) * 400
              : null;
          const cfmMin = cfmTotal ? cfmTotal * 0.85 : null;
          const tonChip = ton ? `Ton ${ton}` : null;
          const typeChip = data.freon ? data.freon : null;
          const chargeChip = chargeOz
            ? `${chargeOz} oz (${chargeLb} lb)`
            : null;
          const ocChip =
            data.overCharged !== undefined
              ? `Over: ${data.overCharged} oz`
              : null;
          const maxCfmChip = cfmTotal
            ? `Max CFM ${Math.round(cfmTotal)}`
            : null;
          const minCfmChip = cfmMin ? `Min CFM ${Math.round(cfmMin)}` : null;
          [tonChip, typeChip, chargeChip, ocChip, maxCfmChip, minCfmChip]
            .filter(Boolean)
            .forEach((txt) => pushChip(chipRow, txt, "outline"));
        }
      }

      if (chipRow.children.length > 0) {
        cardContent.appendChild(chipRow);
      }

      // --- SECCIÓN DE EQUIPOS (Movida al flujo principal) ---
      const equipGrid = document.createElement("div");
      equipGrid.classList.add("equip-grid");
      equipGrid.style.display = "none"; // Oculto por defecto
      equipGrid.style.marginTop = "15px"; // Separación visual

      equipGrid.appendChild(createEquipCard("Heater", heaterModel));
      cardContent.appendChild(equipGrid);
      jobItem.appendChild(cardContent);

      // --- LÓGICA DE EXPANSIÓN Y STARTUP ---

      // Contenedor para el botón de inicio (solo visible al expandir)
      const startContainer = document.createElement("div");
      startContainer.style.display = "none"; // Oculto por defecto

      const startBtn = document.createElement("button");
      startBtn.type = "button"; // Evita que el formulario se envíe y recargue la página
      startBtn.className = "btn btn-start-job";
      startBtn.innerHTML = job.savedState
        ? "▶️ Resume Completion"
        : "📝 Start Completion";
      startBtn.onclick = (e) => {
        e.preventDefault(); // Doble seguridad
        e.stopPropagation(); // Evitar colapsar al hacer click
        startJob(address);
      };
      startContainer.appendChild(startBtn);
      cardContent.appendChild(startContainer);

      // Evento de clic en la tarjeta para expandir/colapsar
      jobItem.addEventListener("click", (e) => {
        // Si estamos en modo foco, no hacer nada (tarjeta fija)
        if (document.body.classList.contains("focus-mode")) return;
        if (e.target.closest(".btn") || e.target.closest(".btn-start-job"))
          return;

        const isExpanded = jobItem.classList.contains("expanded");

        // Colapsar otros
        document.querySelectorAll(".job-item.expanded").forEach((el) => {
          if (el === jobItem) return; // No colapsar el actual aquí, dejar que el toggle lo maneje
          el.classList.remove("expanded");
          const sc = el.querySelector(".btn-start-job").parentNode;
          if (sc) sc.style.display = "none";

          // Ocultar detalles y chips de los otros
          const d = el.querySelector(".job-detail");
          if (d) d.style.display = "none";
          const c = el.querySelector(".job-chip-row");
          if (c) c.style.display = "none";
          const eg = el.querySelector(".equip-grid");
          if (eg) eg.style.display = "none";
        });

        if (!isExpanded) {
          jobItem.classList.add("expanded");
          startContainer.style.display = "block";
          equipGrid.style.display = "grid"; // Mostrar equipos

          // Mostrar detalles y chips
          const detailDiv = cardContent.querySelector(".job-detail");
          if (detailDiv) detailDiv.style.display = "block";

          const cr = cardContent.querySelector(".job-chip-row");
          if (cr) cr.style.display = "flex";
        } else {
          jobItem.classList.remove("expanded");
          startContainer.style.display = "none";
          equipGrid.style.display = "none"; // Ocultar equipos

          const detailDiv = cardContent.querySelector(".job-detail");
          if (detailDiv) detailDiv.style.display = "none";

          const cr = cardContent.querySelector(".job-chip-row");
          if (cr) cr.style.display = "none";
        }
      });

      // Auto-expansión si es el trabajo activo (al recargar página)
      if (activeJobAddress === address) {
        jobItem.classList.add("expanded");
        startContainer.style.display = "block";
        equipGrid.style.display = "grid";

        const detailDiv = cardContent.querySelector(".job-detail");
        if (detailDiv) detailDiv.style.display = "block";

        const cr = cardContent.querySelector(".job-chip-row");
        if (cr && cr.children.length > 0) cr.style.display = "flex";
      }

      // Insertar en la lista
      fragment.appendChild(jobItem);
    });
    jobsList.appendChild(fragment);
  }

  // Función para eliminar un job específico
  function deleteJob(address) {
    if (confirm(`¿Seguro que quieres eliminar esta dirección?\n\n${address}`)) {
      const index = findJobIndex(address);
      if (index > -1) {
        jobsArray.splice(index, 1);

        // Si era el job seleccionado, limpiar selección y campo de address
        if (activeJobAddress === address) {
          exitFocusMode(); // Salir del modo foco si se borra el activo
          addressInput.value = "";
          state.address = "";
        }

        // Actualizar visualización
        renderJobsList();

        // Guardar en localStorage
        saveJobsToLocalStorage();
        saveToLocalStorage();
      }
    }
  }

  // Función para editar un job específico
  function editJob(oldAddress, index) {
    const newAddress = prompt("Editar dirección:", oldAddress);

    if (newAddress && newAddress.trim() !== "") {
      const trimmedAddress = normalizeAddress(newAddress);

      // Verificar si la nueva dirección ya existe
      if (
        findJobIndex(trimmedAddress) !== -1 &&
        trimmedAddress !== normalizeAddress(oldAddress)
      ) {
        alert("Esta dirección ya existe en la lista");
        return;
      }

      // Actualizar la dirección en el array
      const job = jobsArray[index];
      jobsArray[index] = { ...job, address: trimmedAddress };

      // Si esta dirección estaba seleccionada, actualizar la selección
      if (activeJobAddress === oldAddress) {
        activeJobAddress = trimmedAddress;
        addressInput.value = trimmedAddress;
        if (addressDetailsInput) {
          addressDetailsInput.value = job.details || "";
        }
        state.address = trimmedAddress;
      }

      // Actualizar visualización
      renderJobsList();

      // Guardar en localStorage
      saveJobsToLocalStorage();
      saveToLocalStorage();
    }
  }

  // Función para abrir dirección en Google Maps
  function openInMaps(address) {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, "_blank");
  }

  // --- NUEVAS FUNCIONES DE MODO ENFOQUE ---

  function startJob(address) {
    activeJobAddress = address;
    const job = getJobByAddress(address);

    // 1. Cargar estado guardado del trabajo o resetear si es nuevo
    if (job.savedState) {
      state = JSON.parse(JSON.stringify(job.savedState));
      // Asegurar que la dirección coincida (por si acaso)
      state.address = address;
    } else {
      resetSelections(); // Limpiar formulario
      state.address = address; // Setear dirección
      // Pre-cargar modelos si existen en el job
      state.heaterModel = job.heaterModel || "";
      state.outdoorModel = job.outdoorModel || "";
    }

    // Cargar la dirección en el campo de address
    addressInput.value = address;
    if (addressDetailsInput) {
      addressDetailsInput.value = job?.details || "";
    }
    if (heaterModelSelect) {
      heaterModelSelect.value = job?.heaterModel || "";
      state.heaterModel = heaterModelSelect.value;
    }
    if (outdoorModelSelect) {
      outdoorModelSelect.value = job?.outdoorModel || "";
      state.outdoorModel = outdoorModelSelect.value;

      // Auto-fill factory charge if missing (e.g. new job with pre-selected model)
      if (state.outdoorModel) {
        const data = outdoorDataMap[state.outdoorModel];
        if (data) {
          if (!state.weightInData.factoryChargeOz && data.FactoryCharge) {
            state.weightInData.factoryChargeOz = String(data.FactoryCharge);
          }
          if (!state.weightInData.fanSpeedCfm && data.btu) {
            const minCfm = Math.round((data.btu / 12000) * 400 * 0.85);
            state.weightInData.fanSpeedCfm = String(minCfm);
          }
          if (!state.weightInData.oemSubcoolingGoal && data.subcooling) {
            state.weightInData.oemSubcoolingGoal = String(data.subcooling);
          }
        }
      }
    }

    // 2. Mostrar controles (Esto resetea la vista a solo Service)
    toggleWorkspace(true); // Mostrar controles

    // 3. Restaurar UI con el estado cargado (Esto revela las secciones necesarias)
    restoreUIFromState();

    // Actualizar visualización de la lista
    renderJobsList();

    // Scroll al tope
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Guardar inmediatamente que este es el trabajo activo
    saveToLocalStorage();
  }

  function exitFocusMode() {
    // 1. Guardar estado actual en el trabajo
    saveToLocalStorage();

    // 2. Limpiar variable activa
    activeJobAddress = null;
    localStorage.removeItem("lastActiveJobAddress");

    // 3. Ocultar controles
    toggleWorkspace(false); // Ocultar controles

    // 4. Re-renderizar lista
    renderJobsList();
  }

  function toggleWorkspace(show) {
    // Sections that are part of the progressive flow (excluding Service which is entry point)
    const progressiveSections = [
      "thermostat-section",
      "accessory-section",
      "common-fixes-section",
      "weight-in-data-section",
      "notes-section",
    ];

    // Always handle service-section
    const serviceSection = document.getElementById("service-section");
    if (serviceSection) {
      if (show) serviceSection.classList.remove("hidden");
      else serviceSection.classList.add("hidden");
    }

    progressiveSections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        // Always hide initially when toggling workspace on/off
        el.classList.add("hidden");
      }
    });

    const generateBtn = document.getElementById("generate-report");
    if (generateBtn) {
      if (show) generateBtn.classList.remove("hidden");
      else generateBtn.classList.add("hidden");
    }

    // Toggle Side Nav
    if (sideNav) {
      if (show) sideNav.classList.remove("hidden");
      else sideNav.classList.add("hidden");
    }
  }

  function removeJobFromList(address) {
    const index = findJobIndex(address);
    if (index > -1) {
      jobsArray.splice(index, 1);

      // Si era el job seleccionado, limpiar selección
      if (activeJobAddress === address) {
        exitFocusMode();
      }

      // Actualizar visualización
      renderJobsList();

      // Guardar en localStorage
      saveJobsToLocalStorage();
    }
  }

  function saveJobsToLocalStorage() {
    localStorage.setItem("jobsArray", JSON.stringify(jobsArray));
    // Ya no guardamos selectedJobAddress para que al recargar empiece en la lista
  }

  function loadJobsFromLocalStorage() {
    const savedJobs = localStorage.getItem("jobsArray");
    const savedSelected = localStorage.getItem("selectedJobAddress");

    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        // Migrar posibles strings antiguos a objetos
        jobsArray = Array.isArray(parsed)
          ? parsed.map((item) =>
              typeof item === "string"
                ? { address: normalizeAddress(item), details: "" }
                : {
                    address: normalizeAddress(item.address),
                    details: item.details || "",
                    heaterModel: item.heaterModel || "",
                    outdoorModel: item.outdoorModel || "",
                    savedState: item.savedState || null,
                  }
            )
          : [];
      } catch (e) {
        console.error("Error parsing jobsArray:", e);
      }
    }

    renderJobsList();
  }

  // Event listener para Add Jobs button
  if (addJobsButton) {
    addJobsButton.addEventListener("click", () => {
      addJobs();
    });
  } else {
    console.error(
      "❌ Error crítico: Botón Add Jobs no encontrado al asignar evento"
    );
  }

  if (pdfUploadInput) {
    pdfUploadInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      handlePdfUpload(file);
    });
  }

  function clearLocalStorage() {
    localStorage.removeItem("completionState");
    localStorage.removeItem("completionReports");
    localStorage.removeItem("jobsArray");
    // localStorage.removeItem("selectedJobAddress");
  }

  function restoreUIFromState() {
    addressInput.value = state.address;

    serviceTypeButtons.querySelectorAll(".btn").forEach((btn) => {
      const service = btn.dataset.service;
      btn.classList.toggle(
        "active",
        state.selectedServices.some((s) => s.name === service)
      );
    });

    acHeatOptions.querySelectorAll(".btn").forEach((btn) => {
      const option = btn.dataset.option;
      if (option === "Temporary") {
        btn.classList.toggle("active", state.isTemporary);
      } else if (option === "2 Systems") {
        btn.classList.toggle("active", state.isTwoSystems);
      } else if (option === "2 Stage") {
        btn.classList.toggle("active", state.isTwoStage);
      }
    });
    const showAcHeatOptions = state.selectedServices.some((s) =>
      ["AC", "Heat", "Prestart", "Finish"].includes(s.name)
    );
    acHeatOptions.classList.toggle("hidden", !showAcHeatOptions);
    if (state.selectedServices.some((s) => s.name === "Cancel")) {
      state.isTwoSystems = false;
      state.isTwoStage = false;
      state.isTemporary = false;
      acHeatOptions
        .querySelectorAll(".btn")
        .forEach((btn) => btn.classList.remove("active"));
    }

    thermostatButtons.querySelectorAll(".btn").forEach((btn) => {
      const thermostat = btn.dataset.thermostat;
      btn.classList.toggle(
        "active",
        state.selectedThermostat && state.selectedThermostat.name === thermostat
      );
    });
    const hasThermostatButton =
      state.selectedThermostat &&
      thermostatButtons.querySelector(
        `[data-thermostat="${state.selectedThermostat.name}"]`
      );
    if (state.selectedThermostat && hasThermostatButton) {
      thermostatQuantity.classList.remove("hidden");
      quantitySlider.value = state.thermostatQuantity;
      quantityValue.textContent = state.thermostatQuantity;
    } else {
      state.selectedThermostat = null;
      thermostatQuantity.classList.add("hidden");
    }

    accessoryButtons.querySelectorAll(".btn").forEach((btn) => {
      const accessory = btn.dataset.accessory;
      btn.classList.toggle(
        "active",
        state.selectedAccessories.some((a) => a.name === accessory) ||
          (accessory === "Otro" && state.otroAccessory)
      );
    });
    accessoryButtons.querySelectorAll("[data-toggle-target]").forEach((btn) => {
      const target = btn.dataset.toggleTarget;
      const group = document.querySelector(target);
      if (!group) return;
      const hasActiveChild = Array.from(group.querySelectorAll(".btn")).some(
        (child) =>
          state.selectedAccessories.some(
            (a) => a.name === child.dataset.accessory
          )
      );
      const shouldShow = btn.classList.contains("active") || hasActiveChild;
      group.classList.toggle("hidden", !shouldShow);
    });
    if (state.otroAccessory) {
      accessoryOtro.classList.remove("hidden");
      otroNameInput.value = state.otroAccessory.name;
      otroPriceInput.value = state.otroAccessory.basePrice;
    }

    getAllFixButtons().forEach((btn) => {
      const fix = btn.dataset.fix;
      btn.classList.toggle(
        "active",
        state.selectedFixes.some((f) => f.name === fix) ||
          (fix === "Otro" && state.otroFix)
      );
    });
    const leaksActive = state.selectedFixes.some((f) => f.name === "Leaks");
    leaksOptions.classList.toggle("hidden", !leaksActive);
    leaksButtons().forEach((btn) =>
      btn.classList.toggle(
        "active",
        leaksActive && btn.dataset.leakOption === state.leakDetail
      )
    );
    const hasActiveHiddenFix =
      hiddenFixNames.some((name) =>
        state.selectedFixes.some((f) => f.name === name)
      ) || !!state.otroFix;
    if (hasActiveHiddenFix) {
      isCommonFixesExpanded = true;
    }
    applyCommonFixesExpanded(hasActiveHiddenFix || isCommonFixesExpanded);
    if (state.otroFix) {
      fixOtro.classList.remove("hidden");
      fixOtroNameInput.value = state.otroFix.name;
      fixOtroPriceInput.value = state.otroFix.basePrice;
    }

    if (heaterModelSelect) {
      heaterModelSelect.value = state.heaterModel || "";
    }
    if (outdoorModelSelect) {
      outdoorModelSelect.value = state.outdoorModel || "";
    }

    weightInFieldConfigs.forEach(({ key }) => {
      const inputEl = weightInInputs[key];
      if (inputEl) {
        inputEl.value = state.weightInData[key] || "";
      }
    });
    if (hasWeightInData()) {
      setWeightInExpanded(true);
    } else {
      applyWeightInExpanded(isWeightInExpanded);
    }

    notesInput.value = state.notes;

    // Restore visibility based on state
    if (state.selectedServices.length > 0) {
      const isCancel = state.selectedServices.some((s) => s.name === "Cancel");
      if (isCancel) {
        revealSection("notes-section");
      } else {
        revealSection("thermostat-section");
        if (state.selectedThermostat) revealSection("accessory-section");
        if (state.selectedAccessories.length > 0)
          revealSection("common-fixes-section");
        if (state.selectedFixes.length > 0) {
          revealSection("weight-in-data-section");
          revealSection("notes-section");
        }
      }
    }

    updatePriceDisplay();
  }

  loadFromLocalStorage();

  addressInput.addEventListener("input", () => {
    state.address = addressInput.value.trim();
    saveToLocalStorageDebounced();
  });

  notesInput.addEventListener("input", () => {
    state.notes = notesInput.value.trim();
    saveToLocalStorageDebounced();
  });

  function calculateApproxRefrigerant() {
    const linesetInput = weightInInputs.linesetLength;
    const diameterInput = weightInInputs.liquidLineDiameter;
    const approxInput = weightInInputs.approxAdjustOz;

    if (!linesetInput || !diameterInput || !approxInput) return;

    const linesetLength = parseFloat(linesetInput.value);
    const diameterValue = diameterInput.value;

    if (isNaN(linesetLength) || !diameterValue) return;

    let factoryLength = 15; // Default fallback
    let multiplier = 0.6; // Default (Lennox/Goodman)

    if (diameterValue.includes("10ft")) factoryLength = 10;
    else if (diameterValue.includes("15ft")) factoryLength = 15;
    else if (diameterValue.includes("25ft")) factoryLength = 25;
    else if (diameterValue.includes("30ft")) factoryLength = 30;

    if (diameterValue.toLowerCase().includes("trane")) {
      multiplier = 0.47;
    }

    const diff = linesetLength - factoryLength;
    const adjustment = diff * multiplier;

    approxInput.value = adjustment.toFixed(2);
    state.weightInData.approxAdjustOz = approxInput.value;
  }

  function updateFactoryCharge() {
    const model = state.outdoorModel;
    if (!model) return;
    const data = outdoorDataMap[model];
    if (!data) return;

    const diameterValue = weightInInputs.liquidLineDiameter
      ? weightInInputs.liquidLineDiameter.value
      : "";
    let charge = data.FactoryCharge;

    if (
      diameterValue.includes("overcharged") &&
      data.overCharged &&
      data.overCharged > 0
    ) {
      charge = data.overCharged;
    }

    if (charge !== undefined && weightInInputs.factoryChargeOz) {
      weightInInputs.factoryChargeOz.value = charge;
      state.weightInData.factoryChargeOz = String(charge);
    }
  }

  function calculateSubcoolingAndDeviation() {
    const liquidTempInput = weightInInputs.liquidLineTemp;
    const condenserTempInput = weightInInputs.condenserSatTemp;
    const subcoolingInput = weightInInputs.subcoolingValue;
    const oemGoalInput = weightInInputs.oemSubcoolingGoal;
    const deviationInput = weightInInputs.subcoolingDeviation;

    if (!subcoolingInput) return;

    const liquidTemp = parseFloat(liquidTempInput?.value);
    const condenserTemp = parseFloat(condenserTempInput?.value);

    let subcooling = parseFloat(subcoolingInput.value);

    // Calculate Subcooling if temps are available
    if (!isNaN(liquidTemp) && !isNaN(condenserTemp)) {
      subcooling = condenserTemp - liquidTemp;
      subcoolingInput.value = subcooling.toFixed(1);
      state.weightInData.subcoolingValue = subcoolingInput.value;
    }

    // Calculate Deviation if subcooling and goal are available
    if (oemGoalInput && deviationInput) {
      const oemGoal = parseFloat(oemGoalInput.value);
      if (!isNaN(subcooling) && !isNaN(oemGoal)) {
        const deviation = subcooling - oemGoal;
        deviationInput.value = deviation.toFixed(1);
        state.weightInData.subcoolingDeviation = deviationInput.value;
      }
    }
  }

  weightInFieldConfigs.forEach(({ key }) => {
    const inputEl = weightInInputs[key];
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      state.weightInData[key] = inputEl.value;
      if (key === "linesetLength" || key === "liquidLineDiameter") {
        calculateApproxRefrigerant();
        if (key === "liquidLineDiameter") {
          updateFactoryCharge();
        }
      }
      if (
        [
          "liquidLineTemp",
          "condenserSatTemp",
          "subcoolingValue",
          "oemSubcoolingGoal",
        ].includes(key)
      ) {
        calculateSubcoolingAndDeviation();
      }
      saveToLocalStorageDebounced();
    });
  });

  // --- QUICK CHARGE CALCULATOR LOGIC ---

  // --- PROGRESSIVE DISCLOSURE LOGIC ---
  function revealSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section && section.classList.contains("hidden")) {
      section.classList.remove("hidden");
    }
  }

  function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add("hidden");
    }
  }

  // Side Nav Logic
  if (sideNav) {
    sideNav.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-item");
      if (!btn) return;

      const targetId = btn.dataset.target;
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        // Force reveal if hidden so user can jump to it
        targetSection.classList.remove("hidden");
        // Scroll to section
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });

        // Update active state in nav
        sideNav
          .querySelectorAll(".nav-item")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  }

  function updateQuickCalc() {
    if (!quickPies || !quickResultado) return;
    const pies = parseFloat(quickPies.value) || 0;
    const brand = quickBrand ? quickBrand.value : "standard";
    const esOvercharged = quickOvercharged ? quickOvercharged.checked : false;

    // UI Toggle Logic
    if (brand === "daikin") {
      if (quickDaikinTon) quickDaikinTon.classList.remove("hidden");
      if (lblDaikinHe) lblDaikinHe.classList.remove("hidden");
      if (lblOvercharged) lblOvercharged.classList.add("hidden");
    } else {
      if (quickDaikinTon) quickDaikinTon.classList.add("hidden");
      if (lblDaikinHe) lblDaikinHe.classList.add("hidden");
      if (lblOvercharged) lblOvercharged.classList.remove("hidden");
    }

    // 1. Configuración Base (Standard / Lennox / Goodman)
    let multiplier = 0.6; // 0.6 oz por pie (Línea de 3/8")
    let factoryLength = 15; // Pre-carga estándar para 15 pies
    let calculationNote = "";
    let cantidadOz = 0;
    let diff = 0;

    // --- LÓGICA DAIKIN FIT ---
    if (brand === "daikin") {
      const ton = parseFloat(quickDaikinTon.value);
      const isHE = quickDaikinHe.checked;
      factoryLength = 15;
      diff = pies - factoryLength;

      if (pies <= 15) {
        cantidadOz = 0;
      } else {
        // Lógica específica Daikin 2 Ton
        if (ton === 2.0) {
          if (isHE) {
            // High Efficiency 2.0T
            if (pies <= 25) cantidadOz = diff * 0.6;
            else cantidadOz = 6 + (pies - 25) * 0.8; // 6oz base (10ft*0.6) + resto*0.8
          } else {
            // Standard 2.0T
            if (pies <= 20) cantidadOz = diff * 0.6;
            else if (pies <= 25) cantidadOz = 3 + (pies - 20) * 0.4;
            // 3oz base (5ft*0.6) + resto*0.4
            else cantidadOz = 5 + (pies - 25) * 0.6; // 5oz base (3+2) + resto*0.6
          }
        } else {
          // Resto de tonelajes (1.5, 2.5 - 5.0) usan 0.6 oz/ft lineal
          cantidadOz = diff * 0.6;
        }
      }
      calculationNote = `Daikin Fit ${ton}T ${isHE ? "High Eff" : "Std"} logic`;
    }
    // --- LÓGICA TRANE ---
    else if (brand === "trane") {
      multiplier = 0.47; // Factor típico de Trane
      factoryLength = 10; // Trane suele venir pre-cargado para 10 pies

      if (esOvercharged) factoryLength = 25;

      diff = pies - factoryLength;
      cantidadOz = diff * multiplier;
      calculationNote = `(${pies}' - ${factoryLength}') × 0.47 oz/ft`;
    }
    // --- LÓGICA STANDARD ---
    else {
      multiplier = 0.6;
      factoryLength = 15;

      if (esOvercharged) factoryLength = 30;

      diff = pies - factoryLength;
      cantidadOz = diff * multiplier;
      calculationNote = `(${pies}' - ${factoryLength}') × 0.6 oz/ft`;
    }

    if (pies > 0) {
      const absOz = Math.abs(cantidadOz);

      // Formatear a Lbs y Oz (usando función global o cálculo local)
      let lbsOzText = "";
      if (typeof ouncesToPoundsAndOunces === "function") {
        lbsOzText = ouncesToPoundsAndOunces(absOz);
      } else {
        const lbs = Math.floor(absOz / 16);
        const oz = (absOz % 16).toFixed(2);
        lbsOzText = lbs > 0 ? `${lbs} lb ${oz} oz` : `${oz} oz`;
      }

      // Determinar si Agregar o Remover
      let actionLabel = diff >= 0 ? "ADD" : "REMOVE";
      let color = diff >= 0 ? "var(--button-bg-active)" : "#dc2626"; // Azul o Rojo

      quickResultado.style.color = color;
      quickResultado.innerHTML = `
        <div style="font-size: 1.2em; margin-bottom: 4px;">${actionLabel}: ${absOz.toFixed(
        2
      )} oz</div>
        <div style="font-size: 0.9em; font-weight: normal; color: var(--text-color);">(${lbsOzText})</div>
        <div style="font-size: 0.75em; color: #999; margin-top: 8px; font-weight: normal; border-top: 1px solid #eee; padding-top: 4px;">
          Calc: ${calculationNote}
        </div>
      `;
      quickResultado.classList.remove("hidden");
    } else {
      quickResultado.classList.add("hidden");
    }
  }

  if (quickPies) {
    quickPies.addEventListener("input", updateQuickCalc);
    if (quickBrand) quickBrand.addEventListener("change", updateQuickCalc);
    if (quickDaikinTon)
      quickDaikinTon.addEventListener("change", updateQuickCalc);
    if (quickDaikinHe)
      quickDaikinHe.addEventListener("change", updateQuickCalc);
    if (quickOvercharged)
      quickOvercharged.addEventListener("change", updateQuickCalc);
  }

  // Modal Logic for Quick Calc
  if (quickCalcFab && quickCalcModal) {
    quickCalcFab.addEventListener("click", () => {
      quickCalcModal.classList.add("active");
    });
  }

  if (quickCalcClose) {
    quickCalcClose.addEventListener("click", () => {
      quickCalcModal.classList.remove("active");
    });
  }

  if (quickCalcModal) {
    quickCalcModal.addEventListener("click", (e) => {
      if (e.target === quickCalcModal) {
        quickCalcModal.classList.remove("active");
      }
    });
  }

  // --- INYECTAR INPUTS DE IMAGEN EN WEIGHT-IN DATA ---
  if (weightInContent) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-upload-section";

    // Botón para descarga inmediata (Backup)
    const downloadBtn = document.createElement("button");
    downloadBtn.id = "btn-download-images";
    downloadBtn.className = "btn btn-download-zip";
    downloadBtn.innerHTML = "💾 Save to ZIP (Backup)";
    downloadBtn.disabled = true;

    const createFileInput = (label, key) => {
      const uniqueId = `file-input-${key}`;
      const wrapper = document.createElement("div");
      wrapper.className = "file-input-wrapper";

      // Input oculto
      const input = document.createElement("input");
      input.id = uniqueId;
      input.type = "file";
      input.accept = "image/*";
      input.className = "visually-hidden-input";

      // Botón real para disparar el input
      const btnEl = document.createElement("button");
      btnEl.type = "button";
      btnEl.textContent = label;
      btnEl.className = "btn btn-file-upload";

      // Disparar el input al hacer clic en el botón
      btnEl.onclick = (e) => {
        e.preventDefault();
        input.click();
      };

      // Texto de estado (nombre del archivo)
      const statusText = document.createElement("div");
      statusText.className = "file-status-text";
      statusText.textContent = "No image selected";

      input.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          currentImages[key] = file;
          downloadBtn.disabled = false; // Habilitar botón si hay imagen

          // Actualizar UI
          statusText.textContent = `✅ ${file.name}`;
          statusText.style.fontWeight = "bold";
          btnEl.classList.add("active");
          btnEl.style.borderColor = "var(--button-bg-active)";

          // 1. Intentar extraer GPS original del archivo (EXIF)
          const exifGps = await getGpsFromImage(file);

          if (exifGps) {
            currentImages[key + "Gps"] = exifGps;
            currentImages[key + "GpsSource"] = "exif"; // Marcar origen como EXIF
          } else {
            // 2. Fallback: Capturar geolocalización del navegador si no hay EXIF
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  currentImages[key + "Gps"] = {
                    lat: pos.coords.latitude.toFixed(6),
                    lon: pos.coords.longitude.toFixed(6),
                  };
                  currentImages[key + "GpsSource"] = "device"; // Marcar origen como Dispositivo
                },
                (err) => console.warn("GPS no disponible:", err),
                { enableHighAccuracy: true }
              );
            }
          }
        } else {
          currentImages[key] = null;
          currentImages[key + "Gps"] = null;
          currentImages[key + "GpsSource"] = null;
          statusText.textContent = "No image selected";
          statusText.style.fontWeight = "normal";
          btnEl.classList.remove("active");
          btnEl.style.borderColor = "var(--border-color, #ccc)";
        }
      });

      // Guardar referencia para limpiar después
      input.dataset.imgInputKey = key;

      wrapper.appendChild(btnEl);
      wrapper.appendChild(input);
      wrapper.appendChild(statusText);
      return wrapper;
    };

    imageContainer.appendChild(
      createFileInput("📸 Weight Scale Image (oz)", "weight")
    );
    imageContainer.appendChild(
      createFileInput("📸 Fan Speed Setting Image", "fan")
    );

    // Lógica del botón de descarga inmediata
    downloadBtn.onclick = async (e) => {
      e.preventDefault();
      if (!currentImages.weight && !currentImages.fan) return;

      const originalText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = "⏳ Creando ZIP...";
      downloadBtn.disabled = true;

      try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        // Usar la dirección actual para el nombre del archivo
        const safeAddress = (state.address || "Job")
          .replace(/[^a-z0-9]/gi, "_")
          .toUpperCase();

        if (currentImages.weight) {
          const ext = currentImages.weight.name.split(".").pop();
          let fileToSave = currentImages.weight;
          // Solo insertar GPS si tenemos datos Y NO vienen del archivo original (para no re-procesar)
          if (
            currentImages.weightGps &&
            currentImages.weightGpsSource !== "exif"
          ) {
            fileToSave = await addGpsToImage(
              fileToSave,
              currentImages.weightGps.lat,
              currentImages.weightGps.lon
            );
          }
          zip.file(`${safeAddress}_WEIGHT.${ext}`, fileToSave);
        }
        if (currentImages.fan) {
          const ext = currentImages.fan.name.split(".").pop();
          let fileToSave = currentImages.fan;
          if (currentImages.fanGps && currentImages.fanGpsSource !== "exif") {
            fileToSave = await addGpsToImage(
              fileToSave,
              currentImages.fanGps.lat,
              currentImages.fanGps.lon
            );
          }
          zip.file(`${safeAddress}_FAN.${ext}`, fileToSave);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${safeAddress}_PHOTOS.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error(err);
        alert("Error al crear el ZIP de respaldo.");
      } finally {
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
      }
    };

    imageContainer.appendChild(downloadBtn);

    // Agregar al final del contenedor de weight-in
    weightInContent.appendChild(imageContainer);
  }

  if (weightInToggle) {
    weightInToggle.addEventListener("click", () =>
      setWeightInExpanded(!isWeightInExpanded)
    );
  }

  serviceTypeButtons.addEventListener("click", (e) => {
    // Solo manejar botones con data-service (evita capturar clicks en sub-botones)
    const btn = e.target.closest("[data-service]");
    if (!btn || !serviceTypeButtons.contains(btn)) return;

    const service = btn.dataset.service;
    const basePrice = parseFloat(btn.dataset.price) || 0;

    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");

    if (service === "Cancel") {
      if (isActive) {
        // Cancel is exclusive: clear other selections and AC/Heat flags
        serviceTypeButtons.querySelectorAll("[data-service]").forEach((el) => {
          if (el !== btn) el.classList.remove("active");
        });
        state.selectedServices = [{ name: service, basePrice }];
        state.isTwoSystems = false;
        state.isTwoStage = false;
        state.isTemporary = false;
        acHeatOptions
          .querySelectorAll(".btn")
          .forEach((el) => el.classList.remove("active"));

        // Cancel Logic: Hide intermediate sections, show Notes
        [
          "thermostat-section",
          "accessory-section",
          "common-fixes-section",
          "weight-in-data-section",
        ].forEach(hideSection);
        revealSection("notes-section");
      } else {
        state.selectedServices = state.selectedServices.filter(
          (s) => s.name !== service
        );
      }
    } else {
      if (isActive) {
        const cancelBtn = serviceTypeButtons.querySelector(
          '[data-service="Cancel"]'
        );
        if (cancelBtn) cancelBtn.classList.remove("active");
        state.selectedServices = state.selectedServices.filter(
          (s) => !["Cancel", service].includes(s.name)
        );
        state.selectedServices.push({ name: service, basePrice });

        // Reveal next section
        revealSection("thermostat-section");
      } else {
        state.selectedServices = state.selectedServices.filter(
          (s) => s.name !== service
        );
      }
    }

    const showAcHeatOptions = state.selectedServices.some((s) =>
      ["AC", "Heat", "Prestart", "Finish"].includes(s.name)
    );
    acHeatOptions.classList.toggle("hidden", !showAcHeatOptions);

    if (!showAcHeatOptions) {
      acHeatOptions
        .querySelectorAll(".btn")
        .forEach((btn) => btn.classList.remove("active"));
      state.isTwoSystems = false;
      state.isTwoStage = false;
      state.isTemporary = false;
    } else {
      const hasAcHeatOrPrestart = state.selectedServices.some((s) =>
        ["AC", "Heat", "Prestart"].includes(s.name)
      );
      if (!hasAcHeatOrPrestart) {
        const twoStageBtn = acHeatOptions.querySelector(
          '[data-option="2 Stage"]'
        );
        twoStageBtn.classList.remove("active");
        state.isTwoStage = false;
      }
      const hasAcOrHeat = state.selectedServices.some((s) =>
        ["AC", "Heat"].includes(s.name)
      );
      if (!hasAcOrHeat) {
        const temporaryBtn = acHeatOptions.querySelector(
          '[data-option="Temporary"]'
        );
        temporaryBtn.classList.remove("active");
        state.isTemporary = false;
      }
    }

    updatePriceDisplay();
    saveToLocalStorage();
  });

  acHeatOptions.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn")) return;

    const option = e.target.dataset.option;

    if (
      !state.selectedServices.some((s) =>
        ["AC", "Heat", "Prestart", "Finish"].includes(s.name)
      )
    ) {
      console.error("No relevant service selected.");
      return;
    }

    if (option === "2 Stage") {
      const hasAcHeatOrPrestart = state.selectedServices.some((s) =>
        ["AC", "Heat", "Prestart"].includes(s.name)
      );
      if (!hasAcHeatOrPrestart) {
        return;
      }
    }

    if (option === "Temporary") {
      const hasAcOrHeat = state.selectedServices.some((s) =>
        ["AC", "Heat"].includes(s.name)
      );
      if (!hasAcOrHeat) {
        return;
      }
    }

    e.target.classList.toggle("active");

    if (option === "Temporary") {
      state.isTemporary = e.target.classList.contains("active");
    } else if (option === "2 Systems") {
      state.isTwoSystems = e.target.classList.contains("active");
    } else if (option === "2 Stage") {
      state.isTwoStage = e.target.classList.contains("active");
    }

    updatePriceDisplay();
    saveToLocalStorage();
  });

  thermostatButtons.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-thermostat]");
    if (!btn || !thermostatButtons.contains(btn)) return;

    const thermostat = btn.dataset.thermostat;

    const wasActive = btn.classList.contains("active");
    thermostatButtons
      .querySelectorAll(".btn")
      .forEach((el) => el.classList.remove("active"));

    if (wasActive) {
      state.selectedThermostat = null;
      thermostatQuantity.classList.add("hidden");
    } else {
      btn.classList.add("active");
      state.selectedThermostat = { name: thermostat };
      thermostatQuantity.classList.remove("hidden");
      quantitySlider.value = state.thermostatQuantity;
      quantityValue.textContent = state.thermostatQuantity;

      // Reveal next section
      revealSection("accessory-section");
    }

    updatePriceDisplay();
    saveToLocalStorage();
  });

  quantitySlider.addEventListener("input", (e) => {
    const quantity = parseInt(e.target.value);
    state.thermostatQuantity = quantity;
    quantityValue.textContent = quantity;
    updatePriceDisplay();
    saveToLocalStorageDebounced();
  });

  accessoryButtons.addEventListener("click", (e) => {
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
      group.classList.toggle("hidden", !show);
      if (!show) {
        group.querySelectorAll(".btn.active").forEach((btn) => {
          btn.classList.remove("active");
          const name = btn.dataset.accessory;
          state.selectedAccessories = state.selectedAccessories.filter(
            (a) => a.name !== name
          );
        });
      }
    };

    if (accessory === "Otro") {
      if (isActive) {
        accessoryOtro.classList.remove("hidden");
      } else {
        accessoryOtro.classList.add("hidden");
        state.otroAccessory = null;
        otroNameInput.value = "";
        otroPriceInput.value = "";
      }
      toggleSubgroup(toggleTarget, isActive);
    } else {
      if (isActive) {
        toggleSubgroup(toggleTarget, true);
        state.selectedAccessories.push({ name: accessory, basePrice });

        // Reveal next section
        revealSection("common-fixes-section");
      } else {
        toggleSubgroup(toggleTarget, false);
        state.selectedAccessories = state.selectedAccessories.filter(
          (a) => a.name !== accessory
        );
      }
    }

    updatePriceDisplay();
    saveToLocalStorage();
  });

  // ========================================
  // FUNCIÓN GENÉRICA PARA MANEJAR "OTRO"
  // ========================================
  function setupOtroHandler(nameInput, priceInput, stateKey, maxPrice = 1000) {
    const handler = () => {
      const name = nameInput.value.trim();
      let price = parseFloat(priceInput.value) || 0;

      // Validación: no permitir precios negativos
      if (price < 0) {
        priceInput.value = 0;
        price = 0;
      }

      // Validación: no exceder precio máximo
      if (price > maxPrice) {
        priceInput.value = maxPrice;
        price = maxPrice;
        alert(`El precio máximo permitido es $${maxPrice}`);
      }

      // Actualizar estado
      state[stateKey] = name && price >= 0 ? { name, basePrice: price } : null;

      updatePriceDisplay();
      saveToLocalStorageDebounced();
    };

    // Aplicar el handler a ambos inputs
    nameInput.addEventListener("input", handler);
    priceInput.addEventListener("input", handler);
  }

  // ========================================
  // CONFIGURAR MANEJADORES DE "OTRO"
  // ========================================
  setupOtroHandler(otroNameInput, otroPriceInput, "otroAccessory", 500);
  setupOtroHandler(fixOtroNameInput, fixOtroPriceInput, "otroFix", 300);

  commonFixesSection.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || !commonFixesSection.contains(btn)) return;

    if (btn.id === "common-fixes-toggle") {
      setCommonFixesExpanded(!isCommonFixesExpanded);
      return;
    }

    const leakOption = btn.dataset.leakOption;
    if (leakOption) {
      const leaksBtn = getLeaksButton();
      const leaksInState = state.selectedFixes.some((f) => f.name === "Leaks");
      if (!leaksInState && leaksBtn) {
        leaksBtn.classList.add("active");
        state.selectedFixes.push({
          name: "Leaks",
          basePrice: parseFloat(leaksBtn.dataset.price) || 0,
        });
      }
      leaksOptions.classList.remove("hidden");
      leaksButtons().forEach((opt) =>
        opt.classList.toggle("active", opt.dataset.leakOption === leakOption)
      );
      state.leakDetail = leakOption;
      updatePriceDisplay();
      saveToLocalStorage();
      return;
    }

    const fix = btn.dataset.fix;
    if (!fix) return;

    const basePrice = parseFloat(btn.dataset.price) || 0;

    btn.classList.toggle("active");
    const isActive = btn.classList.contains("active");

    if (fix === "Leaks") {
      if (isActive) {
        const already = state.selectedFixes.some((f) => f.name === "Leaks");
        if (!already) {
          state.selectedFixes.push({ name: fix, basePrice });
        }
        leaksOptions.classList.remove("hidden");

        // Reveal next section
        revealSection("weight-in-data-section");
        revealSection("notes-section");
      } else {
        state.selectedFixes = state.selectedFixes.filter(
          (f) => f.name !== "Leaks"
        );
        hideLeakOptions();
      }
      updatePriceDisplay();
      saveToLocalStorage();
      return;
    }

    if (fix === "Otro") {
      if (isActive) {
        fixOtro.classList.remove("hidden");
        setCommonFixesExpanded(true);
      } else {
        fixOtro.classList.add("hidden");
        state.otroFix = null;
        fixOtroNameInput.value = "";
        fixOtroPriceInput.value = "";
      }
    } else {
      if (isActive) {
        state.selectedFixes.push({ name: fix, basePrice });

        // Reveal next section
        revealSection("weight-in-data-section");
        revealSection("notes-section");
      } else {
        state.selectedFixes = state.selectedFixes.filter((f) => f.name !== fix);
      }
    }

    updatePriceDisplay();
    saveToLocalStorage();
  });
  // ========================================
  // FUNCIÓN DE VALIDACIÓN
  // ========================================
  function validateState() {
    const errors = [];

    // Validar dirección
    if (!state.address.trim()) {
      errors.push("⚠️ Falta la dirección del servicio");
    }

    // Validar que haya al menos un servicio seleccionado
    if (state.selectedServices.length === 0) {
      errors.push(
        "⚠️ Selecciona al menos un tipo de servicio (AC, Heat, etc.)"
      );
    }

    // Validar "Otro" accessory (si está activo)
    const otroAccessoryBtn = accessoryButtons.querySelector(
      '[data-accessory="Otro"]'
    );
    if (otroAccessoryBtn && otroAccessoryBtn.classList.contains("active")) {
      if (!state.otroAccessory || !state.otroAccessory.name) {
        errors.push("⚠️ Completa el nombre del accesorio personalizado");
      }
      if (!state.otroAccessory || state.otroAccessory.basePrice <= 0) {
        errors.push(
          "⚠️ Ingresa un precio válido para el accesorio personalizado"
        );
      }
    }

    // Validar "Otro" fix (si está activo)
    const otroFixBtn = commonFixesSection.querySelector('[data-fix="Otro"]');
    if (otroFixBtn && otroFixBtn.classList.contains("active")) {
      if (!state.otroFix || !state.otroFix.name) {
        errors.push("⚠️ Completa el nombre del trabajo personalizado");
      }
      if (!state.otroFix || state.otroFix.basePrice <= 0) {
        errors.push(
          "⚠️ Ingresa un precio válido para el trabajo personalizado"
        );
      }
    }

    return errors;
  }

  // ========================================
  // SHOWING VALIDATION ERRORS
  // ========================================
  function showValidationErrors(errors) {
    // Create or get the error container
    let errorContainer = document.getElementById("validation-errors");

    if (!errorContainer) {
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

    // Mostrar errores
    errorContainer.innerHTML = `
    <h2 style="color: #cc0000; margin-bottom: 8px;">⛔ Errores de Validación</h2>
    <ul style="margin-left: 20px; color: #000000;">
      ${errors
        .map((error) => `<li style="margin-bottom: 4px;">${error}</li>`)
        .join("")}
    </ul>
  `;

    // Scroll to errors
    errorContainer.scrollIntoView({ behavior: "smooth", block: "center" });

    // Auto-hide after 10 segundos
    setTimeout(() => {
      if (errorContainer && errorContainer.parentNode) {
        errorContainer.remove();
      }
    }, 10000);
  }

  // ========================================
  // HIDING VALIDATION ERRORS
  // ========================================
  function hideValidationErrors() {
    const errorContainer = document.getElementById("validation-errors");
    if (errorContainer) {
      errorContainer.remove();
    }
  }

  generateReportButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Hide previous errors
    hideValidationErrors();

    // Validate data
    const errors = validateState();

    // if any error, show and stop.
    if (errors.length > 0) {
      showValidationErrors(errors);
      return;
    }

    // If everything is OK, generate the report.
    const reportText = generateReportText();

    const totals = calculateFinancials(state);
    const hasHarmony = state.selectedAccessories.some(
      (a) => a.name === "Harmony"
    );
    const servicesData = state.selectedServices.map((svc) => ({
      name: svc.name,
      price: svc.basePrice,
    }));
    const accessoriesData = [
      ...state.selectedAccessories.map((acc) => ({
        name: acc.name,
        price: acc.name === "Harmony" ? 40 : acc.basePrice,
      })),
    ];
    if (state.otroAccessory) {
      accessoriesData.push({
        name: state.otroAccessory.name,
        price: state.otroAccessory.basePrice,
      });
    }
    const filteredAccessories = hasHarmony
      ? accessoriesData.filter((acc) => acc.name !== "Zoning")
      : accessoriesData;
    const fixesData = state.selectedFixes.map((fix) => ({
      name: fix.name,
      price: fix.basePrice,
      detail: fix.name === "Leaks" ? state.leakDetail : "",
    }));
    if (state.otroFix) {
      fixesData.push({
        name: state.otroFix.name,
        price: state.otroFix.basePrice,
      });
    }

    const reportWrapper = createReportCard({
      reportText,
      address: state.address.trim().toUpperCase(),
      totals,
      services: servicesData,
      accessories: filteredAccessories,
      fixes: fixesData,
      notes: state.notes,
      timestamp: new Date().toISOString(),
    });

    reportContent.appendChild(reportWrapper);
    reportContainer.classList.remove("hidden");
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
    updateDeleteAllButton();

    // NUEVO: Eliminar el job de la lista si está seleccionado
    if (activeJobAddress && activeJobAddress === state.address) {
      removeJobFromList(activeJobAddress);
    }

    resetSelections();
    saveToLocalStorage();
  });

  // Función auxiliar para crear botones de share
  function createShareButton(text, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("btn", "btn-share-option");
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
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
      reportWrapper.remove();

      // Si no quedan reportes, ocultar el contenedor
      reportImagesMap.delete(reportWrapper.dataset.reportId); // Limpiar imágenes de memoria
      if (reportContent.children.length === 0) {
        reportContainer.classList.add("hidden");
      }

      updateDeleteAllButton();
      saveReportsToLocalStorage();
      if (wasSelected) {
        clearSelection();
      } else {
        refreshReportActions();
      }
    }
  }

  // Función para compartir reporte
  function shareReportVia(reportText, method) {
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

  // Función para actualizar visibilidad del botón "Delete All"
  function updateDeleteAllButton() {
    const reportCount =
      reportContent.querySelectorAll(".report-wrapper").length;

    if (reportCount > 1) {
      // Mostrar botón "Delete All" si no existe
      if (!document.getElementById("delete-all-reports")) {
        const deleteAllBtn = document.createElement("button");
        deleteAllBtn.type = "button";
        deleteAllBtn.id = "delete-all-reports";
        deleteAllBtn.classList.add(
          "btn",
          "btn-delete-all",
          "delete-all-inline"
        );
        deleteAllBtn.textContent = "🗑️ Delete All";

        deleteAllBtn.addEventListener("click", () => {
          const target = getSelectedReport();
          if (target) {
            deleteReport(target);
            selectedReportId = null;
            clearSelection();
          } else if (
            confirm("¿Seguro que quieres eliminar TODOS los reportes?")
          ) {
            reportContent.innerHTML = "";
            reportContainer.classList.add("hidden");
            reportImagesMap.clear(); // Limpiar todas las imágenes
            deleteAllBtn.remove();
            clearReportsFromLocalStorage();
          }
        });

        // Insertar en el encabezado del contenedor
        const titleEl = reportContainer.querySelector("h2");
        if (titleEl && titleEl.parentNode === reportContainer) {
          titleEl.insertAdjacentElement("afterend", deleteAllBtn);
        } else {
          reportContent.insertBefore(deleteAllBtn, reportContent.firstChild);
        }
      }
    } else {
      // Eliminar botón "Delete All" si existe y hay 1 o menos reportes
      const deleteAllBtn = document.getElementById("delete-all-reports");
      if (deleteAllBtn) {
        deleteAllBtn.remove();
      }
    }
    refreshReportActions();
  }

  // Función para guardar reportes en localStorage
  function saveReportsToLocalStorage() {
    const reports = Array.from(
      reportContent.querySelectorAll(".report-wrapper")
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
    localStorage.setItem("completionReports", JSON.stringify(reports));
  }

  // Función para limpiar reportes de localStorage
  function clearReportsFromLocalStorage() {
    localStorage.removeItem("completionReports");
  }

  function resetSelections() {
    addressInput.value = "";
    if (addressDetailsInput) {
      addressDetailsInput.value = "";
    }
    notesInput.value = "";
    otroNameInput.value = "";
    otroPriceInput.value = "";
    fixOtroNameInput.value = "";
    fixOtroPriceInput.value = "";
    serviceTypeButtons
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    acHeatOptions
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    thermostatButtons
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    accessoryButtons
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    getAllFixButtons().forEach((btn) => btn.classList.remove("active"));
    state.address = "";
    state.notes = "";
    state.selectedServices = [];
    state.isTwoSystems = false;
    state.isTwoStage = false;
    state.isTemporary = false;
    state.selectedThermostat = null;
    state.thermostatQuantity = 1;
    state.selectedAccessories = [];
    state.otroAccessory = null;
    state.selectedFixes = [];
    state.otroFix = null;
    state.leakDetail = null;
    state.heaterModel = "";
    state.outdoorModel = "";
    state.weightInData = defaultWeightInData();
    if (heaterModelSelect) heaterModelSelect.value = "";
    if (outdoorModelSelect) outdoorModelSelect.value = "";
    weightInFieldConfigs.forEach(({ key }) => {
      const inputEl = weightInInputs[key];
      if (inputEl) inputEl.value = "";
    });
    // Limpiar inputs de imagen y estado temporal
    currentImages = { weight: null, fan: null };
    if (weightInContent) {
      weightInContent
        .querySelectorAll("input[type='file']")
        .forEach((input) => {
          input.value = "";
        });
      // Resetear textos de estado y estilos de botones de carga
      weightInContent.querySelectorAll(".file-status-text").forEach((el) => {
        el.textContent = "No image selected";
        el.style.fontWeight = "normal";
      });
      weightInContent.querySelectorAll(".btn-file-upload").forEach((el) => {
        el.classList.remove("active");
        el.style.borderColor = "var(--border-color, #ccc)";
      });

      // Deshabilitar botones de imagen
      const dlBtn = document.getElementById("btn-download-images");
      if (dlBtn) dlBtn.disabled = true;
    }
    setWeightInExpanded(false);
    hideLeakOptions();
    thermostatQuantity.classList.add("hidden");
    accessoryOtro.classList.add("hidden");
    fixOtro.classList.add("hidden");
    shareOptions.classList.add("hidden");
    quantitySlider.value = 1;
    quantityValue.textContent = 1;
    updatePriceDisplay();
    saveToLocalStorage();
  }

  reportEditButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (!selected) {
      alert("Selecciona un reporte primero");
      return;
    }
    const text = getSelectedReportText();
    editReport(selected, text);
    refreshReportActions();
  });

  reportDeleteButton.addEventListener("click", () => {
    const selected = getSelectedReport();
    if (selected) {
      deleteReport(selected);
      return;
    }
    if (confirm("¿Seguro que quieres eliminar todos los reportes?")) {
      reportContent.innerHTML = "";
      reportContainer.classList.add("hidden");
      clearSelection();
      clearLocalStorage();
    }
    updateDeleteAllButton();
    refreshReportActions();
  });

  reportShareButton.addEventListener("click", () => {
    if (!getReportWrappers().length) {
      alert("No hay reportes para compartir");
      return;
    }
    shareOptions.classList.toggle("hidden");
  });

  // Configuración de botones de compartir (Refactorizado)
  [
    { btn: shareWhatsappButton, method: "whatsapp" },
    { btn: shareSmsButton, method: "sms" },
    { btn: shareEmailButton, method: "email" },
    { btn: shareCopyButton, method: "copy" },
  ].forEach(({ btn, method }) => {
    if (btn) {
      btn.addEventListener("click", () => {
        shareReportVia(getSelectedReportText() || getAllReportsText(), method);
      });
    }
  });

  if (reportExportCsvButton) {
    reportExportCsvButton.addEventListener("click", () => {
      if (confirm("Generate a CSV file with all reports?")) {
        exportToCSV();
      }
    });
  }

  function generateReportText() {
    let reportItems = [];
    let totalPrice = 0;

    const address = state.address.toUpperCase() || "NOT PROVIDED";
    reportItems.push(address);

    if (state.notes) {
      const notesArray = state.notes
        .split("\n")
        .map((note) => note.trim())
        .filter((note) => note);
      reportItems.push(...notesArray);
    }

    const hasPrestart = state.selectedServices.some(
      (s) => s.name === "Prestart"
    );
    const hasAC = state.selectedServices.some((s) => s.name === "AC");
    const hasHeat = state.selectedServices.some((s) => s.name === "Heat");
    const hasFinish = state.selectedServices.some((s) => s.name === "Finish");
    const hasDriveRun = state.selectedServices.some(
      (s) => s.name === "Drive Run"
    );
    const hasCancel = state.selectedServices.some((s) => s.name === "Cancel");

    if (hasCancel) {
      reportItems.push("service canceled $0");
    } else if (state.selectedServices.length > 0) {
      // Lógica unificada para agregar línea de servicio (con o sin termostato)
      const addServiceLine = (
        serviceName,
        basePrice,
        { respectMultipliers = true } = {}
      ) => {
        let price = basePrice;
        if (
          respectMultipliers &&
          state.isTwoStage &&
          !hasFinish &&
          !hasDriveRun
        )
          price += 10;
        if (respectMultipliers && state.isTwoSystems) price *= 2;
        const tempSuffix =
          state.isTemporary && (serviceName === "AC" || serviceName === "Heat")
            ? " (temporarily)"
            : "";
        let serviceText = `${serviceName}${tempSuffix} started${
          state.isTwoSystems ? " 2 systems" : ""
        }${state.isTwoStage && !hasFinish && !hasDriveRun ? " 2 stage" : ""}`;

        // Agregar información del termostato si existe
        if (state.selectedThermostat) {
          const tstatName = state.selectedThermostat.name;
          const quantity = state.thermostatQuantity;
          const qtyLabel = quantity === 1 ? "tstat" : "tstats";
          serviceText += ` ${quantity} ${tstatName} ${qtyLabel}`;
        }

        totalPrice += price;
        reportItems.push(`${serviceText} $${price}`);
      };

      if (hasFinish) {
        const serviceName =
          hasAC && hasHeat
            ? "AC & Heat"
            : hasAC
            ? "AC"
            : hasHeat
            ? "Heat"
            : "Finish";
        addServiceLine(serviceName, 20, { respectMultipliers: false });
      } else if (hasPrestart) {
        addServiceLine("prestart system", 20);
      } else if (hasAC && hasHeat) {
        addServiceLine("AC & Heat", 30);
      } else if (hasAC || hasHeat || hasFinish || hasDriveRun) {
        const service = hasAC
          ? "AC"
          : hasHeat
          ? "Heat"
          : hasFinish
          ? "Finish"
          : "Drive Run";
        const basePrice = hasFinish ? 20 : hasDriveRun ? 10 : 30;
        addServiceLine(service, basePrice);
      }
    }

    const twoSystemsAccessories = [
      "DragonFly",
      "Trane Harness",
      "Harness",
      "E.S.3.10",
      "LP Kit",
      "Float Switch",
    ];
    const accessoryDisplayNames = {
      Zoning: "zoning",
      Harmony: "harmony",
      "Bypass Control": "bypass control",
      FreshAir: "fresh air",
      FIN180P: "fin180p",
      "FIN6-MD": "fin6-md",
      Dehum: "dehum",
      "F/A": "f/a",
      DragonFly: "dragonfly kit",
      "Weight-In-Data": "weight-in-data",
      "Trane Harness": "trane harness",
      Harness: "harness",
      "E.S.3.10": "e.s.3.10",
      "LP Kit": "lp kit",
      "Float Switch": "float switch",
      Bypass: "bypass damper",
      "Out of town fee": "out of town fee",
      A2L: "a2l",
    };

    state.selectedAccessories.forEach((accessory) => {
      let price = accessory.basePrice;
      if (accessory.name === "E.S.3.10" && hasFinish) {
        price = 20;
      }
      if (accessory.name === "Weight-In-Data" && hasFinish) {
        price += 10;
      }
      const skipInReport =
        accessory.name === "FreshAir" || accessory.name === "A2L";
      let suffix = "";
      if (
        state.isTwoSystems &&
        twoSystemsAccessories.includes(accessory.name)
      ) {
        price *= 2;
        suffix = " (2 systems)";
      }
      const displayName =
        accessoryDisplayNames[accessory.name] || accessory.name.toLowerCase();
      if (!skipInReport) {
        reportItems.push(`${displayName} $${price}${suffix}`);
      }
      totalPrice += price;
    });

    if (state.otroAccessory) {
      const price = state.otroAccessory.basePrice;
      reportItems.push(`${state.otroAccessory.name.toLowerCase()} $${price}`);
      totalPrice += price;
    }

    const fixDisplayNames = {
      "Pressure Test": "pressure test",
      Leaks: "fixed freon leaks",
      "Wires Jammed": "wires jammed",
      "Stuck Blower": "stuck blower",
      "Cut Sheetrock": "cut sheetrock",
      "Extended Wire": "extended wire",
      "PVC Work": "pvc work",
    };

    state.selectedFixes.forEach((fix) => {
      const price = fix.basePrice;
      const displayName = fixDisplayNames[fix.name] || fix.name.toLowerCase();
      const detail =
        fix.name === "Leaks" && state.leakDetail
          ? ` (${state.leakDetail})`
          : "";
      reportItems.push(`${displayName}${detail} $${price}`);
      totalPrice += price;
    });

    if (state.otroFix) {
      const price = state.otroFix.basePrice;
      reportItems.push(`${state.otroFix.name.toLowerCase()} $${price}`);
      totalPrice += price;
    }

    if (hasWeightInData()) {
      reportItems.push("weight-in data recorded");
    }

    reportItems.push(`total $${totalPrice}`);
    const reportText = reportItems.join(", ");
    return reportText;
  }

  // Función para exportar reportes a CSV (Solo texto)
  function exportToCSV() {
    const wrappers = getReportWrappers();

    if (wrappers.length === 0) {
      alert("No hay reportes para exportar");
      console.warn("No reports available to export");
      return;
    }

    // Encabezados del CSV con columnas para cada accesorio y fix
    let csvContent =
      "Date,Address,Service,Thermostat,Qty,Service_Price,Accessories_Summary,Fixes_Summary,Notes,Total,Weight_In_Recorded,Lineset_Length,Factory_Charge_Oz,Liquid_Line_Length,Approx_Adjust_Oz,Adjusted_Oz,Fan_Speed_CFM,Liquid_Line_Temp_F,Suction_Line_Temp_F,Condenser_Sat_Temp_F,Subcooling_Value_F,OEM_Subcooling_Goal_F,Subcooling_Deviation_F\n";

    // Procesar cada reporte
    wrappers.forEach((wrap) => {
      const entry = wrap.querySelector(".report-entry");
      const reportText = entry ? entry.textContent.trim() : "";
      const payloadRaw = wrap.dataset.reportPayload;
      let payload = null;
      if (payloadRaw) {
        try {
          payload = JSON.parse(payloadRaw);
        } catch (e) {
          payload = null;
        }
      }
      const dateStr =
        payload && payload.timestamp
          ? new Date(payload.timestamp).toLocaleDateString()
          : wrap.dataset.timestamp
          ? new Date(wrap.dataset.timestamp).toLocaleDateString()
          : "";

      // En modo solo CSV, no incluimos nombres de imágenes ya que no se adjuntan
      const csvRow = parseReportToCSV(
        reportText,
        dateStr,
        payload && payload.weightInData
      );
      csvContent += csvRow + "\n";
    });

    // Crear archivo y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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

  // Función para parsear el reporte a formato CSV con columnas predefinidas
  function parseReportToCSV(reportText, dateStr = "", weightData = null) {
    // Dividir el reporte en partes
    const parts = reportText.split(", ");

    let address = "";
    let service = "";
    let thermostat = "";
    let quantity = "";
    let servicePrice = "";
    let notes = [];
    let total = "";

    // Listas para agrupar accesorios y reparaciones
    const accessoriesList = [];
    const fixesList = [];

    let weightInRecorded = "";
    const weightValues = {
      linesetLength: "",
      factoryChargeOz: "",
      liquidLineDiameter: "",
      approxAdjustOz: "",
      adjustedOz: "",
      fanSpeedCfm: "",
      liquidLineTemp: "",
      suctionLineTemp: "",
      condenserSatTemp: "",
      subcoolingValue: "",
      oemSubcoolingGoal: "",
      subcoolingDeviation: "",
    };

    if (weightData && typeof weightData === "object") {
      Object.keys(weightValues).forEach((key) => {
        weightValues[key] = weightData[key] || "";
      });
    }

    parts.forEach((part) => {
      const lower = part.toLowerCase();

      // Extraer dirección (primera parte en mayúsculas)
      if (part === part.toUpperCase() && !address && !part.includes("$")) {
        address = part;
        return;
      }

      // Extraer servicios y precio del servicio
      if (
        lower.includes("ac started") ||
        lower.includes("heat started") ||
        lower.includes("ac & heat started") ||
        lower.includes("prestart system") ||
        lower.includes("finish started") ||
        lower.includes("drive run") ||
        lower.includes("service canceled")
      ) {
        // Extraer servicio completo
        service = part;

        // Extraer thermostat y cantidad si están en la misma línea
        const tstatMatch = part.match(
          /(\d+)\s+(t-\d+|t-4|t-6|t-10|t-8321|ecobee|lennox|otro)\s+tstat/i
        );
        if (tstatMatch) {
          quantity = tstatMatch[1];
          thermostat = tstatMatch[2].toUpperCase();
        }

        // Extraer precio del servicio
        const priceMatch = part.match(/\$(\d+)/);
        if (priceMatch) {
          servicePrice = priceMatch[1];
        }
        return;
      }

      // Extraer total
      if (lower.startsWith("total $")) {
        total = part.replace(/total \$/i, "");
        return;
      }

      if (lower.includes("weight-in data recorded")) {
        weightInRecorded = "yes";
        return;
      }

      // Extraer precio de cada parte
      const priceMatch = part.match(/\$(\d+)/);
      const price = priceMatch ? priceMatch[1] : "";

      // Verificar accesorios predefinidos
      if (lower.includes("zoning")) {
        accessoriesList.push(`Zoning $${price}`);
      } else if (lower.includes("fin180p")) {
        accessoriesList.push(`FIN180P $${price}`);
      } else if (lower.includes("dehum")) {
        accessoriesList.push(`Dehum $${price}`);
      } else if (lower.includes("freshair") || lower.includes("fresh air")) {
        accessoriesList.push(`FreshAir $${price}`);
      } else if (lower.includes("f/a")) {
        accessoriesList.push(`F/A $${price}`);
      } else if (lower.includes("fin6-md")) {
        accessoriesList.push(`FIN6-MD $${price}`);
      } else if (lower.includes("dragonfly")) {
        accessoriesList.push(`DragonFly $${price}`);
      } else if (lower.includes("trane harness")) {
        accessoriesList.push(`Trane Harness $${price}`);
      } else if (lower.includes("harness")) {
        accessoriesList.push(`Harness $${price}`);
      } else if (lower.includes("weight-in-data")) {
        accessoriesList.push(`Weight-In-Data $${price}`);
      } else if (lower.includes("lp kit")) {
        accessoriesList.push(`LP Kit $${price}`);
      } else if (lower.includes("float switch")) {
        accessoriesList.push(`Float Switch $${price}`);
      } else if (lower.includes("bypass control")) {
        accessoriesList.push(`Bypass Control $${price}`);
      } else if (lower.includes("bypass")) {
        accessoriesList.push(`Bypass $${price}`);
      } else if (lower.includes("out of town fee")) {
        accessoriesList.push(`Out of Town Fee $${price}`);
      } else if (lower.includes("harmony")) {
        accessoriesList.push(`Harmony $${price}`);
      } else if (lower.includes("a2l")) {
        accessoriesList.push(`A2L $${price}`);
      }
      // Verificar fixes predefinidos
      else if (lower.includes("pressure test")) {
        fixesList.push(`Pressure Test $${price}`);
      } else if (lower.includes("leak")) {
        fixesList.push(`Leaks $${price}`);
      } else if (lower.includes("wires jammed")) {
        fixesList.push(`Wires Jammed $${price}`);
      } else if (lower.includes("stuck blower")) {
        fixesList.push(`Stuck Blower $${price}`);
      } else if (lower.includes("cut sheetrock")) {
        fixesList.push(`Cut Sheetrock $${price}`);
      } else if (lower.includes("extended wire")) {
        fixesList.push(`Extended Wire $${price}`);
      } else if (lower.includes("pvc work")) {
        fixesList.push(`PVC Work $${price}`);
      }
      // Si tiene precio pero no es un item predefinido, es custom
      else if (
        price &&
        !part.toLowerCase().includes("tstat") &&
        part !== address
      ) {
        // Determinar si es accessorio custom o fix custom
        const name = part.replace(/\s*\$\d+/, "").trim();
        accessoriesList.push(`${name} $${price}`);
      }
      // Todo lo demás sin precio son notas
      else if (!price && part !== address && !lower.includes("tstat")) {
        notes.push(part);
      }
    });

    // Escapar comillas y formatear campos CSV
    const escapeCSV = (str) => {
      str = String(str);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const currentDate = dateStr || new Date().toLocaleDateString();

    // Construir fila CSV con todas las columnas
    return [
      escapeCSV(currentDate),
      escapeCSV(address),
      escapeCSV(service),
      escapeCSV(thermostat),
      quantity,
      servicePrice,
      escapeCSV(accessoriesList.join(", ")),
      escapeCSV(fixesList.join(", ")),
      escapeCSV(notes.join("; ")),
      total,
      weightInRecorded,
      weightValues.linesetLength,
      weightValues.factoryChargeOz,
      weightValues.liquidLineDiameter,
      weightValues.approxAdjustOz,
      weightValues.adjustedOz,
      weightValues.fanSpeedCfm,
      weightValues.liquidLineTemp,
      weightValues.suctionLineTemp,
      weightValues.condenserSatTemp,
      weightValues.subcoolingValue,
      weightValues.oemSubcoolingGoal,
      weightValues.subcoolingDeviation,
    ].join(",");
  }

  function updatePriceDisplay() {
    // Si la barra de total no existe, no intentes renderizarla
    if (!serviceOptionsDisplay) {
      return;
    }

    const { totalServicePrice, totalAccessoryPrice, totalFixPrice, total } =
      calculateFinancials(state);

    serviceOptionsDisplay.innerHTML = `
  <div style="text-align: center;">
    <strong style="font-size: 10pt; color: var(--button-bg-active);">
      💵 Total: $${total}
    </strong><br>
    <div style="font-size: 7pt; margin-top: 4px; color: var(--text-color);">
      ${totalServicePrice > 0 ? `🔧 Servicio: $${totalServicePrice}` : ""}
      ${totalAccessoryPrice > 0 ? `📦 Accesorios: $${totalAccessoryPrice}` : ""}
      ${totalFixPrice > 0 ? `⚡ Extras: $${totalFixPrice}` : ""}
    </div>
  </div>
`;
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {})
      .catch((err) => console.error("SW error:", err));
  });
}
