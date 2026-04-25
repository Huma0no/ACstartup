import { getActiveJobAddress, getJobByAddress } from "./src/jobs.js";

// ─── Series → image slug maps ──────────────────────────────────────────────

const HEATER_SERIES_SLUGS = {
  "ML180UH SERIES":                  "ML180UH",
  "ML196UH SERIES(HIGH EFFICIENCY)": "ML196UH",
  "ML180UHV SERIES(DIP SWITCH)":     "ML180UHV",
  "ML296UHV SERIES":                 "ML296UHV",
  "EL196UH SERIES":                  "EL196UH",
  "CBK45UHET SERIES":                "CBK45UHET",
  "CBA25UH SERIES":                  "CBA25UH",
  "S8X1/S8X2-S8B1":                  "S8X1-S8X2",
  "GR9S80 SERIES":                   "GR9S80",
  "AMSTU1300 SERIES":                "AMSTU1300",
  "DR96TC SERIES":                   "DR96TC",
};

const OUTDOOR_SERIES_SLUGS = {
  "ML17XC1 SERIES":  "ML17XC1",
  "EL17XP1 SERIES":  "EL17XP1",
  "ML14KC1 SERIES":  "ML14KC1",
  "ML17KC2 SERIES":  "ML17KC2",
  "4TTR SERIES":     "4TTR",
  "5TTR SERIES":     "5TTR",
  "GLXS4BA SERIES":  "GLXS4BA",
  "GLXS5BA SERIES":  "GLXS5BA",
  "GLZS4BA SERIES":  "GLZS4BA",
  "DC6VSS SERIES":   "DC6VSS",
};

const TSTAT_LABELS = [
  "T-4", "T-6", "T-10", "T-8321", "Ecobee", "Daikin One", "TH2110", "Otro",
];

const ACCESSORIES_LIST = [
  { label: "Zone Board HZ322",         slug: "HZ322",                    zoomable: true  },
  { label: "Zone Board Harmony",       slug: "Harmony",                  zoomable: true  },
  { label: "DH3000",                   slug: "DH3000",                   zoomable: false },
  { label: "DAPS",                     slug: "DAPS",                     zoomable: false },
  { label: "FIN180P",                  slug: "FIN180P",                  zoomable: false },
  { label: "Dehum",                    slug: "Dehum",                    zoomable: false },
  { label: "Float Switch",             slug: "Float Switch",             zoomable: false },
  { label: "Dehumidifier",             slug: "Dehumidifier",             zoomable: false },
  { label: "Fresh Air",                slug: "Fresh Air",                zoomable: false },
  { label: "AprilAir",                 slug: "AprilAir",                 zoomable: false },
  { label: "Electronic Bypass Damper", slug: "Electronic Bypass Damper", zoomable: false },
  { label: "RDS",                      slug: "RDS",                      zoomable: false },
];

// Map job accessory label strings → LV slug
const JOB_ACC_TO_LV = {
  "Harmony":           "Harmony",
  "Zoning":            "HZ322",
  "FIN180P wired and": "FIN180P",
  "Dehum":             "Dehum",
  "Float Switch":      "Float Switch",
  "RDS":               "RDS",
  "Air":               "Fresh Air",
  "eBypass":           "Electronic Bypass Damper",
  "DragonFly":         "DH3000",
};

const IMG = {
  tstat:   "images/lv/tstat/",
  outdoor: "images/lv/outdoor/",
  indoor:  "images/lv/indoor/",
  acc:     "images/lv/accessories/",
};

// ─── Model → series slug ───────────────────────────────────────────────────

function heaterSlugFromModel(model) {
  if (!model) return null;
  const m = model.toUpperCase();
  if (/^ML180UH\d+V/i.test(m)) return "ML180UHV";   // DIP SWITCH variant
  if (m.startsWith("ML180UH"))   return "ML180UH";
  if (m.startsWith("ML196UH"))   return "ML196UH";
  if (m.startsWith("ML296UH"))   return "ML296UHV";
  if (m.startsWith("EL196UH"))   return "EL196UH";
  if (m.startsWith("CBK45UHET")) return "CBK45UHET";
  if (m.startsWith("CBA25UH"))   return "CBA25UH";
  if (m.startsWith("S8X1") || m.startsWith("S8X2") || m.startsWith("S8B1")) return "S8X1-S8X2";
  if (m.startsWith("GR9S80"))    return "GR9S80";
  if (m.startsWith("AMST"))      return "AMSTU1300";
  if (m.startsWith("DR96TC"))    return "DR96TC";
  return null;
}

function outdoorSlugFromModel(model) {
  if (!model) return null;
  const m = model.toUpperCase();
  if (m.startsWith("ML17XC1")) return "ML17XC1";
  if (m.startsWith("ML18XC2")) return "ML18XC2";
  if (m.startsWith("EL17XP1")) return "EL17XP1";
  if (m.startsWith("ML14KC1")) return "ML14KC1";
  if (m.startsWith("ML17KC2")) return "ML17KC2";
  if (m.startsWith("4TTR"))    return "4TTR";
  if (m.startsWith("5TTR"))    return "5TTR";
  if (m.startsWith("GLXS4BA")) return "GLXS4BA";
  if (m.startsWith("GLXS5BA")) return "GLXS5BA";
  if (m.startsWith("GLZS4BA")) return "GLZS4BA";
  if (m.startsWith("DC6VSS"))  return "DC6VSS";
  return null;
}

// ─── Module state ──────────────────────────────────────────────────────────

let activeCategory = "tstat";
let activeSystem   = 1;

// ─── Viewer (created once, lives on body) ─────────────────────────────────

let viewerEl    = null;
let viewerImg   = null;
let viewerTitle = null;
let viewerBody  = null;
let currentScale = 1;
let translateX   = 0;
let translateY   = 0;

function ensureViewer() {
  if (viewerEl) return;

  viewerEl = document.createElement("div");
  viewerEl.id = "lv-viewer";

  // Header
  const header = document.createElement("div");
  header.className = "lv-viewer-header";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "lv-viewer-btn";
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", closeViewer);

  viewerTitle = document.createElement("span");
  viewerTitle.className = "lv-viewer-title";

  const changeBtn = document.createElement("button");
  changeBtn.type = "button";
  changeBtn.className = "lv-viewer-btn";
  changeBtn.textContent = "⟳ Change";
  changeBtn.addEventListener("click", closeViewer);

  header.append(backBtn, viewerTitle, changeBtn);

  // Body
  viewerBody = document.createElement("div");
  viewerBody.className = "lv-viewer-body";

  viewerImg = document.createElement("img");
  viewerImg.id = "lv-diagram-img";
  viewerImg.alt = "LV Wiring Diagram";

  // Zoom controls (non-touch)
  const zoomControls = document.createElement("div");
  zoomControls.className = "lv-zoom-controls";

  const zoomOut = document.createElement("button");
  zoomOut.type = "button";
  zoomOut.className = "lv-zoom-btn";
  zoomOut.textContent = "−";
  zoomOut.addEventListener("click", () => adjustZoom(-0.5));

  const zoomReset = document.createElement("button");
  zoomReset.type = "button";
  zoomReset.className = "lv-zoom-btn lv-zoom-reset";
  zoomReset.textContent = "1:1";
  zoomReset.addEventListener("click", resetZoom);

  const zoomIn = document.createElement("button");
  zoomIn.type = "button";
  zoomIn.className = "lv-zoom-btn";
  zoomIn.textContent = "+";
  zoomIn.addEventListener("click", () => adjustZoom(0.5));

  zoomControls.append(zoomOut, zoomReset, zoomIn);
  viewerBody.append(viewerImg, zoomControls);
  viewerEl.append(header, viewerBody);
  document.body.appendChild(viewerEl);

  setupTouchZoom(viewerImg);
}

// ─── Zoom helpers ──────────────────────────────────────────────────────────

function applyTransform() {
  viewerImg.style.transform       = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
  viewerImg.style.transformOrigin = "center center";
}

function resetZoom() {
  currentScale = 1;
  translateX   = 0;
  translateY   = 0;
  applyTransform();
}

function adjustZoom(delta) {
  currentScale = Math.min(Math.max(currentScale + delta, 1), 5);
  if (currentScale === 1) { translateX = 0; translateY = 0; }
  applyTransform();
}

// ─── Touch / pinch zoom ────────────────────────────────────────────────────

function setupTouchZoom(img) {
  let pinchStartDist  = 0;
  let pinchStartScale = 1;
  let panStartX = 0, panStartY = 0;
  let panStartTX = 0, panStartTY = 0;
  let lastTapTime = 0;
  let tapX = 0, tapY = 0;

  function dist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  img.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      pinchStartDist  = dist(e.touches[0], e.touches[1]);
      pinchStartScale = currentScale;
    } else if (e.touches.length === 1) {
      panStartX  = e.touches[0].clientX;
      panStartY  = e.touches[0].clientY;
      panStartTX = translateX;
      panStartTY = translateY;
      tapX       = panStartX;
      tapY       = panStartY;
    }
  }, { passive: true });

  img.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const d  = dist(e.touches[0], e.touches[1]);
      currentScale = Math.min(Math.max(pinchStartScale * (d / pinchStartDist), 1), 5);
      applyTransform();
    } else if (e.touches.length === 1 && currentScale > 1) {
      translateX = panStartTX + (e.touches[0].clientX - panStartX);
      translateY = panStartTY + (e.touches[0].clientY - panStartY);
      applyTransform();
    }
  }, { passive: false });

  img.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTapTime < 300 && e.changedTouches.length === 1) {
      if (currentScale > 1) {
        resetZoom();
      } else {
        // Zoom 2.5× roughly centered on tap point
        const rect = img.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        currentScale = 2.5;
        translateX   = (cx - tapX) * 0.6;
        translateY   = (cy - tapY) * 0.6;
        applyTransform();
      }
    }
    lastTapTime = now;
  }, { passive: true });
}

// ─── Open / close viewer ───────────────────────────────────────────────────

function openViewer(title, imgPath) {
  ensureViewer();
  resetZoom();
  viewerTitle.textContent = title;

  // Clear previous under-construction placeholder
  viewerImg.style.display = "";
  const prevUC = viewerBody.querySelector(".lv-under-construction");
  if (prevUC) prevUC.remove();

  viewerImg.onload  = null;
  viewerImg.onerror = null;

  viewerImg.onload = () => {
    viewerImg.style.display = "";
  };
  viewerImg.onerror = () => {
    viewerImg.style.display = "none";
    const uc = document.createElement("div");
    uc.className = "lv-under-construction";
    uc.innerHTML = `
      <div class="lv-uc-icon">🚧</div>
      <div class="lv-uc-text">Under Construction</div>
      <div class="lv-uc-sub">${title}</div>
    `;
    viewerBody.appendChild(uc);
  };

  viewerImg.src = imgPath;
  viewerEl.classList.add("visible");
  document.body.style.overflow = "hidden";
}

function closeViewer() {
  if (!viewerEl) return;
  viewerEl.classList.remove("visible");
  document.body.style.overflow = "";
  resetZoom();
}

// ─── List item builder ─────────────────────────────────────────────────────

function makeListItem(name, imgPath, badge = null) {
  const item = document.createElement("div");
  item.className = "lv-item" + (badge ? " lv-item-highlighted" : "");

  const left = document.createElement("div");
  left.className = "lv-item-left";

  const nameEl = document.createElement("span");
  nameEl.className = "lv-item-name";
  nameEl.textContent = name;
  left.appendChild(nameEl);

  if (badge) {
    const badgeEl = document.createElement("span");
    badgeEl.className = "lv-item-badge";
    badgeEl.textContent = badge;
    left.appendChild(badgeEl);
  }

  const arrow = document.createElement("span");
  arrow.className = "lv-item-arrow";
  arrow.textContent = "›";

  item.append(left, arrow);
  item.addEventListener("click", () => openViewer(name, imgPath));
  return item;
}

function addSectionLabel(list, text) {
  const label = document.createElement("div");
  label.className = "lv-section-label";
  label.textContent = text;
  list.appendChild(label);
}

// ─── Category list renderers ───────────────────────────────────────────────

function renderTstatList(list, job) {
  const jobTstat = job?.thermostat?.type || null;

  if (jobTstat) {
    addSectionLabel(list, "Active Job");
    list.appendChild(makeListItem(jobTstat, `${IMG.tstat}${jobTstat}.png`, "Active Job"));
    addSectionLabel(list, "All Thermostats");
  }

  TSTAT_LABELS.forEach((label) => {
    if (label === jobTstat) return;
    list.appendChild(makeListItem(label, `${IMG.tstat}${label}.png`));
  });
}

function renderOutdoorList(list, job) {
  let jobSlug = null;
  if (job) {
    const model = activeSystem === 2 ? job.outdoorModel2 : job.outdoorModel;
    jobSlug = outdoorSlugFromModel(model);
  }

  if (jobSlug) {
    addSectionLabel(list, "Active Job");
    list.appendChild(makeListItem(jobSlug, `${IMG.outdoor}${jobSlug}.png`, "Active Job"));
    addSectionLabel(list, "All Series");
  }

  Object.values(OUTDOOR_SERIES_SLUGS).forEach((slug) => {
    if (slug === jobSlug) return;
    list.appendChild(makeListItem(slug, `${IMG.outdoor}${slug}.png`));
  });
}

function renderIndoorList(list, job) {
  let jobSlug = null;
  if (job) {
    const model = activeSystem === 2 ? job.heaterModel2 : job.heaterModel;
    jobSlug = heaterSlugFromModel(model);
  }

  if (jobSlug) {
    addSectionLabel(list, "Active Job");
    list.appendChild(makeListItem(jobSlug, `${IMG.indoor}${jobSlug}.png`, "Active Job"));
    addSectionLabel(list, "All Series");
  }

  Object.values(HEATER_SERIES_SLUGS).forEach((slug) => {
    if (slug === jobSlug) return;
    list.appendChild(makeListItem(slug, `${IMG.indoor}${slug}.png`));
  });
}

function renderAccList(list, job) {
  const jobSlugs = new Set();
  if (job?.extractedAccessories) {
    job.extractedAccessories.forEach((acc) => {
      const slug = JOB_ACC_TO_LV[acc];
      if (slug) jobSlugs.add(slug);
    });
  }

  if (jobSlugs.size > 0) {
    addSectionLabel(list, "Active Job");
    ACCESSORIES_LIST.filter((a) => jobSlugs.has(a.slug)).forEach((acc) => {
      list.appendChild(makeListItem(acc.label, `${IMG.acc}${acc.slug}.png`, "Active Job"));
    });
    addSectionLabel(list, "All Accessories");
  }

  ACCESSORIES_LIST.filter((a) => !jobSlugs.has(a.slug)).forEach((acc) => {
    list.appendChild(makeListItem(acc.label, `${IMG.acc}${acc.slug}.png`));
  });
}

function renderCategory(cat, job) {
  const content = document.getElementById("lv-content");
  if (!content) return;
  content.innerHTML = "";

  const list = document.createElement("div");
  list.className = "lv-list";

  if      (cat === "tstat")   renderTstatList(list, job);
  else if (cat === "outdoor") renderOutdoorList(list, job);
  else if (cat === "indoor")  renderIndoorList(list, job);
  else if (cat === "acc")     renderAccList(list, job);

  content.appendChild(list);
}

// ─── Full panel render ───���─────────────────────────────────────────────────

function renderLVPanel() {
  const panel = document.getElementById("tab-lv");
  if (!panel) return;

  const addr = getActiveJobAddress();
  const job  = addr ? getJobByAddress(addr) : null;

  panel.innerHTML = `
    <section class="section" id="lv-panel-inner">
      <div id="lv-job-header-wrap"></div>
      <div id="lv-category-bar"></div>
      <div id="lv-content"></div>
    </section>
  `;

  // ── Header ──
  const headerWrap = document.getElementById("lv-job-header-wrap");
  if (job) {
    headerWrap.innerHTML = `
      <div class="lv-job-badge-row">
        <span class="lv-job-badge">📋 Active Job</span>
        <span class="lv-job-addr">${job.address}</span>
      </div>
    `;
    if (job.isTwoSystems) {
      const sysToggle = document.createElement("div");
      sysToggle.className = "lv-sys-toggle";
      [1, 2].forEach((sys) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lv-sys-btn" + (sys === activeSystem ? " active" : "");
        btn.textContent = `System ${sys}`;
        btn.dataset.sys = sys;
        btn.addEventListener("click", () => {
          if (activeSystem === sys) return;
          activeSystem = sys;
          sysToggle.querySelectorAll(".lv-sys-btn").forEach((b) =>
            b.classList.toggle("active", parseInt(b.dataset.sys) === sys)
          );
          renderCategory(activeCategory, job);
        });
        sysToggle.appendChild(btn);
      });
      headerWrap.appendChild(sysToggle);
    }
  } else {
    headerWrap.innerHTML = `
      <p class="lv-no-job-note">No active job — browsing all diagrams</p>
    `;
  }

  // ── Category bar ──
  const catBar = document.getElementById("lv-category-bar");
  const cats = [
    { id: "tstat",   label: "Tstat"   },
    { id: "outdoor", label: "Outdoor" },
    { id: "indoor",  label: "Indoor"  },
    { id: "acc",     label: "Acc"     },
  ];
  cats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lv-cat-btn" + (cat.id === activeCategory ? " active" : "");
    btn.textContent = cat.label;
    btn.addEventListener("click", () => {
      if (activeCategory === cat.id) return;
      activeCategory = cat.id;
      catBar.querySelectorAll(".lv-cat-btn").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      renderCategory(cat.id, job);
    });
    catBar.appendChild(btn);
  });

  renderCategory(activeCategory, job);
}

// ─── Init ──────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  renderLVPanel();

  const lvTabBtn = document.querySelector(".tab-btn[data-tab='lv']");
  if (lvTabBtn) {
    lvTabBtn.addEventListener("click", () => {
      activeSystem = 1;
      renderLVPanel();
    });
  }
});
