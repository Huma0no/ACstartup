# HVAC Field Tool — Project Map
**Rama activa:** build/desde-cero  
**Última actualización:** Abril 2026

> Documento vivo. Se actualiza antes de cada commit.
> Qué existe, qué hace, cómo se conecta.

---

## 1. Estructura de archivos

```
/
├── index.html              # Shell de la app — estructura pura, sin lógica
├── manifest.json           # Config PWA
├── sw.js                   # Service worker — offline + cache de diagramas
├── CLAUDE.md               # Instrucciones de comportamiento para Claude Code
│
├── styles/
│   └── app.css             # Design system — 3 temas (A/B/C), dark/light toggle
│
├── src/
│   ├── data.js             # ✅ Construido
│   ├── storage.js          # 🔲 Pendiente
│   ├── jobs.js             # 🔲 Pendiente
│   ├── workspace.js        # 🔲 Pendiente
│   ├── reports.js          # 🔲 Pendiente
│   ├── settings.js         # 🔲 Pendiente
│   ├── importer.js         # 🔲 Pendiente
│   ├── ai.js               # 🔲 Pendiente
│   └── diagrams.js         # 🔲 Pendiente
│
└── docs/
    ├── requirements.md
    ├── architecture.md
    ├── development_plan.md
    ├── design_system.md
    ├── data_dictionary.md
    └── map.md
```

---

## 2. Módulos

### `src/data.js` ✅
Fuente de verdad de todos los datos estáticos. Ningún otro módulo define precios ni nombres — todos los importan de aquí.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `STORAGE_KEYS` | object | 7 claves de localStorage |
| `SERVICES` | object | Tipos de servicio |
| `STANDALONE_SERVICES` | array | Servicios mutuamente excluyentes con AC/Heat |
| `ACCESSORIES` | object | Accesorios y sus claves |
| `TWO_SYSTEMS_ACCESSORIES` | array | Accesorios que duplican precio con 2 Systems |
| `CUSTOM_PRICE_ACCESSORIES` | array | Accesorios con precio libre |
| `FIXES` | object | Fixes y sus claves |
| `CUSTOM_PRICE_FIXES` | array | Fixes con precio libre |
| `THERMOSTATS` | array | T-6, T-10, Ecobee, Daikin One, TH2110 |
| `BUILDERS` | array | Lennar, MHI, Highland, CastleRock, First America, Chesmar |
| `REFRIGERANTS` | array | R-454B, R-32 |
| `DEFAULT_PRICES` | object | Precios por servicio, accesorio y fix |
| `ACCESSORY_DISPLAY` | object | Strings exactos de accesorios en el reporte |
| `FIX_DISPLAY` | object | Strings exactos de fixes en el reporte |

**Depende de:** Nada.  
**Lo usan:** Todos los módulos de `/src`.

---

### `styles/app.css` ✅
Design system completo. Todos los estilos de la app.

**Contiene:**
- CSS variables por tema: `[data-theme="a/b/c"][data-mode="light/dark"]`
- Componentes: chips, steps, badges, botones, cards, modales, drawer, FAB
- Colores de subdivisión: 8 colores asignados por orden de importación

**Depende de:** `index.html` — lee `data-theme` y `data-mode` del elemento raíz.

---

### `index.html` ✅
Shell de la app. Estructura de 4 tabs, 5 steps en workspace, 3 modales, drawer, FAB.

**Contiene:**
- `<nav>` — Jobs · Workspace · Reports · LV
- `#tab-jobs` — lista de jobs agrupados por subdivisión
- `#tab-workspace` — stepper de 5 pasos
- `#tab-reports` — lista de completions
- `#tab-lv` — visor de diagramas
- `<aside#ts-drawer>` — troubleshooting
- `<dialog#settings-modal>` — configuración
- `<dialog#quick-calc-modal>` — calculadora rápida
- FAB flotante — acceso global a IA

**Sin:** inline styles, datos hardcodeados, lógica JS.

---

## 3. Objetos de datos

### Job
```
id, date, address, subdivision, builder, contact,
serviceTime, timeSensitive, isTwoSystems, details,
jobAccessories[], system1{furnace, coil, outdoor},
system2{furnace, coil, outdoor} | null,
savedState, addressHistory[]
```
> `coil` oculto por default en UI.

### Completion
```
jobId, address, subdivision, builder, timestamp,
isTwoSystems, isTemporary, refrigerant,
outdoorModel, heaterModel, outdoorModel2, heaterModel2,
services[], selectedThermostat, thermostatQuantity,
accessories[], fixes[], weightInData, weightInData2,
notes, photos[], totals{service, accessory, fix, total},
reportText
```

### WeightInData
```
linesetLength, factoryChargeOz, factoryLineConfig,
approxAdjustOz, adjustedOz, fanSpeedCfm,
liquidLineTemp, suctionLineTemp, condenserSatTemp,
subcoolingValue, oemSubcoolingGoal, subcoolingDeviation
```

---

## 4. Flujo de datos

```
PDF / JSON
    ↓
importer.js
    ↓
jobs.js ←→ storage.js ←→ localStorage
    ↓
workspace.js
    ↓
reports.js
    ↓
Share (WhatsApp / SMS / Email / Copy)
Export JSON → Dispatch
```

> Comunicación en tiempo real PWA ↔ Dispatch — pendiente Fase 4.

---

## 5. Reglas de negocio

| # | Regla | Módulo |
|---|---|---|
| 1 | AC + Heat juntos = $30 | workspace.js |
| 2 | 2 Systems duplica precio de servicio y accesorios marcados | workspace.js |
| 3 | Prestart es mutuamente excluyente con AC y Heat | workspace.js |
| 4 | Finish + AC/Heat = $20 base | workspace.js |
| 5 | Weight-In + Finish = $10 + $10 addon | workspace.js |
| 6 | Cancel anula todo cobro | workspace.js |
| 7 | Temporarily modifica solo el texto del reporte | reports.js |
| 8 | Precios del usuario sobreescriben defaults de data.js | settings.js |

---

## 6. Pendientes

| # | Pendiente | Módulo |
|---|---|---|
| 1 | EXTENDED_WIRE sub-opciones: "cond", "ecoil" | data.js / workspace.js |
| 2 | Equipment catalog por marca — modelos, refrigerante, diagramas | data.js |
| 3 | Mapa interactivo de dependencias | docs/ |
| 4 | Comunicación en tiempo real PWA ↔ Dispatch | Fase 4 |

---

*Actualizar antes de cada commit con cambios estructurales.*
