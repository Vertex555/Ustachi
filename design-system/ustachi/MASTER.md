# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Ustachi
**Generated:** 2026-09-23 04:01:38
**Category:** Home Services (Plumber/Electrician)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E40AF` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| On Secondary | `#000000` | `--color-on-secondary` |
| Accent/CTA | `#EA580C` | `--color-accent` |
| On Accent/CTA | `#000000` | `--color-on-accent` |
| Background | `#EFF6FF` | `--color-background` |
| Foreground | `#1E3A8A` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#1E3A8A` | `--color-card-foreground` |
| Muted | `#E9EEF6` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#BFDBFE` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#1E40AF` | `--color-ring` |

**Color Notes:** Professional blue + urgent orange [Accent adjusted from #F97316]

### Typography

- **Heading Font:** Poppins
- **Body Font:** Open Sans
- **Mood:** modern, professional, clean, corporate, friendly, approachable
- **Google Fonts:** [Poppins + Open Sans](https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #EA580C;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #1E40AF;
  border: 2px solid #1E40AF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #EFF6FF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #1E40AF;
  outline: none;
  box-shadow: 0 0 0 3px #1E40AF20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Flat Design

**Keywords:** 2D, minimalist, bold colors, no shadows, clean lines, simple shapes, typography-focused, modern, icon-heavy

**Best For:** Web apps, mobile apps, cross-platform, startup MVPs, user-friendly, SaaS, dashboards, corporate

**Key Effects:** No gradients/shadows, simple hover (color/opacity shift), fast loading, clean transitions (150-200ms ease), minimal icons

### Page Pattern

**Pattern Name:** Trust & Authority + Conversion

- **Conversion Strategy:** Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.
- **CTA Placement:** Contact Sales / Get Quote (primary) + Nav
- **Section Order:** Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path

---

## Anti-Patterns (Do NOT Use)

- ❌ Hidden contact info
- ❌ No certifications

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

---

## ACTIVE STYLE: Neumorphism (Soft UI)

Source: `ui-ux-pro-max` → `styles#neumorphism`. **This section overrides the Flat
Design guidance above.** Trust & Authority remains valid for layout/IA and for
palette accents only.

### Core Rule

A surface and its background must be the **same color**. Depth comes only from
light + dark dual shadows — never from a contrasting fill or a hard border.
The old `#FFFFFF` card on `#EFF6FF` page was the single biggest blocker: the
shadow had nothing to sit on, so neumorphism was invisible.

### Palette (single-tone, not white)

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `neumorphBg` | `#E8ECF3` | `#1B2B36` | page background |
| `neumorphSurface` | `#E8ECF3` | `#1B2B36` | cards, sheets, modals |
| `neumorphInsetBg` | `#E1E6EE` | `#16232C` | inputs, pressed wells |
| `text` | `#1E3A8A` | `#F8FAFC` | body copy |
| `textTertiary` | `#5B6B7F` | `#94A3B8` | secondary meta text |
| `primary` | `#1E40AF` | `#10B981` | CTAs only (contrast anchor) |

`#94A3B8` was rejected for light-mode tertiary text: 2.1:1 on `#E8ECF3` fails
WCAG AA. Use `#5B6B7F` (4.9:1).

### Shadows (the whole style)

```js
raised:  "-6px -6px 16px rgba(255,255,255,0.9), 6px 6px 16px rgba(163,177,198,0.38)"
hover:   "-8px -8px 22px rgba(255,255,255,0.95), 8px 8px 22px rgba(163,177,198,0.45)"
inset:   "inset -4px -4px 9px rgba(255,255,255,0.75), inset 4px 4px 9px rgba(163,177,198,0.32)"
pressed: "inset -3px -3px 7px rgba(163,177,198,0.35), inset 3px 3px 7px rgba(255,255,255,0.7)"
focus:   "0 0 0 3px rgba(30,64,175,0.35)"
```

Dark mode swaps the light source for a `0.06–0.08` white and deepens the dark
shadow to `0.45–0.65` black.

### Radius & Motion

- `radiusSm 12px` · `radius 14px` · `radiusLg 18px`
- Press: `150ms`, `transform: scale(0.985)` + swap to `inset`
- Hover: `200ms`, shadow-only (no layout shift)
- `prefers-reduced-motion: reduce` must disable all neumo transitions.

### Accessibility (risk: HIGH — skill flag)

- Neumorphism is low-contrast by nature. Text is **never** placed on a shadow.
- Body text `>= 4.5:1`; interactive borders/focus `>= 3:1`.
- Every pressable element needs a visible `:focus-visible` ring — a soft
  shadow is **not** an acceptable focus indicator.
- Inputs use an inset well **plus** a `1px` border so their edge stays visible.
- Never encode state by shadow alone; pair with color or text.

### Platform Notes

- **Web:** use the `ust-neumo`, `ust-neumo-inset`, `ust-neumo-active` utilities
  in `index.css`; shadows arrive via `--ustach-neumo-*` custom properties set
  in `ThemeContext.jsx`.
- **iOS/RN:** use `theme.neumorph.raised` / `.pressed` / `.inset`.
- **Android:** elevation drops the light shadow, so the same objects carry a
  1px border pair (`borderTop/Left` light, `borderBottom/Right` dark) to
  simulate the second light source. Never rely on `elevation` alone.

### Forbidden

- ❌ White/near-white card on a colored page background
- ❌ Hard `1px solid` dark borders as the primary edge definition
- ❌ Gradients or glassmorphism blur on neumo surfaces (`blur: "none"`)
- ❌ Removing focus rings because "the shadow shows state"
- ❌ Unmapped icon names — verify every `MaterialCommunityIcons` name against
  its glyphmap; a bad name renders a blank glyph, not a visible error.

