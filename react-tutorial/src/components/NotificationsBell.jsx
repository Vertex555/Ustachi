import React, { useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { apiUrl, authHeaders } from "../services/api";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationsRead,
  markAllNotificationsRead,
} from "../services/notifications";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

const TYPE_ICON = {
  order: "shopping-bag",
  chat: "message-circle",
  promo: "gift",
  system: "info",
  rating: "star",
};

function relTime(iso, t) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return t("justNow") || "Hozirgina";
  if (s < 3600) return `${Math.floor(s / 60)} ${t("minAgo") || "daq"}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${t("hourAgo") || "soat"}`;
  return d.toLocaleDateString();
}

// Suv bosish bilan ochiladigan bildirishnoma paneli + badge.
export const NotificationsBell = ({ onOpenAll }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const ref = useRef(null);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["notif-recent"],
    queryFn: async () => (await fetchNotifications({ limit: 6 })).items,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notif-unread"] });
    qc.invalidateQueries({ queryKey: ["notif-recent"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const openItem = (n) => {
    if (!n.read) {
      markNotificationsRead([n.id]).then(invalidate);
    }
    if (onOpenAll) onOpenAll(n);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notifications") || "Bildirishnomalar"}
        aria-expanded={open}
        style={{
          position: "relative",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          border: `1px solid ${theme.border}`,
          background: theme.surface,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: theme.raiseSm.boxShadow,
          flexShrink: 0,
        }}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span
            className="ust-badge-pulse"
            style={{
              position: "absolute",
              top: "-3px",
              right: "-3px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              borderRadius: "999px",
              background: theme.error,
              color: "#fff",
              fontSize: "10px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${theme.surface}`,
              boxSizing: "border-box",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="ust-slide-down ust-notif-pop"
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            width: "min(340px, calc(100vw - 32px))",
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.lg,
            boxShadow: theme.raiseXl.boxShadow,
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", borderBottom: `1px solid ${theme.borderLight}` }}>
            <span style={{ fontSize: theme.font.base, fontWeight: theme.font.extrabold, color: theme.text }}>
              {t("notifications") || "Bildirishnomalar"}
            </span>
            <button
              onClick={() => readAll.mutate()}
              title={t("markAllRead") || "Barchasini o'qilgan qilish"}
              style={{ border: "none", background: "transparent", color: theme.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: theme.font.xs, fontWeight: theme.font.bold, fontFamily: theme.font.family }}
            >
              <CheckCheck size={15} />
            </button>
          </div>

          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {recent.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: theme.textTertiary, fontSize: theme.font.sm }}>
                {t("noNotifications") || "Yangi bildirishnoma yo'q"}
              </div>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  style={{
                    display: "flex",
                    gap: "11px",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 15px",
                    border: "none",
                    borderBottom: `1px solid ${theme.borderLight}`,
                    background: n.read ? "transparent" : theme.primaryLight,
                    cursor: "pointer",
                    fontFamily: theme.font.family,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "9px",
                      flexShrink: 0,
                      background: theme.gradientSoft || theme.primaryLight,
                      color: theme.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={`https://api.iconify.design/lucide:${TYPE_ICON[n.type] || "bell"}.svg?color=${encodeURIComponent(theme.primary)}`}
                      width="16"
                      height="16"
                      alt=""
                    />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title}
                    </span>
                    <span style={{ display: "block", fontSize: theme.font.xs, color: theme.textSecondary, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </span>
                    <span style={{ display: "block", fontSize: "10px", color: theme.textTertiary, marginTop: "2px" }}>
                      {relTime(n.createdAt, t)}
                    </span>
                  </span>
                  {!n.read && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: theme.primary, flexShrink: 0, marginTop: "6px" }} />}
                </button>
              ))
            )}
          </div>

          {onOpenAll && (
            <button
              onClick={() => {
                setOpen(false);
                onOpenAll();
              }}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderTop: `1px solid ${theme.borderLight}`,
                background: "transparent",
                color: theme.primary,
                fontWeight: theme.font.bold,
                fontSize: theme.font.sm,
                cursor: "pointer",
                fontFamily: theme.font.family,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Settings2 size={15} />
              {t("viewAllNotifications") || "Barchasini ko'rish"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
