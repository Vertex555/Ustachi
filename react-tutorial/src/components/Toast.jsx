import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X, Bell } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";

// Global toast (qisqa xabar) tizimi — butun ilovada ishlatiladi.
const ToastContext = createContext(null);

let idc = 0;

export function ToastProvider({ children }) {
  const { theme } = useTheme();
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (opts) => {
      const o = typeof opts === "string" ? { message: opts } : opts || {};
      const id = ++idc;
      const toast = {
        id,
        type: o.type || "info",
        title: o.title || "",
        message: o.message || "",
      };
      setToasts((t) => [...t.slice(-3), toast]);
      const dur = o.duration || 3200;
      timers.current[id] = setTimeout(() => dismiss(id), dur);
      return id;
    },
    [dismiss]
  );

  const api = {
    push,
    success: (message, title) => push({ type: "success", message, title }),
    error: (message, title) => push({ type: "error", message, title }),
    info: (message, title) => push({ type: "info", message, title }),
    dismiss,
  };

  const icons = {
    success: { Icon: CheckCircle2, color: theme.success },
    error: { Icon: AlertCircle, color: theme.error },
    info: { Icon: Info, color: theme.info },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "min(360px, calc(100vw - 32px))",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const { Icon, color } = icons[t.type] || icons.info;
          return (
            <div
              key={t.id}
              className="ust-toast-in"
              role="status"
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "flex-start",
                gap: "11px",
                padding: "13px 14px",
                borderRadius: theme.radius.md,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.raiseXl.boxShadow,
                fontFamily: theme.font.family,
              }}
            >
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "9px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: t.type === "success" ? theme.successLight : t.type === "error" ? theme.errorLight : theme.infoLight,
                  color,
                }}
              >
                <Icon size={17} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && (
                  <div style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>{t.title}</div>
                )}
                {t.message && (
                  <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, lineHeight: 1.45, wordBreak: "break-word" }}>
                    {t.message}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Yopish"
                style={{
                  border: "none",
                  background: "transparent",
                  color: theme.textTertiary,
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                  lineHeight: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Xavfsiz fallback — provider bo'lmasa ham sinmasin
    const noop = () => {};
    return { push: noop, success: noop, error: noop, info: noop, dismiss: noop };
  }
  return ctx;
}

// Tez ishlatish uchun qisqa icon export
export { Bell };
