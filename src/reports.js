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
    parts.push(svc.price > 0 ? `${svc.displayName} $${svc.price}` : svc.displayName);
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
//   Date, Address, Subdivision, Builder, Notes,
//   Service_Type, Service_Price, Thermostat, Tstat_Qty,
//   Accessories, Accessories_Price, Fixes, Fixes_Price,
//   Total,
//   Indoor_Model, Outdoor_Model, Refrigerant,
//   Lineset_Length, Factory_Line_Config, Factory_Charge, Approx_Adjust,
//   Adjusted_Charge, Fan_Speed, Liquid_Temp, Suction_Temp,
//   Condenser_Sat_Temp, Subcooling, Subcooling_Goal, Subcooling_Deviation,
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

// Columns 1-43 match legacy format. Extra systems are appended at the end.
const CSV_HEADER =
  "Date,Address,Subdivision,Builder,Notes," +
  "Service_Type,Service_Price,Thermostat,Tstat_Qty," +
  "Accessories,Accessories_Price,Fixes,Fixes_Price," +
  "Total," +
  "Indoor_Model,Outdoor_Model,Refrigerant," +
  "Lineset_Length,Factory_Line_Config,Factory_Charge,Approx_Adjust," +
  "Adjusted_Charge,Fan_Speed,Liquid_Temp,Suction_Temp," +
  "Condenser_Sat_Temp,Subcooling,Subcooling_Goal,Subcooling_Deviation," +
  "Indoor_Model_2,Outdoor_Model_2," +
  "Sys2_Lineset,Sys2_Line_Config,Sys2_Fact_Chg,Sys2_Appr_Adj," +
  "Sys2_Adj_Chg,Sys2_Fan_CFM,Sys2_Liq_Temp,Sys2_Suc_Temp," +
  "Sys2_Sat_Temp,Sys2_SC,Sys2_SC_Goal,Sys2_SC_Dev," +
  "Total_Systems,Extra_Systems_Summary";

export function exportCSV(completions) {
  const rows = completions.map((c) => {
    const sysList = Array.isArray(c.systems) && c.systems.length > 0
      ? c.systems
      : [
          { indoor: c.indoor || "", outdoor: c.outdoor || "", weightInData: c.weightInData },
          ...((c.indoor2 || c.outdoor2 || c.isTwoSystems) ? [{ indoor: c.indoor2 || "", outdoor: c.outdoor2 || "", weightInData: c.weightInData2 }] : [])
        ];

    const s1 = sysList[0] || {};
    const s2 = sysList[1] || {};
    const w  = s1.weightInData || c.weightInData  || {};
    const w2 = s2.weightInData || c.weightInData2 || {};

    // Service_Type: handle uniform or mixed per-system services
    let serviceType = "";
    if (c.services?.length === 1) {
      serviceType = (c.services[0]?.displayName || "")
        .replace(/\s+\d+\s+\S+\s+tstats?$/i, "")
        .trim();
    } else if (c.services?.length > 1) {
      serviceType = c.services
        .map((s) => (s.displayName || s.name || "").replace(/\s+\d+\s+\S+\s+tstats?$/i, "").trim())
        .join("; ");
    }

    const accessories = c.accessories
      .map((a) => `${a.displayName} $${a.price}`)
      .join("; ");

    const fixes = c.fixes
      .map((f) => `${f.displayName} $${f.price}`)
      .join("; ");

    const date = c.timestamp
      ? new Date(c.timestamp).toLocaleDateString()
      : "";

    const totalSystems = sysList.length;
    const extraSystemsSummary = sysList.length > 2
      ? sysList.slice(2).map((s, i) =>
          `Sys${i + 3}: [${s.serviceType ? `Service: ${s.serviceType}, ` : ""}Indoor: ${s.indoor || "—"}, Outdoor: ${s.outdoor || "—"}, Lineset: ${s.weightInData?.linesetLength || "—"}, Adj: ${s.weightInData?.adjustedOz || "—"} oz, SC: ${s.weightInData?.subcoolingValue || "—"}°F]`
        ).join(" | ")
      : "";

    return [
      date,
      c.address,
      c.subdivision,
      c.builder,
      c.notes || "",
      serviceType,
      c.totals.service,
      c.selectedThermostat?.name || "",
      c.thermostatQuantity || "",
      accessories,
      c.totals.accessory,
      fixes,
      c.totals.fix,
      c.totals.total,
      // Equipment sys1
      s1.indoor || c.indoor || "",
      s1.outdoor || c.outdoor || "",
      c.refrigerant || "",
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
      // Equipment sys2
      s2.indoor || c.indoor2 || "",
      s2.outdoor || c.outdoor2 || "",
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
      // Extra Multi-System Columns (Columns 44 & 45)
      totalSystems,
      extraSystemsSummary,
    ].map(csvCell).join(",");
  });

  return [CSV_HEADER, ...rows].join("\n");
}
