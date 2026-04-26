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
  EXTENDED_WIRE:     "Extended Wire",
  OUT_OF_TOWN:       "Out of town fee",
  OTRO:              "Otro",
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
  EXTENDED_WIRE: "Extended Wire",
  PVC_WORK:      "PVC Work",
  LEAKS_ECOIL:   "Leaks Ecoil",
  LEAKS_CUNIT:   "Leaks Cunit",
  LEAKS_WALL:    "Leaks Wall",
  OTRO:          "Otro",
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
    [ACCESSORIES.EXTENDED_WIRE]:       5,
  },

  // Weight-In addon: added to WEIGHT_IN_DATA price when Finish is also selected
  WEIGHT_IN_FINISH_ADDON: 10,

  FIX: {
    [FIXES.PRESSURE_TEST]:  10,
    [FIXES.OPEN_ECOIL]:     30,
    [FIXES.WIRES_JAMMED]:    5,
    [FIXES.STUCK_BLOWER]:   20,
    [FIXES.CUT_SHEETROCK]:  15,
    [FIXES.EXTENDED_WIRE]:   5,
    [FIXES.PVC_WORK]:       15,
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
  [ACCESSORIES.EXTENDED_WIRE]:      "extended wire",
  [ACCESSORIES.OUT_OF_TOWN]:        "out of town fee",
};

export const FIX_DISPLAY = {
  [FIXES.PRESSURE_TEST]:  "pressure test",
  [FIXES.OPEN_ECOIL]:     "opened ecoil to pull out sensor wire",
  [FIXES.WIRES_JAMMED]:   "wires jammed",
  [FIXES.STUCK_BLOWER]:   "stuck blower",
  [FIXES.CUT_SHEETROCK]:  "cut sheetrock",
  [FIXES.EXTENDED_WIRE]:  "extended wire",
  [FIXES.PVC_WORK]:       "pvc work",
  [FIXES.LEAKS_ECOIL]:    "leaks (indoor coil)",
  [FIXES.LEAKS_CUNIT]:    "leaks (cunit)",
  [FIXES.LEAKS_WALL]:     "leaks (wall)",
};
