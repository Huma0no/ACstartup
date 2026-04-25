// src/data.js — consolidated static data layer
// Merges: constants.js, utils.js, equipmentData.js, tstatData.js, howtodata.js
// equipmentData.js is the authoritative equipment source (superset of weightInData.js)

export * from "../constants.js";
export * from "../utils.js";
export * from "../equipmentData.js";

// productSpecificLinks only exists in weightInData.js
export { productSpecificLinks } from "../weightInData.js";

export * from "../tstatData.js";
export * from "../howtodata.js";
