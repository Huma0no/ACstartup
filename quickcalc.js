import { ouncesToPoundsAndOunces } from "./weightInData.js";

export function initQuickCalc() {
  const quickPies = document.getElementById("quick-pies");
  const quickBrand = document.getElementById("quick-brand");
  const quickOvercharged = document.getElementById("quick-overcharged");
  const quickResultado = document.getElementById("quick-resultado");
  const quickDaikinTon = document.getElementById("quick-daikin-ton");
  const quickDaikinHe = document.getElementById("quick-daikin-he");
  const lblOvercharged = document.getElementById("lbl-overcharged");
  const lblDaikinHe = document.getElementById("lbl-daikin-he");
  const quickCalcBtn = document.getElementById("btn-open-quick-calc");
  const quickCalcModal = document.getElementById("quick-calc-modal");
  const quickCalcClose = document.getElementById("quick-calc-close");

  if (!quickPies || !quickResultado) return;

  function updateQuickCalc() {
    const pies = parseFloat(quickPies.value) || 0;
    const brand = quickBrand ? quickBrand.value : "standard";
    const esOvercharged = quickOvercharged ? quickOvercharged.checked : false;

    // UI Toggle Logic — always runs so brand switching shows correct controls
    if (brand === "daikin") {
      if (quickDaikinTon) quickDaikinTon.classList.remove("hidden");
      if (lblDaikinHe) lblDaikinHe.classList.remove("hidden");
      if (lblOvercharged) lblOvercharged.classList.add("hidden");
    } else {
      if (quickDaikinTon) quickDaikinTon.classList.add("hidden");
      if (lblDaikinHe) lblDaikinHe.classList.add("hidden");
      if (lblOvercharged) lblOvercharged.classList.remove("hidden");
    }

    // Nothing to calculate if no length entered
    if (pies <= 0) {
      quickResultado.classList.add("hidden");
      return;
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

    const absOz = Math.abs(cantidadOz);
    const lbsOzText = ouncesToPoundsAndOunces(absOz);
    const actionLabel = diff >= 0 ? "ADD" : "REMOVE";
    const color = diff >= 0 ? "var(--button-bg-active)" : "#dc2626";

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
  if (quickCalcBtn && quickCalcModal) {
    quickCalcBtn.addEventListener("click", () => {
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
}
