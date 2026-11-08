// Ustachi — rang palitrasi + zamonaviy "soft depth" elevatsiya tizimi (custom theme uchun)

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

// Yaxshi kontrastli matn rangi (oq / qora)
export function readableText(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return "#FFFFFF";
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return lum > 0.6 ? "#0F172A" : "#FFFFFF";
}

// Shrift o'lchamini o'lchov (0.85x – 1.3x)
function scaleFont(baseFont, scale) {
  const k = Math.max(0.85, Math.min(1.3, Number(scale) || 1));
  const out = {};
  for (const key of Object.keys(baseFont)) {
    const v = baseFont[key];
    if (typeof v === "string" && v.endsWith("px")) {
      const n = parseFloat(v);
      out[key] = `${Math.round(n * k * 10) / 10}px`;
    } else {
      out[key] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------
// Zamonaviy "soft depth" elevatsiya: aniq qatlamli, yo'naltirilgan
// soya. Neumorphism'dan farqli — yumshoq, lekin o'qiladigan chuqurlik.
// depth 1..4  →  sm / md / lg / xl
// ---------------------------------------------------------------
function elevation(base, depth) {
  const dark = base.mode === "dark";
  const k = Math.max(1, Math.min(4, depth));
  if (dark) {
    // Qorong'i: chuqurlik asosan past soyadan, yupqa emerald rim —
    // fon bilan kontrast uchun juda nozik "border" sifatida.
    const raisedByDepth = {
      1: "0 1px 2px rgba(0,0,0,0.40)",
      2: "0 2px 4px rgba(0,0,0,0.40), 0 6px 16px rgba(0,0,0,0.44)",
      3: "0 4px 10px rgba(0,0,0,0.42), 0 14px 32px rgba(0,0,0,0.48)",
      4: "0 8px 18px rgba(0,0,0,0.46), 0 26px 54px rgba(0,0,0,0.54)",
    };
    return {
      hard: raisedByDepth[k],
      pressed: `inset 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(0,0,0,0.4)`,
      rim: "rgba(255,255,255,0.05)",
    };
  }
  const raisedByDepth = {
    1: "0 1px 2px rgba(12,32,25,0.05), 0 1px 3px rgba(12,32,25,0.06)",
    2: "0 2px 4px rgba(12,32,25,0.05), 0 6px 16px rgba(12,32,25,0.08)",
    3: "0 4px 8px rgba(12,32,25,0.05), 0 14px 32px rgba(12,32,25,0.10)",
    4: "0 8px 16px rgba(12,32,25,0.06), 0 28px 56px rgba(12,32,25,0.14)",
  };
  return {
    hard: raisedByDepth[k],
    pressed: "inset 0 2px 6px rgba(12,32,25,0.10), inset 0 1px 2px rgba(12,32,25,0.06)",
    rim: "rgba(255,255,255,0.9)",
  };
}

/**
 * Base (light|dark) topicga mos holda custom accent/bg/font'ni aralashtiradi.
 * custom: { accent, secondary, bg, surface, fontFamily, fontScale }
 */
export function applyCustomTheme(base, custom) {
  const accent = custom && custom.accent ? custom.accent : base.primary;
  const secondary = custom && custom.secondary ? custom.secondary : base.secondary;
  const bg = custom && custom.bg ? custom.bg : base.bg;
  const dark = base.mode === "dark";
  const textBase = dark ? "#F1F7F3" : "#0C2019";
  const textSecondaryBase = dark ? "#A7BEB3" : "#3C574A";
  const textTertiaryBase = dark ? "#6F8C7E" : "#698375";

  // Orqa fon tanlanganida shu rangga mos yuzalar
  const surface =
    custom && custom.surface
      ? custom.surface
      : bg === base.bg
        ? base.surface
        : mix(bg, dark ? "#0B1B14" : "#FFFFFF", dark ? 0.55 : 0.7);
  const bgSecondary = bg === base.bg ? base.bgSecondary : mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.05 : 0.03);
  const bgTertiary = bg === base.bg ? base.bgTertiary : mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.1 : 0.06);
  // Zamonaviy dizaynda chegaralar shaffof EMAS — yuzalarni ajratib turadi
  const border = mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.1 : 0.08);
  const borderLight = mix(surface, dark ? "#FFFFFF" : "#000000", dark ? 0.06 : 0.05);

  // Zamonaviy elevatsiya (1..4 = sm, md, lg, xl)
  const e1 = elevation(base, 1);
  const e2 = elevation(base, 2);
  const e3 = elevation(base, 3);
  const e4 = elevation(base, 4);
  const thinBorder = `1px solid ${e1.rim}`;
  const thinBorderStrong = `1px solid ${e2.rim}`;

  return {
    ...base,
    glass: base.glass,
    bg,
    surface,
    surfaceHover: bgTertiary,
    surfaceActive: border,
    bgSecondary,
    bgTertiary,
    border,
    borderLight,
    text: textBase,
    textSecondary: textSecondaryBase,
    textTertiary: textTertiaryBase,
    textInverse: readableText(accent),
    primary: accent,
    primaryHover: lighten(accent, dark ? 0.1 : -0.12),
    primaryLight: alpha(accent, dark ? 0.18 : 0.12),
    primaryDark: darken(accent, 0.22),
    secondary,
    secondaryHover: lighten(secondary, dark ? 0.1 : -0.1),
    secondaryLight: alpha(secondary, dark ? 0.16 : 0.1),
    ring: alpha(accent, dark ? 0.45 : 0.35),
    // Brend identiteti gradientlari — accentga mos moslashtiriladi
    gradient: `linear-gradient(135deg, ${accent} 0%, ${lighten(accent, dark ? 0.18 : 0.12)} 100%)`,
    gradientSoft: `linear-gradient(135deg, ${alpha(accent, dark ? 0.2 : 0.14)} 0%, ${alpha(lighten(accent, 0.12), dark ? 0.12 : 0.1)} 100%)`,
    gradientHero: `linear-gradient(140deg, ${darken(accent, dark ? 0.55 : 0.62)} 0%, ${darken(accent, 0.25)} 55%, ${lighten(accent, dark ? 0.15 : 0.08)} 100%)`,
    gradientRing: `linear-gradient(135deg, ${accent}, ${lighten(accent, 0.15)}, ${base.accent || "#F59E0B"})`,
    font:
      custom && custom.fontScale
        ? { ...scaleFont(base.font, custom.fontScale), family: custom && custom.fontFamily ? custom.fontFamily : base.font.family }
        : custom && custom.fontFamily
          ? { ...base.font, family: custom.fontFamily }
          : base.font,
    // 3D elevatsiya tizimi (nomlar saqlangan)
    raiseSm: { boxShadow: e1.hard, border: thinBorder },
    raiseMd: { boxShadow: e2.hard, border: thinBorder },
    raiseLg: { boxShadow: e3.hard, border: thinBorderStrong },
    raiseXl: { boxShadow: e4.hard, border: thinBorderStrong },
    pressSm: { boxShadow: e1.pressed, border: thinBorder },
    pressMd: { boxShadow: e2.pressed, border: thinBorder },
    pressLg: { boxShadow: e3.pressed, border: thinBorderStrong },
    pressXl: { boxShadow: e4.pressed, border: thinBorderStrong },
    shadowSm: e1.hard,
    shadowMd: e2.hard,
    shadowLg: e3.hard,
    shadowXl: e4.hard,
    // Neumorph nomli yordamchilar — CSS var'lar va eski ekranlar uchun
    neumorphBg: bg,
    neumorphSurface: surface,
    neumorphInsetBg: bgTertiary,
    neumorph: {
      ...(base.neumorph || {}),
      light: e2.hard,
      lightSm: e1.hard,
      lightHover: e3.hard,
      lightLg: e4.hard,
      inset: "inset 0 2px 6px rgba(12,32,25,0.08)",
      pressed: e2.pressed,
      flat: "0 0 0 rgba(0,0,0,0)",
      focus: `0 0 0 3px ${alpha(accent, dark ? 0.45 : 0.3)}`,
    },
  };
}

// Shrift variantlari (Settings ekranida tanlash uchun)
export const FONT_OPTIONS = [
  { label: "Plus Jakarta", value: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Inter", value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "System", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, sans-serif" },
  { label: "Nunito", value: "'Nunito', 'Inter', system-ui, sans-serif" },
  { label: "Poppins", value: "'Poppins', 'Inter', system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace" },
];

export const FONT_SCALE_STEPS = [0.9, 1, 1.05, 1.15, 1.25];

// Tayyor rang to'plamlari (foydalanuvchi tez tanlashi uchun)
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
