# CHANGELOG

Rama activa: `build/desde-cero`  
Formato: [tipo] módulo — descripción

---

## 2026-04-27

### Build
- **`src/diagrams.js`** `54bec08` — lookup de URLs de diagramas, pre-descarga via Cache API (`hvac-diagrams-v1`), detección offline, trigger manual de descarga. Funciones: `getLinksForJob`, `lookupByModel` (Phase 2 pending), `isAvailableOffline`, `downloadDiagram`, `precacheJob`, `precacheJobs`
- **`src/ai.js`** `9e5b825` — chat IA con proveedor activo según settings. System prompt estrictamente HVAC. Historial multi-turno en memoria. Adaptadores: Anthropic (claude-haiku-4-5), OpenAI (gpt-4o), Google (gemini-2.0-flash). Funciones: `initChat`, `sendMessage`, `clearHistory`, `getHistory`
- **`src/importer.js`** `73d81fa` — import JSON de Dispatch con validación de campos requeridos (data_dictionary §2), deduplicación por `id`, resultado `{ imported, skipped, errors[] }`. Placeholder documentado para PDF import (Phase 3)

### Docs
- **`docs/data_dictionary.md`** `5aaea7e` — campo `links` agregado a `SystemModel`: `{ serviceManual, documentLibrary, blower }` — todos opcionales, default `""`
- **`docs/map.md`** `9dce6ec`, `851b8d6`, `9a83413` — entradas de `diagrams.js`, `ai.js`, `importer.js`

---

## 2026-04-26

### Build
- **`src/settings.js`** `bfa9f50` — primer inicio, onboarding, precios con overrides sparse, proveedor IA y API key, tema dark/light. Funciones: `initSettings`, `getSettings`, `isFirstLaunch`, `completeOnboarding`, `setTechName`, `setTheme`, `setAiProvider`, `setAiApiKey`, `setPrice`, `resetPrices`, `getPrices`
- **`src/reports.js`** `f21ad2e` — generación de texto de reporte por job (formato exacto compañía §8), reporte diario, export JSON, export CSV (43 columnas)
- **`src/workspace.js`** `da63e99` — estado del workspace activo, selecciones, cálculo de total en tiempo real, 8 reglas de negocio, builder de objeto Completion
- **`src/jobs.js`** `fb23aa4` — CRUD de jobs, agrupación por subdivisión con color auto-asignado (1–8), sorting (in-progress primero), detección time-sensitive
- **`src/storage.js`** `cca3b60` — capa única de acceso a localStorage. Ningún otro módulo toca localStorage directamente
- **`src/data.js`** `2f5ea28` — fuente de verdad: STORAGE_KEYS, SERVICES, ACCESSORIES, FIXES, THERMOSTATS, BUILDERS, REFRIGERANTS, DEFAULT_PRICES, ACCESSORY_DISPLAY, FIX_DISPLAY

### Refactor
- **`workspace.js` / `data_dictionary.md` / `map.md`** `44cd65b` — renombre `heaterModel` → `indoorModel` en toda la base de código

### Docs
- **`docs/map.md`** `339dfa9` — project map v1.0
- **`docs/data_dictionary.md`** `0f507b8` — data dictionary v1.0: Job, Completion, WeightInData, precios, reglas de negocio, formato de reporte
- **`docs/map.md`** `2a29610`, `b683e11`, `9e5871b`, `372b224`, `dc7ebb0` — entradas de `storage.js`, `jobs.js`, `workspace.js`, `reports.js`, `settings.js`

### Config
- **`CLAUDE.md`** `bb4e133` — guidelines de comportamiento para Claude Code

---

## 2026-04-25

### Build
- **`index.html`** + **`styles/app.css`** `9f3d42a` — shell limpio de la app (4 tabs, 5 steps, 3 modales, drawer, FAB). Design system con 3 temas (A/B/C), dark/light toggle, colores de subdivisión 1–8

---

## Pendientes

| Módulo | Estado | Nota |
|---|---|---|
| `src/app.js` | 🔲 Pendiente | Entry point, init, routing, tab navigation |
| `sw.js` | 🔲 Pendiente | Reescribir para nuevo build — preservar `hvac-diagrams-v1` |
| `diagrams.js` — catálogo por modelo | 🔲 Phase 2 | `lookupByModel()` retorna `null` hasta que `data.js` tenga el catálogo |
| `importer.js` — PDF | 🔲 Phase 3 | `importFromPDF()` es placeholder |
| `EXTENDED_WIRE` sub-opciones | 🔲 Pendiente | "cond" / "ecoil" en `data.js` / `workspace.js` |
