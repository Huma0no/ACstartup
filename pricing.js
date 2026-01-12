export function calculateFinancials(state) {
  let totalServicePrice = 0;
  let totalAccessoryPrice = 0;
  let totalFixPrice = 0;

  const {
    selectedServices,
    selectedAccessories,
    selectedFixes,
    isTwoSystems,
    isTwoStage,
    otroAccessory,
    otroFix,
  } = state;

  const hasFinish = selectedServices.some((s) => s.name === "Finish");
  const hasAC = selectedServices.some((s) => s.name === "AC");
  const hasHeat = selectedServices.some((s) => s.name === "Heat");
  const hasPrestart = selectedServices.some((s) => s.name === "Prestart");
  const hasDriveRun = selectedServices.some((s) => s.name === "Drive Run");
  const hasCancel = selectedServices.some((s) => s.name === "Cancel");
  const hasHarmony = selectedAccessories.some((a) => a.name === "Harmony");

  // Service Price
  if (!hasCancel) {
    if (hasFinish) {
      totalServicePrice = 20;
    } else if (hasAC && hasHeat) {
      let price = 30;
      if (isTwoStage) price += 10;
      if (isTwoSystems) price *= 2;
      totalServicePrice += price;
    } else if (hasAC || hasHeat || hasPrestart || hasDriveRun) {
      let basePrice = 30;
      if (hasPrestart) basePrice = 20;
      if (hasDriveRun) basePrice = 10;

      let price = basePrice;
      if (isTwoStage && !hasFinish && !hasDriveRun) price += 10;
      if (isTwoSystems) price *= 2;
      totalServicePrice += price;
    }
  }

  // Accessory Price
  const twoSystemsAccessories = [
    "DragonFly",
    "Trane Harness",
    "Harness",
    "E.S.3.10",
    "LP Kit",
    "Float Switch",
  ];

  totalAccessoryPrice = selectedAccessories.reduce((sum, accessory) => {
    if (accessory.name === "Zoning" && hasHarmony) return sum;
    let price = accessory.name === "Harmony" ? 40 : accessory.basePrice;
    if (accessory.name === "E.S.3.10" && hasFinish) price = 20;
    if (accessory.name === "Weight-In-Data" && hasFinish) price += 10;
    if (isTwoSystems && twoSystemsAccessories.includes(accessory.name))
      price *= 2;
    if (isTwoStage && accessory.name === "Dehum") price += 10;
    return sum + price;
  }, 0);
  if (otroAccessory) totalAccessoryPrice += otroAccessory.basePrice;

  // Fix Price
  totalFixPrice = selectedFixes.reduce((sum, fix) => sum + fix.basePrice, 0);
  if (otroFix) totalFixPrice += otroFix.basePrice;

  return {
    totalServicePrice,
    totalAccessoryPrice,
    totalFixPrice,
    total: totalServicePrice + totalAccessoryPrice + totalFixPrice,
  };
}
