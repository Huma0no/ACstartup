// src/data.js — Static data and constants. No logic, no functions.
// Source of truth: docs/data_dictionary.md v1.0

// ---------------------------------------------------------------------------
// STORAGE KEYS
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  STATE:      "completionState",
  REPORTS:    "completionReports",
  JOBS:       "jobsArray",
  ACTIVE_JOB: "lastActiveJobAddress",
  APP_THEME:  "app-theme",
  TECH_NAME:  "dashboard_tech_name",
  SETTINGS:   "appSettings",
};

// ---------------------------------------------------------------------------
// SERVICES
// ---------------------------------------------------------------------------

export const SERVICES = {
  AC:         "AC",
  HEAT:       "Heat",
  AC_HEAT:    "AC & Heat",  // AC + Heat selected together — priced as one ($30, not $60)
  PRESTART:   "Prestart",
  FINISH:     "Finish",
  DRIVE_RUN:  "Drive Run",
  CANCEL:     "Cancel",
};

// Services mutually exclusive with AC and Heat
export const STANDALONE_SERVICES = [
  SERVICES.PRESTART,
  SERVICES.DRIVE_RUN,
  SERVICES.CANCEL,
];

// ---------------------------------------------------------------------------
// ACCESSORIES
// ---------------------------------------------------------------------------

export const ACCESSORIES = {
  FIN180P:           "FIN180P",
  FIN6_MD:           "FIN6-MD",
  FLOAT_SWITCH:      "Float Switch",
  DEHUM:             "Dehum",
  FA_INTAKE:         "F/A",
  HARMONY:           "Harmony",
  HZ322:             "HZ322",
  UT3000:            "UT3000",
  BYPASS:            "Bypass",
  E_BYPASS:          "eBypass",
  DAPC:              "DAPC",
  APRIL_AIR:         "AprilAir",
  RDS:               "RDS",
  TRANE_HARNESS:     "Trane Harness",
  ECOIL_WIRE:        "Ecoil Wire",
  LP_KIT_LENNOX_1STG:"LP Kit Lennox 1stg",
  LP_KIT_LENNOX_2STG:"LP Kit Lennox 2stg",
  LP_KIT_GOODMAN:    "LP Kit Goodman",
  WEIGHT_IN_DATA:    "Weight-In-Data",
  OUT_OF_TOWN:       "Out of town fee",
  OTRO:              "Other",
};

// Accessories whose price doubles when isTwoSystems = true
export const TWO_SYSTEMS_ACCESSORIES = [
  ACCESSORIES.FLOAT_SWITCH,
  ACCESSORIES.RDS,
  ACCESSORIES.TRANE_HARNESS,
  ACCESSORIES.ECOIL_WIRE,
  ACCESSORIES.LP_KIT_LENNOX_1STG,
  ACCESSORIES.LP_KIT_LENNOX_2STG,
  ACCESSORIES.LP_KIT_GOODMAN,
  ACCESSORIES.WEIGHT_IN_DATA,
];

// Accessories that auto-activate when their trigger is selected (and auto-deactivate when trigger is removed)
export const ACCESSORY_COMPANIONS = {
  [ACCESSORIES.HZ322]:  [ACCESSORIES.BYPASS],
  [ACCESSORIES.UT3000]: [ACCESSORIES.DAPC, ACCESSORIES.E_BYPASS, ACCESSORIES.ECOIL_WIRE],
};

// Zone boards are mutually exclusive — activating one deselects the others and their companions
export const ZONE_BOARDS = [
  ACCESSORIES.HZ322,
  ACCESSORIES.HARMONY,
  ACCESSORIES.UT3000,
];

// Accessories with free-form price (no default, user enters amount)
export const CUSTOM_PRICE_ACCESSORIES = [
  ACCESSORIES.OUT_OF_TOWN,
  ACCESSORIES.OTRO,
];

// ---------------------------------------------------------------------------
// FIXES
// ---------------------------------------------------------------------------

export const FIXES = {
  PRESSURE_TEST: "Pressure Test",
  OPEN_ECOIL:    "Open Ecoil",
  WIRES_JAMMED:  "Wires Jammed",
  STUCK_BLOWER:  "Stuck Blower",
  CUT_SHEETROCK: "Cut Sheetrock",
  EXTENDED_WIRE:         "Extended Wire",
  EXTENDED_WIRE_FURNACE: "Extended Wire(Furnace)",
  EXTENDED_WIRE_CUNIT:   "Extended Wire(Cunit)",
  PVC_WORK:              "PVC Work",
  LEAKS_ECOIL:   "Leaks Ecoil",
  LEAKS_CUNIT:   "Leaks Cunit",
  LEAKS_WALL:    "Leaks Wall",
  OTRO:          "Other",
};

// Fix with free-form price
export const CUSTOM_PRICE_FIXES = [FIXES.OTRO];

// ---------------------------------------------------------------------------
// THERMOSTATS
// ---------------------------------------------------------------------------

export const THERMOSTATS = ["T-6", "T-10", "Ecobee", "Daikin One", "TH2110"];

// ---------------------------------------------------------------------------
// BUILDERS
// ---------------------------------------------------------------------------

export const BUILDERS = [
  "Lennar",
  "MHI",
  "Highland",
  "CastleRock",
  "First America",
  "Chesmar",
];

// ---------------------------------------------------------------------------
// REFRIGERANTS
// R-410A excluded — out of use. Add as hidden legacy option if needed.
// ---------------------------------------------------------------------------

export const REFRIGERANTS = ["R-454B", "R-32"];

// ---------------------------------------------------------------------------
// DEFAULT PRICES
// All prices in USD. Overridable by user via Settings.
// ---------------------------------------------------------------------------

export const DEFAULT_PRICES = {
  SERVICE: {
    [SERVICES.AC]:        30,
    [SERVICES.HEAT]:      30,
    [SERVICES.AC_HEAT]:   30,  // combined, not 30+30
    [SERVICES.PRESTART]:  20,
    [SERVICES.FINISH]:    20,
    [SERVICES.DRIVE_RUN]: 10,
    [SERVICES.CANCEL]:     0,
  },

  ACCESSORY: {
    [ACCESSORIES.FIN180P]:            10,
    [ACCESSORIES.FIN6_MD]:            10,
    [ACCESSORIES.FLOAT_SWITCH]:        5,
    [ACCESSORIES.DEHUM]:              10,
    [ACCESSORIES.FA_INTAKE]:          10,
    [ACCESSORIES.HARMONY]:            40,
    [ACCESSORIES.HZ322]:              30,
    [ACCESSORIES.UT3000]:             30,
    [ACCESSORIES.BYPASS]:              5,
    [ACCESSORIES.E_BYPASS]:           10,
    [ACCESSORIES.DAPC]:               10,
    [ACCESSORIES.APRIL_AIR]:          10,
    [ACCESSORIES.RDS]:                10,
    [ACCESSORIES.TRANE_HARNESS]:      10,
    [ACCESSORIES.ECOIL_WIRE]:         10,
    [ACCESSORIES.LP_KIT_LENNOX_1STG]: 20,
    [ACCESSORIES.LP_KIT_LENNOX_2STG]: 20,
    [ACCESSORIES.LP_KIT_GOODMAN]:     20,
    [ACCESSORIES.WEIGHT_IN_DATA]:     10,
  },

  // Weight-In addon: added to WEIGHT_IN_DATA price when Finish is also selected
  WEIGHT_IN_FINISH_ADDON: 10,

  FIX: {
    [FIXES.PRESSURE_TEST]:  10,
    [FIXES.OPEN_ECOIL]:     30,
    [FIXES.WIRES_JAMMED]:    5,
    [FIXES.STUCK_BLOWER]:   20,
    [FIXES.CUT_SHEETROCK]:  15,
    [FIXES.EXTENDED_WIRE]:         5,
    [FIXES.EXTENDED_WIRE_FURNACE]: 5,
    [FIXES.EXTENDED_WIRE_CUNIT]:   5,
    [FIXES.PVC_WORK]:             15,
    [FIXES.LEAKS_ECOIL]:    20,
    [FIXES.LEAKS_CUNIT]:    20,
    [FIXES.LEAKS_WALL]:     50,
  },
};

// ---------------------------------------------------------------------------
// DISPLAY NAMES
// Maps internal keys to the exact strings that appear in the report text.
// ---------------------------------------------------------------------------

export const ACCESSORY_DISPLAY = {
  [ACCESSORIES.FIN180P]:            "fin180p",
  [ACCESSORIES.FIN6_MD]:            "fin6-md",
  [ACCESSORIES.FLOAT_SWITCH]:       "float switch",
  [ACCESSORIES.DEHUM]:              "dehum wired",
  [ACCESSORIES.FA_INTAKE]:          "f/a intake wired",
  [ACCESSORIES.HARMONY]:            "Harmony Zone",
  [ACCESSORIES.HZ322]:              "hz322",
  [ACCESSORIES.UT3000]:             "ut3000",
  [ACCESSORIES.BYPASS]:             "bypass damper",
  [ACCESSORIES.E_BYPASS]:           "ebypass damper",
  [ACCESSORIES.DAPC]:               "dapc",
  [ACCESSORIES.APRIL_AIR]:          "aprilaire",
  [ACCESSORIES.RDS]:                "rds",
  [ACCESSORIES.TRANE_HARNESS]:      "trane harness wired",
  [ACCESSORIES.ECOIL_WIRE]:         "ecoil wire harness wired",
  [ACCESSORIES.LP_KIT_LENNOX_1STG]: "lp kit lennox 1stg",
  [ACCESSORIES.LP_KIT_LENNOX_2STG]: "lp kit lennox 2stg",
  [ACCESSORIES.LP_KIT_GOODMAN]:     "lp kit goodman",
  [ACCESSORIES.WEIGHT_IN_DATA]:     "weigh-in data",
  [ACCESSORIES.OUT_OF_TOWN]:        "out of town fee",
};

export const FIX_DISPLAY = {
  [FIXES.PRESSURE_TEST]:  "pressure test",
  [FIXES.OPEN_ECOIL]:     "opened ecoil to pull out sensor wire",
  [FIXES.WIRES_JAMMED]:   "wires jammed",
  [FIXES.STUCK_BLOWER]:   "stuck blower",
  [FIXES.CUT_SHEETROCK]:  "cut sheetrock",
  [FIXES.EXTENDED_WIRE]:         "extended wire",
  [FIXES.EXTENDED_WIRE_FURNACE]: "Extended Wire(Furnace)",
  [FIXES.EXTENDED_WIRE_CUNIT]:   "Extended Wire(Cunit)",
  [FIXES.PVC_WORK]:              "pvc work",
  [FIXES.LEAKS_ECOIL]:           "Freon Leaks(eCoil)",
  [FIXES.LEAKS_CUNIT]:           "Freon Leaks(Cunit)",
  [FIXES.LEAKS_WALL]:            "Freon Leaks(Inside Wall)",
};

// ---------------------------------------------------------------------------
// INDOOR CATALOG
// hType: "Furnace" | "AirHandler"
// pESP: possible ESP — reference value from previous field readings. 9.9 = no data available.
// imagen: path to equipment image asset.
// wiringColors excluded — UI-only concern, not field data.
// ---------------------------------------------------------------------------

export const INDOOR_CATALOG = {
  // --- Lennox ML180UH ---
  ML180UH045E36A: { hType: "Furnace",     pESP: 0.6, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH045E36A.png" },
  ML180UH070E36A: { hType: "Furnace",     pESP: 0.9, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH070E36A.png" },
  ML180UH070E36B: { hType: "Furnace",     pESP: 0.9, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH070E36B.png" },
  ML180UH090E48B: { hType: "Furnace",     pESP: 9.9, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH090E48B.png" },
  ML180UH090E60C: { hType: "Furnace",     pESP: 1.0, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH090E60C.png" },
  ML180UH110E60C: { hType: "Furnace",     pESP: 1.0, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH110E60C.png" },
  ML180UH135E60D: { hType: "Furnace",     pESP: 9.9, series: "ML180UH SERIES",              imagen: "images/ML180UH/ML180UH135E60D.png" },

  // --- Lennox ML180UHV (dip switch) ---
  ML180UH030V36A: { hType: "Furnace",     pESP: 9.9, series: "ML180UHV SERIES(DIP SWITCH)", imagen: "images/ML180UHV/ML180UH030V36A.png" },
  ML180UH045V36A: { hType: "Furnace",     pESP: 9.9, series: "ML180UHV SERIES(DIP SWITCH)", imagen: "images/ML180UHV/ML180UH045V36A.png" },
  ML180UH070V36A: { hType: "Furnace",     pESP: 9.9, series: "ML180UHV SERIES(DIP SWITCH)", imagen: "images/ML180UHV/ML180UH070V36A.png" },
  ML180UH070V48B: { hType: "Furnace",     pESP: 9.9, series: "ML180UHV SERIES(DIP SWITCH)", imagen: "images/ML180UHV/ML180UH070V48B.png" },
  ML180UH090V48B: { hType: "Furnace",     pESP: 9.9, series: "ML180UHV SERIES(DIP SWITCH)", imagen: "images/ML180UHV/ML180UH090V48B.png" },
  ML180UH110V60C: { hType: "Furnace",     pESP: 9.9, series: "ML180UHV SERIES(DIP SWITCH)", imagen: "images/ML180UHV/ML180UH110V60C.png" },

  // --- Lennox ML196UH (high efficiency) ---
  ML196UH030XE36B: { hType: "Furnace",    pESP: 0.7, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH030XE36B.png" },
  ML196UH045XE36B: { hType: "Furnace",    pESP: 0.6, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH045XE36B.png" },
  ML196UH070XE36B: { hType: "Furnace",    pESP: 0.7, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH070XE36B.png" },
  ML196UH070XE48B: { hType: "Furnace",    pESP: 9.9, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH070XE48B.png" },
  ML196UH090XE36C: { hType: "Furnace",    pESP: 9.9, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH090XE36C.png" },
  ML196UH090XE48C: { hType: "Furnace",    pESP: 0.7, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH090XE48C.png" },
  ML196UH090XE60C: { hType: "Furnace",    pESP: 1.0, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH090XE60C.png" },
  ML196UH110XE60C: { hType: "Furnace",    pESP: 1.0, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH110XE60C.png" },
  ML196UH135XE60D: { hType: "Furnace",    pESP: 9.9, series: "ML196UH SERIES(HIGH EFFICIENCY)", imagen: "images/ML196UHE/ML196UH135XE60D.png" },

  // --- Lennox ML296UH ---
  ML296UH045XV36B: { hType: "Furnace",    pESP: 9.9, series: "ML296UH SERIES",              imagen: "images/ML296UHV/ML296UH045XV36B.png" },
  ML296UH070XV36B: { hType: "Furnace",    pESP: 9.9, series: "ML296UH SERIES",              imagen: "images/ML296UHV/ML296UH070XV36B.png" },
  ML296UH090XV48C: { hType: "Furnace",    pESP: 9.9, series: "ML296UH SERIES",              imagen: "images/ML296UHV/ML296UH090XV48C.png" },
  ML296UH110XV60C: { hType: "Furnace",    pESP: 9.9, series: "ML296UH SERIES",              imagen: "images/ML296UHV/ML296UH110XV60C.png" },

  // --- Lennox EL196UH ---
  EL196UH030XE36BK: { hType: "Furnace",  pESP: 0.0, series: "EL196UH SERIES",              imagen: "images/EL196UH/EL196UH030XE36BK.png" },
  EL196UH045XE36BK: { hType: "Furnace",  pESP: 0.0, series: "EL196UH SERIES",              imagen: "images/EL196UH/EL196UH045XE36BK.png" },
  EL196UH070XE36BK: { hType: "Furnace",  pESP: 0.7, series: "EL196UH SERIES",              imagen: "images/EL196UH/EL196UH070XE36BK.png" },
  EL196UH090XE48CK: { hType: "Furnace",  pESP: 0.7, series: "EL196UH SERIES",              imagen: "images/EL196UH/EL196UH090XE48CK.png" },
  EL196UH110XE60CK: { hType: "Furnace",  pESP: 0.7, series: "EL196UH SERIES",              imagen: "images/EL196UH/EL196UH110XE60CK.png" },

  // --- Lennox CBK45UHET (air handler) ---
  CBK45UHET024: { hType: "AirHandler",   pESP: 9.9, series: "CBK45UHET SERIES",             imagen: "images/CBK45UHET/CBK45UHET-024.png" },
  CBK45UHET030: { hType: "AirHandler",   pESP: 9.9, series: "CBK45UHET SERIES",             imagen: "images/CBK45UHET/CBK45UHET-030.png" },
  CBK45UHET036: { hType: "AirHandler",   pESP: 9.9, series: "CBK45UHET SERIES",             imagen: "images/CBK45UHET/CBK45UHET-036.png" },
  CBK45UHET042: { hType: "AirHandler",   pESP: 9.9, series: "CBK45UHET SERIES",             imagen: "images/CBK45UHET/CBK45UHET-042.png" },
  CBK45UHET048: { hType: "AirHandler",   pESP: 9.9, series: "CBK45UHET SERIES",             imagen: "images/CBK45UHET/CBK45UHET-048.png" },
  CBK45UHET060: { hType: "AirHandler",   pESP: 9.9, series: "CBK45UHET SERIES",             imagen: "images/CBK45UHET/CBK45UHET-060.png" },

  // --- Lennox CBA25UH (air handler) ---
  CBA25UH018: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-018.png" },
  CBA25UH024: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-024.png" },
  CBA25UH030: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-030.png" },
  CBA25UH036: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-036.png" },
  CBA25UH042: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-042.png" },
  CBA25UH048: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-048.png" },
  CBA25UH060: { hType: "AirHandler",     pESP: 9.9, series: "CBA25UH SERIES",               imagen: "images/CBA25UH/CBA25UH-060.png" },

  // --- Trane S8X1/S8X2 ---
  S8X1A040M3PSC: { hType: "Furnace",     pESP: 9.9, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1A040M3PSC.png" },
  S8X1B040M2PSC: { hType: "Furnace",     pESP: 0.9, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1B040M2PSC.png" },
  S8X1B060M4PSC: { hType: "Furnace",     pESP: 0.8, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1B060M4PSC.png" },
  S8X1B080M4PSC: { hType: "Furnace",     pESP: 9.9, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1B080M4PSC.png" },
  S8X1C080M5PSC: { hType: "Furnace",     pESP: 9.9, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1C080M5PSC.png" },
  S8X1C100M5PSC: { hType: "Furnace",     pESP: 9.9, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1C100M5PSC.png" },
  S8X1D120M5PSC: { hType: "Furnace",     pESP: 9.9, series: "S8X1/S8X2-S8B1",              imagen: "images/S8*1-2/S8X1D120M5PSC.png" },

  // --- Goodman GR9S80 ---
  GR9S800403AU: { hType: "Furnace",      pESP: 0.0, series: "GR9S80 SERIES",               imagen: "images/GR9S80/GR9S800403AU.png" },
  GR9S800603AU: { hType: "Furnace",      pESP: 0.6, series: "GR9S80 SERIES",               imagen: "images/GR9S80/GR9S800603AU.png" },
  GR9S800604BU: { hType: "Furnace",      pESP: 9.9, series: "GR9S80 SERIES",               imagen: "images/GR9S80/GR9S800604BU.png" },
  GR9S800804BU: { hType: "Furnace",      pESP: 9.9, series: "GR9S80 SERIES",               imagen: "images/GR9S80/GR9S800804BU.png" },
  GR9S800805CU: { hType: "Furnace",      pESP: 9.9, series: "GR9S80 SERIES",               imagen: "images/GR9S80/GR9S800805CU.png" },

  // --- Goodman AMSTU1300 (air handler) ---
  AMST24BU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST24BU.png" },
  AMST30BU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST30BU.png" },
  AMST36BU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST36BU.png" },
  AMST36CU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST36CU.png" },
  AMST42CU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST42CU.png" },
  AMST48CU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST48CU.png" },
  AMST48DU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST48DU.png" },
  AMST60DU: { hType: "AirHandler",       pESP: 9.9, series: "AMSTU1300 SERIES",             imagen: "images/AMSTU1300/AMST60DU.png" },

  // --- Daikin DR96TC / DD96TC ---
  DR96TC0403BN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DR96TC0603BN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DR96TC0803BN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DR96TC0804CN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DR96TC1005CN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DR96TC1005DN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DR96TC1205DN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DD96TC0403BN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DD96TC0603BN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DD96TC0804CN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DD96TC1005CN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
  DD96TC1205DN: { hType: "Furnace",      pESP: 0.5, series: "DR96TC/DD96TC SERIES" },
};

// ---------------------------------------------------------------------------
// OUTDOOR CATALOG
// uType: "Condenser" | "Heat Pump"
// FactoryCharge: nameplate factory charge in oz.
// revisedCharge: updated factory charge oz for Lennox/Trane units manufactured
//   after May 2025 — R-454B shortage adjustment. Technician determines in field
//   which value applies based on manufacture date.
// ---------------------------------------------------------------------------

export const OUTDOOR_CATALOG = {
  // --- Lennox ML17XC1 (R-410A) ---
  "ML17XC1-018": { uType: "Condenser",  btu: 18000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 72  },
  "ML17XC1-024": { uType: "Condenser",  btu: 24000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 82  },
  "ML17XC1-030": { uType: "Condenser",  btu: 30000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 104 },
  "ML17XC1-036": { uType: "Condenser",  btu: 36000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 136 },
  "ML17XC1-042": { uType: "Condenser",  btu: 42000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 146 },
  "ML17XC1-047": { uType: "Condenser",  btu: 47000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 157 },
  "ML17XC1-059": { uType: "Condenser",  btu: 59000, freon: "R-410A", series: "ML17XC1", FactoryCharge: 190 },

  // --- Lennox ML18XC2 (R-410A) ---
  "ML18XC2-036": { uType: "Condenser",  btu: 36000, freon: "R-410A", series: "ML18XC2", FactoryCharge: 128 },
  "ML18XC2-048": { uType: "Condenser",  btu: 48000, freon: "R-410A", series: "ML18XC2", FactoryCharge: 177 },

  // --- Lennox EL17XP1 Heat Pump (R-410A) ---
  "EL17XP1-18":  { uType: "Heat Pump",  btu: 18000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 92  },
  "EL17XP1-24":  { uType: "Heat Pump",  btu: 24000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 90  },
  "EL17XP1-30":  { uType: "Heat Pump",  btu: 30000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 111 },
  "EL17XP1-36":  { uType: "Heat Pump",  btu: 36000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 131 },
  "EL17XP1-42":  { uType: "Heat Pump",  btu: 42000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 156 },
  "EL17XP1-48":  { uType: "Heat Pump",  btu: 48000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 140 },
  "EL17XP1-60":  { uType: "Heat Pump",  btu: 60000, freon: "R-410A", series: "EL17XP1", FactoryCharge: 158 },

  // --- Lennox ML14KC1 (R-454B) ---
  "ML14KC1-018": { uType: "Condenser",  btu: 18000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 78,  revisedCharge: 92  },
  "ML14KC1-024": { uType: "Condenser",  btu: 24000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 78,  revisedCharge: 87  },
  "ML14KC1-030": { uType: "Condenser",  btu: 30000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 90,  revisedCharge: 99  },
  "ML14KC1-036": { uType: "Condenser",  btu: 36000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 109, revisedCharge: 118 },
  "ML14KC1-041": { uType: "Condenser",  btu: 41000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 119, revisedCharge: 128 },
  "ML14KC1-042": { uType: "Condenser",  btu: 42000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 114, revisedCharge: 123 },
  "ML14KC1-047": { uType: "Condenser",  btu: 47000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 125, revisedCharge: 134 },
  "ML14KC1-048": { uType: "Condenser",  btu: 48000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 142, revisedCharge: 151 },
  "ML14KC1-059": { uType: "Condenser",  btu: 59000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 152, revisedCharge: 161 },
  "ML14KC1-060": { uType: "Condenser",  btu: 60000, freon: "R-454B",   series: "ML14KC1", FactoryCharge: 142, revisedCharge: 151 },

  // --- Lennox ML17KC2 (R-454B) ---
  "ML17KC2-024": { uType: "Condenser",  btu: 24000, freon: "R-454B",   series: "ML17KC2", FactoryCharge: 100 },
  "ML17KC2-036": { uType: "Condenser",  btu: 36000, freon: "R-454B",   series: "ML17KC2", FactoryCharge: 104 },
  "ML17KC2-048": { uType: "Condenser",  btu: 48000, freon: "R-454B",   series: "ML17KC2", FactoryCharge: 126 },
  "ML17KC2-060": { uType: "Condenser",  btu: 60000, freon: "R-454B",   series: "ML17KC2", FactoryCharge: 149 },

  // --- Trane 4TTR (R-410A) ---
  "4TTR6024N1000AA": { uType: "Condenser", btu: 24000, freon: "R-410A", series: "4TTR", FactoryCharge: 148 },
  "4TTR5042A1000AA": { uType: "Condenser", btu: 42000, freon: "R-410A", series: "4TTR", FactoryCharge: 130 },
  "4TTR5048A1000AA": { uType: "Condenser", btu: 48000, freon: "R-410A", series: "4TTR", FactoryCharge: 114 },
  "4TTR5060A1000AA": { uType: "Condenser", btu: 60000, freon: "R-410A", series: "4TTR", FactoryCharge: 152 },

  // --- Trane 5TTR (R-454B) ---
  "5TTR5018": { uType: "Condenser", btu: 18000, freon: "R-454B", series: "5TTR", FactoryCharge: 60,  revisedCharge: null },
  "5TTR5024": { uType: "Condenser", btu: 24000, freon: "R-454B", series: "5TTR", FactoryCharge: 58,  revisedCharge: 83  }, // verified
  "5TTR5030": { uType: "Condenser", btu: 30000, freon: "R-454B", series: "5TTR", FactoryCharge: 56,  revisedCharge: null },
  "5TTR5036": { uType: "Condenser", btu: 36000, freon: "R-454B", series: "5TTR", FactoryCharge: 56,  revisedCharge: 80  }, // verified 07/16/25
  "5TTR5042": { uType: "Condenser", btu: 42000, freon: "R-454B", series: "5TTR", FactoryCharge: 81,  revisedCharge: null },
  "5TTR5048": { uType: "Condenser", btu: 48000, freon: "R-454B", series: "5TTR", FactoryCharge: 106, revisedCharge: 130 }, // verified 07/16/25
  "5TTR5060": { uType: "Condenser", btu: 60000, freon: "R-454B", series: "5TTR", FactoryCharge: 95,  revisedCharge: 119 }, // verified 07/16/25

  // --- Goodman GLXS4BA (R-32) ---
  GLXS4BA1810AA: { uType: "Condenser", btu: 18000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 53  },
  GLXS4BA2410AA: { uType: "Condenser", btu: 24000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 53  },
  GLXS4BA3010AA: { uType: "Condenser", btu: 30000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 63  },
  GLXS4BA3610AA: { uType: "Condenser", btu: 36000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 69  },
  GLXS4BA4210AA: { uType: "Condenser", btu: 42000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 83  },
  GLXS4BA4810AA: { uType: "Condenser", btu: 48000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 91  },
  GLXS4BA6010AA: { uType: "Condenser", btu: 60000, freon: "R-32", series: "GLXS4BA", FactoryCharge: 94  },

  // --- Goodman GLXS5BA (R-32) ---
  GLXS5BA1810AA: { uType: "Condenser", btu: 18000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 54  },
  GLXS5BA2410AA: { uType: "Condenser", btu: 24000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 65  },
  GLXS5BA3010AA: { uType: "Condenser", btu: 30000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 87  },
  GLXS5BA3610AA: { uType: "Condenser", btu: 36000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 88  },
  GLXS5BA4210AA: { uType: "Condenser", btu: 42000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 141 },
  GLXS5BA4810AA: { uType: "Condenser", btu: 48000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 138 },
  GLXS5BA6010AA: { uType: "Condenser", btu: 60000, freon: "R-32", series: "GLXS5BA", FactoryCharge: 167 },

  // --- Goodman GLZS4BA Heat Pump (R-32) ---
  GLZS4BA1810AA: { uType: "Heat Pump", btu: 18000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 70  },
  GLZS4BA2410AA: { uType: "Heat Pump", btu: 24000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 70  },
  GLZS4BA3010AA: { uType: "Heat Pump", btu: 30000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 81  },
  GLZS4BA3610AA: { uType: "Heat Pump", btu: 36000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 83  },
  GLZS4BA4210AA: { uType: "Heat Pump", btu: 42000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 139 },
  GLZS4BA4810AA: { uType: "Heat Pump", btu: 48000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 174 },
  GLZS4BA6010AA: { uType: "Heat Pump", btu: 60000, freon: "R-32", series: "GLZS4BA", FactoryCharge: 194 },

  // --- Daikin DC6VSS (R-32) ---
  DC6VSS2410: { uType: "Condenser", btu: 24000, freon: "R-32", series: "DC6VSS", FactoryCharge: 74  },
  DC6VSS3010: { uType: "Condenser", btu: 30000, freon: "R-32", series: "DC6VSS", FactoryCharge: 76  },
  DC6VSS3610: { uType: "Condenser", btu: 36000, freon: "R-32", series: "DC6VSS", FactoryCharge: 83  },
  DC6VSS4210: { uType: "Condenser", btu: 42000, freon: "R-32", series: "DC6VSS", FactoryCharge: 100 },
  DC6VSS4810: { uType: "Condenser", btu: 48000, freon: "R-32", series: "DC6VSS", FactoryCharge: null },
  DC6VSS6010: { uType: "Condenser", btu: 60000, freon: "R-32", series: "DC6VSS", FactoryCharge: null },
};

// ---------------------------------------------------------------------------
// SERIES LINKS — indoor unit series → service manual + brand library URLs
// ---------------------------------------------------------------------------

export const SERIES_LINKS = {
  "ML180UH SERIES": {
    serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/507103-04-000",
    lennoxPros:    "https://www.lennoxpros.com/documentlibrary",
    linkText:      "Visit LennoxPros Document Library",
  },
  "ML180UHV SERIES(DIP SWITCH)": {
    serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/CORP1909-01-000",
    lennoxPros:    "https://www.lennoxpros.com/documentlibrary",
    linkText:      "Visit LennoxPros Document Library",
  },
  "ML196UH SERIES(HIGH EFFICIENCY)": {
    serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/507966-04-000",
    lennoxPros:    "https://www.lennoxpros.com/documentlibrary",
    linkText:      "Visit LennoxPros Document Library",
  },
  "EL196UH SERIES": {
    serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/100159-01-000",
    lennoxPros:    "https://www.lennoxpros.com/documentlibrary",
    linkText:      "Visit LennoxPros Document Library",
  },
  "CBK45UHET SERIES": {
    serviceManual: "https://s7d9.scene7.com/is/content/lennoxinternational/100110-01-000",
    lennoxPros:    "https://www.lennoxpros.com/documentlibrary",
    linkText:      "Visit LennoxPros Document Library",
  },
  "CBA25UH SERIES": {
    serviceManual:    "https://s7d9.scene7.com/is/content/lennoxinternational/CORP1705-L7-01-000",
    lennoxPros:       "https://www.lennoxpros.com/documentlibrary",
    linkText:         "Visit LennoxPros Document Library",
    blowerSpeedImage: "images/CBA25UH/blowerSpeedChange.png",
    blowerSpeedText:  "Blower Speed Change",
  },
  "S8X1/S8X2-S8B1": {
    serviceManual: "https://elibrary.tranetechnologies.com/public/residential-hvac/Literature/Installation%20Operation%20and%20Maintenance/S8XB-SVX001-1D-EN_08092024.pdf",
    trane:         "https://www.tranetechnologies.com/",
    linkText:      "Visit Trane Technologies",
  },
  "GR9S80 SERIES": {
    serviceManual: "https://www.goodmanmfg.com/pdfviewer.aspx?pdfurl=docs/librariesprovider6/default-document-library/ss-gr9s80-u-r32.pdf?view=true",
    goodman:       "https://www.goodmanmfg.com/",
    linkText:      "Visit Goodman",
  },
  "AMSTU1300 SERIES": {
    serviceManual: "https://daikincomfort.com/docs/default-source/amst/im-io-4011a.pdf",
    goodman:       "https://www.goodmanmfg.com/",
    linkText:      "Visit Goodman",
  },
  "DR96TC/DD96TC SERIES": {
    serviceManual: "https://daikincomfort.com/",
    daikin:        "https://daikincomfort.com/",
    linkText:      "Visit Daikin Comfort",
  },
};

// ---------------------------------------------------------------------------
// OUTDOOR LINKS — outdoor unit series prefix → service manual + brand URLs
// ---------------------------------------------------------------------------

const LENNOX_OUTDOOR_LINKS = {
  serviceManual: "https://www.lennoxpros.com/documentlibrary",
  lennoxPros:    "https://www.lennoxpros.com/documentlibrary",
  linkText:      "Visit LennoxPros Document Library",
};

export const OUTDOOR_LINKS = {
  ML17XC1: LENNOX_OUTDOOR_LINKS,
  EL17XP1: LENNOX_OUTDOOR_LINKS,
  ML14KC1: LENNOX_OUTDOOR_LINKS,
  ML17KC2: LENNOX_OUTDOOR_LINKS,
  "4TTR": {
    serviceManual:   "https://elibrary.tranetechnologies.com/",
    trane:           "https://www.tranetechnologies.com/",
    traneSupply:     "https://www.tranesupply.com/s/?language=en_US",
    linkText:        "Visit Trane Technologies",
    supplyLinkText:  "Visit Trane Supply",
  },
  "5TTR": {
    installManual:  "https://www.trane.com/WEBCACHE/18-AC129D1-1C-EN_10172024.PDF",
    trane:          "https://www.tranetechnologies.com/",
    traneSupply:    "https://www.tranesupply.com/s/?language=en_US",
    linkText:       "Visit Trane Technologies",
    supplyLinkText: "Visit Trane Supply",
  },
  GLXS4BA: {
    serviceManual: "https://www.goodmanmfg.com/support/literature-library",
    goodman:       "https://www.goodmanmfg.com/",
    linkText:      "Visit Goodman Manufacturing",
  },
  GLZS4BA: {
    serviceManual: "https://www.goodmanmfg.com/support/literature-library",
    goodman:       "https://www.goodmanmfg.com/",
    linkText:      "Visit Goodman Manufacturing",
  },
  DC6VSS: {
    serviceManual: "https://daikincomfort.com/",
    daikin:        "https://daikincomfort.com/",
    linkText:      "Visit Daikin Comfort",
  },
};

// ---------------------------------------------------------------------------
// PRODUCT LINKS — specific model → Trane Supply product page URL
// ---------------------------------------------------------------------------

export const PRODUCT_LINKS = {
  "5TTR5018": "https://www.tranesupply.com/psearch/product/01t4w00000Nk6LzAAJ",
  "5TTR5024": "https://www.tranesupply.com/psearch/product/01t4w00000Nk6LzAAJ",
  "5TTR5030": "https://www.tranesupply.com/psearch/product/01t4w00000Nk67UAAR",
  "5TTR5036": "https://www.tranesupply.com/psearch/product/01t4w00000Nk6B1AAJ",
  "5TTR5042": "https://www.tranesupply.com/psearch/product/01t4w00000Nk5ySAAR",
  "5TTR5048": "https://www.tranesupply.com/psearch/product/01t4w00000Nk6PiAAJ",
  "5TTR5060": "https://www.tranesupply.com/psearch/product/01t4w00000Nk5n6AAB",
};

// ---------------------------------------------------------------------------
// SERIES GROUP FUNCTIONS — derive optgroup data from catalog order. No duplication.
// ---------------------------------------------------------------------------

export function getIndoorModel(model)  { return INDOOR_CATALOG[model]  || null; }
export function getOutdoorModel(model) { return OUTDOOR_CATALOG[model] || null; }

export function getIndoorSeriesGroups() {
  const order = [];
  const map   = new Map();
  for (const [model, data] of Object.entries(INDOOR_CATALOG)) {
    const { series } = data;
    if (!map.has(series)) { map.set(series, []); order.push(series); }
    map.get(series).push(model);
  }
  return order.map((series) => ({ series, models: map.get(series) }));
}

export function getOutdoorSeriesGroups() {
  const order = [];
  const map   = new Map();
  for (const [model, data] of Object.entries(OUTDOOR_CATALOG)) {
    const { series } = data;
    if (!map.has(series)) { map.set(series, []); order.push(series); }
    map.get(series).push(model);
  }
  return order.map((series) => ({ series, models: map.get(series) }));
}
