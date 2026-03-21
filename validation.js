// No external imports needed — constants are not used in this module

export function validateState(state, isOtroAccessoryActive, isOtroFixActive) {
  const blockingErrors = [];
  const confirmableErrors = [];
  let missingWeightInFields = [];

  // Validar dirección
  if (!state.address.trim()) {
    blockingErrors.push("⚠️ Falta la dirección del servicio");
  }

  // Validar que haya al menos un servicio seleccionado
  if (state.selectedServices.length === 0) {
    blockingErrors.push(
      "⚠️ Selecciona al menos un tipo de servicio (AC, Heat, etc.)"
    );
  }

  // Validar Weight-In Data si se seleccionó 'Factory supplied liquid line length'
  if (state.weightInData && state.weightInData.factoryLineConfig) {
    const w = state.weightInData;
    const requiredFields = [
      "linesetLength",
      "factoryChargeOz",
      "approxAdjustOz",
      "adjustedOz",
      "fanSpeedCfm",
      "liquidLineTemp",
      "suctionLineTemp",
      "condenserSatTemp",
      "subcoolingValue",
      "oemSubcoolingGoal",
      "subcoolingDeviation",
    ];

    missingWeightInFields = requiredFields.filter(
      (key) => !w[key] || w[key].toString().trim() === ""
    );

    if (missingWeightInFields.length > 0) {
      confirmableErrors.push(
        `⚠️ Faltan ${missingWeightInFields.length} datos en Weight-In Data.`
      );
    }
  }

  return { blockingErrors, confirmableErrors, missingWeightInFields };
}
