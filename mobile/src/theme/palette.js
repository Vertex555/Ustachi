// Ustachi (mobile) — rang palitrasi yordamchilari
import { Platform } from "react-native";

export function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

export function rgbToHex(r, g, b) {
  const to = (v) => String(Math.max(0, Math.min(255, Math.round(v)))).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function mix(colorA, colorB, t) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA;
  return rgbToHex(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  );
}

export function lighten(color, amt = 0.1) {
  return mix(color, "#FFFFFF", amt);
}

export function darken(color, amt = 0.1) {
  return mix(color, "#000000", amt);
}

export function alpha(color, a) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

export function readableText(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return "#FFFFFF";
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return lum > 0.6 ? "#0F172A" : "#FFFFFF";
}

// Shrift o'lchamini masshtablash
function scaleFont(baseFont, scale) {
  const k = Math.max(0.8, Math.min(1.35, Number(scale) || 1));
  const out = {};
  for (const key of Object.keys(baseFont)) {
    const v = baseFont[key];
    if (typeof v === "number") {
      out[key] = Math.round(v * k);
    } else {
      out[key] = v;
    }
  }
  return out;
}

// 3D "bo'rtib chiqqan" / bosilganda "cho'kadigan" uslublar (RN)
// Har bir komponentda yupqa border bo'lsin — komponent ko'rinib tursin.
// Dark rejimda chegara va soya biroz xunukroq bo'ladi (0.22 juda kuchli edi).
function raiseStyle(edge, depth, dark) {
  return {
    borderWidth: 1,
    borderColor: edge,
    borderBottomWidth: depth,
    borderBottomColor: edge,
    elevation: 3 + depth,
    shadowColor: "#000000",
    shadowOpacity: dark ? 0.45 : 0.2,
    shadowRadius: (dark ? 6 : 3) + depth,
    shadowOffset: { width: 0, height: 2 },
  };
}

function pressStyle(edge) {
  return {
    borderWidth: 1,
    borderColor: edge,
    borderBottomWidth: 0,
    elevation: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ translateY: 1 }],
  };
}

export function applyCustomTheme(base, custom) {
  const accent = custom && custom.accent ? custom.accent : base.primary;
  const secondary = custom && custom.secondary ? custom.secondary : base.secondary;
  const bg = custom && custom.bg ? custom.bg : base.bg;
  const dark = base.mode === "dark";
  const textBase = dark ? "#F8FAFC" : "#0F172A";
  const textSecondaryBase = dark ? "#CBD5E1" : "#475569";
  const textTertiaryBase = dark ? "#64748B" : "#94A3B8";

  const surface = custom && custom.surface
    ? custom.surface
    : (bg === base.bg ? base.surface : mix(bg, "#FFFFFF", dark ? 0.12 : 0.03));
  const bgSecondary = bg === base.bg ? base.bgSecondary : mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.06 : 0.025);
  const bgTertiary = bg === base.bg ? base.bgTertiary : mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.12 : 0.05);
  const border = mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.16 : 0.08);
  const edge = mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.1 : 0.16);

  const scaledFont = (custom && custom.fontScale) || (custom && custom.fontFamily)
    ? { ...scaleFont(base.font, custom.fontScale || 1), family: (custom && custom.fontFamily) || base.font.family }
    : base.font;

  const press = pressStyle(edge);

  // Tipografiya ierarxiyasi — foydalanuvchi shrift o'lchamini ham hurmat qiladi
  const fontK = Math.max(0.8, Math.min(1.35, (custom && custom.fontScale) || 1));
  const type = {};
  for (const [k, v] of Object.entries(base.type || {})) {
    type[k] = { ...v, size: Math.round(v.size * fontK) };
  }

  // Kartochka qatlamlari — fon bilan ANIQ farq qilishi uchun
  const card = custom && custom.card
    ? custom.card
    : bg === base.bg
      ? base.card
      : mix(bg, "#FFFFFF", dark ? 0.10 : 0.55);
  const cardAlt = mix(card, dark ? "#000000" : "#000000", dark ? 0.14 : 0.035);
  const cardInset = mix(card, dark ? "#000000" : "#000000", dark ? 0.24 : 0.08);
  const glassFill = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.78)";
  const glassBorder = dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.95)";

  return {
    ...base,
    bg,
    surface,
    bgSecondary,
    bgTertiary,
    surfaceHover: bgTertiary,
    border,
    borderLight: bgSecondary,
    text: textBase,
    textSecondary: textSecondaryBase,
    textTertiary: textTertiaryBase,
    textInverse: readableText(accent),
    primary: accent,
    primaryHover: lighten(accent, dark ? 0.1 : -0.1),
    primaryLight: alpha(accent, dark ? 0.18 : 0.14),
    primaryDark: darken(accent, 0.22),
    secondary,
    secondaryHover: lighten(secondary, dark ? 0.1 : -0.1),
    secondaryLight: alpha(secondary, dark ? 0.18 : 0.14),
    success: accent,
    successLight: alpha(accent, dark ? 0.16 : 0.12),
    font: scaledFont,
    type,
    // Karta / glass tokenlari — yangi komponentlar faqat shularni ishlatadi
    card,
    cardAlt,
    cardInset,
    glassFill,
    glassBorder,
    glassTint: dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
    // Sarlavha gradienti — ekran bosh qismidagi boy rangli blok
    headerFrom: lighten(accent, dark ? 0.04 : -0.05),
    headerTo: darken(accent, dark ? 0.62 : 0.42),
    headerGlow: lighten(accent, 0.25),
    // 3D elevatsiya (Neumorphism)
    // Barcha ekranlar theme.neumorph.* ishlatadi; eski raise*/press* nomlari
    // moslik uchun saqlangan.
    neumorph: {
      ...base.neumorph,
      // Kartalar fonning ustida ko'rinishi uchun alohida rang
      surface: card,
      insetBg: bgTertiary,
      raised: raiseStyle(edge, 3, dark),
      raisedSm: raiseStyle(edge, 2, dark),
      raisedLg: raiseStyle(edge, 4, dark),
      raisedXl: raiseStyle(edge, 5, dark),
      pressed: press,
    },
    // Eski flat nomlar (back-compat)
    raiseSm: raiseStyle(edge, 2, dark),
    raiseMd: raiseStyle(edge, 3, dark),
    raiseLg: raiseStyle(edge, 4, dark),
    raiseXl: raiseStyle(edge, 5, dark),
    pressSm: press,
    pressMd: press,
    pressLg: press,
    pressXl: press,
    shadowSm: raiseStyle(edge, 2, dark),
    shadowMd: raiseStyle(edge, 3, dark),
    shadowLg: raiseStyle(edge, 4, dark),
    shadowXl: raiseStyle(edge, 5, dark),
  };
}

export const PRESET_PALETTES = [
  { label: "Zumrad", accent: "#059669", bg: null },
  { label: "Moviy", accent: "#2563EB", bg: null },
  { label: "Binafsha", accent: "#7C3AED", bg: null },
  { label: "To'q sariq", accent: "#EA580C", bg: null },
  { label: "Olov", accent: "#E11D48", bg: null },
  { label: "Firuz", accent: "#0D9488", bg: null },
  { label: "Gilos", accent: "#BE185D", bg: null },
  { label: "Kobalt", accent: "#1D4ED8", bg: null },
];

export const FONT_OPTIONS =
  Platform.OS === "ios"
    ? [
        { label: "System", value: "System" },
        { label: "Avenir Next", value: "Avenir Next" },
        { label: "Georgia", value: "Georgia" },
        { label: "Helvetica Neue", value: "Helvetica Neue" },
        { label: "Menlo", value: "Menlo" },
      ]
    : [
        { label: "Sans", value: "sans-serif" },
        { label: "Sans Light", value: "sans-serif-light" },
        { label: "Sans Medium", value: "sans-serif-medium" },
        { label: "Sans Condensed", value: "sans-serif-condensed" },
        { label: "Serif", value: "serif" },
        { label: "Monospace", value: "monospace" },
      ];

export const FONT_SCALE_STEPS = [0.9, 1, 1.1, 1.2, 1.3];