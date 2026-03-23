# Registro de Cambios

Todos los cambios notables en este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [No publicado] - Versión Actual

### Añadido

- Implementación de Módulos ES (ESM) para una arquitectura más limpia y moderna.

### Cambiado

- **Refactorización Mayor:** `weightInData.js` ahora exporta sus datos (`heaters`, `unidadesExteriores`, etc.) en lugar de asignarlos al objeto global `window`.
- Actualización de `script.js` y `dropdowns.js` para importar dependencias explícitamente.
- Limpieza de `console.log` y código de depuración para producción.

### Corregido

- Solucionado error crítico de doble inicialización que impedía el funcionamiento del botón "Add Jobs".
- Eliminación de código muerto y listeners de eventos obsoletos en `weightInData.js`.
- Resuelto problema de caché persistente en el Service Worker que bloqueaba la carga de estilos CSS nuevos.
- Corrección de rutas de importación para soportar la ejecución modular en el navegador.
- Limpieza de `styles.css`: Eliminación de bloques de código duplicados ("Instant UI Modernization") y reglas conflictivas ("Navbar Removed", "Global Pill Buttons") para restaurar la integridad del sistema de temas.
