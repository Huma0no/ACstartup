export function ouncesToPoundsAndOunces(oz) {
  return `${oz} oz (${(oz / 16).toFixed(2)} lb)`;
}

export function getSubcoolingDefault(modelNumber) {
  return String(modelNumber).startsWith("GL") ? 8 : 10;
}
