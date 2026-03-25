// ============================================================
// troubleshootingEngine.js — Troubleshooting Engine Nivel 1
// Rule-based HVAC field diagnosis using equipmentData.js context
// ============================================================

import {
  faultCodes,
  heaters,
  unidadesExteriores,
  thermostats,
  accessories,
  zoningBoards,
} from "./equipmentData.js";

// ─────────────────────────────────────────────
// SYMPTOM CATEGORIES
// ─────────────────────────────────────────────
export const SYMPTOM = {
  NO_COOLING:        "no_cooling",
  NO_HEATING:        "no_heating",
  FAULT_CODE:        "fault_code",
  NO_FAN:            "no_fan",
  FLOAT_SWITCH:      "float_switch",
  ZONING:            "zoning",
  A2L_SAFETY:        "a2l_safety",
  TSTAT:             "tstat",
  CONDENSER_NO_START:"condenser_no_start",
};

export const SYMPTOM_LABELS = {
  [SYMPTOM.NO_COOLING]:        "❄️ No Enfría",
  [SYMPTOM.NO_HEATING]:        "🔥 No Calienta",
  [SYMPTOM.FAULT_CODE]:        "⚠️ Fault Code",
  [SYMPTOM.NO_FAN]:            "💨 Fan No Arranca",
  [SYMPTOM.FLOAT_SWITCH]:      "💧 Float Switch",
  [SYMPTOM.ZONING]:            "🏠 Zoning Issue",
  [SYMPTOM.A2L_SAFETY]:        "🔐 A2L Safety",
  [SYMPTOM.TSTAT]:             "🌡️ Tstat Issue",
  [SYMPTOM.CONDENSER_NO_START]:"🔌 Condensadora No Arranca",
};

// ─────────────────────────────────────────────
// BUILD EQUIPMENT CONTEXT FROM APP STATE
// ─────────────────────────────────────────────
export function buildContext(state) {
  const heater  = state.heaterModel  ? heaters[state.heaterModel]               : null;
  const outdoor = state.outdoorModel ? unidadesExteriores[state.outdoorModel]    : null;
  const tstat   = state.selectedThermostat ? thermostats[state.selectedThermostat] : null;

  const accs = state.selectedAccessories || [];

  const zoningKey    = accs.find(a => zoningBoards[a]) || null;
  const hasZoning    = accs.some(a => ["HZ322","UT3000","HZ432","DAPC","Zoning"].includes(a));
  const hasFloatSwitch  = accs.includes("Float Switch");
  const hasTraneHarness = accs.includes("Trane Harness");
  const hasEcoilWire    = accs.includes("Ecoil Wire");

  return {
    heater,
    heaterModel:   state.heaterModel   || null,
    outdoor,
    outdoorModel:  state.outdoorModel  || null,
    tstat,
    tstatKey:      state.selectedThermostat || null,
    hasZoning,
    hasFloatSwitch,
    hasTraneHarness,
    hasEcoilWire,
    zoningBoard:    zoningKey ? zoningBoards[zoningKey] : null,
    zoningBoardKey: zoningKey,
    isA2L:         !!(heater?.isA2L || outdoor?.isA2L),
    isTwoSystems:  state.isTwoSystems || false,
    selectedAccessories: accs,
  };
}

// ─────────────────────────────────────────────
// MAIN DIAGNOSIS ENTRY POINT
// ─────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.symptom   - SYMPTOM constant
 * @param {string} [params.detail]  - Extra detail (e.g. fault code string)
 * @param {object} [params.context] - Result of buildContext()
 * @returns {{ title, severity, summary, steps, equipmentNotes, faultCodeInfo }}
 */
export function diagnose({ symptom, detail = "", context = {} }) {
  switch (symptom) {
    case SYMPTOM.NO_COOLING:   return diagnoseNoCooling(detail, context);
    case SYMPTOM.NO_HEATING:   return diagnoseNoHeating(detail, context);
    case SYMPTOM.FAULT_CODE:   return diagnoseFaultCode(detail, context);
    case SYMPTOM.NO_FAN:       return diagnoseNoFan(detail, context);
    case SYMPTOM.FLOAT_SWITCH: return diagnoseFloatSwitch(detail, context);
    case SYMPTOM.ZONING:       return diagnoseZoning(detail, context);
    case SYMPTOM.A2L_SAFETY:   return diagnoseA2LSafety(detail, context);
    case SYMPTOM.TSTAT:             return diagnoseTstat(detail, context);
    case SYMPTOM.CONDENSER_NO_START:return diagnoseCondenserNoStart(detail, context);
    default:
      return {
        title: "Diagnóstico General",
        severity: "info",
        summary: "Selecciona un síntoma específico para obtener pasos de diagnóstico.",
        steps: [],
        equipmentNotes: [],
        faultCodeInfo: null,
      };
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function step(n, action, detail = null, tool = null, branches = null) {
  return { step: n, action, detail, tool, branches };
}

// branches format:
// { question: "¿Hay 24V?", yes: { label:"Sí", steps:[] }, no: { label:"No", steps:[] } }
function branch(question, yesLabel, yesSteps, noLabel, noSteps) {
  return { question, yes: { label: yesLabel, steps: yesSteps }, no: { label: noLabel, steps: noSteps } };
}

function equipmentNote(label, text) {
  return { label, text };
}

function getFaultCodeInfo(heaterObj, codeStr) {
  if (!heaterObj || !codeStr) return null;
  const ref   = heaterObj.faultCodeRef;
  const board = faultCodes[ref];
  if (!board) return null;
  const normalized = codeStr.trim().toUpperCase();
  const code = board.codes[normalized] || board.codes[codeStr.trim()];
  if (!code) return null;
  return { board: board.boardName, code: normalized, ...code };
}

// Guess board from context when no heater selected
function guessBoardRef(context) {
  if (context.heater?.faultCodeRef) return context.heater.faultCodeRef;
  return null;
}

// Search all boards for a code string
function searchAllBoards(codeStr) {
  const normalized = codeStr.trim().toUpperCase();
  const results = [];
  for (const [boardKey, boardData] of Object.entries(faultCodes)) {
    const match = boardData.codes[normalized] || boardData.codes[codeStr.trim()];
    if (match) {
      results.push({ board: boardData.boardName, code: normalized, ...match });
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// DIAGNOSE: NO COOLING
// ─────────────────────────────────────────────
function diagnoseNoCooling(detail, ctx) {
  const steps = [];
  const notes = [];
  let severity = "warning";
  let i = 1;

  // 1. Float switch check first (common culprit)
  if (ctx.hasFloatSwitch) {
    steps.push(step(i++, "Verificar Float Switch", "Si el pan de condensado está lleno, el float switch abre el circuito Y1 y el sistema no enfría aunque todo lo demás esté bien.", "visual"));
    steps.push(step(i++, "Drenar el pan de condensado", "Usa shop vac o taza. Después del drenaje, el sistema debe arrancar en ~30 segundos.", null));
    notes.push(equipmentNote("Float Switch", accessories["Float Switch"].troubleshootingNotes));
  }

  // 2. A2L safety / Trane Harness check
  if (ctx.isA2L && ctx.hasTraneHarness) {
    severity = "critical";
    steps.push(step(i++, "Verificar código E6 en furnace board", "E6 = Refrigerant leak detected. El harness puede abrir Y1 por false positive (flux, polvo, pintura en sensor del evap coil).", "visual"));
    steps.push(step(i++, "Verificar continuidad del Trane Harness", "Con multímetro en continuidad: del terminal de entrada al terminal de salida del harness. Si está abierto → revisar conexiones del harness al furnace board.", "multimeter"));
    notes.push(equipmentNote("Trane Harness (A2L)", accessories["Trane Harness"].troubleshootingNotes));
  }

  if (ctx.isA2L && ctx.hasEcoilWire) {
    severity = "critical";
    steps.push(step(i++, "Verificar Ecoil Wire (sensor de fuga)", "Revisar que el sensor esté correctamente asentado en el bracket del evap coil. False positives comunes en new construction.", "visual"));
    notes.push(equipmentNote("Ecoil Wire", accessories["Ecoil Wire"].troubleshootingNotes));
  }

  // 3. Thermostat check
  if (ctx.tstatKey === "Ecobee") {
    steps.push(step(i++, "Revisar Ecobee app — verificar overrides activos", "Ir a Settings → Preferences en la app. Un override puede estar bloqueando la llamada de cooling.", "app"));
    steps.push(step(i++, "En Ecobee: verificar que el setpoint de cooling sea menor a la temp del cuarto", null, "visual"));
  }
  steps.push(step(i++, "Confirmar modo Cool en tstat y setpoint abajo de temp ambiente", null, "visual"));

  // 4. Zoning check
  if (ctx.hasZoning && ctx.zoningBoard) {
    steps.push(step(i++, `Verificar señal en zone board (${ctx.zoningBoard.name})`, "Con multímetro: medir entre Y1-OUT y C en el zone board. Debe haber 24VAC cuando el tstat pide cooling.", "multimeter"));
    if (ctx.zoningBoardKey === "HZ322") {
      notes.push(equipmentNote("HZ322", ctx.zoningBoard.troubleshootingNotes));
    }
  }

  // 5. Power at outdoor unit
  steps.push(step(i++, "Verificar alimentación eléctrica en condensadora", "Medir L1-L2 en disconnect. Debe ser 208-240VAC. Revisar fuses del disconnect.", "multimeter"));

  // 6. Contactor — medir 24V bobina
  steps.push(step(i++, "Medir 24VAC en bobina del contactor (A1-A2) en condensadora", "Con el sistema llamando cooling: medir entre A1 y A2 del contactor. Resultado determina si la señal llega o no a la unidad exterior.", "multimeter"));

  // 7. BRANCH — 24V at contactor?
  steps.push(step(i++,
    "Medir 24VAC en bornes Y y C del furnace board — terminales de salida hacia condensadora",
    "Con el tstat llamando cooling: medir Y-C en los bornes de salida del furnace board (el cable que va al outdoor unit).",
    "multimeter",
    branch(
      "¿Hay 24VAC en Y-C en los bornes de salida del furnace board?",
      "Sí — hay 24V en el board",
      [
        { step: "A", action: "El board funciona — problema en el cable o conexiones exteriores", detail: "La señal sale del board pero no llega al contactor. Rastrear el cable low voltage entre furnace y condensadora.", tool: null },
        { step: "B", action: "Verificar continuidad del cable Y de furnace a condensadora", detail: "Apagar sistema. Desconectar cable Y en ambos extremos. Multímetro en continuidad: punta a punta. Sin continuidad → cable cortado, stapled-through, o terminal dañado. Revisar recorrido en attic y cerca del outdoor unit.", tool: "multimeter" },
        { step: "C", action: "Verificar continuidad del cable C (común)", detail: "Sin C funcional el circuito no cierra aunque Y tenga señal. Mismo procedimiento: desconectar ambos extremos, medir continuidad. En new construction el C frecuentemente queda suelto en la condensadora.", tool: "multimeter" },
        { step: "D", action: "Revisar conexiones Y y C en el control board de la condensadora", detail: "Con continuidad confirmada: verificar que los cables estén firmemente apretados en los terminales. Terminal flojo o mal pelado es la causa más frecuente en new construction.", tool: "visual" },
      ],
      "No — no hay 24V en el board",
      [
        { step: "A", action: "Revisar fusible de baja tensión en el furnace board", detail: "Buscar fusible 3A o 5A (generalmente amarillo o azul, marcado FUSE). Medir continuidad. Si quemado: antes de reemplazar, desconectar cable Y del outdoor unit para verificar que no haya cortocircuito en el exterior.", tool: "visual" },
        { step: "B", action: "Leer fault codes en el furnace board", detail: "Un fault activo puede bloquear la salida Y aunque haya señal entrando. Contar blinks del LED o leer display LCD.", tool: "visual" },
        { step: "C", action: "Verificar señal Y en la entrada del board — medir Y-C en input", detail: "Si hay 24V entrando pero no saliendo con fusible OK y sin fault codes → el board no está cerrando el relay internamente → board dañado.", tool: "multimeter" },
        { step: "D", action: "Confirmar señal Y en el tstat — medir Y-C directamente en los cables del tstat", detail: "Si no hay señal en el input del board: rastrear hacia el tstat. Verificar modo Cool, setpoint correcto, y que el tstat tenga voltaje R-C.", tool: "multimeter" },
      ]
    )
  ));

  // 8. Refrigerant hint
  steps.push(step(i++, "Si condensadora arranca pero no enfría — conectar manómetros", `Verificar presiones y subcooling. ${ctx.outdoor ? `OEM subcooling goal: ${ctx.outdoor.subcooling}°F. Refrigerante: ${ctx.outdoor.freon}.` : "Confirmar tipo de refrigerante antes de conectar manómetros."}`, "gauges"));

  // Equipment-specific notes
  if (ctx.heater) {
    notes.push(equipmentNote(
      ctx.heaterModel,
      `Board: ${ctx.heater.boardType} | Fault ref: ${ctx.heater.faultCodeRef}${ctx.heater.isA2L ? " | ⚠️ A2L System" : ""}`
    ));
  }
  if (ctx.outdoor) {
    notes.push(equipmentNote(
      ctx.outdoorModel,
      `${ctx.outdoor.tons} ton | ${ctx.outdoor.freon} | Factory charge: ${ctx.outdoor.FactoryCharge} oz | Subcooling goal: ${ctx.outdoor.subcooling}°F`
    ));
  }

  return {
    title: "No Enfría — Diagnóstico",
    severity,
    summary: `Árbol de diagnóstico para no-cooling${ctx.isA2L ? " (sistema A2L)" : ""}. Seguir en orden.`,
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: NO HEATING
// ─────────────────────────────────────────────
function diagnoseNoHeating(detail, ctx) {
  const steps = [];
  const notes = [];
  const severity = "warning";
  let i = 1;

  steps.push(step(i++, "Leer fault codes en furnace board", "Observar el LED de diagnóstico. Contar los blinks o leer el display LCD.", "visual"));

  if (ctx.heater?.faultCodeRef) {
    const board = faultCodes[ctx.heater.faultCodeRef];
    if (board) {
      notes.push(equipmentNote(`Fault Codes — ${board.boardName}`, Object.entries(board.codes).map(([k, v]) => `${k}: ${v.description}`).join(" | ")));
    }
  }

  steps.push(step(i++, "Confirmar gas: verificar válvula de gas abierta y presión", "Con manómetro de gas: supply debe ser 7\" WC (nat gas) o 11\" WC (LP). Manifold: 3.5\" WC (nat) o 10\" WC (LP).", "gas manometer"));
  steps.push(step(i++, "Verificar ignitor (hot surface ignitor)", "Con multímetro en ohms: resistencia normal 40-100Ω. Si está abierto → ignitor malo.", "multimeter"));
  steps.push(step(i++, "Verificar flame sensor", "Limpiar con lija fina 400 grit. Medir microamperaje durante ignición: debe ser >1μA.", "multimeter"));
  steps.push(step(i++, "Revisar limit switch", "Con multímetro en continuidad. Si está abierto con el sistema frío → stuck open → reemplazar. Causa común: airflow restringido.", "multimeter"));
  steps.push(step(i++, "Revisar presostato de tiro inducido (inducer pressure switch)", "Soplar suavemente en el tubo de presión del presostato para verificar que cierre. Verificar que el tubo no esté obstruido.", "visual"));
  steps.push(step(i++, "Verificar voltaje en W1 del furnace board", "Con el tstat pidiendo calor: debe haber 24VAC en W1-C.", "multimeter"));

  if (ctx.heater) {
    notes.push(equipmentNote(
      ctx.heaterModel,
      `${ctx.heater.hType} | ${ctx.heater.brand} | Board: ${ctx.heater.boardType}`
    ));
  }

  return {
    title: "No Calienta — Diagnóstico",
    severity,
    summary: "Diagnóstico de falla de calefacción. Revisar fault codes primero.",
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: FAULT CODE LOOKUP
// ─────────────────────────────────────────────
function diagnoseFaultCode(codeStr, ctx) {
  if (!codeStr || !codeStr.trim()) {
    return {
      title: "Lookup de Fault Code",
      severity: "info",
      summary: "Ingresa el código de falla para ver su descripción y pasos.",
      steps: [],
      equipmentNotes: [],
      faultCodeInfo: null,
    };
  }

  let codeInfo = null;
  const steps = [];
  const notes = [];
  let severity = "info";

  // Try with known heater board first
  if (ctx.heater) {
    codeInfo = getFaultCodeInfo(ctx.heater, codeStr);
  }

  // Fall back to searching all boards
  if (!codeInfo) {
    const allMatches = searchAllBoards(codeStr);
    if (allMatches.length > 0) codeInfo = allMatches[0];
  }

  if (!codeInfo) {
    return {
      title: `Código "${codeStr}" — No encontrado`,
      severity: "info",
      summary: `No se encontró el código "${codeStr}" en la base de datos. Verifica el modelo del equipo o consulta el manual.`,
      steps: [
        step(1, "Verificar modelo exacto del furnace/air handler", null, "visual"),
        step(2, "Consultar manual de instalación del equipo", null, "visual"),
        step(3, "Si el problema persiste → usar Ask Claude para diagnóstico asistido", null, null),
      ],
      equipmentNotes: [],
      faultCodeInfo: null,
    };
  }

  severity = codeInfo.severity === "critical" ? "critical" : codeInfo.severity === "fault" ? "warning" : "info";

  // Code-specific step trees
  const codeUpper = codeInfo.code;

  if (codeUpper === "E6") {
    steps.push(step(1, "E6 = Refrigerant leak detected (A2L safety)", "El sensor del evap coil detectó fuga o tiene circuito abierto. En new construction es común un false positive por flux, polvo o pintura en el sensor.", "visual"));
    steps.push(step(2, "Verificar continuidad del Trane Harness", "Multímetro en continuidad entre extremos del harness. Si está abierto: revisar conexiones en el furnace board y en el harness.", "multimeter"));
    steps.push(step(3, "Verificar que el sensor del evap coil esté bien asentado en el bracket", "El sensor debe estar firmemente encajado, no colgando.", "visual"));
    steps.push(step(4, "Si continuidad del harness está bien: bypass temporal del sensor para verificar si es false positive", "SOLO para diagnóstico — no dejar bypasseado en new construction.", "multimeter"));
    if (ctx.heater) notes.push(equipmentNote("A2L Safety", accessories["Trane Harness"]?.troubleshootingNotes || ""));
  } else if (codeUpper === "E4" || codeUpper === "5F" || codeUpper === "6") {
    steps.push(step(1, "Falla de ignición — verificar gas", "Confirmar que la válvula de gas esté abierta. Escuchar si el inducer arranca y el ignitor se pone rojo.", "visual"));
    steps.push(step(2, "Revisar ignitor (hot surface ignitor)", "Resistencia: 40-100Ω. Si abierto → reemplazar.", "multimeter"));
    steps.push(step(3, "Revisar flame sensor", "Limpiar con lija 400 grit. Microamperaje mínimo: 1μA durante ignición.", "multimeter"));
    steps.push(step(4, "Verificar presión de gas en manifold", "Gas natural: 3.5\" WC | LP: 10\" WC", "gas manometer"));
  } else if (codeUpper === "E3" || codeUpper === "4" || codeUpper === "3F") {
    steps.push(step(1, "Limit switch abierto — verificar airflow", "Causa más común: filtro sucio o blower no arrancando. Verificar que el blower funcione.", "visual"));
    steps.push(step(2, "Con sistema frío: medir continuidad del limit switch", "Si está abierto con el equipo frío → stuck open → reemplazar.", "multimeter"));
    steps.push(step(3, "Verificar registro del duct system — sin registros cerrados", null, "visual"));
  } else if (codeUpper === "E2" || codeUpper === "2" || codeUpper === "2F") {
    steps.push(step(1, "Presostato de tiro inducido — verificar inducer", "El inducer debe arrancar antes de que se haga la llamada de gas. Escuchar si arranca.", "visual"));
    steps.push(step(2, "Soplar suavemente en el tubo de presión del presostato", "Si cierra → tubo puede estar obstruido. Limpiar tubo.", "visual"));
    steps.push(step(3, "Verificar que el venting esté sin obstrucciones", "Revisar PVC de venting en exterior — sin nidos, hojas, o agua.", "visual"));
  } else if (codeUpper === "E9") {
    steps.push(step(1, "Comunicación perdida — verificar cableado de control", "Revisar conexión de C (common) al furnace board. Sin C → el tstat no tiene referencia.", "multimeter"));
    steps.push(step(2, "Si hay zone board: verificar que el board tenga alimentación 24VAC", "Medir R-C en el zone board: debe ser 24VAC.", "multimeter"));
    if (ctx.hasZoning) notes.push(equipmentNote("Zone Board", ctx.zoningBoard?.troubleshootingNotes || "Revisar cableado R-C del zone board."));
  } else {
    steps.push(step(1, `${codeInfo.description}`, "Referirse a este código en el manual del board para pasos adicionales.", "visual"));
    steps.push(step(2, "Tomar foto del LED/display con el código activo para documentación", null, "visual"));
  }

  if (ctx.heater) {
    notes.push(equipmentNote(ctx.heaterModel, `Board: ${ctx.heater.boardType} | Board ref: ${codeInfo.board}`));
  }

  return {
    title: `Código ${codeInfo.code} — ${codeInfo.severity.toUpperCase()}`,
    severity,
    summary: codeInfo.description,
    steps,
    equipmentNotes: notes,
    faultCodeInfo: codeInfo,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: NO FAN
// ─────────────────────────────────────────────
function diagnoseNoFan(detail, ctx) {
  const steps = [];
  const notes = [];
  let i = 1;

  steps.push(step(i++, "Confirmar que hay llamada de fan (G) en el furnace board", "Medir G-C: debe ser 24VAC cuando el tstat envía señal de fan.", "multimeter"));
  steps.push(step(i++, "Revisar si hay fault code en el board", "El board puede estar en fault y no arrancar el blower. Leer LEDs.", "visual"));
  steps.push(step(i++, "Verificar alimentación 120/240VAC al blower motor", "Sin voltaje: revisar breaker del air handler / furnace.", "multimeter"));
  steps.push(step(i++, "Capacitor del blower motor", "Medir capacitancia con multímetro en modo CAP. Si está fuera de ±10% del valor nominal → reemplazar.", "multimeter"));
  steps.push(step(i++, "Si el motor tiene voltaje y buen capacitor pero no arranca → blower motor malo", null, "visual"));

  if (ctx.tstatKey === "Ecobee") {
    notes.push(equipmentNote("Ecobee", "Verificar que el fan schedule en la app no tenga override de 'Fan Off'. En algunos casos la app puede silenciar el fan."));
  }

  return {
    title: "Fan No Arranca — Diagnóstico",
    severity: "warning",
    summary: "Diagnóstico para blower que no arranca.",
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: FLOAT SWITCH
// ─────────────────────────────────────────────
function diagnoseFloatSwitch(detail, ctx) {
  const steps = [];

  steps.push(step(1, "Verificar nivel de agua en el condensate pan", "Si está lleno → sistema no enfriará hasta drenar. El float switch está en serie con Y1.", "visual"));
  steps.push(step(2, "Drenar el pan con shop vac o jeringa", "Después del drenaje: esperar 30 segundos y verificar que el sistema arranque.", null));
  steps.push(step(3, "Revisar por qué se llenó el pan", "Causa probable: línea de drenaje obstruida. Soplar con nitrógeno desde el interior hacia el exterior.", null));
  steps.push(step(4, "Verificar continuidad del float switch (con pan vacío)", "Con el pan vacío: el switch debe estar cerrado (continuidad). Si está abierto con pan vacío → switch malo.", "multimeter"));
  steps.push(step(5, "Confirmar que el switch está instalado en serie con Y1 o en el terminal correcto del furnace board", null, "visual"));

  return {
    title: "Float Switch — Diagnóstico",
    severity: "warning",
    summary: "El float switch interrumpe la llamada de cooling cuando el pan de condensado se llena.",
    steps,
    equipmentNotes: [equipmentNote("Float Switch", accessories["Float Switch"]?.troubleshootingNotes || "")],
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: ZONING ISSUE
// ─────────────────────────────────────────────
function diagnoseZoning(detail, ctx) {
  const steps = [];
  const notes = [];
  let i = 1;

  if (!ctx.hasZoning) {
    return {
      title: "Zoning — Sin zone board registrado",
      severity: "info",
      summary: "No se detectó un zone board en el job actual. Asegúrate de seleccionar el zoning board en Accessories.",
      steps: [step(1, "Agregar el zone board en la sección de Accessories del job", null, null)],
      equipmentNotes: [],
      faultCodeInfo: null,
    };
  }

  steps.push(step(i++, "Verificar alimentación del zone board: R-C debe ser 24VAC", null, "multimeter"));
  steps.push(step(i++, "Confirmar que el tstat está enviando señal Y1 al zone board (no directo a condensadora)", "En sistemas zonificados, Y1 del tstat va al zone board, el zone board sale por Y1-OUT hacia la condensadora.", "multimeter"));
  steps.push(step(i++, "Medir Y1-OUT vs C en el zone board durante llamada de cooling", "Si hay 24VAC en Y1-OUT → el board está enviando señal. Si no la hay → revisar zonas y dampers.", "multimeter"));
  steps.push(step(i++, "Verificar que todas las zonas tengan al menos 1 zona abierta (bypass damper activo)", "Si todas las zonas están cerradas, el bypass damper debe abrir para proteger el equipo.", "visual"));

  if (ctx.zoningBoardKey === "HZ322") {
    steps.push(step(i++, "HZ322 — Verificar DIP switch configuración", "Revisar DIP switches para modo heat pump vs convencional si aplica.", "visual"));
    notes.push(equipmentNote("HZ322 Terminal Map", Object.entries(zoningBoards.HZ322.terminalMap).map(([k,v]) => `${k}: ${v}`).join(" | ")));
    notes.push(equipmentNote("HZ322 Troubleshooting", zoningBoards.HZ322.troubleshootingNotes));
  }

  if (ctx.zoningBoardKey === "UT3000") {
    notes.push(equipmentNote("UT3000", zoningBoards.UT3000.troubleshootingNotes));
  }

  if (ctx.tstatKey === "Ecobee") {
    notes.push(equipmentNote("Ecobee + Zoning", thermostats.Ecobee.troubleshootingNotes));
  }

  return {
    title: `Zoning Issue — ${ctx.zoningBoard?.name || "Zone Board"}`,
    severity: "warning",
    summary: "Diagnóstico de problemas de zonificación. Verificar señales de control en el zone board.",
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: A2L SAFETY
// ─────────────────────────────────────────────
function diagnoseA2LSafety(detail, ctx) {
  const steps = [];
  const notes = [];
  let i = 1;

  if (!ctx.isA2L) {
    return {
      title: "A2L Safety — Sin sistema A2L detectado",
      severity: "info",
      summary: "El equipo actual no está marcado como A2L (R-454B o R-32). Si el equipo es A2L, verifica que tengas el modelo correcto seleccionado.",
      steps: [],
      equipmentNotes: [],
      faultCodeInfo: null,
    };
  }

  steps.push(step(i++, "Leer fault codes en furnace board", "En Trane S8X1/S8X2: buscar E6 (Refrigerant leak detected). Si hay E6 → el sensor del evap coil abrió el circuito.", "visual"));
  steps.push(step(i++, "Verificar el sensor del evap coil", "El sensor debe estar bien asentado en el bracket interno del evap coil. En new construction: flux, pintura o polvo pueden causar false positive.", "visual"));
  steps.push(step(i++, "Verificar continuidad del harness A2L", ctx.hasTraneHarness ? "Trane Harness: medir continuidad de extremo a extremo." : "Ecoil Wire: medir continuidad del sensor al board.", "multimeter"));
  steps.push(step(i++, "Verificar circuito completo: Tstat → Zone Board → Harness → Furnace Board → Condensadora", "Cualquier punto abierto en este circuito corta la llamada de cooling.", "multimeter"));
  steps.push(step(i++, "Si es false positive confirmado: documentar y reportar al supervisor", "En new construction es esperado — el sensor se limpiará una vez que el sistema haya corrido y el flux evaporado.", null));

  if (ctx.hasTraneHarness) {
    notes.push(equipmentNote("Trane Harness", accessories["Trane Harness"].troubleshootingNotes));
    notes.push(equipmentNote("Circuit Path", accessories["Trane Harness"].circuitPath));
  }
  if (ctx.hasEcoilWire) {
    notes.push(equipmentNote("Ecoil Wire", accessories["Ecoil Wire"].troubleshootingNotes));
  }
  if (ctx.heater) {
    const board = faultCodes[ctx.heater.faultCodeRef];
    if (board?.codes?.["E6"]) {
      notes.push(equipmentNote("E6 — Board Ref", board.codes["E6"].description));
    }
  }

  return {
    title: "A2L Safety — Diagnóstico",
    severity: "critical",
    summary: "Sistema con refrigerante A2L (R-454B). Los dispositivos de seguridad pueden cortar la llamada de cooling.",
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: CONDENSER NO START — no 24V at contactor
// Precondition: blower runs, tstat calls for cooling
// Focus: Y-circuit path from furnace board → outdoor unit
// ─────────────────────────────────────────────
function diagnoseCondenserNoStart(_detail, ctx) {
  const steps = [];
  const notes = [];
  let i = 1;
  let severity = "warning";

  // Context banner
  notes.push(equipmentNote(
    "Condición confirmada",
    "Blower opera ✓ | Tstat llama cooling ✓ | Sin 24V en bobina del contactor ✗ — rastrear circuito Y desde tstat hasta condensadora."
  ));

  // Step 1 — Confirm tstat IS sending Y
  steps.push(step(i++,
    "Confirmar señal Y en el tstat — medir Y a C",
    "Con el tstat en modo Cool y setpoint bajo la temp ambiente: medir entre terminal Y y C directamente en los cables del tstat. Debe ser 24VAC. Si no hay voltaje aquí → problema en el tstat mismo.",
    "multimeter"
  ));

  // Step 2 — Float switch (interrupts Y before board)
  if (ctx.hasFloatSwitch) {
    severity = "warning";
    steps.push(step(i++,
      "Float Switch — verificar que el pan esté vacío y el switch cerrado",
      "El float switch está en serie con Y. Con pan vacío, medir continuidad del switch: debe estar cerrado. Si está abierto con pan vacío → switch malo. Si el pan tiene agua → drenar primero.",
      "multimeter"
    ));
  }

  // Step 3 — Y arrives at furnace board input
  steps.push(step(i++,
    "Confirmar Y llega al furnace board — medir Y-C en terminales de entrada del board",
    "Medir en los terminales del furnace board donde llega el cable del tstat (Y y C). 24VAC confirma que la señal llegó. Sin voltaje aquí: revisar cableado entre tstat y board (posible cable dañado, terminal flojo o float switch interrumpiendo).",
    "multimeter"
  ));

  // Step 4 — A2L harness check (sits between board and Y-out)
  if (ctx.isA2L && ctx.hasTraneHarness) {
    severity = "critical";
    steps.push(step(i++,
      "Trane Harness (A2L) — verificar continuidad del harness",
      "El Trane Harness está en serie con Y entre el furnace board y la condensadora. Con el sistema apagado y harness desconectado: medir continuidad de extremo a extremo. Si está abierto → revisar conexiones en ambos extremos o reemplazar harness. Causa en new construction: falso positivo del sensor del evap coil (E6).",
      "multimeter"
    ));
    notes.push(equipmentNote("Trane Harness (A2L)", accessories["Trane Harness"]?.troubleshootingNotes || ""));
    notes.push(equipmentNote("Circuito Y completo", accessories["Trane Harness"]?.circuitPath || "Tstat Y → Float Sw → Zone Board Y1-OUT → Trane Harness → Furnace Board Y-out → Cable low voltage → Contactor A1-A2"));
  }

  // Step 5 — Zone board Y1-OUT
  if (ctx.hasZoning && ctx.zoningBoard) {
    steps.push(step(i++,
      `Zone Board (${ctx.zoningBoard.name}) — medir Y1-OUT vs C`,
      "Con el tstat pidiendo cooling: medir entre Y1-OUT y C en el zone board. 24VAC = board está pasando la señal. Sin voltaje: revisar que al menos una zona esté llamando y que el board tenga alimentación R-C.",
      "multimeter"
    ));
  }

  // Step 6 — KEY BRANCH: 24V at furnace board Y output?
  steps.push(step(i++,
    "Medir 24V en terminales de salida del furnace board — bornes Y y C hacia condensadora",
    "Con el tstat llamando cooling: medir entre Y y C en los terminales del board donde conecta el cable que va al outdoor unit. Este resultado determina si el problema está en el board o en el cable exterior.",
    "multimeter",
    branch(
      "¿Hay 24VAC en Y-C en los bornes de salida del furnace board?",
      "Sí — hay 24V en el board",
      [
        { step: "A", action: "El board está funcionando — el problema está en el cable o conexiones exteriores", detail: "La señal sale del board pero no llega al contactor. Rastrear el cable low voltage.", tool: null },
        { step: "B", action: "Verificar continuidad del cable Y de furnace a condensadora", detail: "Apagar sistema. Desconectar cable Y en AMBOS extremos. Multímetro en continuidad: punta a punta del cable. Sin continuidad → cable cortado, stapled-through, o terminal oxidado. Revisar recorrido en attic y cerca del outdoor unit.", tool: "multimeter" },
        { step: "C", action: "Verificar continuidad del cable C (común)", detail: "Sin cable C funcional el circuito no cierra aunque Y tenga señal. Mismo procedimiento: desconectar ambos extremos, medir continuidad. En new construction: C frecuentemente queda suelto en la condensadora.", tool: "multimeter" },
        { step: "D", action: "Revisar conexiones en la condensadora — terminales Y y C", detail: "Con continuidad confirmada: verificar que los cables estén firmemente apretados en los terminales del control board de la condensadora. Terminal flojo o mal pelado es la causa más frecuente en new construction.", tool: "visual" },
      ],
      "No — no hay 24V en el board",
      [
        { step: "A", action: "Revisar fusible de baja tensión en el furnace board", detail: "Buscar fusible 3A o 5A en el board (marcado FUSE, generalmente amarillo o azul). Medir continuidad del fusible. Si está quemado: antes de reemplazarlo, desconectar el cable Y del outdoor unit y verificar que no haya cortocircuito en el cableado exterior que lo haya quemado.", tool: "visual" },
        { step: "B", action: "Confirmar que la señal Y llega a la entrada del board — medir Y-C en input", detail: "Medir en los terminales de entrada del board (lado del tstat). Si hay 24V entrando pero no saliendo con fusible OK → el board no está pasando la señal → board dañado o en fault.", tool: "multimeter" },
        { step: "C", action: "Leer fault codes en el board", detail: "Un fault code activo puede bloquear la salida Y. Contar los blinks del LED de diagnóstico o leer el display LCD y buscar el código.", tool: "visual" },
        { step: "D", action: "Si fusible OK, señal llega al board, y no hay fault code → board dañado", detail: "El board no está cerrando el relay de Y internamente. Requiere reemplazo del control board.", tool: null },
      ]
    )
  ));

  // Step 10 — Connections at outdoor unit
  steps.push(step(i++,
    "Revisar conexiones en la condensadora — terminales Y y C en el control board",
    "Verificar que los cables Y y C estén firmemente conectados en los terminales del control board de la condensadora. Terminal flojo o mal pelado es la causa más frecuente en new construction.",
    "visual"
  ));

  // Step 11 — 240V at outdoor unit (sanity check)
  steps.push(step(i++,
    "Verificar alimentación 240VAC en el disconnect de la condensadora",
    "Aunque el contactor no tenga 24V, confirmar que llega 240V al disconnect. Medir L1-L2: debe ser 208-240VAC. Sin voltaje: revisar breaker dedicado del outdoor unit.",
    "multimeter"
  ));

  // Equipment notes
  if (ctx.outdoor) {
    notes.push(equipmentNote(
      ctx.outdoorModel,
      `${ctx.outdoor.tons} ton | ${ctx.outdoor.freon} | Contactor: medir 24VAC entre A1-A2 durante llamada de cooling`
    ));
  }
  if (ctx.heater) {
    notes.push(equipmentNote(
      ctx.heaterModel,
      `Board: ${ctx.heater.boardType}${ctx.heater.isA2L ? " | ⚠️ A2L — Trane Harness en circuito Y" : ""}`
    ));
  }

  return {
    title: "Condensadora No Arranca — Sin 24V en Contactor",
    severity,
    summary: "Blower corre y tstat llama cooling pero la unidad exterior no arranca. Árbol de continuidad del circuito Y: tstat → furnace board → cable low voltage → contactor.",
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}

// ─────────────────────────────────────────────
// DIAGNOSE: TSTAT ISSUE
// ─────────────────────────────────────────────
function diagnoseTstat(detail, ctx) {
  const steps = [];
  const notes = [];
  let i = 1;

  steps.push(step(i++, "Verificar que el tstat tenga voltaje — medir Rc-C o R-C", "Debe ser 24VAC. Sin voltaje: revisar transformer del furnace y fusible de baja tensión.", "multimeter"));
  steps.push(step(i++, "Verificar que el modo y setpoint sean correctos", "Cooling: setpoint < temp ambiente. Heating: setpoint > temp ambiente.", "visual"));

  if (ctx.tstatKey === "Ecobee") {
    steps.push(step(i++, "Ecobee: revisar la app — verificar que no haya override activo", "Ir a la app Ecobee → menú principal → ver si hay 'Hold' o 'Away' activo.", "app"));
    steps.push(step(i++, "Ecobee: verificar instalación del PEK si no hay terminal C disponible", "Sin C: el tstat no tiene referencia de retorno. El PEK es el Power Extender Kit.", "visual"));
    notes.push(equipmentNote("Ecobee", thermostats.Ecobee.troubleshootingNotes));
    notes.push(equipmentNote("Ecobee Terminals", Object.entries(thermostats.Ecobee.terminalMap).map(([k,v]) => `${k}: ${v}`).join(" | ")));
  }

  if (ctx.tstatKey === "Daikin One") {
    steps.push(step(i++, "Daikin One: compatible exclusivo con sistemas Daikin Fit", "Verificar que el sistema outdoor sea Daikin Fit compatible.", "visual"));
    notes.push(equipmentNote("Daikin One+", thermostats["Daikin One"].notes));
  }

  steps.push(step(i++, "Verificar señal Y1 en bornes del tstat durante llamada de cooling", "Con tstat pidiendo cooling: medir Y1-C. Debe ser 24VAC.", "multimeter"));
  steps.push(step(i++, "Verificar señal W1 en bornes del tstat durante llamada de calor", "Con tstat pidiendo calor: medir W1-C. Debe ser 24VAC.", "multimeter"));

  if (ctx.hasZoning) {
    steps.push(step(i++, "Con zoning: confirmar que Y1 del tstat va al zone board, NO directo a la condensadora", null, "visual"));
  }

  if (ctx.tstat) {
    notes.push(equipmentNote(ctx.tstatKey, `${ctx.tstat.brand} ${ctx.tstat.name} | Heat pump ready: ${ctx.tstat.heatPumpReady} | Zoning ready: ${ctx.tstat.zoningReady}`));
  }

  return {
    title: "Thermostat — Diagnóstico",
    severity: "info",
    summary: "Diagnóstico de problemas de termostato y señales de control.",
    steps,
    equipmentNotes: notes,
    faultCodeInfo: null,
  };
}
