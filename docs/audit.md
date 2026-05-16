# Field Ops PWA — Auditoría de Codebase
**Rama:** build/desde-cero  
**Fecha:** Mayo 2026  
**Archivos auditados:** index.html, app.js, data.js, workspace.js, reports.js, settings.js, map.md, CLAUDE.md

---

## Resumen ejecutivo

El codebase está bien estructurado para Vanilla JS — separación de responsabilidades clara, `data.js` como fuente de verdad, capa de storage aislada. Los problemas encontrados son acotados y corregibles sin reescritura. Hay **1 bug activo** que afecta precios del usuario, **1 duplicación crítica** de lógica de negocio, y **varias inconsistencias** de datos que producen comportamiento silenciosamente incorrecto.

---

## 🔴 Crítico — Acción requerida antes de continuar desarrollo

### C1 — Bug de precios: key mismatch entre `index.html` y `data.js`

**Archivos:** `index.html` líneas 303–304, `data.js` líneas 109–110, `settings.js` `setPrice()`

`index.html` declara:
```
data-price-name="Extended Wire (Furnace)"   ← espacio antes del paréntesis
data-price-name="Extended Wire (Cunit)"     ← espacio antes del paréntesis
```

`data.js` define:
```js
EXTENDED_WIRE_FURNACE: "Extended Wire(Furnace)"   ← sin espacio
EXTENDED_WIRE_CUNIT:   "Extended Wire(Cunit)"     ← sin espacio
```

**Efecto:** cuando el usuario cambia el precio de Extended Wire (Furnace) o (Cunit) en Settings, `setPrice()` guarda la key con espacio. `getPrices()` hace spread sobre `DEFAULT_PRICES.FIX` cuya key no tiene espacio. El override nunca pisa el default. El precio custom se guarda en localStorage pero se ignora silenciosamente en todos los cálculos.

**Fix:** corregir los dos `data-price-name` en `index.html` para que coincidan exactamente con los valores en `FIXES`.

---

### C2 — Duplicación de `_buildServiceItems`

**Archivos:** `workspace.js` líneas 378–421, `app.js` líneas 2250–2307

La lógica que construye los service items del completion está implementada dos veces. La segunda copia vive dentro del Edit Modal en `app.js` y el propio comentario lo admite: *"mirrors `_buildServiceItems` in workspace.js"*.

**Efecto:** cualquier cambio en reglas de servicio (nueva combinación, nuevo servicio, cambio de displayName) requiere editar dos lugares. Si se edita uno y no el otro, los completions editados y los nuevos producen reportes inconsistentes.

**Fix:** exportar `buildServiceItems` desde `workspace.js` y llamarla desde el Edit Modal en `app.js`. La función ya existe — solo necesita ser exportada y la copia en `app.js` eliminada.

---

## 🟡 Medio — Inconsistencias de datos

### M1 — Formato de refrigerante inconsistente en `OUTDOOR_CATALOG`

**Archivo:** `data.js`, `OUTDOOR_CATALOG`

Tres formatos distintos para el campo `freon`:
- Lennox/Trane R-454B: `"454B"` ← sin prefijo "R-"
- Goodman/Daikin R-32: `"R32"` ← sin guion
- Lennox R-410A: `"R-410A"` ← formato completo

`REFRIGERANTS` (línea 145) declara `["R-454B", "R-32"]`. Si algún módulo compara `unit.freon` con valores de `REFRIGERANTS`, la comparación falla en todos los casos excepto R-410A.

**Fix:** normalizar todos los valores de `freon` en `OUTDOOR_CATALOG` a un formato único. Recomendado: `"R-454B"`, `"R-32"`, `"R-410A"` — consistente con `REFRIGERANTS`.

---

### M2 — Placeholder `0` y `999` en `OUTDOOR_CATALOG`

**Archivo:** `data.js`, líneas 412–416, 452–453

- `5TTR5018.revisedCharge: 0` y `5TTR5030.revisedCharge: 0` — valor `0` significa "no verificado" pero es un valor técnicamente válido de carga. Si se usa en cálculo sin validación, produce resultado incorrecto sin error.
- `DC6VSS4810.FactoryCharge: 999` y `DC6VSS6010.FactoryCharge: 999` — mismo problema.

**Fix:** usar `null` para datos faltantes/no verificados. Agregar validación en la UI que detecte `null` y muestre "No disponible" en lugar de calcular.

---

### M3 — `ECOIL_WIRE` companion de UT3000 no visible en UI

**Archivos:** `data.js` línea 82, UI workspace

`ACCESSORY_COMPANIONS` define que UT3000 activa `[DAPC, E_BYPASS, ECOIL_WIRE]`. La lógica en `workspace.js` `toggleAccessory()` agrega los tres automáticamente. Pero `ECOIL_WIRE` no aparece como chip visible en la sección Accessories — solo existe como companion en la lógica.

**Efecto:** el accesorio se agrega al total y al reporte, pero el técnico no puede verlo ni deseleccionarlo individualmente desde la UI. Documentado como pendiente pero confirma comportamiento incompleto activo.

---

## 🟠 Deuda técnica documentada (ya en `map.md`, confirmar estado)

### D1 — Settings price fields hardcodeados en `index.html`

**Pendiente #23 en map.md.** ~45 `<label>` hardcodeados en `index.html` líneas 268–308 que deben generarse dinámicamente desde `DEFAULT_PRICES` en `data.js`.

**Riesgo actual:** si se agrega o elimina un item en `data.js`, el panel de Settings queda desincronizado silenciosamente. El bug C1 es consecuencia directa de este problema.

**Fix planeado:** `renderSettingsModal()` en `app.js` genera los campos iterando `DEFAULT_PRICES`. Eliminar los `<label>` estáticos del HTML.

---

### D2 — `_renderNewTotalCharge` y `factoryLineConfig` handler en `app.js`

**Pendientes #7 y #8 en map.md.** Lógica que pertenece a `workspace.js` vive en `app.js`.

**Estado:** documentado, sin acción urgente — no causan bugs activos, pero aumentan la superficie de `app.js` que ya tiene 2300+ líneas.

---

### D3 — `dropdowns.js` cargado fuera de `src/`

**Archivo:** `index.html` línea 340

```html
<script type="module" src="dropdowns.js"></script>
```

Todos los demás módulos están en `src/`. Este archivo carga desde raíz. Puede ser intencional o un residuo. Verificar si existe, qué exporta, y si sus responsabilidades deberían estar en otro módulo.

---

## ℹ️ Observaciones — Sin acción inmediata

### O1 — `isFirstLaunch()` / `completeOnboarding()` posiblemente huérfanas

**Archivo:** `settings.js`

Funciones exportadas que no aparecen en el resto del codebase visible. Si el onboarding fue eliminado, estas funciones son código muerto. Verificar en `app.js` (sección truncada no auditada).

### O2 — `techName` en settings sin uso en reportes

**Archivo:** `settings.js`

`techName` se guarda pero no aparece en `generateReportText()` ni en `exportCSV()`. Feature incompleta o campo reservado para Fase 4.

### O3 — `_SLOT_LABELS` y `getAllPhotos()` con sistemas de labels distintos

**Archivo:** `workspace.js` líneas 458–461, 243

`_SLOT_LABELS`: `weight → "Scale"`, `fan → "Fan Speed"` (sin número de sistema)  
`getAllPhotos()`: `weight → "Scale Sys1"`, `fan → "FanSpeed Sys1"` (con número)

Dos sistemas de labels para los mismos slots. Si se agregan más usos de `_SLOT_LABELS`, puede desincronizarse con lo que aparece en exports/ZIP.

### O4 — `reportText` con dos caminos de generación

**Archivos:** `workspace.js` `buildCompletion()`, `app.js` Edit Modal, `reports.js` `generateDailyReport()`

`buildCompletion()` deja `reportText: ""` — se espera que el caller lo genere.  
Edit Modal llama `generateReportText()` directamente y lo persiste.  
`generateDailyReport()` tiene fallback `c.reportText || generateReportText(c)`.

Funcionalmente correcto hoy, pero el contrato no es explícito. Si `buildCompletion()` alguna vez genera `reportText` internamente, el Edit Modal quedaría duplicando trabajo.

### O5 — `SITE_PRESETS` hardcodeado en `app.js`

**Archivo:** `app.js` líneas 92–98

Array de presets de fotos de sitio definido en el entry point. Dato estático que debería vivir en `data.js` junto con el resto de constantes de UI.

### O6 — `exportCSV` parsea displayName con regex

**Archivo:** `reports.js`

```js
.replace(/\s+\d+\s+\S+\s+tstats?$/i, "")
```

El thermostat se extrae del displayName (que fue construido concatenando strings en `_buildServiceItems`). Acoplamiento frágil — si cambia el formato del displayName, el regex falla silenciosamente y el CSV exporta datos incorrectos. El thermostat debería vivir como campo separado en el completion object (ya existe `selectedThermostat` y `thermostatQuantity` — usarlos directamente).

---

## Plan de acción recomendado

### Sesión 1 — Bugs activos (antes de cualquier desarrollo)

| Prioridad | Tarea | Archivos | Esfuerzo |
|---|---|---|---|
| 1 | Fix C1: corregir key mismatch en `index.html` (2 líneas) | `index.html` | 5 min |
| 2 | Fix M1: normalizar campo `freon` en `OUTDOOR_CATALOG` | `data.js` | 15 min |
| 3 | Fix M2: reemplazar `0` y `999` por `null` en catalog | `data.js` | 10 min |

### Sesión 2 — Deuda técnica prioritaria

| Prioridad | Tarea | Archivos | Esfuerzo |
|---|---|---|---|
| 4 | Fix C2: exportar `buildServiceItems`, eliminar copia en Edit Modal | `workspace.js`, `app.js` | 30 min |
| 5 | Refactor D1: generar Settings price fields dinámicamente | `index.html`, `app.js` | 45 min |

### Sesión 3 — Limpieza

| Prioridad | Tarea | Archivos | Esfuerzo |
|---|---|---|---|
| 6 | Mover `SITE_PRESETS` a `data.js` | `app.js`, `data.js` | 10 min |
| 7 | Verificar `dropdowns.js` — existe, qué hace, consolidar o eliminar | `index.html` | 15 min |
| 8 | Verificar `isFirstLaunch()` / `techName` — código muerto o feature pendiente | `settings.js`, `app.js` | 10 min |
| 9 — | Migrar D2: `_renderNewTotalCharge` y `factoryLineConfig` handler | `app.js` → `workspace.js` | 45 min |

---

## Estado de `map.md`

El documento está bien mantenido y refleja el estado real del código. Dos correcciones necesarias:

1. **Pendiente #10** — describe Edit Modal como ✅ pero no menciona que la duplicación de `_buildServiceItems` sigue activa (C2 de esta auditoría).
2. **Pendiente #23** — Settings hardcodeados: cambiar descripción para incluir el bug C1 como consecuencia directa.

El resto del documento es preciso.

---

*Generado post-auditoría de 6 archivos fuente. Sección truncada de `app.js` (líneas 261–2111) no auditada — pueden existir hallazgos adicionales en esa sección.*
