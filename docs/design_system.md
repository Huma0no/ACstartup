# HVAC Field Tool — Design System
**Version:** 1.0  
**Date:** April 2026  
**Status:** Pending Theme Selection

---

## Principios generales

- **Mobile-first:** Todo se diseña para pantalla de teléfono primero
- **Legibilidad en campo:** Texto grande, contraste alto, fácil de leer con sol directo
- **Interacción táctil:** Botones y chips mínimo 44px de altura, sin elementos pequeños
- **Velocidad visual:** El técnico debe encontrar lo que necesita en menos de 2 segundos
- **Dark/Light toggle:** Todos los temas soportan ambos modos via CSS variables

---

## Tipografía (igual en los 3 temas)

```css
--font-family: 'Inter', system-ui, -apple-system, sans-serif;

--font-size-xs:   11px;   /* labels, badges, meta */
--font-size-sm:   13px;   /* body secundario */
--font-size-md:   15px;   /* body principal */
--font-size-lg:   18px;   /* totales, énfasis */
--font-size-xl:   24px;   /* headers principales */

--font-weight-normal:  400;
--font-weight-medium:  500;
--font-weight-bold:    600;

--line-height-tight:  1.2;
--line-height-normal: 1.5;
```

---

## Espaciado (igual en los 3 temas)

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;

--radius-sm:  6px;
--radius-md:  10px;
--radius-lg:  16px;
--radius-full: 999px;  /* chips, badges */
```

---

## Componentes base (igual en los 3 temas)

### Chips (accesorios y fixes)
```css
.chip {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip.selected {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-text);
}
```

### Steps colapsables
```css
.step-header {
  height: 48px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Badges de status
```css
/* Completado */
--badge-done-bg:     #D1FAE5;
--badge-done-text:   #065F46;

/* Pendiente */
--badge-pending-bg:  #FEF3C7;
--badge-pending-text:#92400E;

/* Urgente */
--badge-urgent-bg:   #FEE2E2;
--badge-urgent-text: #991B1B;
```

---

## TEMA A — Minimalista y limpio

Inspiración: apps de productividad modernas. Mucho espacio blanco, tipografía clara, sin distracciones.

```css
/* LIGHT MODE */
:root[data-theme="a"][data-mode="light"] {
  --color-bg:              #FFFFFF;
  --color-surface:         #F8F9FA;
  --color-surface-raised:  #FFFFFF;
  --color-border:          #E5E7EB;
  --color-border-strong:   #D1D5DB;

  --color-text-primary:    #111827;
  --color-text-secondary:  #6B7280;
  --color-text-disabled:   #D1D5DB;

  --color-accent:          #06B6D4;  /* cian */
  --color-accent-soft:     #ECFEFF;
  --color-accent-text:     #FFFFFF;

  --color-success:         #10B981;
  --color-success-soft:    #D1FAE5;
  --color-warning:         #F59E0B;
  --color-warning-soft:    #FEF3C7;
  --color-danger:          #EF4444;
  --color-danger-soft:     #FEE2E2;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}

/* DARK MODE */
:root[data-theme="a"][data-mode="dark"] {
  --color-bg:              #0F172A;
  --color-surface:         #1E293B;
  --color-surface-raised:  #334155;
  --color-border:          #334155;
  --color-border-strong:   #475569;

  --color-text-primary:    #F1F5F9;
  --color-text-secondary:  #94A3B8;
  --color-text-disabled:   #475569;

  --color-accent:          #22D3EE;
  --color-accent-soft:     #164E63;
  --color-accent-text:     #0F172A;

  --color-success:         #34D399;
  --color-success-soft:    #064E3B;
  --color-warning:         #FBBF24;
  --color-warning-soft:    #451A03;
  --color-danger:          #F87171;
  --color-danger-soft:     #450A0A;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
}
```

**Características visuales:**
- Fondo blanco puro / azul noche profundo
- Sin sombras fuertes — separación por color de superficie
- Acento cian vibrante sobre fondos neutros
- Chips con borde sutil, selected en cian sólido

---

## TEMA B — Moderno con sombras y profundidad

Inspiración: apps financieras y dashboards premium. Capas de profundidad, sombras suaves, sensación de material.

```css
/* LIGHT MODE */
:root[data-theme="b"][data-mode="light"] {
  --color-bg:              #F3F4F6;
  --color-surface:         #FFFFFF;
  --color-surface-raised:  #FFFFFF;
  --color-border:          #E5E7EB;
  --color-border-strong:   #9CA3AF;

  --color-text-primary:    #1F2937;
  --color-text-secondary:  #6B7280;
  --color-text-disabled:   #D1D5DB;

  --color-accent:          #0891B2;
  --color-accent-soft:     #E0F7FA;
  --color-accent-text:     #FFFFFF;

  --color-success:         #059669;
  --color-success-soft:    #D1FAE5;
  --color-warning:         #D97706;
  --color-warning-soft:    #FEF3C7;
  --color-danger:          #DC2626;
  --color-danger-soft:     #FEE2E2;

  --shadow-sm: 0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
}

/* DARK MODE */
:root[data-theme="b"][data-mode="dark"] {
  --color-bg:              #18181B;
  --color-surface:         #27272A;
  --color-surface-raised:  #3F3F46;
  --color-border:          #3F3F46;
  --color-border-strong:   #52525B;

  --color-text-primary:    #FAFAFA;
  --color-text-secondary:  #A1A1AA;
  --color-text-disabled:   #52525B;

  --color-accent:          #22D3EE;
  --color-accent-soft:     #083344;
  --color-accent-text:     #0C0A09;

  --color-success:         #34D399;
  --color-success-soft:    #022C22;
  --color-warning:         #FCD34D;
  --color-warning-soft:    #2D1B00;
  --color-danger:          #F87171;
  --color-danger-soft:     #2D0808;

  --shadow-sm: 0 1px 4px rgba(0,0,0,0.4);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.5);
}
```

**Características visuales:**
- Fondo gris claro / negro zinc
- Cards con sombra visible — sensación de elevación
- Acento cian más oscuro y saturado
- Chips con sombra propia al seleccionar

---

## TEMA C — Industrial / Técnico

Inspiración: interfaces de equipos industriales, HMI panels, herramientas de campo. Funcional sobre estético.

```css
/* LIGHT MODE */
:root[data-theme="c"][data-mode="light"] {
  --color-bg:              #ECEFF1;
  --color-surface:         #FFFFFF;
  --color-surface-raised:  #F5F5F5;
  --color-border:          #B0BEC5;
  --color-border-strong:   #78909C;

  --color-text-primary:    #212121;
  --color-text-secondary:  #546E7A;
  --color-text-disabled:   #B0BEC5;

  --color-accent:          #00ACC1;
  --color-accent-soft:     #E0F7FA;
  --color-accent-text:     #FFFFFF;

  --color-success:         #2E7D32;
  --color-success-soft:    #E8F5E9;
  --color-warning:         #E65100;
  --color-warning-soft:    #FBE9E7;
  --color-danger:          #C62828;
  --color-danger-soft:     #FFEBEE;

  --shadow-sm: inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.15);
}

/* DARK MODE */
:root[data-theme="c"][data-mode="dark"] {
  --color-bg:              #1C1C1E;
  --color-surface:         #2C2C2E;
  --color-surface-raised:  #3A3A3C;
  --color-border:          #48484A;
  --color-border-strong:   #636366;

  --color-text-primary:    #EBEBF5;
  --color-text-secondary:  #8E8E93;
  --color-text-disabled:   #48484A;

  --color-accent:          #64D2FF;
  --color-accent-soft:     #003D57;
  --color-accent-text:     #001F2D;

  --color-success:         #32D74B;
  --color-success-soft:    #0D2E13;
  --color-warning:         #FF9F0A;
  --color-warning-soft:    #2E1A00;
  --color-danger:          #FF453A;
  --color-danger-soft:     #2E0A09;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.6);
}
```

**Características visuales:**
- Gris azulado frío / negro iOS
- Bordes más visibles y definidos
- Acento cian eléctrico sobre fondos oscuros
- Chips con borde sólido, sin border-radius agresivo

---

## Subdivisión — colores de borde izquierdo

Estos colores son fijos en ambos modos y ambos temas:

```css
--subdivision-1: #3B82F6;  /* azul */
--subdivision-2: #10B981;  /* verde */
--subdivision-3: #F59E0B;  /* ámbar */
--subdivision-4: #8B5CF6;  /* púrpura */
--subdivision-5: #EF4444;  /* rojo */
--subdivision-6: #EC4899;  /* rosa */
--subdivision-7: #14B8A6;  /* teal */
--subdivision-8: #F97316;  /* naranja */
```

Se asignan automáticamente en orden al importar jobs.

---

## Cómo probar los temas

En `index.html`, el atributo del elemento raíz controla el tema:

```html
<!-- Tema A, modo claro -->
<html data-theme="a" data-mode="light">

<!-- Tema B, modo oscuro -->
<html data-theme="b" data-mode="dark">

<!-- Tema C, modo claro -->
<html data-theme="c" data-mode="light">
```

Cambia los valores, recarga el navegador, y compara.

---

*Document prepared by: PM/Software Engineer*  
*Approved by: _________________ Date: _________*
