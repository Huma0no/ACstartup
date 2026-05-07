# HVAC Field Tool — Project Map
**Rama activa:** build/desde-cero  
**Última actualización:** Abril 2026 (rev 3)

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
│   ├── app.js              # ✅ Construido
│   ├── data.js             # ✅ Construido
│   ├── storage.js          # ✅ Construido
│   ├── jobs.js             # ✅ Construido
│   ├── workspace.js        # ✅ Construido
│   ├── reports.js          # ✅ Construido
│   ├── settings.js         # ✅ Construido
│   ├── importer.js         # ✅ Construido
│   ├── ai.js               # ✅ Construido
│   ├── diagrams.js         # ✅ Construido
│   ├── utils.js            # ✅ Construido
│   └── lv.js               # ✅ Construido
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
| `ACCESSORIES` | object | Accesorios y sus claves — `EXTENDED_WIRE` eliminado (movido a FIXES como sub-opciones) |
| `TWO_SYSTEMS_ACCESSORIES` | array | Accesorios que duplican precio con 2 Systems |
| `CUSTOM_PRICE_ACCESSORIES` | array | Accesorios con precio libre |
| `FIXES` | object | Fixes y sus claves — incluye `EXTENDED_WIRE_FURNACE` y `EXTENDED_WIRE_CUNIT` como entradas independientes para sub-chips del grupo "Extended LV Wire"; `EXTENDED_WIRE` se conserva solo por backward-compat con completions guardados |
| `CUSTOM_PRICE_FIXES` | array | Fixes con precio libre |
| `THERMOSTATS` | array | T-6, T-10, Ecobee, Daikin One, TH2110 |
| `BUILDERS` | array | Lennar, MHI, Highland, CastleRock, First America, Chesmar |
| `REFRIGERANTS` | array | R-454B, R-32 |
| `DEFAULT_PRICES` | object | Precios por servicio, accesorio y fix |
| `ACCESSORY_DISPLAY` | object | Strings exactos de accesorios en el reporte |
| `FIX_DISPLAY` | object | Strings exactos de fixes en el reporte — Leaks actualizados a `"Freon Leaks(eCoil/Cunit/Inside Wall)"`; nuevas entradas `"Extended Wire(Furnace)"` y `"Extended Wire(Cunit)"` |
| `INDOOR_CATALOG` | object | Modelos indoor Lennox: `hType`, `pESP`, `series`, `imagen` (ruta relativa a `/images/`) |
| `OUTDOOR_CATALOG` | object | Modelos outdoor Lennox: `btu`, `freon`, `FactoryCharge`, `revisedCharge`, `series`, `imagen` |
| `SERIES_LINKS` | object | Links de manuales por serie indoor — `serviceManual`, `documentLibrary`, `blower` |
| `OUTDOOR_LINKS` | object | Links de manuales por modelo outdoor |
| `PRODUCT_LINKS` | object | Links de producto por modelo (landing pages / spec sheets) |
| `getIndoorModel` | function | `(model: string) → entry \| null` — lookup en `INDOOR_CATALOG` |
| `getOutdoorModel` | function | `(model: string) → entry \| null` — lookup en `OUTDOOR_CATALOG` |
| `getIndoorSeriesGroups` | function | Retorna `{ seriesName: [model, ...] }` — agrupa `INDOOR_CATALOG` por campo `series` |
| `getOutdoorSeriesGroups` | function | Retorna `{ seriesName: [model, ...] }` — agrupa `OUTDOOR_CATALOG` por campo `series` |

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
| `saveImageToDB` | function | Stores {file, gps, timestamp} in IndexedDB AppImagesDB at given key |
| `getImageFromDB` | function | Returns stored record or null from IndexedDB |
| `deleteImageFromDB` | function | Removes a single record from IndexedDB by key |
| `clearImagesFromDB` | function | Clears entire IndexedDB images store |

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
| `initWeighInPhotos` | function | Initializes photo capture rows for weigh-in. Idempotent — guarded by _photoRowsInitialized flag. Sets up IndexedDB key prefix from job address, renders camera+gallery buttons for weight/fan slots per system, restores saved photos on init |
| `addSitePhoto` | function | Stores site photo in _sitePhotos map and saves to IndexedDB with no GPS |
| `removeSitePhoto` | function | Removes site photo from _sitePhotos, deletes from IndexedDB, updates sitePhotoMeta |
| `getSitePhotos` | function | Returns current _sitePhotos map |
| `getSitePhotoCount` | function | Returns count of loaded site photos |
| `initSitePhotos` | function | Async — restores site photos from IndexedDB on job load using sitePhotoMeta |
| `getPhotoCount` | function | Total de fotos cargadas — weigh-in + site conditions combinadas |
| `getAllPhotos` | function | Retorna todas las fotos para export ZIP |

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
| `generateReportText` | function | Ensambla el texto de un completion siguiendo el formato §8 del data dictionary. No re-aplica reglas de negocio — los displayNames y precios ya vienen resueltos desde `workspace.js`. Site photo labels de `sitePhotoMeta` se insertan entre notas y servicios |
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

**UI:** Settings modal → sección Prices — `renderSettingsModal()` puebla todos los inputs via `querySelectorAll("[data-price-category]")`; event delegation en `input` del modal llama `setPrice()` inmediatamente; botón Reset llama `resetPrices()` y re-renderiza.

**Depende de:** `src/data.js` (DEFAULT_PRICES), `src/storage.js` (getSettings, saveSettings).  
**Lo usan:** `app.js`, `workspace.js` (vía getPrices()).

---

### `src/ai.js` ✅
Chat IA con el proveedor activo según `settings.js`. Sin render de UI. Sin acceso directo a localStorage.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `initChat` | function | Inicializa (o re-inicializa) el chat con contexto del job activo. Resetea historial. Pasa `null` si no hay job activo — scope HVAC se mantiene igual |
| `sendMessage` | function | Envía mensaje del usuario, llama al proveedor activo, retorna texto de respuesta. Mantiene historial multi-turno en memoria. Lanza error si no hay API key, proveedor desconocido, o fallo de red |
| `clearHistory` | function | Resetea el historial sin cambiar el system prompt actual |
| `getHistory` | function | Retorna copia del historial actual `[{role, content}]` |

**Proveedores soportados:** `"anthropic"` (claude-haiku-4-5), `"openai"` (gpt-4o), `"google"` (gemini-2.0-flash). El proveedor activo y el API key se leen de `settings.js`.

**System prompt:** estrictamente limitado a HVAC. Incluye contexto del job: modelos de equipo (furnace, coil, outdoor) y links de manuales (`serviceManual`, `documentLibrary`, `blower`) de `system1` y `system2`.

**Depende de:** `src/settings.js` — `getSettings()`.  
**Lo usan:** `app.js`.

---

### `src/app.js` ✅
Punto de entrada. Inicializa todos los módulos en orden, maneja navegación entre tabs, conecta eventos del HTML con los módulos, y actualiza la UI después de cada acción. Sin lógica de negocio — toda lógica vive en los módulos especializados.

**Responsabilidades:**

| Área | Descripción |
|---|---|
| Init | SW registration, `initSettings()`, aplica tema al DOM, restaura job activo interrumpido |
| Tab navigation | Activa/oculta panels por `data-tab`; dispara `renderReports()` y `renderLV()` al entrar |
| Jobs tab | Renderiza lista agrupada por subdivisión con color auto-asignado; search por dirección; toggle expand/collapse; delete; start/resume → workspace |
| Job card | Visible siempre: dirección, chips de builder/subdivisión, chips de termostato y accesorios pre-seleccionados. Al expandir: chips de outdoor (ton, refrigerante, carga, CFM) y equip-grid con imagen del indoor model (`getIndoorModel().imagen`); click en imagen abre `#lightbox` |
| Workspace | Renderiza los 7 steps con chips de estado; event delegation desde `#workspace-form` para servicios, tstat, accesorios, fixes (grupos expandibles "Fixed Leaks" y "Extended LV Wire" con badge contador de seleccionados; sub-chips multi-select; chips standalone más pequeños con wrap), weight-in (Line Config como `<select>`; auto-fill de `factoryChargeOz` desde `outdoor.FactoryCharge` y `approxAdjustOz` según revisedCharge/FactoryCharge al cargar; subcooling auto-calc: `subcoolingValue = condenserSatTemp − liquidLineTemp`, `subcoolingDeviation = abs(subcoolingValue − oemSubcoolingGoal)`), notas, fotos |
| Generate Report | `buildCompletion()` → `generateReportText()` → `saveCompletion()` → `removeJob(id)` → limpia workspace → navega a Reports |
| Reports tab | Renderiza completions. Per-card: Copy, Share (WhatsApp/SMS/Email/Copy), Delete. Global: Share All (`generateDailyReport()`), Delete All, DB export → `dashboard_import_{date}.json`, CSV export → `service_reports_{MM-DD-YY}.csv` |
| LV tab | `getLinksForJob()` + `isAvailableOffline()` por cada link; botón Cache → `downloadDiagram()` |
| Settings modal | Theme toggle (`data-mode`), proveedor IA, API key save/clear |
| Import/Export Jobs | Tab Jobs — botón discreto. Import agrega sin duplicar por dirección. Export serializa jobs a JSON |
| Export Completions | Tab Reports — CSV para hojas de cálculo, JSON para Dispatch |
| Add Job | Sección inline en `#tab-jobs` (no dialog); campos: dirección, subdivision, builder, fecha, notas, 2 Systems, time-sensitive, termostato (modelo + qty), accesorios multi-select, modelos indoor/outdoor con selects por serie + links de manuales → `createJob()` → `precacheJobs([job])` |
| Active job bar | `updateActiveJobBar()` — muestra/oculta `#active-job-bar`. Outdoor: press-hold → `_showOutdoorPopover` con datos OUTDOOR_CATALOG. Indoor: tap → `openViewer` LV. |
| Troubleshooting | Abre/cierra `#ts-drawer`; body pendiente |
| Photos | File input → FileReader → `addPhoto()`; geolocation no-blocking |

**Depende de:** todos los módulos de `src/`.  
**No exporta nada** — es el entry point.

---

### `src/lv.js` ✅
Visor de diagramas LV. Renderiza header dinámico con contexto del job activo, cuerpo estático de 4 secciones con botones por categoría, footer de links por marca, y viewer singleton con zoom y pan.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `renderLV` | function | Recibe `container` — renderiza header + cuerpo estático + footer; construye viewer singleton la primera vez. Sin DOMContentLoaded — llamado desde `app.js` |

**Depende de:** `src/storage.js` (`getActiveJobId`), `src/jobs.js` (`getJobById`), `src/data.js` (`getIndoorModel`, `getOutdoorModel` — acceso a INDOOR_CATALOG).  
**Lo usan:** `app.js`.

---

### `src/diagrams.js` ✅
Lookup de URLs de diagramas, pre-descarga via Cache API, detección de disponibilidad offline. Sin render de UI. Sin acceso a localStorage.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `getLinksForJob` | function | Extrae todas las URLs de manuales/diagramas de `job.system1.links` y `job.system2?.links`. Retorna `[{ label, url }]` solo con entradas no vacías |
| `lookupByModel` | function | Lookup por número de modelo en el catálogo de equipos. Retorna `null` hasta que el catálogo se pueble en `data.js` (Phase 2, map.md §6) |
| `isAvailableOffline` | function | Retorna `true` si la URL ya está en el cache de diagramas |
| `downloadDiagram` | function | Trigger manual — cachea una URL individual. No-op si ya está cacheada. Lanza si la red falla |
| `precacheJob` | function | Pre-descarga en paralelo todas las URLs del job. Nunca lanza — retorna `{ cached, failed }`. Seguro llamar offline |
| `precacheJobs` | function | Batch — llama `precacheJob` por cada job del array. Retorna `{ cached, failed }` agregado. Llamar desde `importer.js` al importar jobs |

**Cache:** usa `"hvac-diagrams-v1"` — cache independiente del cache de la app para sobrevivir actualizaciones del SW. **Nota:** el `sw.js` activo (legacy) borra caches que no sean `CACHE_NAME` en activate — respetar `hvac-diagrams-v1` al reescribir `sw.js`.

**Depende de:** Nada — usa solo Cache API del navegador.  
**Lo usan:** `app.js`, `importer.js`.

---

### `src/utils.js` ✅
Funciones utilitarias compartidas sin dependencias.

**Exporta:**

| Export | Tipo | Descripción |
|---|---|---|
| `ouncesToPoundsAndOunces` | function | Convierte oz a string "X lb Y oz" (o solo "Y oz" si < 16 oz) — usado en chips de carga de refrigerante en el job card |
| `getSubcoolingDefault` | function | Returns expected subcooling range object {min, max} by brand string |
| `calculateApproxAdjust` | function | Returns refrigerant adjustment excess in oz: (linesetReal - factoryLength) × multiplier (0.47 Trane, 0.6 others). Returns null if inputs invalid |
| `calculateCFM` | function | `(btu: number) → { max, min } \| null` — Max CFM = round((btu/12000)×400); Min CFM = round(max×0.85). Retorna null si btu es falsy |
| `compressImage` | function | Compresses image file to JPEG at 0.8 quality / 1600px max width. Handles HEIC via heic2any. Returns original file on failure |
| `getGpsFromImage` | function | Extracts {lat, lon} from EXIF via exifr library. Returns null on miss or error |

**Depende de:** Nada.  
**Lo usan:** `app.js`.

---

### `styles/app.css` ✅
Design system completo. Todos los estilos de la app.

**Contiene:**
- CSS variables por tema: `[data-theme="a/b/c"][data-mode="light/dark"]`
- Paleta Signal from Elsewhere en `:root`: `--void`, `--signal`, `--plasma`, `--chrome`, `--heat`, `--static`, `--white-cold`, `--slate`, `--dark-cell`, `--dark-border`, `--signal-dim`
- Tokens de estado semántico en `:root`: `--state-done-color/border/bg`, `--state-pending-color`, `--state-warn-color`, `--state-na-color/bg/border`
- Componentes: chips, steps, badges, botones, cards, modales, drawer, FAB
- Colores de subdivisión: 8 colores asignados por orden de importación
- Clases weight-in: `.wi-grid` (3 col), `.wi-field`, `.wi-field input/select` — renombradas de `.weight-in-*` para coincidir con el HTML
- Clases fixes: `.fix-chips-row` (chips standalone con wrap), `.chip-badge` (contador en chip de grupo), override de `.chip-sm` dentro de grupos/standalone (22 px, 11 px font)

**Depende de:** `index.html` — lee `data-theme` y `data-mode` del elemento raíz.

---

### `index.html` ✅
Shell de la app. Estructura de 4 tabs, 5 steps en workspace, 3 modales, drawer, FAB.

**Contiene:**
- `<nav>` — Jobs · Workspace · Reports · LV
- `#active-job-bar` — fila bajo la nav: dirección del job activo + chips Outdoor/Indoor. Oculta si no hay job activo.
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
jobThermostat{model, qty} | null,
jobAccessories[],
system1{furnace, coil, outdoor},
system2{furnace, coil, outdoor} | null,
savedState, addressHistory[]
```
> `coil` oculto por default en UI.  
> `jobThermostat` y `jobAccessories` son los valores pre-seleccionados desde el formulario de creación del job — no deben confundirse con las selecciones del workspace que el técnico hace en campo.

### Completion
```
jobId, address, subdivision, builder, timestamp,
isTwoSystems, isTemporary, refrigerant,
outdoorModel, indoorModel, outdoorModel2, indoorModel2,
services[], selectedThermostat, thermostatQuantity,
accessories[], fixes[], weightInData, weightInData2,
notes, photos[], sitePhotoMeta[{ slug, label }],
totals{service, accessory, fix, total},
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
| 1 | Mapa interactivo de dependencias | docs/ |
| 2 | Comunicación en tiempo real PWA ↔ Dispatch | Fase 4 |
| 3 | `heaterModel` → `indoorModel` en workspace.js y data_dictionary.md | workspace.js / docs |
| 4 | `aiApiKey` stored as plaintext in localStorage — acceptable for offline-first, revisit in Phase 4 | settings.js |
| 5 | Imágenes indoor con nombre de archivo en lowercase en disco pero uppercase en el catálogo — falla en Netlify (Linux, case-sensitive) | data.js / images/ |
| 6 | SC out-of-range warnings — show discrete alert when subcooling is negative or outside expected range | app.js |
| 7 | `_renderNewTotalCharge` lives in app.js but belongs in workspace.js — migrate in next refactor session | app.js → workspace.js |
| 8 | factoryLineConfig change handler lives in app.js — move to workspace.js in next refactor session | app.js → workspace.js |
| 9 | Photos Phase 2 pending — GPS device fallback, GPS injection at ZIP time, ZIP export/download | workspace.js / utils.js |
| 10 | Edit completion — individual edit of a saved completion report | reports.js / app.js |
| 11 | ✅ Settings — Prices: sección en Settings modal con inputs por subsección (Services/Accessories/Fixes + Weight-In Finish Addon), live-save via setPrice() en cada cambio, botón "Reset to defaults" via resetPrices(). | settings.js / app.js |
| 12 | ✅ Crear imágenes LV — diagramas de cableado BV por configuración de sistema. 1/2 stage comparte imagen con línea punteada para Y2. Convención de nombres en data_dictionary.md §9 | images/lv/ |
| 13 | LV Interactivo — SVG dinámico compuesto con zoom semántico y transparencia por componente. Producto separado, planificar independientemente. lv.js construido para ser reemplazable sin tocar ningún otro módulo | Futuro |
| 14 | ✅ Header global dinámico — `#active-job-bar` con dirección + chips Outdoor (press-hold → popover OUTDOOR_CATALOG: Ton/Ref/Charge) + Indoor (tap → LV viewer imagen). Tstat/Acc chips — deferred. | app.js / index.html / lv.js |
| 15 | `.photo-options` en app.css — clase huérfana, eliminar en próximo refactor | styles/app.css |
| 16 | ⏳ espera Dispatch — Import Jobs — botón discreto en Tab Jobs | jobs.js / app.js |
| 17 | ⏳ espera Dispatch — Export Jobs — botón discreto en Tab Jobs | jobs.js / app.js |
| 18 | ⏳ espera Dispatch — Export Completions CSV | reports.js / app.js |
| 19 | ⏳ espera Dispatch — Export Completions JSON | reports.js / app.js |

---

*Actualizar antes de cada commit con cambios estructurales.*
