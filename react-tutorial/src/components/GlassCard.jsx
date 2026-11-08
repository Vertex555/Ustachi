import React from "react";
import { useTheme } from "../theme/ThemeContext";

export const GlassCard = ({ children, style, className, padding, hover, active, glow, onClick, ...rest }) => {
  const { theme } = useTheme();
  const g = theme.glass || {};

  const base = {
    background: g.bg || theme.surface,
    backdropFilter: g.blur || "none",
    WebkitBackdropFilter: g.blur || "none",
    border: `1px solid ${g.borderSubtle || theme.border}`,
    borderRadius: theme.radius.lg,
    boxShadow: g.shadow || theme.shadowMd,
    transition: theme.transition.normal,
    boxSizing: "border-box",
    ...(padding ? { padding: typeof padding === "string" ? padding : theme.spacing.lg } : {}),
    ...(onClick ? { cursor: "pointer" } : {}),
    ...style,
  };

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = g.shadowHover || theme.shadowLg;
        }
      }}
      onMouseDown={(e) => {
        if (active) e.currentTarget.style.boxShadow = g.shadowActive || theme.shadowSm;
      }}
      onMouseUp={(e) => {
        if (active) e.currentTarget.style.boxShadow = g.shadowHover || theme.shadowLg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = base.boxShadow;
      }}
      style={base}
      {...rest}
    >
      {children}
    </div>
  );
};

export const GlassInput = ({ style, ...rest }) => {
  const { theme } = useTheme();
  const g = theme.glass || {};
  return (
    <input
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 15px",
        borderRadius: theme.radius.md,
        border: `1px solid ${g.borderSubtle || theme.border}`,
        backgroundColor: g.inputBg || theme.bgSecondary,
        color: theme.text,
        fontSize: theme.font.base,
        outline: "none",
        fontFamily: theme.font.family,
        transition: "border-color .2s ease, box-shadow .2s ease",
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = theme.primary;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.ring}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = g.borderSubtle || theme.border;
        e.currentTarget.style.boxShadow = "none";
      }}
      {...rest}
    />
  );
};

export const GlassButton = ({ children, variant = "primary", style, ...rest }) => {
  const { theme } = useTheme();
  const g = theme.glass || {};
  const colors = {
    primary: { bg: theme.gradient || theme.primary, color: "#fff", border: "transparent" },
    soft: { bg: g.badgeBg || theme.primaryLight, color: theme.primary, border: "transparent" },
    ghost: { bg: "transparent", color: theme.textSecondary, border: g.borderSubtle || theme.border },
    danger: { bg: theme.errorLight, color: theme.error, border: "transparent" },
  };
  const c = colors[variant] || colors.primary;
  return (
    <button
      style={{
        padding: "11px 18px",
        borderRadius: theme.radius.full,
        border: c.border === "transparent" ? "none" : `1px solid ${c.border}`,
        backgroundColor: c.bg,
        color: c.color,
        fontWeight: theme.font.bold,
        fontSize: theme.font.sm,
        cursor: "pointer",
        fontFamily: theme.font.family,
        transition: "transform .15s cubic-bezier(0.22,1,0.36,1), box-shadow .2s ease",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      {...rest}
    >
      {children}
    </button>
  );
};
