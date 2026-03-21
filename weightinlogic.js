import { getState, setState } from "./state.js";
import { unidadesExteriores } from "./weightInData.js";
import { debounce } from "./utils.js";

let inputs1 = {};
let inputs2 = {};
let saveDebounced = () => {};

export function initWeightInLogic(
  weightInInputs1,
  weightInInputs2,
  saveCallback
) {
  inputs1 = weightInInputs1;
  inputs2 = weightInInputs2;
  saveDebounced = saveCallback;

  const attachListeners = (inputs, systemId) => {
    const stateKey = systemId === 2 ? "weightInData2" : "weightInData";

    Object.keys(inputs).forEach((key) => {
      const inputEl = inputs[key];
      if (!inputEl) return;
      const handler = debounce(() => {
        const currentData = getState()[stateKey];
        const updatedData = { ...currentData, [key]: inputEl.value };
        setState({ [stateKey]: updatedData });

        if (key === "linesetLength" || key === "factoryLineConfig") {
          calculateApproxRefrigerant(systemId);
          if (key === "factoryLineConfig") {
            updateFactoryCharge(systemId);
          }
        }
        if (
          [
            "liquidLineTemp",
            "condenserSatTemp",
            "subcoolingValue",
            "oemSubcoolingGoal",
          ].includes(key)
        ) {
          calculateSubcoolingAndDeviation(systemId);
        }
        saveDebounced();
      }, 150);
      inputEl.addEventListener("input", handler);
      if (inputEl.tagName === "SELECT") {
        inputEl.addEventListener("change", handler);
      }
    });
  };

  attachListeners(inputs1, 1);
  attachListeners(inputs2, 2);
}

export function calculateApproxRefrigerant(systemId = 1) {
  const inputs = systemId === 2 ? inputs2 : inputs1;
  const stateKey = systemId === 2 ? "weightInData2" : "weightInData";

  const linesetInput = inputs.linesetLength;
  const diameterInput = inputs.factoryLineConfig;
  const approxInput = inputs.approxAdjustOz;

  if (!linesetInput || !diameterInput || !approxInput) return;

  const linesetLength = parseFloat(linesetInput.value);
  const diameterValue = diameterInput.value;

  if (isNaN(linesetLength) || !diameterValue) return;

  let factoryLength = 15; // Default fallback
  let multiplier = 0.6; // Default (Lennox/Goodman)

  if (diameterValue.includes("10ft")) factoryLength = 10;
  else if (diameterValue.includes("15ft")) factoryLength = 15;
  else if (diameterValue.includes("25ft")) factoryLength = 25;
  else if (diameterValue.includes("30ft")) factoryLength = 30;

  if (diameterValue.toLowerCase().includes("trane")) {
    multiplier = 0.47;
  }

  const diff = linesetLength - factoryLength;
  const adjustment = diff * multiplier;

  approxInput.value = adjustment.toFixed(2);
  const updatedData = {
    ...getState()[stateKey],
    approxAdjustOz: approxInput.value,
  };
  setState({ [stateKey]: updatedData });
}

export function updateFactoryCharge(systemId = 1) {
  const inputs = systemId === 2 ? inputs2 : inputs1;
  const stateKey = systemId === 2 ? "weightInData2" : "weightInData";
  const currentState = getState();
  const model =
    systemId === 2 ? currentState.outdoorModel2 : currentState.outdoorModel;

  if (!model) return;
  const data = unidadesExteriores[model];
  if (!data) return;

  const diameterValue = inputs.factoryLineConfig
    ? inputs.factoryLineConfig.value
    : "";
  let charge = data.FactoryCharge;

  if (
    diameterValue.includes("overcharged") &&
    data.overCharged &&
    data.overCharged > 0
  ) {
    charge = data.overCharged;
  }

  if (charge !== undefined && inputs.factoryChargeOz) {
    inputs.factoryChargeOz.value = charge;
    const updatedData = {
      ...getState()[stateKey],
      factoryChargeOz: String(charge),
    };
    setState({ [stateKey]: updatedData });
  }
}

export function calculateSubcoolingAndDeviation(systemId = 1) {
  const inputs = systemId === 2 ? inputs2 : inputs1;
  const stateKey = systemId === 2 ? "weightInData2" : "weightInData";

  const liquidTempInput = inputs.liquidLineTemp;
  const condenserTempInput = inputs.condenserSatTemp;
  const subcoolingInput = inputs.subcoolingValue;
  const oemGoalInput = inputs.oemSubcoolingGoal;
  const deviationInput = inputs.subcoolingDeviation;

  if (!subcoolingInput) return;

  const liquidTemp = parseFloat(liquidTempInput?.value);
  const condenserTemp = parseFloat(condenserTempInput?.value);

  let subcooling = parseFloat(subcoolingInput.value);

  // Calculate Subcooling if temps are available
  if (!isNaN(liquidTemp) && !isNaN(condenserTemp)) {
    subcooling = condenserTemp - liquidTemp;
    subcoolingInput.value = subcooling.toFixed(1);
    const updatedData = {
      ...getState()[stateKey],
      subcoolingValue: subcoolingInput.value,
    };
    setState({ [stateKey]: updatedData });
  } else if (subcoolingInput.readOnly) {
    // Clear if read-only and inputs invalid
    subcoolingInput.value = "";
    const updatedData = { ...getState()[stateKey], subcoolingValue: "" };
    setState({ [stateKey]: updatedData });
    subcooling = NaN; // Ensure deviation calc knows it's invalid
  }

  // Calculate Deviation if subcooling and goal are available
  if (oemGoalInput && deviationInput) {
    const oemGoal = parseFloat(oemGoalInput.value);
    if (!isNaN(subcooling) && !isNaN(oemGoal)) {
      const deviation = subcooling - oemGoal;
      deviationInput.value = deviation.toFixed(1);
      const updatedData = {
        ...getState()[stateKey],
        subcoolingDeviation: deviationInput.value,
      };
      setState({ [stateKey]: updatedData });
    } else {
      deviationInput.value = "";
      const updatedData = { ...getState()[stateKey], subcoolingDeviation: "" };
      setState({ [stateKey]: updatedData });
    }
  }
}
