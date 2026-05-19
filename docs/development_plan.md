# HVAC Field Tool — Development Plan
**Version:** 2.0
**Date:** Mayo 2026
**Status:** Active
**Prerequisite:** Architecture v1.0 ✅ · Requirements v1.0 ✅ · Data Dictionary v1.1 ✅

---

## Principio guía

> La app funciona al final de cada sesión. Nunca se rompe nada entre sesiones.

---

## Estado actual — Mayo 2026

Fases 1 y 2 del plan original completadas bajo rama `build/desde-cero`.
App funcional en producción: `hvacfieldops-dev.netlify.app`
App original preservada en: `completion.netlify.app`
Dispatch preservado y funcional — no se toca.

### Lo que existe y funciona
- Tab Jobs — lista, agrupación por subdivisión, crear job manual
- Workspace completo — Service, Accessories, Fixes, Weight-In, Notes, Fotos
- Tab Reports — ver completions, export CSV, export JSON
- Tab LV — diagramas de cableado
- Settings — configuración de precios
- src/ai.js — construido, pendiente de UI
- src/importer.js — construido, pendiente de UI
- src/diagrams.js — construido

### Deuda técnica documentada (ver audit.md)
- C1: key mismatch Extended Wire en index.html vs data.js — bug de precios activo
- C2: _buildServiceItems duplicada en workspace.js y app.js
- M1: formato de campo `freon` inconsistente en OUTDOOR_CATALOG
- M2: placeholders 0 y 999 en OUTDOOR_CATALOG en lugar de null
- Settings price fields hardcodeados en index.html — pendiente refactor

---

## Fase 3 — Estabilizar y completar
**Objetivo:** Corregir bugs activos, completar features incompletas, ajustar UI.
**Estado:** En progreso

### 3A — Bugs críticos (primera sesión)

Bloquean el uso en campo. Van primero.

- [ ] **Modal close bug** — Quick Calc, Troubleshooting, y Settings no se pueden
      cerrar en móvil. Solo cierra con ESC en PC o recargando página.
      Fix: agregar botón de cierre visible y handler de click fuera del modal.
- [ ] **Workspace inicia en sección incorrecta** — cuando hay accesorios
      registrados en el job, el workspace abre en Fixes en lugar de Service.
      Fix: forzar scroll/focus a sección Service siempre al iniciar workspace.

### 3B — Deuda técnica (segunda sesión)

Bugs silenciosos que producen datos incorrectos.

- [x] **C1** — key mismatch fue falso positivo, keys ya eran correctas
- [ ] **C2** — exportar buildServiceItems desde workspace.js, eliminar copia
      duplicada en app.js (Edit Modal)
- [x] **M1** — campo `freon` normalizado en OUTDOOR_CATALOG: R-454B, R-32, R-410A
- [x] **M2** — placeholders 0 y 999 reemplazados por null en OUTDOOR_CATALOG
- [x] **Refactor data.js** — FIX_DISPLAY y ACCESSORY_DISPLAY migrados a
      `{ label, report }`. app.js lee `label`, reports.js lee `report`.

### 3C — Ajustes de UI (tercera sesión)

No bloquean pero afectan experiencia en campo.

- [x] **Job card** — layout de address corregido. Dos filas flexbox independientes.
      job-top-spacer eliminado.
- [x] **Botón X de eliminar job** — sin fondo en hover, solo color rojo en ícono.
- [x] **Tema oscuro en crear job** — inputs usan color-surface para mejor contraste.
- [x] **Address field** — address, subdivision y builder se convierten a mayúsculas.
- [x] **Toggle 2 Systems** — reemplazado por botón contextual "+ Add second system"
      que aparece solo cuando ambos dropdowns de Sistema 1 tienen valor.
- [ ] **Botón Add Job** — hacerlo más prominente. Habilitarlo solo cuando
      hay datos mínimos requeridos (address). Deshabilitar si no hay cambios.
- [ ] **Fixes** — ajuste de estilo visual (sin cambios de lógica).
- [ ] **Finish — reglas de UI** — deshabilitar botón Finish cuando workspace
      está completamente vacío. Ver reglas completas en data_dictionary.md §10.

### 3D — Ajustes de lógica (cuarta sesión)

- [ ] **Other en Tstats** — habilitar campo de texto libre. Tratar el texto
      introducido igual que un tstat fijo en el reporte.
- [ ] **LP Kit** — convertir a botón agrupador que revela sub-opciones:
      Lennox 1Stg, Lennox 2Stg, Goodman. El agrupador no genera línea en
      el reporte — solo la sub-opción elegida.
- [ ] **Extended Wire** — renombrar de "Extended LV Wire" a "Extended Wire".
      Mantener sub-opciones: Furnace, Cunit.
- [ ] **PVC Work** — eliminar del catálogo de Fixes.
      Casos similares se manejan con Other + texto libre.
- [ ] **Service Other** — eliminar botón Other de Services.
- [ ] **CSV** — reubicar campo Notes: nueva posición después de Subdivision,
      antes de Service_Type. Reubicar Refrigerant: nueva posición después
      de Outdoor_Model.
- [ ] **Finish + Other** — habilitar Other (Accessory o Fix) como acompañante
      válido de Finish. Ver jerarquía completa en data_dictionary.md §10.

### 3E — Features pendientes (quinta sesión en adelante)

- [ ] **Import JSON — UI** — agregar botón de selección de archivo en Tab Jobs.
      Flujo: usuario selecciona archivo JSON → validar → agregar jobs sin
      duplicar por dirección → confirmar importación.
- [ ] **Quick Calc** — evaluar si el acceso rápido desde fuera del workspace
      agrega valor suficiente. Si sí, implementar como modal standalone
      que no requiere job activo.
- [ ] **Route Generation** — funcionalidad existente en repo original,
      funciona de manera inconsistente. Revisar implementación, estabilizar,
      integrar en Tab Jobs.
- [ ] **IA flotante** — implementar UI usando src/ai.js existente.
      FAB flotante visible en todas las pantallas. Panel de chat sin perder
      estado actual. Tier gratuito por default, opción de API key propia
      por proveedor en Settings.
- [ ] **PDF Import** — implementar UI usando src/importer.js existente.
      Flujo: seleccionar PDF → OCR → IA parsea campos → usuario revisa →
      confirmar importación.
- [ ] **Troubleshoot drawer** — investigar por qué `ts-drawer` no se hace
      visible cuando se presiona `btn-open-troubleshoot`. El handler se ejecuta
      (añade clase `"open"` al drawer y `"visible"` al overlay) pero el drawer
      no aparece. Implementar o simplificar.

---

## Fase 4 — Infraestructura
**Objetivo:** Corregir la base técnica antes de agregar más features.

- [ ] **sw.js** — reescribir service worker para cachear archivos de src/
      en lugar de archivos del repo original. CACHE_NAME nuevo para forzar
      actualización en browsers con SW viejo instalado.
- [ ] **dropdowns.js** — eliminar script tag de index.html (línea 340).
      El archivo lanza TypeError en cada carga y no tiene efecto en la PWA.
- [ ] **Settings price fields** — generar dinámicamente desde DEFAULT_PRICES
      en data.js. Eliminar labels hardcodeados en index.html.
- [ ] **docs/behavior.md** — construir UI Behavior Spec documentando el
      comportamiento esperado de cada sección. Base para testing manual.

---

## Fase 5 — Preparar para otros usuarios
**Objetivo:** La app puede ser usada por otros contratistas de forma independiente.

- [ ] Separar datos por usuario (namespace en localStorage por técnico)
- [ ] Onboarding adaptado para nuevo usuario
- [ ] Export/import de configuración completa (JSON de respaldo)
- [ ] Documentación mínima de uso (lenguaje de técnico, no de developer)
- [ ] Prueba con 1–2 contratistas reales antes de cobrar
- [ ] Definir modelo de precio y forma de entrega

---

## Resumen

| Fase | Objetivo | Sesiones est. | Estado |
|---|---|---|---|
| 1 | Limpiar base | — | ✅ Completa |
| 2 | Mejorar UI | — | ✅ Completa |
| 3A | Bugs críticos | 1 | 🔴 Pendiente |
| 3B | Deuda técnica | 1 | 🔴 Pendiente |
| 3C | Ajustes UI | 1 | 🔴 Pendiente |
| 3D | Ajustes lógica | 1 | 🔴 Pendiente |
| 3E | Features pendientes | 3+ | 🔴 Pendiente |
| 4 | Infraestructura | 1 | 🔴 Pendiente |
| 5 | Multi-usuario | 2–3 | ⏳ Futuro |

---

## Reglas de trabajo

1. Una sub-fase a la vez. No se empieza la siguiente hasta que la anterior está verificada.
2. Commit al final de cada tarea. Push inmediato.
3. Behavior Summary antes de cualquier cambio (ver CLAUDE.md).
4. Si algo no está claro, se define en el doc antes de codificar.
5. La app siempre debe funcionar. Si una tarea rompe algo, se revierte.
6. Dispatch y completion.netlify.app no se tocan.
7. Verify in device before every commit. No exceptions.
8. For complex UI components: sketch or mockup first, code after. Never iterate layout in code without a validated visual reference.

---

*Document prepared by: PM/Software Engineer*
*Updated: Mayo 2026*
