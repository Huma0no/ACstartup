export function ouncesToPoundsAndOunces(oz) {
  return `${oz} oz (${(oz / 16).toFixed(2)} lb)`;
}

export function getSubcoolingDefault(modelNumber) {
  return String(modelNumber).startsWith("GL") ? 8 : 10;
}

export function calculateApproxAdjust(linesetLength, lineConfig) {
  if (isNaN(linesetLength) || !lineConfig) return null;

  let factoryLength = 15;
  if      (lineConfig.includes("10ft")) factoryLength = 10;
  else if (lineConfig.includes("25ft")) factoryLength = 25;
  else if (lineConfig.includes("30ft")) factoryLength = 30;
  else if (lineConfig.includes("15ft")) factoryLength = 15;

  const multiplier = lineConfig.toLowerCase().includes("trane") ? 0.47 : 0.6;
  return ((linesetLength - factoryLength) * multiplier).toFixed(2);
}
