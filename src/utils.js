// src/utils.js — Shared utility functions.

export function ouncesToPoundsAndOunces(ounces) {
  const pounds = Math.floor(ounces / 16);
  const remainingOunces = (ounces % 16).toFixed(2);
  return pounds > 0
    ? `${pounds} lb ${remainingOunces} oz`
    : `${remainingOunces} oz`;
}
