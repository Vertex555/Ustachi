import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

export const SidebarLayout = ({ items, activeKey, onSelect, badges, roundKey, children, footer, collapsed: controlledCollapsed, onToggleCollapse }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const g = theme.glass || {};
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed((p) => !p));

  const SIDEBAR_W = collapsed ? "60px" : "200px";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "transparent", color: theme.text, fontFamily: theme.font.family, width: "100%" }}>
      {/* Desktop sidebar */}
      <nav className="ust-sidebar" style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_W,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: collapsed ? "14px 0" : "14px 8px",
        background: g.sidebarBg || theme.surface,
        borderRight: `1px solid ${g.sidebarBorder || theme.border}`,
        boxShadow: g.sidebarShadow || "none",
        zIndex: 100,
        boxSizing: "border-box",
        overflow: "hidden",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), padding 0.22s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Logo + toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: collapsed ? "0" : "10px", padding: collapsed ? "0 0 12px 0" : "0 4px 14px 4px", justifyContent: collapsed ? "center" : "space-between", borderBottom: `1px solid ${g.sidebarBorder || theme.border}`, marginBottom: "6px", flexShrink: 0 }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "12px", minWidth: "38px",
            background: theme.gradient || theme.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 14px ${g.glow || "rgba(5,150,105,0.35)"}`,
            fontSize: "16px", fontWeight: "900", color: "#fff", fontFamily: theme.font.family,
          }}>U</div>
          {!collapsed && (
            <button
              onClick={toggleCollapse}
              aria-label="Toggle sidebar"
              style={{
                width: "26px", height: "26px", borderRadius: theme.radius.sm, border: `1px solid ${g.sidebarBorder || theme.border}`,
                background: theme.bgSecondary || theme.surface, color: theme.textTertiary,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                flexShrink: 0, transition: theme.transition.fast,
              }}
            >
              <img src="https://api.iconify.design/lucide:panel-left-close.svg?color=currentColor" width="14" height="14" alt="" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {items.map((item) => {
            const isActive = activeKey === item.key;
            const color = isActive ? theme.primary : theme.textTertiary;
            const count = item.badgeKey && badges ? badges[item.badgeKey] || 0 : 0;
            const isRound = roundKey && item.key === roundKey;
            return (
              <button
                key={item.key}
                onClick={() => onSelect && onSelect(item.key)}
                title={collapsed ? t(item.label) : undefined}
                className={isActive ? "ust-tab-active" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: collapsed ? "42px" : "100%",
                  height: collapsed ? "42px" : "40px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "0" : "0 11px",
                  borderRadius: isRound ? "50%" : "12px",
                  border: isRound ? `1px solid ${g.sidebarBorder || theme.border}` : "none",
                  background: isRound
                    ? (isActive ? theme.gradientSoft || theme.primaryLight : g.sidebarBg || "transparent")
                    : (isActive ? theme.gradientSoft || theme.primaryLight : "transparent"),
                  color,
                  cursor: "pointer", position: "relative", transition: "all 0.18s cubic-bezier(0.22,1,0.36,1)",
                  flexShrink: 0,
                  fontFamily: theme.font.family,
                }}
              >
                <img
                  src={`https://api.iconify.design/lucide:${item.icon}.svg?color=${encodeURIComponent(color)}`}
                  width={isRound ? 20 : 18}
                  height={isRound ? 20 : 18}
                  alt=""
                  style={{ flexShrink: 0 }}
                />
                {!collapsed && (
                  <span style={{ fontSize: "13px", fontWeight: isActive ? "700" : "500", color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t(item.label)}</span>
                )}
                {isActive && !isRound && !collapsed && <div style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  width: "3px", height: "18px", borderRadius: "0 3px 3px 0",
                  backgroundColor: theme.primary,
                }} />}
                {/* Neumorphism: mobil pastki menyu uchun inset "bosingan" pill */}
                {isActive && <div className="ust-tab-pill" />}
                {count > 0 && (
                  <span className="ust-badge-pulse" style={{
                    position: "absolute", top: "4px", right: collapsed ? "4px" : "8px",
                    minWidth: "15px", height: "15px", borderRadius: theme.radius.full,
                    backgroundColor: theme.error, color: theme.textInverse,
                    fontSize: "9px", fontWeight: "800", lineHeight: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", boxSizing: "border-box",
                    border: `1.5px solid ${g.sidebarBg || theme.surface}`,
                  }}>
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer items (profile/settings) */}
        {footer && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: `1px solid ${g.sidebarBorder || theme.border}`, paddingTop: "8px", flexShrink: 0 }}>
            {footer.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: collapsed ? "42px" : "100%", height: "40px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "0" : "0 10px",
                  borderRadius: theme.radius.md, border: "none",
                  background: "transparent", color: item.color || theme.textTertiary,
                  cursor: "pointer", transition: "all 0.18s ease", flexShrink: 0,
                  fontFamily: theme.font.family,
                }}
              >
                <img
                  src={`https://api.iconify.design/lucide:${item.icon}.svg?color=${encodeURIComponent(item.color || theme.textTertiary)}`}
                  width="18" height="18" alt="" style={{ flexShrink: 0 }}
                />
                {!collapsed && <span style={{ fontSize: "13px", fontWeight: "500", color: item.color || theme.textTertiary }}>{item.label}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={toggleCollapse}
            aria-label="Expand sidebar"
            style={{
              width: "36px", height: "36px", borderRadius: theme.radius.md, border: `1px solid ${g.sidebarBorder || theme.border}`,
              background: theme.bgSecondary || theme.surface, color: theme.textTertiary,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              flexShrink: 0, margin: "4px auto 0", transition: theme.transition.fast,
            }}
          >
            <img src="https://api.iconify.design/lucide:panel-left-open.svg?color=currentColor" width="16" height="16" alt="" />
          </button>
        )}
      </nav>

      {/* Main content */}
      <div className="ust-main-content" style={{ flex: 1, marginLeft: SIDEBAR_W, minWidth: 0, transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
        {children}
      </div>
    </div>
  );
};

export default SidebarLayout;