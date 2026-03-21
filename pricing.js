import {
  SERVICES,
  ACCESSORIES,
  TWO_SYSTEMS_ACCESSORIES,
  PRICES,
} from "./constants.js";
import { hasWeightInData } from "./state.js";

export function calculateFinancials(state) {
  let totalServicePrice = 0;
  let totalAccessoryPrice = 0;
  let totalFixPrice = 0;

  const {
    selectedServices,
    selectedAccessories,
    selectedFixes,
    isTwoSystems,
    customAccessories,
    customFixes,
  } = state;

  const hasFinish = selectedServices.some((s) => s.name === SERVICES.FINISH);
  const hasAC = selectedServices.some((s) => s.name === SERVICES.AC);
  const hasHeat = selectedServices.some((s) => s.name === SERVICES.HEAT);
  const hasPrestart = selectedServices.some(
    (s) => s.name === SERVICES.PRESTART
  );
  const hasDriveRun = selectedServices.some(
    (s) => s.name === SERVICES.DRIVE_RUN
  );
  const hasCancel = selectedServices.some((s) => s.name === SERVICES.CANCEL);
  const hasHarmony = selectedAccessories.some(
    (a) => a.name === ACCESSORIES.HARMONY
  );

  // Service Price
  if (!hasCancel) {
    if (hasFinish) {
      totalServicePrice = PRICES.SERVICE.FINISH;
      if (isTwoSystems) totalServicePrice *= 2;
    } else if (hasAC && hasHeat) {
      let price = PRICES.SERVICE.AC_HEAT;
      if (isTwoSystems) price *= 2;
      totalServicePrice += price;
    } else if (hasAC || hasHeat || hasPrestart || hasDriveRun) {
      let basePrice = PRICES.SERVICE.STANDARD;
      if (hasPrestart) basePrice = PRICES.SERVICE.PRESTART;
      if (hasDriveRun) basePrice = PRICES.SERVICE.DRIVE_RUN;

      let price = basePrice;
      if (isTwoSystems) price *= 2;
      totalServicePrice += price;
    }
  }

  // Accessory Price
  totalAccessoryPrice = selectedAccessories.reduce((sum, accessory) => {
    if (accessory.name === ACCESSORIES.ZONING && hasHarmony) return sum;

    let price = accessory.basePrice;
    if (accessory.name === ACCESSORIES.HARMONY)
      price = PRICES.ACCESSORY.HARMONY;
    if (accessory.name === ACCESSORIES.ZONING) price = PRICES.ACCESSORY.ZONING;
    if (accessory.name === ACCESSORIES.BYPASS) price = PRICES.ACCESSORY.BYPASS;

    if (accessory.name === ACCESSORIES.WEIGHT_IN_DATA && hasFinish)
      price += PRICES.ACCESSORY.WEIGHT_IN_FINISH_ADDON;
    if (isTwoSystems && TWO_SYSTEMS_ACCESSORIES.includes(accessory.name))
      price *= 2;
    return sum + price;
  }, 0);
  totalAccessoryPrice += customAccessories.reduce(
    (sum, item) => sum + item.basePrice,
    0
  );

  // Cobro Automático de Weight-In Data si hay datos ingresados
  // (Solo si no fue seleccionado manualmente para evitar doble cobro en estados antiguos)
  const isWeightSelected = selectedAccessories.some(
    (a) => a.name === ACCESSORIES.WEIGHT_IN_DATA
  );
  const weightDataActive =
    hasWeightInData(state.weightInData) ||
    (isTwoSystems && hasWeightInData(state.weightInData2));

  if (!isWeightSelected && weightDataActive) {
    let price = hasFinish
      ? PRICES.ACCESSORY.WEIGHT_IN_BASE +
        PRICES.ACCESSORY.WEIGHT_IN_FINISH_ADDON
      : PRICES.ACCESSORY.WEIGHT_IN_BASE;
    if (isTwoSystems) price *= 2;
    totalAccessoryPrice += price;
  }

  // Fix Price
  totalFixPrice = selectedFixes.reduce((sum, fix) => sum + fix.basePrice, 0);
  totalFixPrice += customFixes.reduce((sum, item) => sum + item.basePrice, 0);

  return {
    totalServicePrice,
    totalAccessoryPrice,
    totalFixPrice,
    total: totalServicePrice + totalAccessoryPrice + totalFixPrice,
  };
}
