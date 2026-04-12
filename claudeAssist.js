// ============================================================
// claudeAssist.js — Troubleshooting Engine Nivel 2
// Claude API integration for AI-assisted HVAC field diagnosis
//
// NOTE: API key stored in localStorage (user-provided).
// For production deployments, proxy through a Netlify Function
// to avoid exposing the key in the browser.
// ============================================================

// ─────────────────────────────────────────────
// BUILD CONTEXT PROMPT FROM EQUIPMENT + L1 RESULT
// ─────────────────────────────────────────────

export function buildUserMessage(symptomLabel, detail, context, l1Result) {
  const lines = [];

  lines.push(`## Situación en Campo`);
  lines.push(`**Síntoma:** ${symptomLabel}`);
  if (detail) lines.push(`**Detalle adicional:** ${detail}`);

  lines.push(`\n## Equipo Instalado`);
  if (context.heaterModel) {
    const h = context.heater;
    lines.push(`- **Indoor unit:** ${context.heaterModel} (${h?.brand || ""} ${h?.hType || ""}, Board: ${h?.boardType || "N/A"})`);
    if (h?.isA2L) lines.push(`  ⚠️ Sistema A2L — requiere Trane Harness`);
  } else {
    lines.push(`- Indoor unit: No seleccionado`);
  }

  if (context.outdoorModel) {
    const o = context.outdoor;
    lines.push(`- **Outdoor unit:** ${context.outdoorModel} (${o?.tons || "?"} ton, ${o?.freon || "?"}, Factory charge: ${o?.FactoryCharge || "?"}oz, Subcooling goal: ${o?.subcooling || "?"}°F)`);
  } else {
    lines.push(`- Outdoor unit: No seleccionado`);
  }

  if (context.tstatKey) {
    lines.push(`- **Thermostat:** ${context.tstatKey}`);
  }

  if (context.hasZoning) {
    lines.push(`- **Zone board:** ${context.zoningBoard?.name || context.zoningBoardKey}`);
  }

  const accessories = [];
  if (context.hasFloatSwitch)  accessories.push("Float Switch");
  if (context.hasTraneHarness) accessories.push("Trane Harness (A2L)");
  if (context.hasEcoilWire)    accessories.push("Ecoil Wire (A2L)");
  if (accessories.length) lines.push(`- **Accessories:** ${accessories.join(", ")}`);

  if (l1Result && l1Result.steps?.length > 0) {
    lines.push(`\n## Diagnóstico Nivel 1 (pasos ya revisados)`);
    lines.push(`**${l1Result.title}** — ${l1Result.summary}`);
    l1Result.steps.forEach(s => {
      lines.push(`${s.step}. ${s.action}${s.detail ? ` — ${s.detail}` : ""}`);
    });
    if (l1Result.equipmentNotes?.length > 0) {
      lines.push(`\n**Notas de equipo:**`);
      l1Result.equipmentNotes.forEach(n => lines.push(`- ${n.label}: ${n.text}`));
    }
  }

  lines.push(`\n---`);
  lines.push(`Basándote en este contexto, ¿qué pasos adicionales recomiendas? ¿Hay algo en el Diagnóstico Nivel 1 que deba priorizarse o alguna causa probable que se haya pasado por alto?`);

  return lines.join("\n");
}

