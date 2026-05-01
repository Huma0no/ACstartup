# HVAC Field Tool — Development Plan
**Version:** 1.0  
**Date:** April 2026  
**Status:** Pending Approval  
**Prerequisite:** Architecture v1.0 ✅ · Wireframes v3 ✅

---

## Principio guía

> La app funciona al final de cada fase. Nunca se rompe nada entre fases.

Dado que existe un repo funcional, el plan es **refactorizar primero, construir después**. Cada fase tiene un entregable concreto y verificable antes de pasar a la siguiente.

---

## Fase 1 — Limpiar la base
**Objetivo:** El código refleja la arquitectura ideal. La app funciona igual que hoy.  
**Duración estimada:** 1–2 sesiones de trabajo

### Tareas
- [ ] Auditar los 32+ archivos del repo contra el plano de 12 archivos
- [ ] Identificar qué código de cada archivo existente va a qué módulo nuevo
- [ ] Crear la estructura de carpetas `/src` y `/styles`
- [ ] Fusionar `jobs.js` + `jobmanager.js` → `src/jobs.js`
- [ ] Fusionar `reports.js` + `reportmanager.js` → `src/reports.js`
- [ ] Fusionar `ui.js` + `formmanager.js` + `script.js` → distribuir entre `src/app.js` y `src/workspace.js`
- [ ] Fusionar `weightindata.js` + `weightinlogic.js` → absorber en `src/workspace.js`
- [ ] Extraer todos los `data-price=""` hardcodeados del HTML → `src/data.js`
- [ ] Crear `src/storage.js` como única capa de acceso a localStorage
- [ ] Limpiar `index.html` a ~120 líneas (solo estructura)
- [ ] Eliminar del repo: `reset_db.js`, `verify_db.js`, `completions.db-journal`, `dashboard.db`, `SKILL.md`
- [ ] Verificar que la app funciona igual que antes

### Entregable
App funcional con estructura limpia de 12 archivos. Sin features nuevas.

---

## Fase 2 — Mejorar lo existente
**Objetivo:** La app existente adopta el diseño del wireframe v3.  
**Duración estimada:** 2–3 sesiones de trabajo

### Tareas
- [ ] Implementar UI de chips para accesorios y fixes en workspace
- [ ] Unir Servicio + Termostato en un solo step colapsable
- [ ] Implementar steps colapsables (1–5) en workspace
- [ ] Agrupar jobs por subdivisión con color por borde izquierdo
- [ ] Implementar status: Completado / Pendiente / Dar Seguimiento
- [ ] Agregar campo `pendingReason` al completion
- [ ] Implementar badge de status visible en lista de jobs
- [ ] Implementar badge URGENT / TIME-SENSITIVE en jobs
- [ ] Reestructurar Reports: Edit / Share▾ / Delete por completion
- [ ] Implementar submenú Share: WhatsApp / SMS / Email / Copy
- [ ] Mover "Delete All" a posición discreta (texto pequeño, abajo)
- [ ] Total corriente visible en header del workspace
- [ ] Verificar que exports CSV y JSON existentes funcionan correctamente

### Entregable
App con nueva UI, agrupación por subdivisión, status de jobs, y reports mejorados.

---

## Fase 3 — Agregar lo nuevo
**Objetivo:** Features nuevas que no existen en el repo actual.  
**Duración estimada:** 3–5 sesiones de trabajo

### 3A — Onboarding y configuración de precios
- [ ] Detectar primer inicio (`settings.firstLaunch`)
- [ ] Pantalla de onboarding: nombre del técnico + precios por servicio y accesorio
- [ ] Guardar configuración en `src/settings.js` → localStorage
- [ ] Aplicar precios del usuario automáticamente en workspace
- [ ] Pantalla de Settings accesible desde tab Config
- [ ] Configuración de cost rules (combinaciones que modifican, no solo suman)

### 3B — PDF Import con IA
- [ ] Implementar `src/importer.js`
- [ ] OCR del PDF (librería Tesseract.js — no requiere servidor)
- [ ] Enviar texto extraído a IA con prompt estructurado para parsear campos
- [ ] Mapear campos parseados al data model: address, subdivision, builder, equipment models, notes, time-sensitive flags
- [ ] Pantalla de revisión: usuario confirma/corrige antes de guardar
- [ ] Soporte para import mid-day sin sobreescribir sesión actual
- [ ] Import JSON desde Dispatch (ya existe, verificar y mantener)

### 3C — Botón IA flotante
- [ ] Implementar `src/ai.js`
- [ ] FAB flotante (✦) visible en todas las pantallas
- [ ] Panel de chat que se abre sin perder estado actual
- [ ] Inyectar contexto del job activo (equipo, marca, refrigerante)
- [ ] System prompt: scope HVAC únicamente
- [ ] Soporte multi-proveedor: Claude / ChatGPT / Gemini / Copilot
- [ ] Input de API key por proveedor en Settings
- [ ] Accesos rápidos en panel IA: Fault Codes / Diagramas / Weigh-In del equipo activo

### 3D — Diagramas offline
- [ ] Implementar `src/diagrams.js`
- [ ] Mapa de URLs de diagramas por modelo de equipo en `src/data.js`
- [ ] Pre-descarga automática al importar jobs (vía service worker cache)
- [ ] Trigger manual de descarga por diagrama
- [ ] Viewer offline dentro de la app

### Entregable
App completa con todas las features del Requirements v1.0.

---

## Fase 4 — Preparar para vender
**Objetivo:** La app puede ser usada por otros contratistas de forma independiente.  
**Duración estimada:** 2–3 sesiones de trabajo

### Tareas
- [ ] Separar datos por usuario (namespace en localStorage por técnico)
- [ ] Onboarding adaptado para nuevo usuario (no solo Christian)
- [ ] Export/import de configuración completa (JSON de respaldo)
- [ ] Documentación mínima de uso (1 página, lenguaje de técnico)
- [ ] Prueba con 1–2 contratistas reales (feedback antes de cobrar)
- [ ] Definir modelo de precio y forma de entrega (URL privada por contratista)

### Entregable
App lista para entregar a otros contratistas y cobrar.

---

## Resumen de fases

| Fase | Objetivo | Sesiones est. | Resultado |
|---|---|---|---|
| 1 | Limpiar base | 1–2 | Código limpio, app igual |
| 2 | Mejorar UI | 2–3 | Nueva interfaz funcional |
| 3 | Features nuevas | 3–5 | App completa |
| 4 | Vender | 2–3 | Producto entregable |

**Total estimado: 8–13 sesiones de trabajo.**

---

## Reglas de trabajo

1. **Una fase a la vez.** No se empieza la siguiente hasta que la anterior está verificada.
2. **Commit al final de cada tarea.** Git es el registro de progreso.
3. **Si algo no está claro, se define antes de codificar.** No improvisar sobre la marcha.
4. **La app siempre debe funcionar.** Si una tarea rompe algo, se revierte antes de continuar.

---

*Document prepared by: PM/Software Engineer*  
*Approved by: _________________ Date: _________*
