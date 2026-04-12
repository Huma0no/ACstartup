# App Flow — HVAC Field Ops

Diagramas Mermaid de los flujos principales del app.  
Renderizable en: [mermaid.live](https://mermaid.live) o cualquier editor con soporte Mermaid.

---

## Diagrama 1 — Dependencias de Módulos (imports estáticos)

```mermaid
graph LR
    %% COLORES por capa
    classDef stateLayer fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef uiLayer fill:#dcfce7,stroke:#22c55e,color:#14532d
    classDef dataLayer fill:#fef9c3,stroke:#eab308,color:#422006
    classDef aiLayer fill:#f3e8ff,stroke:#a855f7,color:#3b0764
    classDef backend fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef controller fill:#ffedd5,stroke:#f97316,color:#431407
    classDef config fill:#e0f2fe,stroke:#0ea5e9,color:#0c4a6e

    script:::controller
    formmanager:::controller
    jobmanager:::controller
    reportmanager:::controller
    imagemanager:::controller
    troubleshootingPanel:::controller
    wikimanager:::controller
    quickcalc:::controller
    dropdowns:::controller

    state:::stateLayer

    ui:::uiLayer
    components:::uiLayer
    reports:::uiLayer

    jobs:::dataLayer
    pricing:::dataLayer
    validation:::dataLayer
    weightinlogic:::dataLayer
    weightInData:::dataLayer
    routeTracker:::dataLayer
    fileutils:::dataLayer

    aiProviders:::aiLayer
    claudeAssist:::aiLayer
    troubleshootingEngine:::aiLayer
    equipmentData:::aiLayer
    tstatData:::aiLayer

    constants:::config
    utils:::config

    server:::backend

    %% IMPORTS de script.js
    script --> state
    script --> ui
    script --> pricing
    script --> weightInData
    script --> jobs
    script --> constants
    script --> utils
    script --> validation
    script --> components
    script --> imagemanager
    script --> jobmanager
    script --> reportmanager
    script --> routeTracker
    script --> weightinlogic
    script --> quickcalc

    %% IMPORTS de controllers
    formmanager --> constants
    formmanager --> ui
    formmanager --> weightInData
    formmanager --> utils
    formmanager --> weightinlogic
    jobmanager --> jobs
    jobmanager --> utils
    jobmanager --> routeTracker
    jobmanager --> weightInData
    jobmanager --> ui
    jobmanager --> constants
    reportmanager --> reports
    reportmanager --> constants
    reportmanager --> validation
    reportmanager --> jobs
    reportmanager --> weightInData
    reportmanager --> ui
    reportmanager --> routeTracker
    imagemanager --> fileutils
    imagemanager --> ui
    troubleshootingPanel --> state
    troubleshootingPanel --> jobs
    troubleshootingPanel --> tstatData
    troubleshootingPanel --> troubleshootingEngine
    troubleshootingPanel --> aiProviders
    troubleshootingPanel --> claudeAssist
    wikimanager --> howToData
    quickcalc --> weightInData
    dropdowns --> weightInData

    %% IMPORTS de data/logic
    jobs --> ui
    jobs --> weightInData
    jobs --> utils
    jobs --> routeTracker
    pricing --> constants
    pricing --> state
    validation -.-> nothing
    weightinlogic --> state
    weightinlogic --> weightInData
    weightinlogic --> utils
    reports --> ui
    reports --> constants
    reports --> state
    reports --> pricing
    components --> constants
    components --> ui
    troubleshootingEngine --> equipmentData
```

---

## Diagrama 2 — Secuencia de Inicialización del App

```mermaid
sequenceDiagram
    participant DOM as DOMContentLoaded
    participant S as script.js init()
    participant ST as state.js
    participant TK as routeTracker.js
    participant JM as jobmanager.js
    participant RM as reportmanager.js
    participant IM as imagemanager.js
    participant WL as weightinlogic.js
    participant FM as formmanager.js
    participant TP as troubleshootingPanel.js

    DOM->>S: event fired
    S->>ST: subscribe(restoreUIFromState)
    Note over ST: ÚNICO subscriber registrado
    S->>TK: initTracker()
    Note over TK: Restaura estado de ruta desde localStorage
    S->>S: build UI object (all DOM refs)
    S->>JM: initJobManager(context)
    Note over JM: loadJobsFromLocalStorage() → renderJobsList()
    S->>RM: initReportManager(context)
    Note over RM: loadReportsFromLocalStorage()
    S->>IM: initImageManager(context)
    Note over IM: Abre IndexedDB (AppImagesDB)
    S->>WL: initWeightInLogic(inputs1, inputs2, saveDebounced)
    Note over WL: Attach input listeners con debounce 150ms
    S->>FM: initFormManager(context)
    Note over FM: Attach ~10 event listeners delegados
    S->>S: initTabs(), initStepper()
    S->>S: loadFromLocalStorage()
    Note over S: Restaura state → setState() → subscribe fires → restoreUIFromState()
    S->>S: toggleWorkspace(false)
    DOM->>TP: DOMContentLoaded (auto-init independiente)
    TP->>TP: init() — attach drawer/symptom/AI listeners
```

---

## Diagrama 3 — Flujo Principal: Job → Completar → Reporte

```mermaid
flowchart TD
    A([Técnico abre el app]) --> B[Lista de Jobs visible]
    B --> C[Click en un Job]
    C --> D{¿Job tiene savedState?}

    D -->|Sí: Resume| E[setState con savedState completo]
    D -->|No: Nuevo| F[setState con address + equipo del job]

    E --> G[toggleWorkspace true]
    F --> G
    G --> H[switchToTab workspace]
    H --> I[subscribe fires → restoreUIFromState]
    I --> J[Components.*.render sincroniza botones]

    J --> K[Técnico llena formulario]
    K --> K1[Services → setState selectedServices]
    K --> K2[Thermostat → setState selectedThermostat]
    K --> K3[Accessories → setState selectedAccessories]
    K --> K4[Fixes → setState selectedFixes]
    K --> K5[WeightIn inputs → setState weightInData]

    K1 & K2 & K3 & K4 & K5 --> L[saveToLocalStorage en cada cambio]
    L --> M{Click Next o botón sección}
    M -->|Validación stepper| N[validateState called]
    N -->|blockingErrors| O[showValidationErrors — stop]
    N -->|OK| P[revealSection siguiente]

    P --> Q[Click GENERATE REPORT]
    Q --> R[validateState para reporte]
    R -->|confirmableErrors| S[showValidationErrors con bypass]
    R -->|OK o bypass| T[generateReportProcess]

    T --> T1[stopLlamada — detiene timer]
    T --> T2[generateReportText state → string]
    T --> T3[generateReportData state → object]
    T --> T4[createReportCard DOM card]
    T4 --> T5[saveReportsToLocalStorage]
    T5 --> T6[removeJobFromList — elimina de lista]
    T6 --> U[switchToTab reports]

    U --> V[Técnico ve su reporte]
    V --> W{Acción compartir}
    W -->|WhatsApp| X[shareReportVia text, whatsapp]
    W -->|SMS| Y[shareReportVia text, sms]
    W -->|Copy| Z[shareReportVia text, copy]
    W -->|Email| AA[shareReportVia text, email]
```

---

## Diagrama 4 — Mapa de Mutaciones de Estado

```mermaid
graph LR
    classDef setter fill:#fef3c7,stroke:#d97706
    classDef stateNode fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef subscriber fill:#dcfce7,stroke:#22c55e

    STATE([state.js\ncentralState]):::stateNode
    SUB([script.js:765\nsubscribe callback]):::subscriber

    %% Setters → STATE
    FM_ADDR[formmanager\naddressInput.input]:::setter
    FM_SRV[formmanager\nserviceTypeButtons]:::setter
    FM_OPT[formmanager\nacHeatOptions]:::setter
    FM_TST[formmanager\nthermostatButtons]:::setter
    FM_QTY[formmanager\nquantitySelector]:::setter
    FM_ACC[formmanager\naccessoryButtons]:::setter
    FM_FIX[formmanager\nfixesSection]:::setter
    FM_HMD[formmanager\nheaterModelSelect]:::setter
    FM_OMD[formmanager\noutdoorModelSelect]:::setter
    FM_NTS[formmanager\nnotesInput.input]:::setter
    WL_INP[weightinlogic\ninput listeners]:::setter
    JM_STR[jobmanager\nstartJob]:::setter
    JM_ADD[jobmanager\naddJobs → address clear]:::setter
    JM_EDT[jobmanager\neditJob]:::setter
    JM_DEL[jobmanager\n_removeJob]:::setter

    FM_ADDR --> STATE
    FM_SRV --> STATE
    FM_OPT --> STATE
    FM_TST --> STATE
    FM_QTY --> STATE
    FM_ACC --> STATE
    FM_FIX --> STATE
    FM_HMD --> STATE
    FM_OMD --> STATE
    FM_NTS --> STATE
    WL_INP --> STATE
    JM_STR --> STATE
    JM_ADD --> STATE
    JM_EDT --> STATE
    JM_DEL --> STATE

    %% STATE → Subscriber → UI
    STATE --> SUB
    SUB --> RUI[restoreUIFromState]
    RUI --> C_ADDR[Components.Address.render]
    RUI --> C_SRV[Components.Services.render]
    RUI --> C_TST[Components.Thermostat.render]
    RUI --> C_ACC[Components.Accessories.render]
    RUI --> C_FIX[Components.Fixes.render]
    RUI --> PRICE[updatePriceDisplay\n→ calculateFinancials]
    RUI --> STEP[updateStepper]
```

---

## Diagrama 5 — Flujo de Troubleshooting y AI

```mermaid
sequenceDiagram
    participant T as Técnico
    participant TP as troubleshootingPanel.js
    participant TE as troubleshootingEngine.js
    participant CA as claudeAssist.js
    participant AP as aiProviders.js
    participant AI as AI Provider\n(Claude/GPT/Gemini/etc)

    T->>TP: Click btn-open-troubleshoot
    TP->>TP: openDrawer() — renderJobSection()
    Note over TP: Carga job activo o permite selección manual

    T->>TP: Click síntoma (.ts-symptom-btn)
    TP->>TP: selectSymptom(symptom)
    TP->>TP: runDiagnosis(symptom, detail)
    TP->>TE: buildContext(state)
    Note over TE: Lee heater, outdoor, tstat, accessories de state
    TE-->>TP: context object
    TP->>TE: diagnose(symptom, context)
    Note over TE: Lógica heurística por síntoma (no API)
    TE-->>TP: result {title, severity, steps, equipmentNotes}
    TP->>TP: renderResults(result)
    Note over T: Ve pasos L1 de diagnóstico

    alt Técnico quiere más ayuda (L2)
        T->>TP: Escribe en chatInput y click ts-ask-claude-btn
        TP->>TP: handleAskClaude()
        Note over TP: Verifica hasProviderKey(activeProvider.id)

        alt No hay API key
            TP-->>T: Muestra error "No API key configured"
        else Hay API key
            TP->>CA: buildUserMessage(symptomLabel, detail, context, l1Result)
            Note over CA: Construye prompt estructurado con equipo + L1 result
            CA-->>TP: userMessage string

            TP->>AP: askAI({providerId, userMessage, onChunk, onDone, onError})

            alt provider.format === 'anthropic'
                AP->>AI: callAnthropic() — SSE stream
            else provider.format === 'gemini'
                AP->>AI: callGemini() — polling simulado
            else provider.format === 'openai'
                AP->>AI: callOpenAICompat() — SSE stream
            end

            AI-->>AP: streaming chunks
            AP->>TP: onChunk(text) — por cada chunk
            TP->>TP: Append a _chatHistory + renderChatMessage
            Note over T: Ve respuesta streameada en tiempo real
            AP->>TP: onDone()
            TP->>TP: _chatHistory.push({role:'ai', text})
        end
    end
```

---

## Diagrama 6 — Arquitectura de Storage (3 tiers)

```mermaid
graph TB
    classDef lsNode fill:#fef9c3,stroke:#eab308
    classDef idbNode fill:#e0f2fe,stroke:#0ea5e9
    classDef sqlNode fill:#f3e8ff,stroke:#a855f7
    classDef writerNode fill:#dcfce7,stroke:#22c55e,color:#14532d
    classDef readerNode fill:#ffedd5,stroke:#f97316,color:#431407

    subgraph LS["💾 localStorage (Browser)"]
        LS1["completionState\nSTO_KEYS.STATE"]:::lsNode
        LS2["completionReports\nSTO_KEYS.REPORTS"]:::lsNode
        LS3["jobsArray\nSTO_KEYS.JOBS"]:::lsNode
        LS4["lastActiveJobAddress\nSTO_KEYS.ACTIVE_JOB"]:::lsNode
        LS5["app-theme\n⚠️ sin constante"]:::lsNode
        LS6["route_tracker_state\n⚠️ sin constante"]:::lsNode
        LS7["wiki_favorites\n⚠️ sin constante"]:::lsNode
        LS8["ts_ai_key_{provider}\n14 keys posibles"]:::lsNode
        LS9["ts_ai_active_provider"]:::lsNode
        LS10["ts_claude_api_key\n⚠️ LEGACY + ts_ai_key_claude"]:::lsNode
    end

    subgraph IDB["🗄️ IndexedDB (Browser)"]
        IDB1["AppImagesDB\n→ store: 'images'\nkey: {addr_prefix}_{label}"]:::idbNode
    end

    subgraph SQL["🏛️ SQLite — dashboard.db (Server)"]
        SQL1[jobs]:::sqlNode
        SQL2[job_items]:::sqlNode
        SQL3[job_edits]:::sqlNode
        SQL4[inventory]:::sqlNode
        SQL5[dispatch_jobs]:::sqlNode
        SQL6[route_times]:::sqlNode
    end

    %% Escritores
    W_SCRIPT["script.js\nsaveToLocalStorage"]:::writerNode
    W_JM["jobmanager.js\nsaveJobsToLocalStorage"]:::writerNode
    W_RM["reportmanager.js\nsaveReportsToLocalStorage"]:::writerNode
    W_RT["routeTracker.js\n_save"]:::writerNode
    W_WIKI["wikimanager.js\nfavorites toggle"]:::writerNode
    W_AI["aiProviders.js\nsaveProviderKey"]:::writerNode
    W_IMG["imagemanager.js\nsaveImageToDB"]:::writerNode
    W_IMPORT["POST /api/import\n(server.js)"]:::writerNode

    W_SCRIPT -->|write| LS1
    W_JM -->|write| LS3
    W_RM -->|write| LS2
    W_RT -->|write| LS6
    W_WIKI -->|write| LS7
    W_AI -->|write| LS8
    W_IMG -->|write| IDB1
    W_IMPORT -->|write| SQL1
    W_IMPORT -->|write| SQL2
    W_IMPORT -->|write| SQL6

    %% Lectores
    R_SCRIPT["script.js\nloadFromLocalStorage"]:::readerNode
    R_JM["jobmanager.js\nloadJobsFromLocalStorage"]:::readerNode
    R_RM["reportmanager.js\nloadReportsFromLocalStorage"]:::readerNode
    R_IMG["imagemanager.js\ngetImageFromDB"]:::readerNode
    R_DASH["dashboard.html\nfetch /api/*"]:::readerNode

    LS1 -->|read| R_SCRIPT
    LS3 -->|read| R_JM
    LS2 -->|read| R_RM
    IDB1 -->|read| R_IMG
    SQL1 -->|read| R_DASH
    SQL2 -->|read| R_DASH
    SQL3 -->|read| R_DASH
    SQL4 -->|read| R_DASH

    %% Separación arquitectónica
    note1["⚠️ index.html NO accede\na SQL nunca — 100% offline"]

    style note1 fill:#fecaca,stroke:#ef4444,color:#7f1d1d
```

---

## Hallazgos de Auditoría Rápida

| ID | Tipo | Severidad | Archivo | Descripción |
|----|------|-----------|---------|-------------|
| AF-001 | Dead Code | Baja | `claudeAssist.js:144` | `askClaude()` con `fetch()` nunca llamada — reemplazada por `aiProviders.askAI()` |
| AF-002 | Duplicado | Media | `aiProviders.js:239` + `claudeAssist.js:36` | `buildSystemPrompt()` definida en ambos archivos |
| AF-003 | Duplicado | Baja | `troubleshootingPanel.js` vs `ui.js` | `showToastLocal` local vs `showToast` exportada |
| AF-004 | Layer Violation | Media | `jobs.js:66-667` | `renderJobsList` (500 líneas DOM) en módulo de persistencia |
| AF-005 | Riesgo | Media | `dropdowns.js:8-9` | DOM queries ejecutadas a nivel de módulo, sin init() |
| AF-006 | Missing Constant | Baja | `wikimanager.js`, `routeTracker.js`, `ui.js` | 3+ keys localStorage sin registrar en `STORAGE_KEYS` |
| AF-007 | Arquitectura | Alta | `server.js` (40+ endpoints) | El app principal no usa el backend — cero impacto al optimizarlo |
| AF-008 | Single Point of Failure | Alta | `script.js:765` | Un único `subscribe()` maneja TODA la reactividad UI |
| AF-009 | Seguridad | Media | `aiProviders.js` | API keys en localStorage — vulnerable a XSS |
| AF-010 | Key Duplicada | Baja | `claudeAssist.js` vs `aiProviders.js` | Dos keys distintas para Claude API (`ts_claude_api_key` legacy vs `ts_ai_key_claude`) |

Ver detalles completos y recomendaciones en [app-map.json](./app-map.json) → `auditFindings[]`.
