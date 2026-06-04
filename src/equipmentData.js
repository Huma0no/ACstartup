// src/equipmentData.js — Equipment data adapter for troubleshootingEngine.js
// Re-exports engine-ready catalogs from root equipmentData.js under canonical PWA names.

export {
  faultCodes,
  heaters            as indoorCatalog,
  unidadesExteriores as outdoorCatalog,
  thermostats,
  accessories,
  zoningBoards,
} from "../equipmentData.js";
