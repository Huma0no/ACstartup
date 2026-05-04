// src/lv.js — LV diagram viewer: job header, static sections, viewer singleton.

import { getActiveJobId }             from "./storage.js";
import { getJobById }                 from "./jobs.js";
import { getIndoorModel, getOutdoorModel } from "./data.js";

// ---------------------------------------------------------------------------
// Viewer singleton state
// ---------------------------------------------------------------------------

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

  viewerBody = document.createElement("div");
  viewerBody.className = "lv-viewer-body";

  viewerImg = document.createElement("img");
  viewerImg.id = "lv-diagram-img";
  viewerImg.alt = "LV Wiring Diagram";

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
      const d = dist(e.touches[0], e.touches[1]);
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

function openViewer(title, imgPath) {
  ensureViewer();
  resetZoom();
  viewerTitle.textContent = title;

  viewerImg.style.display = "";
  const prevUC = viewerBody.querySelector(".lv-under-construction");
  if (prevUC) prevUC.remove();

  viewerImg.onload  = null;
  viewerImg.onerror = null;

  viewerImg.onload  = () => { viewerImg.style.display = ""; };
  viewerImg.onerror = () => {
    viewerImg.style.display = "none";
    const uc = document.createElement("div");
    uc.className = "lv-under-construction";
    uc.innerHTML = `<div class="lv-uc-icon">🚧</div><div class="lv-uc-text">Under Construction</div><div class="lv-uc-sub">${title}</div>`;
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

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const SECTIONS = [
  {
    label: "Tstat",
    items: [
      { label: "1/2 stage",  img: "images/lv/tstat-1-2stage.png" },
      { label: "Heat Pump",  img: "images/lv/tstat-heatpump.png" },
      { label: "Daikin One", img: "images/lv/tstat-daikin.png"   },
    ],
  },
  {
    label: "Condenser Units",
    items: [
      { label: "1/2 stage", img: "images/lv/cond-1-2stage.png" },
      { label: "Heat Pump", img: "images/lv/cond-heatpump.png" },
      { label: "Daikin",    img: "images/lv/cond-daikin.png"   },
    ],
  },
  {
    label: "Furnace / Air Handler",
    items: [
      { label: "Furnace 1/2 stage",    img: "images/lv/furnace-1-2stage.png" },
      { label: "Furnace Heat Pump",    img: "images/lv/furnace-heatpump.png" },
      { label: "Air Handler",          img: "images/lv/airhandler.png"       },
      { label: "Daikin Communication", img: "images/lv/daikin-comm.png"      },
    ],
  },
  {
    label: "Accessories",
    items: [
      { label: "FIN180P",      img: "images/lv/acc-fin180p.png"     },
      { label: "HZ322",        img: "images/lv/acc-hz322.png"       },
      { label: "Harmony",      img: "images/lv/acc-harmony.png"     },
      { label: "Float Switch", img: "images/lv/acc-floatswitch.png" },
      { label: "RDS",          img: "images/lv/acc-rds.png"         },
      { label: "eBypass",      img: "images/lv/acc-ebypass.png"     },
      { label: "Fresh Air",    img: "images/lv/acc-freshair.png"    },
      { label: "AprilAir",     img: "images/lv/acc-aprilair.png"    },
      { label: "Dehum",        img: "images/lv/acc-dehum.png"       },
      { label: "UT3000",       img: "images/lv/acc-ut3000.png"      },
      { label: "DAPC",         img: "images/lv/acc-dapc.png"        },
    ],
  },
];

const FOOTER_LINKS = [
  { label: "Lennox",  url: "https://www.lennoxpros.com/documentlibrary" },
  { label: "Trane",   url: "https://www.tranetechnologies.com/"         },
  { label: "Goodman", url: "https://www.goodmanmfg.com/"                },
  { label: "Daikin",  url: "https://daikincomfort.com/"                 },
];

// ---------------------------------------------------------------------------
// Header chip resolution — Indoor · Outdoor · S Manual
// ---------------------------------------------------------------------------

function _resolveJobChips(job) {
  const chips = [];
  const f = job.system1?.furnace;
  const o = job.system1?.outdoor;
  const indoorEntry  = f ? getIndoorModel(f)  : null;
  const outdoorEntry = o ? getOutdoorModel(o) : null;

  if (indoorEntry?.imagen) chips.push({ label: "Indoor", img: indoorEntry.imagen });

  if (outdoorEntry) {
    let img;
    if (outdoorEntry.series === "DC6VSS")        img = "images/lv/cond-daikin.png";
    else if (outdoorEntry.uType === "Heat Pump") img = "images/lv/cond-heatpump.png";
    else                                         img = "images/lv/cond-1-2stage.png";
    chips.push({ label: "Outdoor", img });
  }

  const sManual = job.system1?.links?.serviceManual;
  if (sManual) chips.push({ label: "S Manual", url: sManual });

  return chips;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderLV(container) {
  container.innerHTML = "";
  ensureViewer();

  const jobId = getActiveJobId();
  const job   = jobId ? getJobById(jobId) : null;

  // Header
  const header = document.createElement("div");
  header.className = "lv-header";

  if (job) {
    const addr = document.createElement("div");
    addr.className = "lv-job-addr";
    addr.textContent = job.address;
    header.appendChild(addr);

    const chips = _resolveJobChips(job);
    if (chips.length) {
      const row = document.createElement("div");
      row.className = "lv-chip-row";
      chips.forEach(({ label, img, url }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip chip-sm chip-primary";
        btn.textContent = label;
        if (img) btn.addEventListener("click", () => openViewer(label, img));
        if (url) btn.addEventListener("click", () => window.open(url, "_blank", "noopener"));
        row.appendChild(btn);
      });
      header.appendChild(row);
    }
  } else {
    const note = document.createElement("p");
    note.className = "lv-no-job";
    note.textContent = "Browsing all diagrams";
    header.appendChild(note);
  }

  container.appendChild(header);

  // Body — static sections
  SECTIONS.forEach(({ label, items }) => {
    const section = document.createElement("div");
    section.className = "lv-section";

    const heading = document.createElement("p");
    heading.className = "lv-section-label";
    heading.textContent = label;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "lv-btn-grid";
    items.forEach(({ label: l, img }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-outline";
      btn.textContent = l;
      btn.addEventListener("click", () => openViewer(l, img));
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  // Footer
  const footer = document.createElement("div");
  footer.className = "lv-footer";
  FOOTER_LINKS.forEach(({ label: l, url }) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "lv-footer-link";
    a.textContent = l;
    footer.appendChild(a);
  });
  container.appendChild(footer);
}
