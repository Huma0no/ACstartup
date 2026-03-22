/**
 * tstatData.js
 * Knowledge base for thermostat wiring, programming rules, and manuals.
 * Each entry keyed by tstat name (lowercase, normalized).
 */

export const TSTAT_DATA = {
  "t-10": {
    label: "T-10",
    manualUrl: "https://customer.resideo.com/resources/Techlit/TechLitDocuments/33-00000s/33-00462.pdf",
    wiring: {
      stages: {
        "1-Stage Cool / 1-Stage Heat (most common)": ["Y", "R", "C", "G", "W"],
      },
      notes: "C wire required. Verify R & Rc are jumpered if only one R terminal on equipment.",
    },
    programming: {
      builders: {
        "Chesmar": {
          cool: 70,
          heat: 80,
          notes: "",
        },
        "Castlerock": {
          cool: 70,
          heat: 80,
          notes: "",
        },
        "First America": {
          cool: 70,
          heat: 80,
          notes: "",
        },
      },
      steps: [
        "Press MENU → System Setup",
        "Set System: Cool/Heat (or Cool only if no heat)",
        "Set Fan: Auto",
        "Set Setpoints per builder table above",
        "Exit — screen returns to home in 30 sec",
      ],
    },
  },
};

/** Normalize a tstat name to match TSTAT_DATA keys */
export function normalizeTstatKey(name) {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  // Direct match
  if (TSTAT_DATA[n]) return n;
  // Strip spaces/dashes variants: "t10" → "t-10"
  const dashed = n.replace(/^(t)(\d)/i, "t-$2");
  if (TSTAT_DATA[dashed]) return dashed;
  return null;
}
