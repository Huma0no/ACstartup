# HVAC Field Tool — Data Dictionary
**Version:** 1.0  
**Date:** April 2026  
**Status:** Approved  
**Prerequisite:** Architecture v1.0 ✅ · Requirements v1.0 ✅

---

## 1. Storage Keys

Todas las claves de localStorage están centralizadas en `src/storage.js`. Ningún otro módulo usa strings directos.

| Clave | Valor en storage | Módulo | Descripción |
|---|---|---|---|
| STATE | "completionState" | workspace.js | Estado activo del workspace |
| REPORTS | "completionReports" | reports.js | Lista de completions generados |
| JOBS | "jobsArray" | jobs.js | Lista de jobs del día |
| ACTIVE_JOB | "lastActiveJobAddress" | jobs.js | Dirección del job activo |
| APP_THEME | "app-theme" | settings.js | Tema dark/light |
| TECH_NAME | "dashboard_tech_name" | settings.js | Nombre del técnico |
| SETTINGS | "appSettings" | settings.js | Configuración completa incluyendo precios |

> `ROUTE_TRACKER` y `WIKI_FAVORITES` eliminados — sin consumidores activos.

---

## 2. Objeto Job

Representa una dirección de servicio asignada para el día.

```json
{
  "id": "uuid-v4",
  "date": "2026-01-08",
  "address": "32122 WATERLILY VIEW COURT",
  "subdivision": "DELLROSE",
  "builder": "LENNAR",
  "contact": "BRENT ANDERSON 281 831 3102",
  "serviceTime": "8:00 AM",
  "timeSensitive": false,
  "isTwoSystems": false,
  "details": "",
  "jobAccessories": [],
  "system1": {
    "furnace": "GR9S800805C",
    "coil": "CHPTA4830C3",
    "outdoor": "GLXS4BA4210",
    "links": {}
  },
  "system2": null,
  "savedState": null,
  "addressHistory": []
}
```

### Campos — Job

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | string (uuid) | ✅ | Generado automáticamente al crear |
| `date` | string (ISO) | ✅ | Fecha del job |
| `address` | string | ✅ | Dirección en mayúsculas |
| `subdivision` | string | ✅ | Nombre de la subdivisión |
| `builder` | string | ✅ | Constructor — ver lista §6 |
| `contact` | string | ❌ | Nombre y teléfono del contacto del builder |
| `serviceTime` | string | ❌ | Hora sugerida del PDF — solo referencia |
| `timeSensitive` | boolean | ❌ | true si PDF contiene URGENT / MUST / VISIT AM / PM |
| `isTwoSystems` | boolean | ❌ | true si la dirección tiene 2 sistemas HVAC |
| `details` | string | ❌ | Notas previas extraídas del PDF |
| `jobAccessories` | string[] | ❌ | Accesorios seleccionados por el técnico. Usado para: restaurar workspace al reanudar, filtrar diagramas LV, y construir contexto de troubleshooting |
| `system1` | SystemModel | ✅ | Modelos del sistema principal |
| `system2` | SystemModel \| null | ❌ | Modelos del segundo sistema — null si no aplica |
| `savedState` | object \| null | ❌ | Estado del workspace guardado a mitad del job |
| `addressHistory` | string[] | ❌ | Historial de visitas previas a esta dirección |

### SystemModel

El objeto `system1` es requerido. Sus campos internos son todos opcionales — pueden llegar vacíos desde el PDF.

| Campo | Tipo | UI | Descripción |
|---|---|---|---|
| `furnace` | string | Visible | Número de modelo del furnace / air handler |
| `coil` | string | **Oculto por default** | Número de modelo del coil evaporador — visible al expandir |
| `outdoor` | string | Visible | Número de modelo de la unidad exterior |
| `links` | object | — | Resultado merged de SERIES_LINKS y OUTDOOR_LINKS para los modelos del job. Populado al crear el job. `{}` si no hay match en el catálogo |

> Los 3 campos de modelo se exportan siempre en el JSON hacia Dispatch, independientemente de si están visibles en la UI.

> `links` shape varies by brand — keys come directly from `SERIES_LINKS` / `OUTDOOR_LINKS` in `src/data.js` (e.g. `serviceManual`, `lennoxPros`, `trane`, `goodman`, `linkText`, `blowerSpeedImage`). No fixed schema.

---

## 3. Objeto Completion

Representa el trabajo realizado en un job. Se genera al completar el workspace.

```json
{
  "jobId": "uuid-v4",
  "address": "32122 WATERLILY VIEW COURT",
  "subdivision": "DELLROSE",
  "builder": "LENNAR",
  "timestamp": "2026-01-08T14:30:00.000Z",
  "isTwoSystems": false,
  "isTemporary": false,
  "refrigerant": "R-454B",
  "outdoorModel": "GLXS4BA4210",
  "indoorModel": "GR9S800805C",
  "outdoorModel2": null,
  "indoorModel2": null,
  "services": [],
  "selectedThermostat": null,
  "thermostatQuantity": 1,
  "accessories": [],
  "fixes": [],
  "weightInData": null,
  "weightInData2": null,
  "notes": "",
  "photos": [],
  "sitePhotoMeta": [],
  "totals": {
    "service": 0,
    "accessory": 0,
    "fix": 0,
    "total": 0
  },
  "reportText": ""
}
```

### Campos — Completion

| Campo | Tipo | Descripción |
|---|---|---|
| `jobId` | string | Referencia al Job de origen |
| `address` | string | Copiado del Job |
| `subdivision` | string | Copiado del Job |
| `builder` | string | Copiado del Job |
| `timestamp` | string ISO 8601 | Momento de generación del reporte |
| `isTwoSystems` | boolean | Duplica precios de servicios y accesorios marcados |
| `isTemporary` | boolean | true = "AC (Temporarily) started" en el reporte |
| `refrigerant` | string | Tipo de refrigerante — ver sección 6 (R-410A, R-454B) |
| `outdoorModel` | string | Modelo outdoor Sistema 1 |
| `indoorModel` | string | Modelo furnace Sistema 1 |
| `outdoorModel2` | string \| null | Modelo outdoor Sistema 2 |
| `indoorModel2` | string \| null | Modelo furnace Sistema 2 |
| `services` | ServiceItem[] | Servicios realizados |
| `selectedThermostat` | object \| null | Termostato seleccionado |
| `thermostatQuantity` | number | Cantidad de termostatos |
| `accessories` | AccessoryItem[] | Accesorios instalados |
| `fixes` | FixItem[] | Fixes realizados |
| `weightInData` | WeightInData \| null | Datos de carga Sistema 1 |
| `weightInData2` | WeightInData \| null | Datos de carga Sistema 2 |
| `notes` | string | Notas de campo |
| `photos` | Photo[] | Fotos con metadata GPS |
| `sitePhotoMeta` | SitePhotoMeta[] | Fotos de condiciones del sitio — labels insertados en el reporte entre notas y servicios |
| `totals` | Totals | Desglose de precios y total |
| `reportText` | string | Texto final generado para enviar a la compañía |

---

## 4. Sub-objetos

### ServiceItem
```json
{ "name": "AC", "displayName": "AC started", "price": 30 }
```

### AccessoryItem
```json
{ "name": "FIN180P", "displayName": "fin180p", "price": 10 }
```

### AccessoryItem (updated)
```json
{ 
  "name": "FLOAT_SWITCH", 
  "displayName": "Float Switch", 
  "price": 5,
  "techSupplied": true
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Accessory key from ACCESSORIES constant |
| `displayName` | string | Human-readable label for reports |
| `price` | number | Price charged |
| `techSupplied` | boolean | true = technician supplies and installs (counts against inventory in Dispatch). false = pre-installed on site (does not affect inventory). Other custom accessories are always techSupplied: true. |

### Technician-supplied accessories
Defined in `src/data.js` as `TECH_SUPPLIED_ACCESSORIES`.
Thermostats are always techSupplied: true by nature —
not included in this array since they are tracked
separately via jobThermostat.

### FixItem
```json
{ "name": "OPEN_ECOIL", "displayName": "opened ecoil to pull out sensor wire", "price": 30, "detail": "" }
```
> `detail` solo se usa en Leaks — especifica ubicación: "indoor coil", "cunit", "wall".

### WeightInData
| Campo | Tipo | Descripción |
|---|---|---|
| `linesetLength` | string | Longitud del lineset (pies) |
| `factoryChargeOz` | string | Carga de fábrica del nameplate (oz) |
| `factoryLineConfig` | string | Configuración de línea de fábrica |
| `approxAdjustOz` | string | Ajuste aproximado por pie de lineset (oz) |
| `adjustedOz` | string | Carga objetivo ajustada (oz) |
| `fanSpeedCfm` | string | Velocidad del fan (CFM) |
| `liquidLineTemp` | string | Temperatura línea de líquido (°F) |
| `suctionLineTemp` | string | Temperatura línea de succión (°F) |
| `condenserSatTemp` | string | Temperatura saturación condensador (°F) |
| `subcoolingValue` | string | Subenfriamiento medido (°F) |
| `oemSubcoolingGoal` | string | Objetivo OEM de subenfriamiento (°F) |
| `subcoolingDeviation` | string | Desviación respecto al objetivo OEM (°F) |

### Photo
```json
{ "dataUrl": "base64...", "lat": 29.7604, "lng": -95.3698, "timestamp": "2026-01-08T14:30:00Z" }
```

### SitePhotoMeta
```json
{ "slug": "no_p_drain_1746123456789", "label": "No P-Drain" }
```

### Totals
```json
{ "service": 30, "accessory": 25, "fix": 30, "total": 85 }
```

---

## 5. Precios y Reglas

Todos los precios viven en `src/data.js` como constantes. El usuario puede sobreescribirlos desde Settings — los valores aquí son defaults.

### Servicios

| Clave | Nombre | Precio base | Regla especial |
|---|---|---|---|
| AC | "AC" | $30 | — |
| HEAT | "Heat" | $30 | — |
| AC_HEAT | "AC & Heat" | $30 | AC + Heat juntos = $30, no $60 |
| PRESTART | "Prestart" | $20 | No se mezcla con AC ni Heat. Reporte: "System Prestarted $20" |
| FINISH | "Finish" | $20 | Se activa junto a AC, Heat, o AC & Heat. El precio base del servicio es $20 — no se suma al precio de AC/Heat. Reporte: "Finish/ AC Started $20", "Finish/ Heat Started $20", "Finish/ AC & Heat Started $20" |
| DRIVE_RUN | "Drive Run" | $10 | — |
| CANCEL | "Cancel" | $0 | Anula todo cobro |

> **Regla 2 Systems:** todos los servicios duplican su precio y agregan "(2 Systems)" al texto. Ejemplo: "System Prestarted (2 Systems) $40", "Finish/ AC & Heat Started (2 Systems) $60"
> **Temporarily:** no modifica el precio. Solo modifica el texto del reporte — "AC (Temporarily) started".

### Accesorios

| Clave | Nombre display | Precio | ×2 con 2 Systems | Regla especial |
|---|---|---|---|---|
| FIN180P | "fin180p" | $10 | ❌ | — |
| FIN6_MD | "FIN6-MD" | $10 | ❌ | — |
| FLOAT_SWITCH | "Float Switch" | $5 | ✅ | — |
| DEHUM | "Dehum" | $10 | ❌ | — |
| FA_INTAKE | "F/A" | $10 | ❌ | — |
| HARMONY | "Harmony" | $40 | ❌ | — |
| HZ322 | "HZ322" | $30 | ❌ | — |
| UT3000 | "UT3000" | $30 | ❌ | — |
| BYPASS | "Bypass" | $5 | ❌ | — |
| E_BYPASS | "eBypass" | $10 | ❌ | — |
| DAPC | "DAPC" | $10 | ❌ | — |
| APRIL_AIR | "AprilAir" | $10 | ❌ | — |
| RDS | "RDS" | $10 | ✅ | — |
| TRANE_HARNESS | "Trane Harness" | $10 | ✅ | — |
| ECOIL_WIRE | "Ecoil Wire" | $10 | ✅ | — |
| LP_KIT_LENNOX_1STG | "LP Kit Lennox 1stg" | $20 | ✅ | — |
| LP_KIT_LENNOX_2STG | "LP Kit Lennox 2stg" | $20 | ✅ | — |
| LP_KIT_GOODMAN | "LP Kit Goodman" | $20 | ✅ | — |
| WEIGHT_IN_DATA | "weigh-in data" | $10 | ✅ | +$10 adicional si hay Finish |
| EXTENDED_WIRE | "extended wire" | $5 | ❌ | Sub-opciones ocultas por default: "cond", "ecoil" — mismo precio, genera reporte más específico |
| OUT_OF_TOWN | "Out of town fee" | custom | ❌ | Precio libre |
| OTRO | "Otro" | custom | ❌ | Precio libre |

### Fixes

| Clave | Nombre display | Precio |
|---|---|---|
| PRESSURE_TEST | "pressure test" | $10 |
| OPEN_ECOIL | "opened ecoil to pull out sensor wire" | $30 |
| WIRES_JAMMED | "wires jammed" | $5 |
| STUCK_BLOWER | "stuck blower" | $20 |
| CUT_SHEETROCK | "cut sheetrock" | $15 |
| EXTENDED_WIRE | "extended wire" | $5 |
| PVC_WORK | "PVC work" | $15 |
| LEAKS_ECOIL | "leaks (indoor coil)" | $20 |
| LEAKS_CUNIT | "leaks (cunit)" | $20 |
| LEAKS_WALL | "leaks (wall)" | $50 |
| OTRO | "Otro" | custom |

---

## 6. Listas de Valores Válidos

### Builders
```
Lennar, MHI, Highland, CastleRock, First America, Chesmar
```

### Tipos de Servicio
```
AC, Heat, AC & Heat, Prestart, Finish, Drive Run, Cancel
```

### Termostatos
```
T-6, T-10, Ecobee, Daikin One, TH2110
```

### Marcas de Equipo
```
Goodman, Trane, Lennox, Daikin
```

### Refrigerantes
```
R-454B (A2L), R-32 (A2L)
```
> R-410A eliminado — fuera de uso. Se puede agregar como opción oculta de respaldo en el futuro si se requiere compatibilidad con equipos legacy.

---

## 7. Reglas de Negocio

1. **AC + Heat simultáneos** → precio total $30, no la suma de ambos ($60)
2. **2 Systems** → duplica precio de servicio y accesorios marcados con ✅, agrega "(2 Systems)" al texto del reporte
3. **Prestart** → no se mezcla con AC ni Heat — son mutuamente excluyentes
4. **Finish** → se activa junto a AC, Heat o AC & Heat — el precio base del servicio es $20, reemplaza al precio de AC/Heat. Modifica el texto: "Finish/ AC Started $20"
5. **Weight-In + Finish** → precio base $10 + addon $10 = $20
6. **Cancel** → anula todo cobro, total = $0
7. **Temporarily** → no modifica precio — solo modifica texto: "AC (Temporarily) started"
8. **Precios del usuario** → sobreescriben los defaults en `src/data.js` vía Settings

---

## 8. Formato del Reporte

Texto plano generado por `src/reports.js`. Debe coincidir exactamente con el estándar de la compañía.

```
[ADDRESS], [NOTAS SI EXISTEN], [TIPO DE SERVICIO] [DETALLES EQUIPO] $[PRECIO SERVICIO], [ACCESORIO 1] $[PRECIO], [ACCESORIO 2] $[PRECIO], [FIX 1] $[PRECIO], [FIX 2] $[PRECIO], total $[TOTAL]
```

**Ejemplo completo:**
```
32122 WATERLILY VIEW COURT, AC & Heat started 2 Ecobee tstats $60, fin180p $10, float switch $5, opened ecoil to pull out sensor wire $30, weigh-in data $20, total $125
```

**Ejemplo con Finish:**
```
22022 MATERA VISTA LANE, Finish/ AC & Heat started 1 T-6 tstat $20, fin180p $10, float switch $5, pressure test $10, weigh-in data $20, total $65
```

**Ejemplo con notas y Temporarily:**
```
5011 WILD BERGAMOT, No P-Drain, AC (Temporarily) started 1 T-6 tstat $30, fin180p $10, pressure test $10, total $50
```

**Ejemplo con Prestart 2 Systems:**
```
31531 BLUEBELL, System Prestarted (2 Systems) $40, fin180p $10, float switch $10, total $60
```

---

## 9. Imágenes LV

Todas las imágenes en una sola carpeta: `images/lv/`

| Archivo | Entrada |
|---|---|
| tstat-1-2stage.png | Tstat 1/2 stage |
| tstat-heatpump.png | Tstat Heat Pump |
| tstat-daikin.png | Tstat Daikin One |
| cond-1-2stage.png | Condenser 1/2 stage |
| cond-heatpump.png | Condenser Heat Pump |
| cond-daikin.png | Condenser Daikin |
| furnace-1-2stage.png | Furnace 1/2 stage |
| furnace-heatpump.png | Furnace Heat Pump |
| airhandler.png | Air Handler |
| daikin-comm.png | Daikin Communication |
| acc-fin180p.png | FIN180P |
| acc-hz322.png | HZ322 |
| acc-harmony.png | Harmony |
| acc-floatswitch.png | Float Switch |
| acc-rds.png | RDS |
| acc-ebypass.png | eBypass |
| acc-freshair.png | Fresh Air |
| acc-aprilair.png | AprilAir |
| acc-dehum.png | Dehum |
| acc-ut3000.png | UT3000 |
| acc-dapc.png | DAPC |

---

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
