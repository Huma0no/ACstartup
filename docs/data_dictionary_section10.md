## 10. Display Strings — label vs report

Cada item del catálogo (Service, Accessory, Fix) tiene dos representaciones
de texto con propósitos distintos.

### Definiciones

| Campo    | Audiencia            | Contexto                      | Características                            |
|----------|----------------------|-------------------------------|--------------------------------------------|
| `label`  | Técnico en campo     | Chip / botón en la UI         | Corto, reconocible, lenguaje técnico       |
| `report` | Supervisor / CSV     | Texto del completion report   | Descriptivo, completo, legible por todos   |

### Regla
Nunca usar el mismo string para ambos propósitos.
Si `label` y `report` son idénticos hoy, es deuda técnica — documentar y
corregir antes de que el catálogo crezca.

### Estructura en data.js

```javascript
// Antes (incorrecto) — un string, dos usos:
FIX_DISPLAY[FIXES.OPEN_ECOIL] = "opened ecoil to pull out sensor wire"

// Después (correcto) — dos strings, dos trabajos:
FIX_DISPLAY[FIXES.OPEN_ECOIL] = {
  label:  "Open Ecoil",
  report: "I had to open the ecoil to pull out the sensor wire"
}
```

### Consumidores

| Campo    | Lo usa                                                    |
|----------|-----------------------------------------------------------|
| `label`  | `app.js` — construye chips y botones en la UI             |
| `report` | `reports.js` — genera `reportText` y columnas CSV         |

---

### Catálogo — Services

Los toggles (Temporarily, 2 Systems) no tienen label/report propios —
modifican el string del servicio activo según las reglas definidas en §7.

| Clave        | label       | report                              | Notas                                              |
|--------------|-------------|-------------------------------------|----------------------------------------------------|
| AC           | "AC"        | "AC started"                        | Temporarily → "AC (Temporarily) started"           |
| HEAT         | "Heat"      | "Heat started"                      | Temporarily → "Heat (Temporarily) started"         |
| AC_HEAT      | —           | "AC & Heat started"                 | Generado internamente cuando AC + Heat activos     |
| FINISH       | "Finish"    | "Finish/ [servicio activo]"         | Ver reglas de Finish abajo                         |
| PRESTART     | "Prestart"  | "System Prestarted"                 | —                                                  |
| DRIVE_RUN    | "Drive Run" | "Drive Run"                         | 2 Systems nunca aplica                             |
| CANCEL       | "Cancel"    | "service canceled"                  | Anula todo cobro                                   |

#### Reglas de Finish

- Finish es un **flag de contexto** — no modifica cómo se construye el reporte
- El reporte se construye con las mismas reglas con o sin Finish activo
- La única diferencia es que Finish agrega el prefijo "Finish/" al string del servicio activo
- Finish no tiene precio propio — el precio viene de los items activos
- El botón Finish se deshabilita si el workspace está completamente vacío
- Temporarily es edge case no prohibido con Finish

**Items que Finish modifica cuando están activos:**
- AC / Heat → precio cambia de $30 a $20, texto cambia a "Finish/ AC started"
- Weight-In → agrega $10 addon (regla independiente, no relacionada con el prefijo)

**Acompañantes válidos de Finish — jerarquía de prioridad:**

| Prioridad | Acompañante        | Report string de Finish             | Precio |
|-----------|--------------------|-------------------------------------|--------|
| 1         | AC y/o Heat        | "Finish/ AC started"                | $20    |
| 1         | AC + Heat          | "Finish/ AC & Heat started"         | $20    |
| 2         | Notes              | "Finish/ [texto de notes]"          | $0     |
| 3         | Other (Acc o Fix)  | "Finish/ [texto de Other]"          | custom |
| —         | Nada activo        | Finish se ignora, no aparece        | —      |

> Si hay múltiples acompañantes activos, Finish toma el de mayor prioridad.
> El resto de items aparecen como líneas independientes en el reporte, sin relación con Finish.
> Fixes y Accessories (excepto Other) nunca son acompañantes de Finish — siempre son items independientes.

---

### Catálogo — Accessories

| Clave               | label              | report                                  | Precio  | Notas                          |
|---------------------|--------------------|-----------------------------------------|---------|--------------------------------|
| UT3000              | "UT3000"           | "UT3000 zone board"                     | $30     | Companion: DAPC, eBypass, Ecoil Wire |
| HZ322               | "HZ322"            | "HZ322 zone board"                      | $30     | Companion: Bypass              |
| HARMONY             | "Harmony"          | "Harmony zone board"                    | $40     | —                              |
| DAPC                | "DAPC"             | "DAPC"                                  | $10     | —                              |
| E_BYPASS            | "eBypass"          | "Electronic Bypass Damper wired"        | $10     | —                              |
| BYPASS              | "Bypass"           | "Bypass damper controller"              | $5      | —                              |
| FIN180P             | "FIN180P"          | "FIN180P wired and set"                 | $10     | —                              |
| DEHUM               | "Dehum"            | "Dehum Box wired"                       | $10     | —                              |
| FLOAT_SWITCH        | "Float Switch"     | "Float Switch"                          | $5      | ×2 con 2 Systems               |
| WEIGHT_IN_DATA      | "Weigh-In Data"    | "weigh-in data"                         | $10     | +$10 addon cuando Finish activo|
| ECOIL_WIRE          | "Ecoil Wire"       | "Ecoil wire to furnace wired"           | $10     | ×2 con 2 Systems               |
| APRIL_AIR           | "AprilAire"        | "AprilAire"                             | $10     | —                              |
| FA_INTAKE           | "F/A"              | "Fresh Air damper wired"                | $10     | —                              |
| FIN6_MD             | "FIN6-MD"          | "FIN6-MD wired"                         | $10     | —                              |
| TRANE_HARNESS       | "Trane Harness"    | "Trane Harness wired"                   | $10     | ×2 con 2 Systems               |
| RDS                 | "RDS"              | "RDS"                                   | $10     | ×2 con 2 Systems               |
| LP_KIT_LENNOX_1STG  | "Lennox 1Stg"      | "Lennox LP Kit 1 Stage"                 | $20     | Sub-opción de LP Kit           |
| LP_KIT_LENNOX_2STG  | "Lennox 2Stg"      | "Lennox LP Kit 2 Stage"                 | $20     | Sub-opción de LP Kit           |
| LP_KIT_GOODMAN      | "Goodman"          | "Goodman LP Kit"                        | $20     | Sub-opción de LP Kit           |
| EXT_WIRE_FURNACE    | "Furnace"          | "extended wire to furnace"              | $5      | Sub-opción de Extended Wire    |
| EXT_WIRE_CUNIT      | "Cunit"            | "extended wire to cunit"                | $5      | Sub-opción de Extended Wire    |
| OUT_OF_TOWN         | "Out of Town"      | "Out of town fee"                       | custom  | Precio libre                   |
| OTRO                | "Other"            | [texto introducido por el técnico]      | custom  | Precio libre                   |

#### Botones agrupados — Accessories

Algunos botones son agrupadores que revelan sub-opciones al presionarse.
El agrupador no genera item en el reporte — solo sus sub-opciones lo hacen.

| Botón agrupador  | label           | Sub-opciones visibles al presionar         |
|------------------|-----------------|--------------------------------------------|
| LP Kit           | "LP Kit"        | Lennox 1Stg, Lennox 2Stg, Goodman         |
| Extended Wire    | "Extended Wire" | Furnace, Cunit                             |

---

### Catálogo — Fixes

| Clave            | label            | report                                                    | Precio | Notas          |
|------------------|------------------|-----------------------------------------------------------|--------|----------------|
| PRESSURE_TEST    | "Pressure Test"  | "Pressure Test"                                           | $10    | —              |
| OPEN_ECOIL       | "Open Ecoil"     | "I had to open the ecoil to pull out the sensor wire"     | $30    | —              |
| LEAKS_ECOIL      | "Ecoil"          | "Fixed Leaks at Ecoil"                                    | $20    | Sub-opción de Leaks |
| LEAKS_CUNIT      | "Cunit"          | "Fixed Leaks at Cunit"                                    | $20    | Sub-opción de Leaks |
| LEAKS_WALL       | "Inside Wall"    | "Fixed Leaks Inside the Wall"                             | $50    | Sub-opción de Leaks |
| JAMMED_WIRES     | "Jammed Wires"   | "Compressor wires jammed, fixed them to prevent electrical short" | $5 | — |
| STUCK_BLOWER     | "Stuck Blower"   | "Fixed Stuck/Out of balance Blower"                       | $20    | —              |
| SHEETROCK        | "Sheetrock"      | "I had to cut sheetrock to locate tstat wire"             | $15    | —              |
| OTRO             | "Other"          | [texto introducido por el técnico]                        | custom | Precio libre   |

#### Botones agrupados — Fixes

| Botón agrupador | label    | Sub-opciones visibles al presionar |
|-----------------|----------|------------------------------------|
| Leaks           | "Leaks"  | Ecoil, Cunit, Inside Wall          |

> PVC Work eliminado. Casos similares se manejan con Other + texto libre.

---

### Regla única de modificador de precio

La única excepción donde el contexto modifica el precio de un item es:

**Weight-In Data + Finish activo → $10 base + $10 addon = $20**

Cualquier otro edge case de precio no estándar se maneja con el botón
Other (Accessories o Fixes) con precio libre introducido por el técnico.
No existen otros modificadores de precio por contexto.
