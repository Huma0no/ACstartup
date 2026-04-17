// ============================================================
// equipmentData.js — HVAC Equipment Data Layer v2.0
// Fundación del sistema de troubleshooting contextual
// Reemplaza y expande weightindata.js
// ============================================================

// ─────────────────────────────────────────────
// ENUMS / CONSTANTES GLOBALES
// ─────────────────────────────────────────────
export const REFRIGERANT = {
  R410A: "R-410A",
  R454B: "R-454B",
  R32:   "R-32",
};

export const A2L_REFRIGERANTS = [REFRIGERANT.R454B, REFRIGERANT.R32];

export const BRAND = {
  GOODMAN: "Goodman",
  LENNOX:  "Lennox",
  TRANE:   "Trane",
  DAIKIN:  "Daikin",
};

export const BOARD_TYPE = {
  WHITE_RODGERS: "White-Rodgers",
  YORK:          "York",
  LENNOX_IFC:    "Lennox IFC",
  DAIKIN_IFC:    "Daikin IFC",
};

export const UNIT_TYPE = {
  FURNACE:    "Furnace",
  AIR_HANDLER:"AirHandler",
  CONDENSER:  "Condenser",
  HEAT_PUMP:  "Heat Pump",
};

// ─────────────────────────────────────────────
// HELPER: Detectar marca por prefijo de modelo
// ─────────────────────────────────────────────
export function detectBrand(modelStr = "") {
  const m = modelStr.toUpperCase();
  if (m.startsWith("GL") || m.startsWith("GR") || m.startsWith("AMST") || m.startsWith("CBK") || m.startsWith("CBA")) return BRAND.GOODMAN;
  if (m.startsWith("ML") || m.startsWith("EL")) return BRAND.LENNOX;
  if (m.startsWith("S8") || m.startsWith("4TTR") || m.startsWith("5TTR")) return BRAND.TRANE;
  if (m.startsWith("DR") || m.startsWith("DD") || m.startsWith("DC") || m.startsWith("GLXS") || m.startsWith("GLZS") || m.startsWith("GLXS5")) return BRAND.DAIKIN;
  return null;
}

// ─────────────────────────────────────────────
// HELPER: ¿Es refrigerante A2L?
// ─────────────────────────────────────────────
export function isA2L(freon = "") {
  return A2L_REFRIGERANTS.some(r => freon.includes("454") || freon.includes("R32") || freon === r);
}

// ─────────────────────────────────────────────
// ZONING BOARDS — Contexto para troubleshooting
// ─────────────────────────────────────────────
export const zoningBoards = {
  HZ322: {
    brand:       "Honeywell",
    name:        "TrueZONE HZ322",
    zones:       3,
    controlType: "24VAC",
    notes:       "Zone board con 3 zonas. Y1-OUT envía señal de cooling a la condensadora. Requiere bypass damper. Compatible con heat pump (O/B configurable).",
    faultIndicators: {
      "CALL":   "Llamada activa de zona",
      "FAULT":  "Corto en sensor de zona o damper",
    },
    terminalMap: {
      "R":    "24V Power input",
      "C":    "Common",
      "Y1":   "Cooling input desde tstat",
      "Y1OUT":"Cooling output hacia condensadora",
      "W":    "Heat input desde tstat",
      "G":    "Fan input desde tstat",
      "O/B":  "Heat pump reversing valve",
    },
    troubleshootingNotes: "Si fan arranca pero condensadora no, verificar Y1-OUT vs C con multímetro. 24VAC indica que board envía señal — problema está aguas abajo.",
  },
  UT3000: {
    brand:       "Honeywell",
    name:        "TrueZONE UT3000",
    zones:       null,
    controlType: "24VAC",
    notes:       "Universal zone controller. Compatible con múltiples zonas.",
    faultIndicators: {},
    terminalMap: {},
    troubleshootingNotes: "Verificar configuración DIP switches para modo heat pump vs convencional.",
  },
  HZ432: {
    brand:       "Honeywell",
    name:        "TrueZONE HZ432",
    zones:       4,
    controlType: "24VAC",
    notes:       "Zone board con 4 zonas.",
    faultIndicators: {},
    terminalMap: {},
    troubleshootingNotes: "",
  },
  DAPC: {
    brand:       "Daikin",
    name:        "Daikin DAPC Zone Controller",
    zones:       null,
    controlType: "24VAC",
    notes:       "Controlador de zonas Daikin.",
    faultIndicators: {},
    terminalMap: {},
    troubleshootingNotes: "",
  },
};

// ─────────────────────────────────────────────
// THERMOSTATS
// ─────────────────────────────────────────────
export const thermostats = {
  Ecobee: {
    brand:         "Ecobee",
    name:          "Ecobee SmartThermostat Pro",
    type:          "Smart",
    heatPumpReady: true,
    zoningReady:   true,
    notes:         "Compatible con sistemas de zonificación. Terminal PEK (Power Extender Kit) requerido si no hay terminal C en el aire handler.",
    terminalMap: {
      "Rc": "24V Cooling power",
      "Rh": "24V Heating power",
      "C":  "Common",
      "Y1": "Cooling stage 1",
      "W1": "Heat stage 1",
      "G":  "Fan",
      "O/B":"Heat pump reversing valve",
    },
    troubleshootingNotes: "Verificar que la app Ecobee no tenga override activo. En sistemas zonificados, la llamada Y1 va al zone board, no directo a la condensadora.",
  },
  "T-4": {
    brand: "Lennox", name: "iComfort T4", type: "Programmable",
    heatPumpReady: false, zoningReady: false, notes: "", terminalMap: {}, troubleshootingNotes: "",
  },
  "T-6": {
    brand: "Lennox", name: "iComfort T6", type: "Smart",
    heatPumpReady: true, zoningReady: true, notes: "", terminalMap: {}, troubleshootingNotes: "",
  },
  "T-10": {
    brand: "Lennox", name: "iComfort T10", type: "Smart",
    heatPumpReady: true, zoningReady: true, notes: "", terminalMap: {}, troubleshootingNotes: "",
  },
  "T-8321": {
    brand: "Honeywell", name: "T8321", type: "Programmable",
    heatPumpReady: false, zoningReady: false, notes: "", terminalMap: {}, troubleshootingNotes: "",
  },
  "Daikin One": {
    brand: "Daikin", name: "Daikin One+", type: "Smart",
    heatPumpReady: true, zoningReady: true, notes: "Compatible exclusivo con sistemas Daikin Fit.", terminalMap: {}, troubleshootingNotes: "",
  },
  "TH2110": {
    brand: "Honeywell", name: "TH2110D", type: "Basic",
    heatPumpReady: false, zoningReady: false, notes: "", terminalMap: {}, troubleshootingNotes: "",
  },
};

// ─────────────────────────────────────────────
// ACCESSORIES — Safety devices y add-ons
// ─────────────────────────────────────────────
export const accessories = {
  "Trane Harness": {
    name:        "Trane Safety Wire Harness",
    brand:       "Trane",
    safetyDevice: true,
    refrigerants: [REFRIGERANT.R454B],
    notes:        "Wire harness requerido en sistemas R-454B (A2L). Hace puente entre el leak sensor del evap coil y el furnace board. Si el leak sensor detecta fuga, abre el circuito Y1 y la condensadora no enciende.",
    circuitPath:  "Tstat Y1 → Zone Board → Wire Harness → Furnace Board → Condensadora",
    troubleshootingNotes: "Si condensadora no enciende: (1) verificar continuidad del harness, (2) verificar código en furnace board, (3) harness puede abrir circuito por false positive en new construction (flux, polvo, pintura en sensor).",
    relatedFaultCodes: {
      "Trane S8X1": { "E6": "Refrigerant leak detected — sensor abierto" },
    },
  },
  "Ecoil Wire": {
    name:         "Evap Coil Leak Sensor Wire",
    brand:        "Lennox/Goodman",
    safetyDevice:  true,
    refrigerants:  [REFRIGERANT.R454B, REFRIGERANT.R32],
    notes:         "Cable del sensor de fuga de refrigerante del evap coil. Similar al Trane Harness.",
    circuitPath:   "Leak sensor → Furnace Board",
    troubleshootingNotes: "Verificar que el sensor esté correctamente asentado en el bracket del evap coil. False positives comunes en new construction.",
    relatedFaultCodes: {},
  },
  "Float Switch": {
    name:         "Condensate Float Switch",
    brand:        "Generic",
    safetyDevice:  true,
    refrigerants:  [],
    notes:         "Interrumpe el circuito de control si el condensate pan se llena. Se instala en serie con Y1 o en el terminal de low voltage.",
    troubleshootingNotes: "Si sistema no enfría y float switch está instalado: verificar nivel de agua en pan. Drenar si está lleno. Puede causar no-cooling aunque el sistema esté bien.",
    relatedFaultCodes: {},
  },
  "HZ322": {
    ...zoningBoards.HZ322,
    safetyDevice: false,
  },
  "LP Kit Lennox 1stg": {
    name:         "LP Conversion Kit — Lennox 1-Stage",
    brand:        "Lennox",
    safetyDevice:  false,
    notes:         "Kit de conversión a gas LP (propano) para furnaces Lennox de 1 etapa. Incluye orificio de gas y ajuste de presión de manifold.",
    troubleshootingNotes: "Verificar presión de gas LP: manifold debe ser 10\" WC. Supply debe ser 11-14\" WC.",
    relatedFaultCodes: {},
  },
  "LP Kit Lennox 2stg": {
    name:         "LP Conversion Kit — Lennox 2-Stage",
    brand:        "Lennox",
    safetyDevice:  false,
    notes:         "Kit de conversión a gas LP (propano) para furnaces Lennox de 2 etapas. Incluye orificios para ambas etapas y ajuste de presión de manifold.",
    troubleshootingNotes: "Verificar presión de gas LP: manifold debe ser 10\" WC. Supply debe ser 11-14\" WC.",
    relatedFaultCodes: {},
  },
  "LP Kit Goodman": {
    name:         "LP Conversion Kit — Goodman",
    brand:        "Goodman",
    safetyDevice:  false,
    notes:         "Kit de conversión a gas LP (propano) para furnaces Goodman. Incluye orificio de gas diferente y ajuste de presión de manifold.",
    troubleshootingNotes: "Verificar presión de gas LP: manifold debe ser 10\" WC. Supply debe ser 11-14\" WC.",
    relatedFaultCodes: {},
  },
  "RDS": {
    name:         "Remote Diagnostic System / DragonFly",
    brand:        "Lennox",
    safetyDevice:  false,
    notes:         "Sistema de diagnóstico remoto Lennox.",
    troubleshootingNotes: "",
    relatedFaultCodes: {},
  },
};

// ─────────────────────────────────────────────
// FAULT CODES — Por board/marca
// ─────────────────────────────────────────────
export const faultCodes = {
  "Trane-WhiteRodgers-S8X1": {
    boardName: "White-Rodgers (Trane S8X1/S8X2)",
    codes: {
      "TP01": { severity: "info",    description: "Modo calefacción activo — blower stage 1" },
      "TP02": { severity: "info",    description: "Modo calefacción activo — blower stage 2" },
      "TP03": { severity: "info",    description: "Modo calefacción activo — blower stage 3" },
      "TP04": { severity: "info",    description: "Modo calefacción activo — blower stage 4" },
      "TP05": { severity: "info",    description: "Modo cooling — blower speed bajo" },
      "TP06": { severity: "info",    description: "Modo cooling — blower speed correcto (NORMAL en startup AC)" },
      "TP07": { severity: "info",    description: "Modo cooling — blower speed alto" },
      "E1":   { severity: "fault",   description: "Rollout switch abierto — sobrecalentamiento en área de quemadores" },
      "E2":   { severity: "fault",   description: "Presostato de tiro inducido — problema de venting o presostato defectuoso" },
      "E3":   { severity: "fault",   description: "Limit switch abierto — temperatura excesiva, airflow restringido" },
      "E4":   { severity: "fault",   description: "Falla de ignición — revisar gas, ignitor, flame sensor" },
      "E5":   { severity: "fault",   description: "Falla de llama — pérdida de llama después de encendido" },
      "E6":   { severity: "critical", description: "Refrigerant leak detected — sensor de fuga del evap coil abierto (A2L safety)" },
      "E7":   { severity: "fault",   description: "Falla del inducer motor" },
      "E8":   { severity: "fault",   description: "Falla del blower motor" },
      "E9":   { severity: "fault",   description: "Comunicación perdida con tstat o zone board" },
      "EE":   { severity: "critical", description: "Falla crítica — requiere reset manual" },
    },
  },
  "Lennox-IFC": {
    boardName: "Lennox Integrated Function Control",
    codes: {
      "2":  { severity: "fault",   description: "Presostato de tiro inducido — stuck open" },
      "3":  { severity: "fault",   description: "Presostato de tiro inducido — stuck closed" },
      "4":  { severity: "fault",   description: "Limit switch abierto — airflow restringido o filtro sucio" },
      "5":  { severity: "fault",   description: "Rollout switch abierto" },
      "6":  { severity: "fault",   description: "Falla de ignición — sin gas o ignitor defectuoso" },
      "7":  { severity: "fault",   description: "Falla de llama" },
      "8":  { severity: "fault",   description: "Falla del inducer" },
      "9":  { severity: "fault",   description: "Falla del blower" },
      "10": { severity: "info",    description: "Modo calor activo (normal)" },
      "11": { severity: "fault",   description: "Voltaje bajo de control" },
    },
  },
  "Goodman-Daikin-IFC": {
    boardName: "Goodman/Daikin Control Board",
    codes: {
      "1f": { severity: "info",    description: "Normal — sin llamada activa" },
      "2f": { severity: "fault",   description: "Presostato de tiro inducido — problema de venting" },
      "3f": { severity: "fault",   description: "Limit switch abierto" },
      "4f": { severity: "fault",   description: "Rollout switch" },
      "5f": { severity: "fault",   description: "Falla de ignición" },
      "6f": { severity: "fault",   description: "Falla de llama — flame sensor contaminado" },
      "7f": { severity: "fault",   description: "Gas valve fault" },
      "8f": { severity: "fault",   description: "Falla de ventilador" },
      "9f": { severity: "fault",   description: "Falla de blower" },
    },
  },
};

// ─────────────────────────────────────────────
// HEATERS (Furnaces + Air Handlers)
// Expande el heaters original con metadata de troubleshooting
// ─────────────────────────────────────────────
export const heaters = {

  // ═══ LENNOX ML180UH SERIES ═══
  ML180UH045E36A: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 0.6,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH045E36A.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML180UH070E36A: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 0.9,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH070E36A.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML180UH070E36B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 0.9,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH070E36B.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML180UH090E48B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 9.9,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH090E48B.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML180UH090E60C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 1.0,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH090E60C.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML180UH110E60C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 1.0,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH110E60C.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML180UH135E60D: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UH", pESP: 9.9,  refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UH/ML180UH135E60D.png",   faultCodeRef: "Lennox-IFC", requiresHarness: false },

  // ═══ LENNOX ML180UHV SERIES (DIP SWITCH) ═══
  ML180UH030V36A: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UHV", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UHV/ML180UH030V36A.png",  faultCodeRef: "Lennox-IFC", requiresHarness: false, hasDipSwitch: true },
  ML180UH045V36A: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UHV", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UHV/ML180UH045V36A.png",  faultCodeRef: "Lennox-IFC", requiresHarness: false, hasDipSwitch: true },
  ML180UH070V36A: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UHV", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UHV/ML180UH070V36A.png",  faultCodeRef: "Lennox-IFC", requiresHarness: false, hasDipSwitch: true },
  ML180UH070V48B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UHV", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UHV/ML180UH070V48B.png",  faultCodeRef: "Lennox-IFC", requiresHarness: false, hasDipSwitch: true },
  ML180UH090V48B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UHV", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UHV/ML180UH090V48B.png",  faultCodeRef: "Lennox-IFC", requiresHarness: false, hasDipSwitch: true },
  ML180UH110V60C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML180UHV", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML180UHV/ML180UH110V60C.png",  faultCodeRef: "Lennox-IFC", requiresHarness: false, hasDipSwitch: true },

  // ═══ LENNOX ML196UH SERIES (HIGH EFFICIENCY) ═══
  ML196UH030XE36B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 0.7, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH030XE36B.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue","Brown"] },
  ML196UH045XE36B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 0.6, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH045XE36B.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue","Brown"] },
  ML196UH070XE36B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 0.7, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH070XE36B.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Blue","Brown"] },
  ML196UH070XE48B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH070XE48B.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue"] },
  ML196UH090XE36C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH090XE36C.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Blue","Brown"] },
  ML196UH090XE48C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 0.7, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH090XE48C.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue","Brown"] },
  ML196UH090XE60C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 1.0, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH090XE60C.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue"] },
  ML196UH110XE60C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 1.0, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH110XE60C.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Yellow","Blue","Brown"] },
  ML196UH135XE60D: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML196UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML196UHE/ML196UH135XE60D.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Yellow","Blue"] },

  // ═══ LENNOX ML296UH SERIES ═══
  ML296UH045XV36B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML296UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML296UHV/ML296UH045XV36B.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML296UH070XV36B: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML296UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML296UHV/ML296UH070XV36B.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML296UH090XV48C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML296UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML296UHV/ML296UH090XV48C.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  ML296UH110XV60C: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "ML296UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/ML296UHV/ML296UH110XV60C.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },

  // ═══ LENNOX EL196UH SERIES ═══
  EL196UH030XE36BK: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "EL196UH", pESP: 0.0, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/EL196UH/EL196UH030XE36BK.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  EL196UH045XE36BK: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "EL196UH", pESP: 0.0, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/EL196UH/EL196UH045XE36BK.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  EL196UH070XE36BK: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "EL196UH", pESP: 0.7, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/EL196UH/EL196UH070XE36BK.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue","Brown"] },
  EL196UH090XE48CK: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "EL196UH", pESP: 0.7, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/EL196UH/EL196UH090XE48CK.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue","Brown"] },
  EL196UH110XE60CK: { hType: UNIT_TYPE.FURNACE, brand: BRAND.LENNOX, series: "EL196UH", pESP: 0.7, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/EL196UH/EL196UH110XE60CK.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, wiringColors: ["Red","Yellow","Blue","Brown"] },

  // ═══ LENNOX CBK45UHET SERIES (Air Handler) ═══
  CBK45UHET024: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBK45UHET", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBK45UHET/CBK45UHET-024.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  CBK45UHET030: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBK45UHET", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBK45UHET/CBK45UHET-030.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  CBK45UHET036: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBK45UHET", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBK45UHET/CBK45UHET-036.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  CBK45UHET042: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBK45UHET", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBK45UHET/CBK45UHET-042.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  CBK45UHET048: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBK45UHET", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBK45UHET/CBK45UHET-048.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },
  CBK45UHET060: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBK45UHET", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBK45UHET/CBK45UHET-060.png", faultCodeRef: "Lennox-IFC", requiresHarness: false },

  // ═══ LENNOX CBA25UH SERIES (Air Handler) ═══
  CBA25UH018: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-018.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },
  CBA25UH024: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-024.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },
  CBA25UH030: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-030.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },
  CBA25UH036: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-036.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },
  CBA25UH042: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-042.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },
  CBA25UH048: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-048.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },
  CBA25UH060: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.LENNOX, series: "CBA25UH", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.LENNOX_IFC, imagen: "images/CBA25UH/CBA25UH-060.png", faultCodeRef: "Lennox-IFC", requiresHarness: false, blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png" },

  // ═══ TRANE S8X1/S8X2 SERIES (R-454B / A2L) ═══
  S8X1A040M3PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 9.9, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1A040M3PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true },
  S8X1B040M2PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 0.9, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1B040M2PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true },
  S8X1B060M4PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 0.8, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1B060M4PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true,
    notes: "Furnace R-454B con sensor de fuga en evap coil y wire harness de seguridad. Circuito: Tstat → Zone Board → Harness → Furnace Board → Condensadora.",
  },
  S8X1B080M4PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 9.9, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1B080M4PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true },
  S8X1C080M5PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 9.9, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1C080M5PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true },
  S8X1C100M5PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 9.9, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1C100M5PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true },
  S8X1D120M5PSC: { hType: UNIT_TYPE.FURNACE, brand: BRAND.TRANE, series: "S8X1", pESP: 9.9, refrigerant: REFRIGERANT.R454B, boardType: BOARD_TYPE.WHITE_RODGERS, imagen: "images/S8*1-2/S8X1D120M5PSC.png", faultCodeRef: "Trane-WhiteRodgers-S8X1", requiresHarness: true, isA2L: true },

  // ═══ GOODMAN GR9S80 SERIES ═══
  GR9S800403AU: { hType: UNIT_TYPE.FURNACE, brand: BRAND.GOODMAN, series: "GR9S80", pESP: 0.0, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/GR9S80/GR9S800403AU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  GR9S800603AU: { hType: UNIT_TYPE.FURNACE, brand: BRAND.GOODMAN, series: "GR9S80", pESP: 0.6, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/GR9S80/GR9S800603AU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  GR9S800604BU: { hType: UNIT_TYPE.FURNACE, brand: BRAND.GOODMAN, series: "GR9S80", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/GR9S80/GR9S800604BU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  GR9S800804BU: { hType: UNIT_TYPE.FURNACE, brand: BRAND.GOODMAN, series: "GR9S80", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/GR9S80/GR9S800804BU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  GR9S800805CU: { hType: UNIT_TYPE.FURNACE, brand: BRAND.GOODMAN, series: "GR9S80", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/GR9S80/GR9S800805CU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },

  // ═══ GOODMAN/DAIKIN AMSTU1300 SERIES (Air Handler) ═══
  AMST24BU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST24BU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST30BU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST30BU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST36BU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST36BU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST36CU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST36CU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST42CU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST42CU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST48CU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST48CU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST48DU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST48DU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  AMST60DU: { hType: UNIT_TYPE.AIR_HANDLER, brand: BRAND.GOODMAN, series: "AMSTU1300", pESP: 9.9, refrigerant: null, boardType: BOARD_TYPE.YORK, imagen: "images/AMSTU1300/AMST60DU.png", faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },

  // ═══ DAIKIN DR96TC/DD96TC SERIES ═══
  DR96TC0403BN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DR96TC0603BN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DR96TC0803BN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DR96TC0804CN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DR96TC1005CN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DR96TC1005DN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DR96TC1205DN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DR96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DD96TC0403BN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DD96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DD96TC0603BN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DD96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DD96TC0804CN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DD96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DD96TC1005CN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DD96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
  DD96TC1205DN: { hType: UNIT_TYPE.FURNACE, brand: BRAND.DAIKIN, series: "DD96TC", pESP: 0.5, refrigerant: null, boardType: BOARD_TYPE.DAIKIN_IFC, faultCodeRef: "Goodman-Daikin-IFC", requiresHarness: false },
};

// ─────────────────────────────────────────────
// CONDENSADORAS / HEAT PUMPS
// ─────────────────────────────────────────────
export const unidadesExteriores = {

  // ═══ LENNOX ML17XC1 (R-410A) ═══
  "ML17XC1-018": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 18000, tons: 1.5, freon: REFRIGERANT.R410A, FactoryCharge: 72,  subcooling: 10, overCharged: null, isA2L: false },
  "ML17XC1-024": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 24000, tons: 2.0, freon: REFRIGERANT.R410A, FactoryCharge: 82,  subcooling: 10, overCharged: null, isA2L: false },
  "ML17XC1-030": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 30000, tons: 2.5, freon: REFRIGERANT.R410A, FactoryCharge: 104, subcooling: 10, overCharged: null, isA2L: false },
  "ML17XC1-036": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 36000, tons: 3.0, freon: REFRIGERANT.R410A, FactoryCharge: 136, subcooling: 10, overCharged: null, isA2L: false },
  "ML17XC1-042": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 42000, tons: 3.5, freon: REFRIGERANT.R410A, FactoryCharge: 146, subcooling: 10, overCharged: null, isA2L: false },
  "ML17XC1-047": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 47000, tons: 3.9, freon: REFRIGERANT.R410A, FactoryCharge: 157, subcooling: 10, overCharged: null, isA2L: false },
  "ML17XC1-059": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17XC1", btu: 59000, tons: 4.9, freon: REFRIGERANT.R410A, FactoryCharge: 190, subcooling: 10, overCharged: null, isA2L: false },
  "ML18XC2-036": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML18XC2", btu: 36000, tons: 3.0, freon: REFRIGERANT.R410A, FactoryCharge: 128, subcooling: 10, overCharged: null, isA2L: false },
  "ML18XC2-048": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML18XC2", btu: 48000, tons: 4.0, freon: REFRIGERANT.R410A, FactoryCharge: 177, subcooling: 10, overCharged: null, isA2L: false },

  // ═══ LENNOX EL17XP1 HEAT PUMP (R-410A) ═══
  "EL17XP1-18": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 18000, tons: 1.5, freon: REFRIGERANT.R410A, FactoryCharge: 92,  subcooling: 10, isA2L: false },
  "EL17XP1-24": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 24000, tons: 2.0, freon: REFRIGERANT.R410A, FactoryCharge: 90,  subcooling: 10, isA2L: false },
  "EL17XP1-30": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 30000, tons: 2.5, freon: REFRIGERANT.R410A, FactoryCharge: 111, subcooling: 10, isA2L: false },
  "EL17XP1-36": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 36000, tons: 3.0, freon: REFRIGERANT.R410A, FactoryCharge: 131, subcooling: 10, isA2L: false },
  "EL17XP1-42": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 42000, tons: 3.5, freon: REFRIGERANT.R410A, FactoryCharge: 156, subcooling: 10, isA2L: false },
  "EL17XP1-48": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 48000, tons: 4.0, freon: REFRIGERANT.R410A, FactoryCharge: 140, subcooling: 10, isA2L: false },
  "EL17XP1-60": { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.LENNOX, series: "EL17XP1", btu: 60000, tons: 5.0, freon: REFRIGERANT.R410A, FactoryCharge: 158, subcooling: 10, isA2L: false },

  // ═══ LENNOX ML14KC1 (R-454B / A2L) ═══
  "ML14KC1-018": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 18000, tons: 1.5, freon: REFRIGERANT.R454B, FactoryCharge: 78,  subcooling: 10, overCharged: 92,  isA2L: true },
  "ML14KC1-024": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 24000, tons: 2.0, freon: REFRIGERANT.R454B, FactoryCharge: 78,  subcooling: 10, overCharged: 87,  isA2L: true },
  "ML14KC1-030": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 30000, tons: 2.5, freon: REFRIGERANT.R454B, FactoryCharge: 90,  subcooling: 10, overCharged: 99,  isA2L: true },
  "ML14KC1-036": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 36000, tons: 3.0, freon: REFRIGERANT.R454B, FactoryCharge: 109, subcooling: 10, overCharged: 118, isA2L: true },
  "ML14KC1-041": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 41000, tons: 3.4, freon: REFRIGERANT.R454B, FactoryCharge: 119, subcooling: 10, overCharged: 128, isA2L: true },
  "ML14KC1-042": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 42000, tons: 3.5, freon: REFRIGERANT.R454B, FactoryCharge: 114, subcooling: 10, overCharged: 123, isA2L: true },
  "ML14KC1-047": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 47000, tons: 3.9, freon: REFRIGERANT.R454B, FactoryCharge: 125, subcooling: 10, overCharged: 134, isA2L: true },
  "ML14KC1-048": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 48000, tons: 4.0, freon: REFRIGERANT.R454B, FactoryCharge: 142, subcooling: 10, overCharged: 151, isA2L: true },
  "ML14KC1-059": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 59000, tons: 4.9, freon: REFRIGERANT.R454B, FactoryCharge: 152, subcooling: 10, overCharged: 161, isA2L: true },
  "ML14KC1-060": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML14KC1", btu: 60000, tons: 5.0, freon: REFRIGERANT.R454B, FactoryCharge: 142, subcooling: 10, overCharged: 151, isA2L: true },

  // ═══ LENNOX ML17KC2 (R-454B / A2L) ═══
  "ML17KC2-024": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17KC2", btu: 24000, tons: 2.0, freon: REFRIGERANT.R454B, FactoryCharge: 100, subcooling: 10, isA2L: true },
  "ML17KC2-036": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17KC2", btu: 36000, tons: 3.0, freon: REFRIGERANT.R454B, FactoryCharge: 104, subcooling: 10, isA2L: true },
  "ML17KC2-048": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17KC2", btu: 48000, tons: 4.0, freon: REFRIGERANT.R454B, FactoryCharge: 126, subcooling: 10, isA2L: true },
  "ML17KC2-060": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.LENNOX, series: "ML17KC2", btu: 60000, tons: 5.0, freon: REFRIGERANT.R454B, FactoryCharge: 149, subcooling: 10, isA2L: true },

  // ═══ TRANE 4TTR (R-410A) ═══
  "4TTR6024N1000AA": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "4TTR6", btu: 24000, tons: 2.0, freon: REFRIGERANT.R410A, FactoryCharge: 148, subcooling: 10, isA2L: false },
  "4TTR5042A1000AA": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "4TTR5", btu: 42000, tons: 3.5, freon: REFRIGERANT.R410A, FactoryCharge: 130, subcooling: 10, isA2L: false },
  "4TTR5048A1000AA": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "4TTR5", btu: 48000, tons: 4.0, freon: REFRIGERANT.R410A, FactoryCharge: 114, subcooling: 10, isA2L: false },
  "4TTR5060A1000AA": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "4TTR5", btu: 60000, tons: 5.0, freon: REFRIGERANT.R410A, FactoryCharge: 152, subcooling: 10, isA2L: false },

  // ═══ TRANE 5TTR (R-454B / A2L) ═══
  "5TTR5018": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 18000, tons: 1.5, freon: REFRIGERANT.R454B, FactoryCharge: 60,  subcooling: 10, overCharged: 0,   isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk6LzAAJ" },
  "5TTR5024": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 24000, tons: 2.0, freon: REFRIGERANT.R454B, FactoryCharge: 58,  subcooling: 10, overCharged: 83,  isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk6LzAAJ" },
  "5TTR5030": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 30000, tons: 2.5, freon: REFRIGERANT.R454B, FactoryCharge: 56,  subcooling: 10, overCharged: 0,   isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk67UAAR" },
  "5TTR5036": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 36000, tons: 3.0, freon: REFRIGERANT.R454B, FactoryCharge: 56,  subcooling: 10, overCharged: 80,  isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk6B1AAJ" },
  "5TTR5042": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 42000, tons: 3.5, freon: REFRIGERANT.R454B, FactoryCharge: 81,  subcooling: 10, overCharged: 0,   isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk5ySAAR" },
  "5TTR5048": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 48000, tons: 4.0, freon: REFRIGERANT.R454B, FactoryCharge: 106, subcooling: 10, overCharged: 130, isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk6PiAAJ" },
  "5TTR5060": { uType: UNIT_TYPE.CONDENSER, brand: BRAND.TRANE, series: "5TTR5", btu: 60000, tons: 5.0, freon: REFRIGERANT.R454B, FactoryCharge: 95,  subcooling: 10, overCharged: 119, isA2L: true, productLink: "https://www.tranesupply.com/psearch/product/01t4w00000Nk5n6AAB" },

  // ═══ GOODMAN/DAIKIN GLXS4BA (R-32) ═══
  GLXS4BA1810AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 18000, tons: 1.5, freon: REFRIGERANT.R32, FactoryCharge: 53,  subcooling: 8, isA2L: true },
  GLXS4BA2410AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 24000, tons: 2.0, freon: REFRIGERANT.R32, FactoryCharge: 53,  subcooling: 8, isA2L: true },
  GLXS4BA3010AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 30000, tons: 2.5, freon: REFRIGERANT.R32, FactoryCharge: 63,  subcooling: 8, isA2L: true },
  GLXS4BA3610AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 36000, tons: 3.0, freon: REFRIGERANT.R32, FactoryCharge: 69,  subcooling: 8, isA2L: true },
  GLXS4BA4210AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 42000, tons: 3.5, freon: REFRIGERANT.R32, FactoryCharge: 83,  subcooling: 8, isA2L: true },
  GLXS4BA4810AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 48000, tons: 4.0, freon: REFRIGERANT.R32, FactoryCharge: 91,  subcooling: 8, isA2L: true },
  GLXS4BA6010AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS4BA", btu: 60000, tons: 5.0, freon: REFRIGERANT.R32, FactoryCharge: 94,  subcooling: 8, isA2L: true },

  // ═══ GOODMAN/DAIKIN GLXS5BA (R-32) ═══
  GLXS5BA1810AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 18000, tons: 1.5, freon: REFRIGERANT.R32, FactoryCharge: 54,  subcooling: 8, isA2L: true },
  GLXS5BA2410AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 24000, tons: 2.0, freon: REFRIGERANT.R32, FactoryCharge: 65,  subcooling: 8, isA2L: true },
  GLXS5BA3010AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 30000, tons: 2.5, freon: REFRIGERANT.R32, FactoryCharge: 87,  subcooling: 8, isA2L: true },
  GLXS5BA3610AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 36000, tons: 3.0, freon: REFRIGERANT.R32, FactoryCharge: 88,  subcooling: 8, isA2L: true },
  GLXS5BA4210AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 42000, tons: 3.5, freon: REFRIGERANT.R32, FactoryCharge: 141, subcooling: 8, isA2L: true },
  GLXS5BA4810AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 48000, tons: 4.0, freon: REFRIGERANT.R32, FactoryCharge: 138, subcooling: 8, isA2L: true },
  GLXS5BA6010AA: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "GLXS5BA", btu: 60000, tons: 5.0, freon: REFRIGERANT.R32, FactoryCharge: 167, subcooling: 8, isA2L: true },

  // ═══ GOODMAN/DAIKIN GLZS4BA HEAT PUMP (R-32) ═══
  GLZS4BA1810AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 18000, tons: 1.5, freon: REFRIGERANT.R32, FactoryCharge: 70,  subcooling: 8, isA2L: true },
  GLZS4BA2410AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 24000, tons: 2.0, freon: REFRIGERANT.R32, FactoryCharge: 70,  subcooling: 8, isA2L: true },
  GLZS4BA3010AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 30000, tons: 2.5, freon: REFRIGERANT.R32, FactoryCharge: 81,  subcooling: 8, isA2L: true },
  GLZS4BA3610AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 36000, tons: 3.0, freon: REFRIGERANT.R32, FactoryCharge: 83,  subcooling: 8, isA2L: true },
  GLZS4BA4210AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 42000, tons: 3.5, freon: REFRIGERANT.R32, FactoryCharge: 139, subcooling: 8, isA2L: true },
  GLZS4BA4810AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 48000, tons: 4.0, freon: REFRIGERANT.R32, FactoryCharge: 174, subcooling: 8, isA2L: true },
  GLZS4BA6010AA: { uType: UNIT_TYPE.HEAT_PUMP, brand: BRAND.DAIKIN, series: "GLZS4BA", btu: 60000, tons: 5.0, freon: REFRIGERANT.R32, FactoryCharge: 194, subcooling: 8, isA2L: true },

  // ═══ DAIKIN DC6VSS (R-32) ═══
  DC6VSS2410: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "DC6VSS", btu: 24000, tons: 2.0, freon: REFRIGERANT.R32, FactoryCharge: 74,  subcooling: 8, isA2L: true },
  DC6VSS3010: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "DC6VSS", btu: 30000, tons: 2.5, freon: REFRIGERANT.R32, FactoryCharge: 76,  subcooling: 8, isA2L: true },
  DC6VSS3610: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "DC6VSS", btu: 36000, tons: 3.0, freon: REFRIGERANT.R32, FactoryCharge: 83,  subcooling: 8, isA2L: true },
  DC6VSS4210: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "DC6VSS", btu: 42000, tons: 3.5, freon: REFRIGERANT.R32, FactoryCharge: 100, subcooling: 8, isA2L: true },
  DC6VSS4810: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "DC6VSS", btu: 48000, tons: 4.0, freon: REFRIGERANT.R32, FactoryCharge: 999, subcooling: 8, isA2L: true },
  DC6VSS6010: { uType: UNIT_TYPE.CONDENSER, brand: BRAND.DAIKIN, series: "DC6VSS", btu: 60000, tons: 5.0, freon: REFRIGERANT.R32, FactoryCharge: 999, subcooling: 8, isA2L: true },
};

// ─────────────────────────────────────────────
// Asignar subcooling predeterminado si no existe (backward compat)
// ─────────────────────────────────────────────
for (const key in unidadesExteriores) {
  if (!unidadesExteriores[key].subcooling) {
    unidadesExteriores[key].subcooling = key.startsWith("GL") ? 8 : 10;
  }
  if (unidadesExteriores[key].isA2L === undefined) {
    unidadesExteriores[key].isA2L = isA2L(unidadesExteriores[key].freon || "");
  }
}

// ─────────────────────────────────────────────
// SERVICE MANUAL LINKS (sin cambios)
// ─────────────────────────────────────────────
export const seriesLinks = {
  "ML180UH SERIES":              { serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/507103-04-000", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  "ML180UHV SERIES(DIP SWITCH)": { serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/CORP1909-01-000", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  "ML196UH SERIES(HIGH EFFICIENCY)": { serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/507966-04-000", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  "EL196UH SERIES":              { serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/100159-01-000", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  "CBK45UHET SERIES":            { serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/100110-01-000", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  "CBA25UH SERIES":              { serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/CORP1705-L7-01-000", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library", blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png", blowerSpeedText: "Blower Speed Change" },
  "S8X1/S8X2-S8B1":             { serviceManual: "https://elibrary.tranetechnologies.com/public/residential-hvac/Literature/Installation%20Operation%20and%20Maintenance/S8XB-SVX001-1D-EN_08092024.pdf", trane: "https://www.tranetechnologies.com/", linkText: "Visit Trane Technologies" },
  "GR9S80 SERIES":               { serviceManual: "https://www.goodmanmfg.com/pdfviewer.aspx?pdfurl=docs/librariesprovider6/default-document-library/ss-gr9s80-u-r32.pdf?view=true", goodman: "https://www.goodmanmfg.com/", linkText: "Visit Goodman" },
  "AMSTU1300 SERIES":            { serviceManual: "https://daikincomfort.com/docs/default-source/amst/im-io-4011a.pdf", goodman: "https://www.goodmanmfg.com/", linkText: "Visit Goodman" },
  "DR96TC/DD96TC SERIES":        { serviceManual: "https://daikincomfort.com/", daikin: "https://daikincomfort.com/", linkText: "Visit Daikin Comfort" },
};

export const outdoorUnitLinks = {
  ML17XC1: { serviceManual: "https://www.lennoxpros.com/documentlibrary", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  EL17XP1: { serviceManual: "https://www.lennoxpros.com/documentlibrary", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  ML14KC1: { serviceManual: "https://www.lennoxpros.com/documentlibrary", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  ML17KC2: { serviceManual: "https://www.lennoxpros.com/documentlibrary", lennoxPros: "https://www.lennoxpros.com/documentlibrary", linkText: "Visit LennoxPros Document Library" },
  "4TTR":  { serviceManual: "https://elibrary.tranetechnologies.com/", trane: "https://www.tranetechnologies.com/", traneSupply: "https://www.tranesupply.com/s/?language=en_US", linkText: "Visit Trane Technologies", supplyLinkText: "Visit Trane Supply" },
  "5TTR":  { installManual: "https://www.trane.com/WEBCACHE/18-AC129D1-1C-EN_10172024.PDF", trane: "https://www.tranetechnologies.com/", traneSupply: "https://www.tranesupply.com/s/?language=en_US", linkText: "Visit Trane Technologies", supplyLinkText: "Visit Trane Supply" },
  GLXS4BA: { serviceManual: "https://www.goodmanmfg.com/support/literature-library", goodman: "https://www.goodmanmfg.com/", linkText: "Visit Goodman Manufacturing" },
  GLZS4BA: { serviceManual: "https://www.goodmanmfg.com/support/literature-library", goodman: "https://www.goodmanmfg.com/", linkText: "Visit Goodman Manufacturing" },
  DC6VSS:  { serviceManual: "https://daikincomfort.com/", daikin: "https://daikincomfort.com/", linkText: "Visit Daikin Comfort" },
};

// ─────────────────────────────────────────────
// FUNCIÓN CLAVE: buildJobContext
// Genera el contexto completo del job para Claude API
// ─────────────────────────────────────────────
export function buildJobContext(state) {
  const furnaceData   = heaters[state.heaterModel]   || null;
  const condenserData = unidadesExteriores[state.outdoorModel] || null;
  const tstatData     = thermostats[state.selectedThermostat?.name] || null;

  // Detectar zoning board y accesorios de seguridad
  const zoningAcc    = state.selectedAccessories?.find(a => ["HZ322","UT3000","HZ432","DAPC"].includes(a.name));
  const harnessAcc   = state.selectedAccessories?.find(a => ["Trane Harness","Ecoil Wire"].includes(a.name));
  const floatSwitch  = state.selectedAccessories?.find(a => a.name === "Float Switch");
  const zoningData   = zoningAcc ? zoningBoards[zoningAcc.name] : null;
  const harnessData  = harnessAcc ? accessories[harnessAcc.name] : null;

  const refrigerant  = condenserData?.freon || furnaceData?.refrigerant || "Unknown";
  const isA2LSystem  = condenserData?.isA2L || furnaceData?.isA2L || false;
  const faultRef     = furnaceData?.faultCodeRef ? faultCodes[furnaceData.faultCodeRef] : null;

  return {
    // ── Identificación del job ──
    address:      state.address,
    subdivision:  state.subdivision,
    builder:      state.builder,
    isTwoSystems: state.isTwoSystems,

    // ── Sistema 1 ──
    system1: {
      furnace: furnaceData ? {
        model:          state.heaterModel,
        brand:          furnaceData.brand,
        series:         furnaceData.series,
        type:           furnaceData.hType,
        pESP:           furnaceData.pESP,
        boardType:      furnaceData.boardType,
        requiresHarness:furnaceData.requiresHarness,
        isA2L:          furnaceData.isA2L || false,
        faultCodes:     faultRef?.codes || {},
        notes:          furnaceData.notes || "",
      } : { model: state.heaterModel, brand: detectBrand(state.heaterModel) },

      condenser: condenserData ? {
        model:          state.outdoorModel,
        brand:          condenserData.brand,
        series:         condenserData.series,
        type:           condenserData.uType,
        btu:            condenserData.btu,
        tons:           condenserData.tons,
        refrigerant:    condenserData.freon,
        factoryCharge:  condenserData.FactoryCharge,
        subcoolingGoal: condenserData.subcooling,
        overCharged:    condenserData.overCharged,
        isA2L:          condenserData.isA2L,
      } : { model: state.outdoorModel, brand: detectBrand(state.outdoorModel) },

      refrigerant,
      isA2LSystem,
    },

    // ── Sistema 2 (si aplica) ──
    system2: state.isTwoSystems ? {
      furnace:   { model: state.heaterModel2,  brand: detectBrand(state.heaterModel2) },
      condenser: { model: state.outdoorModel2, brand: detectBrand(state.outdoorModel2) },
    } : null,

    // ── Controles ──
    thermostat: tstatData ? {
      model:         state.selectedThermostat?.name,
      brand:         tstatData.brand,
      heatPumpReady: tstatData.heatPumpReady,
      zoningReady:   tstatData.zoningReady,
      notes:         tstatData.notes,
      troubleshootingNotes: tstatData.troubleshootingNotes,
    } : { model: state.selectedThermostat?.name },

    // ── Zoning ──
    zoning: zoningData ? {
      model:       zoningAcc.name,
      brand:       zoningData.brand,
      zones:       zoningData.zones,
      terminalMap: zoningData.terminalMap,
      troubleshootingNotes: zoningData.troubleshootingNotes,
    } : null,

    // ── Safety devices ──
    safetyDevices: {
      wireHarness:  harnessData ? { model: harnessAcc.name, circuitPath: harnessData.circuitPath, troubleshootingNotes: harnessData.troubleshootingNotes } : null,
      floatSwitch:  floatSwitch ? { installed: true, troubleshootingNotes: accessories["Float Switch"].troubleshootingNotes } : null,
    },

    // ── Weight-in data (si hay) ──
    weightInData: state.weightInData,
  };
}

// ─────────────────────────────────────────────
// FUNCIÓN: buildClaudePrompt
// Genera el system prompt para Claude API con todo el contexto del job
// ─────────────────────────────────────────────
export function buildClaudePrompt(jobContext) {
  const s1 = jobContext.system1;
  const a2lWarning = s1.isA2LSystem
    ? `\n⚠️ SISTEMA A2L (${s1.refrigerant}): Refrigerante levemente inflamable. NO hacer bypass del leak sensor en espacios habitados.`
    : "";

  const zoningSection = jobContext.zoning
    ? `\nZONING: ${jobContext.zoning.model} (${jobContext.zoning.brand}) — ${jobContext.zoning.zones || "N/A"} zonas\nCircuito de control: ${jobContext.thermostat?.model || "Tstat"} → ${jobContext.zoning.model} → ${jobContext.safetyDevices?.wireHarness?.model || "Furnace Board"} → Condensadora`
    : "";

  const harnessSection = jobContext.safetyDevices?.wireHarness
    ? `\nWIRE HARNESS: ${jobContext.safetyDevices.wireHarness.model} instalado. ${jobContext.safetyDevices.wireHarness.troubleshootingNotes}`
    : "";

  const faultCodesSection = s1.furnace?.faultCodes && Object.keys(s1.furnace.faultCodes).length
    ? `\nFAULT CODES DEL BOARD (${s1.furnace.boardType}):\n` +
      Object.entries(s1.furnace.faultCodes).map(([code, info]) => `  ${code}: ${info.description}`).join("\n")
    : "";

  return `Eres un asistente técnico experto en HVAC residencial de nueva construcción. El técnico está en campo. Responde en español, de forma directa y paso a paso. Una pregunta o instrucción a la vez. Máximo 3-4 líneas por respuesta. Usa terminología técnica precisa.

═══ EQUIPO DEL JOB ═══
DIRECCIÓN: ${jobContext.address || "N/A"}
BUILDER: ${jobContext.builder || "N/A"} | SUBDIVISION: ${jobContext.subdivision || "N/A"}

SISTEMA INDOOR:
• Modelo: ${s1.furnace?.model || "N/A"}
• Marca: ${s1.furnace?.brand || "N/A"} | Series: ${s1.furnace?.series || "N/A"}
• Tipo: ${s1.furnace?.type || "N/A"} | Board: ${s1.furnace?.boardType || "N/A"}
• Wire Harness requerido: ${s1.furnace?.requiresHarness ? "SÍ" : "NO"}

SISTEMA OUTDOOR:
• Modelo: ${s1.condenser?.model || "N/A"}
• Marca: ${s1.condenser?.brand || "N/A"} | Tipo: ${s1.condenser?.type || "N/A"}
• Tonelaje: ${s1.condenser?.tons || "N/A"} ton | BTU: ${s1.condenser?.btu || "N/A"}
• Refrigerante: ${s1.refrigerant} | Factory Charge: ${s1.condenser?.factoryCharge || "N/A"} oz
• Subcooling goal: ${s1.condenser?.subcoolingGoal || "N/A"}°F${a2lWarning}

TERMOSTATO: ${jobContext.thermostat?.model || "N/A"} (${jobContext.thermostat?.brand || "N/A"})${zoningSection}${harnessSection}${faultCodesSection}

${s1.furnace?.notes ? `NOTAS DEL EQUIPO: ${s1.furnace.notes}` : ""}

El técnico describe el síntoma. Guía el diagnóstico paso a paso comenzando por lo más básico.`;
}

// ─────────────────────────────────────────────
// UTILITY: ouncesToPoundsAndOunces (backward compat)
// ─────────────────────────────────────────────
export function ouncesToPoundsAndOunces(ounces) {
  const pounds = Math.floor(ounces / 16);
  const remainingOunces = (ounces % 16).toFixed(2);
  return pounds > 0 ? `${pounds} lb ${remainingOunces} oz` : `${remainingOunces} oz`;
}
