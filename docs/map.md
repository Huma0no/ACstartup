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
│   ├── storage.js          # ✅ Construido
│   ├── jobs.js             # ✅ Construido
│   ├── workspace.js        # ✅ Construido
│   ├── reports.js          # ✅ Construido
│   ├── settings.js         # ✅ Construido
│   ├── importer.js         # ✅ Construido
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

### `src/storage.js` ✅
Capa única de acceso a localStorage. Ningún otro módulo lee ni escribe localStorage directamente.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `getJobs` | function | Retorna el array completo de jobs |
| `saveJob` | function | Upsert de un job por `id` |
| `deleteJob` | function | Elimina un job por `id` |
| `getCompletions` | function | Retorna el array de completions |
| `saveCompletion` | function | Upsert de un completion por `jobId` |
| `deleteCompletion` | function | Elimina un completion por `jobId` |
| `getWorkspaceState` | function | Lee el estado activo del workspace |
| `saveWorkspaceState` | function | Guarda el estado del workspace |
| `clearWorkspaceState` | function | Elimina el estado del workspace |
| `getActiveJobId` | function | Retorna el id del job activo |
| `setActiveJobId` | function | Guarda o limpia el id del job activo |
| `getSettings` | function | Lee la configuración completa |
| `saveSettings` | function | Guarda la configuración completa |
| `exportBackup` | function | Serializa jobs + completions + settings a JSON |
| `importBackup` | function | Restaura datos desde un JSON de backup |

**Depende de:** `src/data.js` — importa `STORAGE_KEYS`.  
**Lo usan:** `jobs.js`, `workspace.js`, `reports.js`, `settings.js`.

---

### `src/jobs.js` ✅
CRUD de jobs, agrupación por subdivisión con color auto-asignado, detección de time-sensitive, y ordenamiento.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `createJob` | function | Genera uuid, normaliza campos, guarda y retorna el job |
| `updateJob` | function | Upsert de un job existente |
| `removeJob` | function | Elimina un job por `id` |
| `getJobById` | function | Busca un job por `id` |
| `getAllJobs` | function | Retorna todos los jobs |
| `sortJobs` | function | Jobs con `savedState` primero, resto sin orden específico |
| `groupBySubdivision` | function | Retorna `{ subdivision, colorIndex, jobs[] }[]` — colorIndex 1–8 por orden de aparición |
| `isTimeSensitive` | function | Detecta keywords URGENT, MUST, VISIT AM, VISIT PM en texto de PDF |

**Depende de:** `src/storage.js` — todo acceso a datos pasa por aquí.  
**Lo usan:** `app.js`, `workspace.js`, `importer.js`.

---

### `src/workspace.js` ✅
Estado del workspace activo: carga el job, registra selecciones, calcula total en tiempo real, guarda progreso, y construye el objeto Completion al finalizar. Sin render de UI.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `initWorkspace` | function | Carga el job; restaura progreso guardado si el `jobId` coincide |
| `getState` | function | Retorna el estado actual del workspace |
| `clearWorkspace` | function | Limpia estado en memoria y en storage |
| `toggleService` | function | Activa/desactiva un servicio; aplica reglas de exclusividad |
| `setThermostat` | function | Setea termostato y cantidad |
| `toggleAccessory` | function | Activa/desactiva accesorio de catálogo o precio libre |
| `toggleFix` | function | Activa/desactiva fix de catálogo o precio libre |
| `setOption` | function | Setea `isTwoSystems` o `isTemporary` |
| `setSystem2Models` | function | Guarda modelos del Sistema 2 descubiertos en campo |
| `setWeightInData` | function | Guarda datos de carga para sistema 1 o 2 |
| `setNotes` | function | Guarda notas de campo |
| `addPhoto` / `removePhoto` | function | Agrega o elimina foto del array |
| `calculateTotals` | function | Función pura — aplica las 8 reglas de negocio del data dictionary §7 |
| `saveProgress` | function | Persiste el estado via `storage.js` |
| `buildCompletion` | function | Ensambla el objeto `Completion` completo listo para `reports.js` |

**Reglas de negocio implementadas:**
1. AC + Heat = $30 combinados, no $60
2. 2 Systems duplica precio de servicio y accesorios marcados
3. Prestart es mutuamente excluyente con AC/Heat/Finish
4. Finish reemplaza el precio de AC/Heat — base $20
5. Weight-In + Finish = $10 + $10 addon
6. Cancel anula todo cobro
7. Temporarily modifica solo el texto del reporte
8. Precios del usuario sobreescriben defaults vía parámetro `prices`

**Depende de:** `src/data.js`, `src/storage.js`.  
**Lo usan:** `app.js`, `reports.js`.

---

### `src/reports.js` ✅
Genera el texto exacto del reporte por job y el reporte diario completo. Sin render de UI. Sin acceso a localStorage.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `generateReportText` | function | Ensambla el texto de un completion siguiendo el formato §8 del data dictionary. No re-aplica reglas de negocio — los displayNames y precios ya vienen resueltos desde `workspace.js` |
| `generateDailyReport` | function | Concatena el `reportText` de todos los completions del día separados por párrafo. Si un completion no tiene `reportText`, lo genera on-the-fly |
| `exportJSON` | function | Serializa el array de completions a JSON con indentación |
| `exportCSV` | function | Serializa a CSV con 43 columnas: Date, Address, Subdivision, Builder, Service_Type, Service_Price, Thermostat, Tstat_Qty, Accessories, Accessories_Price, Fixes, Fixes_Price, Notes, Total, Indoor_Model, Outdoor_Model, 12 columnas weigh-in sys1, Refrigerant, Indoor_Model_2, Outdoor_Model_2, 12 columnas weigh-in sys2 |

**Depende de:** Nada — recibe los datos como parámetros.  
**Lo usan:** `app.js`.

---

### `src/importer.js` ✅
Importa jobs desde Dispatch JSON. Sin render de UI. Sin acceso directo a localStorage.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `importFromJSON` | function | Parsea JSON de Dispatch (array o job único), valida campos requeridos, guarda jobs nuevos via `jobs.js`. Retorna `{ imported, skipped, errors[] }` |
| `importFromPDF` | function | Placeholder — retorna error indicando que PDF import está pendiente para Fase 3 |

**Validación:** campos requeridos según data_dictionary.md §2 — `id`, `date`, `address`, `subdivision`, `builder`, `system1`. Jobs con `id` ya existente en storage se omiten sin sobreescribir.

**Depende de:** `src/jobs.js` — `getJobById`, `updateJob`.  
**Lo usan:** `app.js`.

---

### `src/settings.js` ✅
Configuración de la app: detección de primer inicio, onboarding de precios, proveedor de IA y API key, tema dark/light. Sin render de UI. Sin acceso directo a localStorage.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `initSettings` | function | Carga desde storage y aplica defaults para claves faltantes. Llamar una vez al inicio antes que cualquier módulo lea settings |
| `getSettings` | function | Retorna el objeto settings en memoria |
| `isFirstLaunch` | function | `true` si `onboardingComplete === false` — indica que el usuario no ha completado el setup inicial |
| `completeOnboarding` | function | Marca onboarding completo y persiste |
| `setTechName` | function | Actualiza nombre del técnico y persiste |
| `setTheme` | function | `"dark"` \| `"light"` — persiste preferencia; `app.js` aplica al DOM (`data-mode`) |
| `setAiProvider` | function | Persiste el proveedor de IA seleccionado |
| `setAiApiKey` | function | Persiste el API key |
| `setPrice` | function | Override de un precio individual. `setPrice(category, name, value)` — category: "SERVICE" \| "ACCESSORY" \| "FIX"; name: null para scalars como WEIGHT_IN_FINISH_ADDON |
| `resetPrices` | function | Borra todos los overrides, revierte a DEFAULT_PRICES |
| `getPrices` | function | Retorna DEFAULT_PRICES con overrides del usuario aplicados — objeto listo para pasar a `calculateTotals()` |

**Nota de diseño:** `prices` en storage es un objeto sparse — solo almacena lo que el usuario cambió. `getPrices()` hace el merge en memoria sobre DEFAULT_PRICES.

**Depende de:** `src/data.js` (DEFAULT_PRICES), `src/storage.js` (getSettings, saveSettings).  
**Lo usan:** `app.js`, `workspace.js` (vía getPrices()).

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
outdoorModel, indoorModel, outdoorModel2, indoorModel2,
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
| 5 | `heaterModel` → `indoorModel` en workspace.js y data_dictionary.md | workspace.js / docs |
| 6 | `aiApiKey` stored as plaintext in localStorage — acceptable for offline-first, revisit in Phase 4 | settings.js |

---

*Actualizar antes de cada commit con cambios estructurales.*
