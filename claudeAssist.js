// ============================================================
// claudeAssist.js — Troubleshooting Engine Nivel 2
// Claude API integration for AI-assisted HVAC field diagnosis
//
// NOTE: API key stored in localStorage (user-provided).
// For production deployments, proxy through a Netlify Function
// to avoid exposing the key in the browser.
// ============================================================

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL   = "claude-haiku-4-5-20251001"; // Fast, cost-effective for field use
const STORAGE_KEY    = "ts_claude_api_key";

// ─────────────────────────────────────────────
// API KEY MANAGEMENT
// ─────────────────────────────────────────────
export function saveApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function hasApiKey() {
  return !!getApiKey();
}

export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────────
// BUILD CONTEXT PROMPT FROM EQUIPMENT + L1 RESULT
// ─────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are an expert HVAC field technician assistant for a residential new-construction HVAC company. You specialize in Lennox, Goodman, Trane, and Daikin systems. Your job is to help field technicians diagnose and solve HVAC problems quickly.

Key knowledge areas:
- A2L refrigerants (R-454B, R-32) and their safety requirements (leak sensors, wire harnesses, E6 fault codes)
- Lennox, Trane, Goodman/Daikin furnace boards and their fault codes
- Honeywell zone boards (HZ322, UT3000) — Y1-OUT signal path, bypass dampers
- Ecobee SmartThermostat — app overrides, PEK wiring, zoning setups
- New construction startup issues — false positive A2L sensors, float switches, commissioning
- Refrigerant charge verification — subcooling method, R-410A vs R-454B vs R-32

Response format:
- Be CONCISE and ACTIONABLE — field techs need quick, practical steps
- Use numbered steps for procedures
- Include specific measurements (voltages, pressures, resistances) when relevant
- Flag safety concerns clearly (A2L, gas leaks, electrical hazards)
- Answer in the same language the tech uses (Spanish or English)

Do NOT give generic HVAC advice. Be specific to the equipment context provided.`;
}

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

// ─────────────────────────────────────────────
// MAIN: ASK CLAUDE (streaming)
// ─────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.symptomLabel  - Human-readable symptom name
 * @param {string} [params.detail]      - Extra user detail
 * @param {object} params.context       - buildContext() result
 * @param {object} [params.l1Result]    - Level 1 diagnosis result
 * @param {function} params.onChunk     - Called with each text chunk (string)
 * @param {function} [params.onDone]    - Called when stream completes
 * @param {function} [params.onError]   - Called on error (Error object)
 */
export async function askClaude({ symptomLabel, detail = "", context = {}, l1Result = null, onChunk, onDone, onError }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    onError?.(new Error("No API key configured. Ingresa tu API key de Anthropic para usar Nivel 2."));
    return;
  }

  const userMessage = buildUserMessage(symptomLabel, detail, context, l1Result);

  const body = {
    model:      CLAUDE_MODEL,
    max_tokens: 1024,
    system:     buildSystemPrompt(),
    messages:   [{ role: "user", content: userMessage }],
    stream:     true,
  };

  let response;
  try {
    response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type":            "application/json",
        "x-api-key":               apiKey,
        "anthropic-version":       "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    onError?.(new Error(`Network error: ${err.message}`));
    return;
  }

  if (!response.ok) {
    let errMsg = `API error ${response.status}`;
    try {
      const errJson = await response.json();
      errMsg = errJson?.error?.message || errMsg;
    } catch (_) { /* ignore */ }
    onError?.(new Error(errMsg));
    return;
  }

  // Parse SSE stream
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            onChunk?.(parsed.delta.text);
          }
        } catch (_) { /* ignore malformed events */ }
      }
    }
  } catch (err) {
    onError?.(new Error(`Stream read error: ${err.message}`));
    return;
  }

  onDone?.();
}
