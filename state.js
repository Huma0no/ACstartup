const defaultWeightInData = () => ({
  linesetLength: "",
  factoryChargeOz: "",
  factoryLineConfig: "",
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

const initialState = {
  address: "",
  selectedServices: [],
  isTwoSystems: false,
  isTemporary: false,
  selectedThermostat: null,
  thermostatQuantity: 1,
  selectedAccessories: [],
  customAccessories: [],
  isOtroAccessoryOpen: false,
  selectedFixes: [],
  customFixes: [],
  isOtroFixOpen: false,
  leakDetail: null,
  heaterModel: "",
  outdoorModel: "",
  heaterModel2: "",
  outdoorModel2: "",
  weightInData: defaultWeightInData(),
  weightInData2: defaultWeightInData(),
  notes: "",
  extraPhotos: [],
};

let state = { ...initialState };

// Sistema Pub/Sub simple
const listeners = [];

export const subscribe = (listener) => {
  if (listeners.includes(listener)) {
    // Already subscribed — return unsubscribe fn without adding again
    return () => listeners.splice(listeners.indexOf(listener), 1);
  }
  listeners.push(listener);
  return () => listeners.splice(listeners.indexOf(listener), 1);
};

export const getState = () => state;

export const setState = (newState) => {
  state = { ...state, ...newState };
  listeners.forEach((listener) => listener(state));
};

export const resetState = () => {
  state = {
    ...initialState,
    weightInData: defaultWeightInData(),
    weightInData2: defaultWeightInData(),
  };
};

export const hasWeightInData = (dataObj = state.weightInData) =>
  dataObj &&
  Object.values(dataObj).some(
    (val) => typeof val === "string" && val.trim() !== ""
  );

export { defaultWeightInData };
