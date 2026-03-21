export const APP_ICON_URL = "images/icon.png";

export const STORAGE_KEYS = {
  STATE: "completionState",
  REPORTS: "completionReports",
  JOBS: "jobsArray",
  ACTIVE_JOB: "lastActiveJobAddress",
};

export const SERVICES = {
  AC: "AC",
  HEAT: "Heat",
  PRESTART: "Prestart",
  FINISH: "Finish",
  DRIVE_RUN: "Drive Run",
  CANCEL: "Cancel",
};

export const ACCESSORIES = {
  ZONING: "Zoning",
  HARMONY: "Harmony",
  BYPASS_CONTROL: "Bypass Control",
  FRESH_AIR: "Air",
  FIN180P: "FIN180P wired and",
  FIN6_MD: "FIN6-MD",
  DEHUM: "Dehum",
  FA_INTAKE: "F/A",
  DRAGONFLY: "DragonFly",
  RDS: "RDS",
  WEIGHT_IN_DATA: "Weight-In-Data",
  TRANE_HARNESS: "Trane Harness",
  HARNESS: "Harness",
  LP_KIT: "LP Kit",
  FLOAT_SWITCH: "Float Switch",
  BYPASS: "Bypass",
  E_BYPASS: "eBypass",
  OUT_OF_TOWN: "Out of town fee",
  A2L: "A2L",
  ECOIL_WIRE: "Ecoil Wire",
  OTRO: "Otro",
};

export const FIXES = {
  PRESSURE_TEST: "Pressure Test",
  LEAKS: "Leaks",
  WIRES_JAMMED: "Wires Jammed",
  STUCK_BLOWER: "Stuck Blower",
  CUT_SHEETROCK: "Cut Sheetrock",
  EXTENDED_WIRE: "Extended Wire",
  PVC_WORK: "PVC Work",
  OPEN_ECOIL: "Open Ecoil",
  OTRO: "Otro",
};

export const THERMOSTATS = {
  T4: "T-4",
  T6: "T-6",
  T10: "T-10",
  T8321: "T-8321",
  ECOBEE: "Ecobee",
  DAIKIN_ONE: "Daikin One",
  TH2110: "TH2110",
  OTRO: "Otro",
};

export const OPTIONS = {
  TEMPORARY: "Temporary",
  TWO_SYSTEMS: "2 Systems",
};

export const TWO_SYSTEMS_ACCESSORIES = [
  ACCESSORIES.RDS,
  ACCESSORIES.TRANE_HARNESS,
  ACCESSORIES.HARNESS,
  ACCESSORIES.LP_KIT,
  ACCESSORIES.FLOAT_SWITCH,
  ACCESSORIES.WEIGHT_IN_DATA,
  ACCESSORIES.ECOIL_WIRE,
];

export const PRICES = {
  SERVICE: {
    FINISH: 20,
    AC_HEAT: 30,
    STANDARD: 30, // AC or Heat base
    PRESTART: 20,
    DRIVE_RUN: 10,
  },
  ACCESSORY: {
    HARMONY: 40,
    ZONING: 30,
    BYPASS: 5,
    WEIGHT_IN_BASE: 10,
    WEIGHT_IN_FINISH_ADDON: 10, // Se suma al base si hay Finish
  },
};
