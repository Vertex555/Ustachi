import React from "react";
import { ChevronLeft, ChevronDown, Loader2, X, Star, Search } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useRaise } from "../theme/useRaise";

/**
 * Ustachi unified UI kit — yangi zamonaviy "soft depth" dizayn tili.
 * Barcha ekranlar theme tokenlari + raise/press elevatsiya tizimiga tayanadi.
 */

const TAP = "cubic-bezier(0.22,1,0.36,1)";

// ============================== Buttons ==============================
export const UButton = ({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  disabled = false,
  onClick,
  children,
  icon,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const raise = useRaise(theme, "md");
  const [hov, setHov] = React.useState(false);

  const palette = {
    primary: {
      bg: hov ? theme.primaryHover : theme.gradient || theme.primary,
      color: "#fff",
      border: "none",
      hoverShadow: `0 10px 26px ${theme.primaryLight}, ${theme.raiseLg.boxShadow}`,
    },
    secondary: {
      bg: hov ? theme.surfaceActive : theme.surface,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      hoverShadow: theme.raiseLg.boxShadow,
    },
    subtle: {
      bg: hov ? theme.bgTertiary : theme.bgSecondary,
      color: theme.textSecondary,
      border: "none",
      hoverShadow: theme.raiseLg.boxShadow,
    },
    ghost: {
      bg: hov ? theme.bgSecondary : "transparent",
      color: theme.textSecondary,
      border: "none",
      hoverShadow: "none",
    },
    accent: {
      bg: theme.gradientAccent || theme.accent,
      color: "#3A2500",
      border: "none",
      hoverShadow: `0 10px 26px ${theme.accentLight}, ${theme.raiseLg.boxShadow}`,
    },
    danger: {
      bg: theme.error,
      color: "#fff",
      border: "none",
      hoverShadow: `0 10px 26px ${theme.errorLight}, ${theme.raiseLg.boxShadow}`,
    },
  };

  const p = palette[variant] || palette.primary;
  const pad = size === "lg" ? "16px 22px" : size === "sm" ? "10px 15px" : "13px 19px";
  const fs = size === "lg" ? theme.font.md : size === "sm" ? theme.font.sm : theme.font.base;
  const inactive = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={inactive}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: pad,
        minHeight: size === "sm" ? "42px" : "48px",
        borderRadius: theme.radius.full,
        border: p.border,
        background: p.bg,
        color: p.color,
        fontWeight: theme.font.bold,
        letterSpacing: "-0.01em",
        fontSize: fs,
        cursor: inactive ? "not-allowed" : "pointer",
        opacity: inactive ? 0.55 : 1,
        width: full ? "100%" : "auto",
        fontFamily: theme.font.family,
        transform: hov && !inactive ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov && !inactive ? p.hoverShadow : raise.style.boxShadow,
        transition: `transform .18s ${TAP}, box-shadow .18s ease, background .25s ease, opacity .2s ease`,
        ...style,
      }}
      {...raise.bind}
      {...rest}
    >
      {icon}
      {children}
      {loading && <Loader2 size={16} className="ust-spin" style={{ flexShrink: 0 }} />}
    </button>
  );
};

export const UIconBtn = ({ label = "", onClick, disabled = false, children, style, size = 42, variant = "surface" }) => {
  const { theme } = useTheme();
  const raise = useRaise(theme, "sm");
  const bg = variant === "ghost" ? "transparent" : theme.surface;
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.full,
        border: variant === "ghost" ? "none" : `1px solid ${theme.border}`,
        background: bg,
        color: theme.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        transition: "transform .15s ease, box-shadow .15s ease, opacity .2s ease, background .2s ease",
        ...raise.style,
        ...style,
      }}
      {...raise.bind}
    >
      {children}
    </button>
  );
};

export const UBackBtn = ({ onClick, disabled = false, style, size = 40 }) => {
  const { theme } = useTheme();
  return (
    <UIconBtn label="Back" onClick={onClick} disabled={disabled} size={size} style={style}>
      <ChevronLeft size={19} style={{ color: theme.text }} />
    </UIconBtn>
  );
};

const fieldBase = (theme) => ({
  width: "100%",
  boxSizing: "border-box",
  borderRadius: theme.radius.md,
  border: `1px solid ${theme.border}`,
  backgroundColor: theme.surface,
  color: theme.text,
  fontSize: theme.font.base,
  outline: "none",
  fontFamily: theme.font.family,
  boxShadow: "inset 0 1px 2px rgba(12,32,25,0.04)",
  transition: "border-color .2s ease, box-shadow .2s ease",
});

export const UInput = ({ label, hint, style, ...rest }) => {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px", width: "100%" }}>
      {label && (
        <label style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>{label}</label>
      )}
      <input
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.primary;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.ring}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.border;
          e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(12,32,25,0.04)";
        }}
        style={{
          ...fieldBase(theme),
          padding: "13px 16px",
          ...style,
        }}
        {...rest}
      />
      {hint && <span style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>{hint}</span>}
    </div>
  );
};

export const UTextarea = ({ label, rows = 4, style, ...rest }) => {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px", width: "100%" }}>
      {label && (
        <label style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>{label}</label>
      )}
      <textarea
        rows={rows}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.primary;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.ring}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.border;
          e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(12,32,25,0.04)";
        }}
        style={{
          ...fieldBase(theme),
          padding: "13px 16px",
          resize: "vertical",
          ...style,
        }}
        {...rest}
      />
    </div>
  );
};

export const USelect = ({ label, hint, options = [], style, ...rest }) => {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px", width: "100%" }}>
      {label && (
        <label style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>{label}</label>
      )}
      <div style={{ position: "relative", width: "100%" }}>
        <select
          style={{
            ...fieldBase(theme),
            padding: "13px 40px 13px 16px",
            appearance: "none",
            cursor: "pointer",
            ...style,
          }}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={17}
          style={{
            position: "absolute",
            right: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: theme.textTertiary,
            pointerEvents: "none",
          }}
        />
      </div>
      {hint && <span style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>{hint}</span>}
    </div>
  );
};

export const USearchInput = ({ value, onChange, placeholder, style, onSubmit, ...rest }) => {
  const { theme } = useTheme();
  return (
    <div
      className="ust-neumo-inset"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 14px",
        borderRadius: theme.radius.full,
        width: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Search size={18} style={{ color: theme.textTertiary, flexShrink: 0 }} />
      <input
        value={value}
        onChange={onChange}
        onKeyDown={(e) => e.key === "Enter" && onSubmit && onSubmit()}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          color: theme.text,
          fontSize: theme.font.base,
          fontFamily: theme.font.family,
          padding: "13px 0",
          minWidth: 0,
        }}
        {...rest}
      />
      {value ? (
        <button
          onClick={() => onChange && onChange({ target: { value: "" } })}
          aria-label="Clear"
          style={{
            border: "none",
            background: theme.bgTertiary,
            color: theme.textSecondary,
            borderRadius: "50%",
            width: "22px",
            height: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
};

export const UToggle = ({ checked, onChange, label, desc, disabled = false }) => {
  const { theme } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        width: "100%",
        background: "transparent",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        fontFamily: theme.font.family,
        textAlign: "left",
      }}
    >
      {(label || desc) && (
        <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
          {label && <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold, color: theme.text }}>{label}</span>}
          {desc && <span style={{ fontSize: theme.font.xs, color: theme.textTertiary, lineHeight: 1.4 }}>{desc}</span>}
        </span>
      )}
      <span
        style={{
          position: "relative",
          width: "48px",
          height: "28px",
          borderRadius: "999px",
          background: checked ? (theme.gradient || theme.primary) : theme.bgTertiary,
          border: `1px solid ${checked ? "transparent" : theme.border}`,
          transition: "background .2s ease",
          flexShrink: 0,
        }}
      >
        <span
          className="ust-toggle-knob"
          style={{
            position: "absolute",
            top: "2px",
            left: checked ? "22px" : "2px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            transition: "left .2s " + TAP,
          }}
        />
      </span>
    </button>
  );
};

export const UBadge = ({ children, variant = "primary", icon, style }) => {
  const { theme } = useTheme();
  const map = {
    primary: { bg: theme.primaryLight, color: theme.primary },
    accent: { bg: theme.accentLight, color: theme.accentText || theme.accent },
    success: { bg: theme.successLight, color: theme.success },
    error: { bg: theme.errorLight, color: theme.error },
    warning: { bg: theme.warningLight, color: theme.warning },
    info: { bg: theme.infoLight, color: theme.info },
    neutral: { bg: theme.bgTertiary, color: theme.textSecondary },
  };
  const c = map[variant] || map.primary;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "999px",
        background: c.bg,
        color: c.color,
        fontSize: theme.font.xs,
        fontWeight: theme.font.bold,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
};

export const USeparator = ({ style }) => {
  const { theme } = useTheme();
  return <div style={{ height: "1px", background: theme.borderLight, width: "100%", ...style }} />;
};

export const UProgressBar = ({ value = 0, max = 100, color, height = 8, style }) => {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: "999px",
        background: theme.bgTertiary,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: "999px",
          background: color || theme.gradient || theme.primary,
          transition: "width .5s " + TAP,
        }}
      />
    </div>
  );
};

export const USkeleton = ({ width = "100%", height = "16px", radius = "10px", style }) => (
  <div className="ust-skel" style={{ width, height, borderRadius: radius, ...style }} />
);

export const USectionHeader = ({ title, action, onAction, style }) => {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px", ...style }}>
      <h3 style={{ margin: 0, fontSize: theme.font.lg, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      {action && (
        <button
          onClick={onAction}
          style={{
            border: "none",
            background: "transparent",
            color: theme.primary,
            fontSize: theme.font.sm,
            fontWeight: theme.font.bold,
            cursor: "pointer",
            fontFamily: theme.font.family,
            padding: "4px 6px",
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
};

// ============================== Rating ==============================
// Display va interaktiv reyting — bitta komponent.
export const StarRating = ({
  value = 0,
  onChange,
  size = 18,
  showValue = false,
  count = null,
  style,
}) => {
  const { theme } = useTheme();
  const [hover, setHover] = React.useState(null);
  const active = hover != null ? hover : value;
  const interactive = typeof onChange === "function";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", ...style }}>
      <span style={{ display: "inline-flex", gap: "2px" }}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = active >= i;
          const half = !filled && active >= i - 0.5;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              aria-label={`${i} yulduz`}
              onClick={() => interactive && onChange(i)}
              onMouseEnter={() => interactive && setHover(i)}
              onMouseLeave={() => interactive && setHover(null)}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                lineHeight: 0,
                cursor: interactive ? "pointer" : "default",
                transition: "transform .12s ease",
                transform: hover === i ? "scale(1.15)" : "scale(1)",
              }}
            >
              <Star
                size={size}
                strokeWidth={2}
                style={{
                  color: filled || half ? theme.accent : theme.textTertiary,
                  fill: filled ? theme.accent : half ? `url(#half-${i})` : "transparent",
                  opacity: filled || half ? 1 : 0.5,
                }}
              />
            </button>
          );
        })}
      </span>
      {showValue && (
        <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>
          {Number(value || 0).toFixed(1)}
        </span>
      )}
      {count != null && (
        <span style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>({count})</span>
      )}
    </span>
  );
};

// ============================== Cards ==============================
export const UCard = ({ raised = true, pressed = false, onClick, hover = false, children, style, className }) => {
  const { theme } = useTheme();
  const sh = pressed ? theme.pressMd.boxShadow : raised ? theme.raiseLg.boxShadow : "none";
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover) e.currentTarget.style.boxShadow = theme.raiseXl.boxShadow;
      }}
      onMouseLeave={(e) => {
        if (hover) e.currentTarget.style.boxShadow = sh;
      }}
      style={{
        backgroundColor: theme.surface,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        boxShadow: sh,
        boxSizing: "border-box",
        transition: theme.transition.normal,
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Stat karta — analitika/dashbordlar uchun
export const UStatCard = ({ icon, label, value, sub, accent, style }) => {
  const { theme } = useTheme();
  return (
    <div
      className="ust-neumo"
      style={{
        flex: "1 1 150px",
        minWidth: "140px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            width: "38px",
            height: "38px",
            borderRadius: theme.radius.md,
            background: accent || theme.gradientSoft || theme.primaryLight,
            color: accent ? "#fff" : theme.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      </div>
      <div>
        <div style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: "3px", fontWeight: theme.font.semibold }}>
          {label}
        </div>
      </div>
      {sub && <div style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>{sub}</div>}
    </div>
  );
};

export const UChip = ({ active = false, onClick, activeColor = null, children, style, disabled = false }) => {
  const { theme } = useTheme();
  const c = activeColor || theme.primary;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 15px",
        minHeight: "44px",
        borderRadius: theme.radius.full,
        border: `1px solid ${active ? "transparent" : theme.border}`,
        backgroundColor: active ? c : theme.surface,
        color: active ? "#fff" : theme.textSecondary,
        fontSize: theme.font.sm,
        fontWeight: theme.font.semibold,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all .2s cubic-bezier(0.22,1,0.36,1)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        boxShadow: active ? `0 4px 12px ${alphaSafe(theme, c, 0.35)}` : "none",
        fontFamily: theme.font.family,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

function alphaSafe(theme, color, a) {
  // rang rgba bo'lsa to'g'ridan-to'g'ri qaytaramiz, aks holda primaryLight ishlatamiz
  if (typeof color === "string" && color.startsWith("rgba")) return color;
  return theme.primaryLight;
}

export const UModal = ({ open, onClose, title, children, maxWidth = 420, footer }) => {
  const { theme } = useTheme();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: theme.overlay || "rgba(6,24,18,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ust-scale"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "calc(100vh - 110px)",
          overflowY: "auto",
          backgroundColor: theme.surface,
          borderRadius: theme.radius.xl,
          padding: "clamp(18px, 3vw, 26px)",
          border: `1px solid ${theme.border}`,
          boxShadow: theme.raiseXl.boxShadow,
          boxSizing: "border-box",
        }}
      >
        {title != null && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "10px" }}>
            <span style={{ fontSize: theme.font.xl, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.01em" }}>{title}</span>
            <UIconBtn label="Close" onClick={onClose} size={34}>
              <X size={17} />
            </UIconBtn>
          </div>
        )}
        {children}
        {footer && <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>{footer}</div>}
      </div>
    </div>
  );
};

export const EmptyState = ({ icon, title, desc, children, style }) => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        textAlign: "center",
        padding: "48px 20px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            width: "78px",
            height: "78px",
            borderRadius: "50%",
            background: theme.gradientSoft || theme.primaryLight,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.raiseMd.boxShadow,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src={icon} width="34" height="34" alt="" />
        </div>
      )}
      {title && <div style={{ color: theme.text, fontSize: theme.font.lg, fontWeight: theme.font.bold }}>{title}</div>}
      {desc && <div style={{ color: theme.textSecondary, fontSize: theme.font.sm, lineHeight: "1.55", maxWidth: "300px" }}>{desc}</div>}
      {children}
    </div>
  );
};
