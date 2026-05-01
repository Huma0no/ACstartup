// src/reports.js — Report text generation and export. No UI rendering. No localStorage access.
// Format spec: docs/data_dictionary.md §8

// ---------------------------------------------------------------------------
// Report text — one completion
// Format: ADDRESS, [notes,] SERVICE $price, ACC $price, ..., FIX $price, total $total
// ---------------------------------------------------------------------------

export function generateReportText(completion) {
  const parts = [completion.address];

  if (completion.notes && completion.notes.trim()) {
    parts.push(completion.notes.trim());
  }

  if (completion.sitePhotoMeta?.length) {
    for (const p of completion.sitePhotoMeta) parts.push(p.label);
  }

  for (const svc of completion.services) {
    parts.push(`${svc.displayName} $${svc.price}`);
  }

  for (const acc of completion.accessories) {
    parts.push(`${acc.displayName} $${acc.price}`);
  }

  for (const fix of completion.fixes) {
    parts.push(`${fix.displayName} $${fix.price}`);
  }

  parts.push(`total $${completion.totals.total}`);

  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Daily report — all completions joined, one per paragraph
// Uses completion.reportText if already set, otherwise generates it.
// ---------------------------------------------------------------------------

export function generateDailyReport(completions) {
  return completions
    .map((c) => c.reportText || generateReportText(c))
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Export — JSON
// ---------------------------------------------------------------------------

export function exportJSON(completions) {
  return JSON.stringify(completions, null, 2);
}

// ---------------------------------------------------------------------------
// Export — CSV (43 columns, matches main branch format)
//
// Columns:
//   Date, Address, Subdivision, Builder,
//   Service_Type, Service_Price, Thermostat, Tstat_Qty,
//   Accessories, Accessories_Price, Fixes, Fixes_Price,
//   Notes, Total,
//   Indoor_Model, Outdoor_Model,
//   Lineset_Length, Factory_Line_Config, Factory_Charge, Approx_Adjust,
//   Adjusted_Charge, Fan_Speed, Liquid_Temp, Suction_Temp,
//   Condenser_Sat_Temp, Subcooling, Subcooling_Goal, Subcooling_Deviation,
//   Refrigerant,
//   Indoor_Model_2, Outdoor_Model_2,
//   Sys2_Lineset, Sys2_Line_Config, Sys2_Fact_Chg, Sys2_Appr_Adj,
//   Sys2_Adj_Chg, Sys2_Fan_CFM, Sys2_Liq_Temp, Sys2_Suc_Temp,
//   Sys2_Sat_Temp, Sys2_SC, Sys2_SC_Goal, Sys2_SC_Dev
// ---------------------------------------------------------------------------

function csvCell(value) {
  const s = String(value ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const CSV_HEADER =
  "Date,Address,Subdivision,Builder," +
  "Service_Type,Service_Price,Thermostat,Tstat_Qty," +
  "Accessories,Accessories_Price,Fixes,Fixes_Price," +
  "Notes,Total," +
  "Indoor_Model,Outdoor_Model," +
  "Lineset_Length,Factory_Line_Config,Factory_Charge,Approx_Adjust," +
  "Adjusted_Charge,Fan_Speed,Liquid_Temp,Suction_Temp," +
  "Condenser_Sat_Temp,Subcooling,Subcooling_Goal,Subcooling_Deviation," +
  "Refrigerant," +
  "Indoor_Model_2,Outdoor_Model_2," +
  "Sys2_Lineset,Sys2_Line_Config,Sys2_Fact_Chg,Sys2_Appr_Adj," +
  "Sys2_Adj_Chg,Sys2_Fan_CFM,Sys2_Liq_Temp,Sys2_Suc_Temp," +
  "Sys2_Sat_Temp,Sys2_SC,Sys2_SC_Goal,Sys2_SC_Dev";

export function exportCSV(completions) {
  const rows = completions.map((c) => {
    const w  = c.weightInData  || {};
    const w2 = c.weightInData2 || {};

    // Service_Type: strip tstat segment embedded in displayName
    const serviceType = (c.services[0]?.displayName || "")
      .replace(/\s+\d+\s+\S+\s+tstats?$/i, "")
      .trim();

    const accessories = c.accessories
      .map((a) => `${a.displayName} $${a.price}`)
      .join("; ");

    const fixes = c.fixes
      .map((f) => `${f.displayName} $${f.price}`)
      .join("; ");

    const date = c.timestamp
      ? new Date(c.timestamp).toLocaleDateString()
      : "";

    return [
      date,
      c.address,
      c.subdivision,
      c.builder,
      serviceType,
      c.totals.service,
      c.selectedThermostat?.name || "",
      c.thermostatQuantity || "",
      accessories,
      c.totals.accessory,
      fixes,
      c.totals.fix,
      c.notes || "",
      c.totals.total,
      // Equipment sys1
      c.indoorModel,
      c.outdoorModel,
      // Weigh-in sys1
      w.linesetLength        || "",
      w.factoryLineConfig    || "",
      w.factoryChargeOz      || "",
      w.approxAdjustOz       || "",
      w.adjustedOz           || "",
      w.fanSpeedCfm          || "",
      w.liquidLineTemp       || "",
      w.suctionLineTemp      || "",
      w.condenserSatTemp     || "",
      w.subcoolingValue      || "",
      w.oemSubcoolingGoal    || "",
      w.subcoolingDeviation  || "",
      c.refrigerant,
      // Equipment sys2
      c.indoorModel2,
      c.outdoorModel2,
      // Weigh-in sys2
      w2.linesetLength       || "",
      w2.factoryLineConfig   || "",
      w2.factoryChargeOz     || "",
      w2.approxAdjustOz      || "",
      w2.adjustedOz          || "",
      w2.fanSpeedCfm         || "",
      w2.liquidLineTemp      || "",
      w2.suctionLineTemp     || "",
      w2.condenserSatTemp    || "",
      w2.subcoolingValue     || "",
      w2.oemSubcoolingGoal   || "",
      w2.subcoolingDeviation || "",
    ].map(csvCell).join(",");
  });

  return [CSV_HEADER, ...rows].join("\n");
}
