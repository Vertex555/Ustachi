import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { Bell, Trash2, CheckCheck, Inbox } from "lucide-react";
import {
  fetchNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../services/notifications";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UButton, UChip, USkeleton } from "../components/ui";

const TYPE_STYLE = {
  order: { icon: "shopping-bag", tint: "primary" },
  chat: { icon: "message-circle", tint: "info" },
  promo: { icon: "gift", tint: "accent" },
  rating: { icon: "star", tint: "warning" },
  system: { icon: "info", tint: "neutral" },
};

function relTime(iso, t) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return t("justNow") || "Hozirgina";
  if (s < 3600) return `${Math.floor(s / 60)} ${t("minAgo") || "daq"}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${t("hourAgo") || "soat"}`;
  return d.toLocaleDateString();
}

export const NotificationsScreen = ({ onBack, onOpen }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["notifications", tab, page],
    queryFn: () => fetchNotifications({ page, limit: 20, unread: tab === "unread" }),
    placeholderData: keepPreviousData, // react-query v5: sahifada skelton chaqmasin
  });

  const items = data?.items || [];
  const unread = data?.unread || 0;
  const pages = data?.pagination?.pages || 1;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notif-unread"] });
    qc.invalidateQueries({ queryKey: ["notif-recent"] });
  };

  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
  const del = useMutation({ mutationFn: deleteNotification, onSuccess: invalidate });

  const onItem = (n) => {
    if (!n.read) markNotificationsRead([n.id]).then(invalidate);
    if (onOpen) onOpen(n);
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px", width: "100%", boxSizing: "border-box", fontFamily: theme.font.family }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <UBackBtn onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.02em" }}>
            {t("notifications") || "Bildirishnomalar"}
          </h1>
          {unread > 0 && (
            <span style={{ fontSize: theme.font.sm, color: theme.primary, fontWeight: theme.font.semibold }}>
              {unread} {t("unreadLabel") || "ta o'qilmagan"}
            </span>
          )}
        </div>
        <button
          onClick={() => readAll.mutate()}
          disabled={unread === 0}
          title={t("markAllRead")}
          style={{ border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, borderRadius: theme.radius.full, width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", cursor: unread === 0 ? "default" : "pointer", opacity: unread === 0 ? 0.5 : 1, boxShadow: theme.raiseSm.boxShadow }}
        >
          <CheckCheck size={18} />
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <UChip active={tab === "all"} onClick={() => { setTab("all"); setPage(1); }}>
          {t("all") || "Barchasi"}
        </UChip>
        <UChip active={tab === "unread"} onClick={() => { setTab("unread"); setPage(1); }}>
          {t("unreadOnly") || "O'qilmagan"} ({unread})
        </UChip>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[0, 1, 2, 3].map((i) => (
            <USkeleton key={i} height="72px" radius={theme.radius.md} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="ust-neumo" style={{ padding: "48px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: theme.gradientSoft || theme.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Inbox size={30} style={{ color: theme.primary }} />
          </div>
          <div style={{ fontSize: theme.font.lg, fontWeight: theme.font.bold, color: theme.text }}>
            {t("noNotifications") || "Bildirishnoma yo'q"}
          </div>
          <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, maxWidth: "280px" }}>
            {t("noNotificationsDesc") || "Buyurtma va yangiliklar shu yerda ko'rinadi"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: isFetching ? 0.7 : 1 }}>
          {items.map((n) => {
            const st = TYPE_STYLE[n.type] || TYPE_STYLE.system;
            return (
              <div
                key={n.id}
                onClick={() => onItem(n)}
                className="ust-neumo"
                style={{ display: "flex", gap: "12px", padding: "14px 16px", cursor: "pointer", alignItems: "flex-start", background: n.read ? undefined : theme.mode === "dark" ? theme.surface : undefined, borderLeft: n.read ? undefined : `3px solid ${theme.primary}` }}
              >
                <span style={{ width: "38px", height: "38px", borderRadius: "11px", flexShrink: 0, background: theme.gradientSoft || theme.primaryLight, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={`https://api.iconify.design/lucide:${st.icon}.svg?color=${encodeURIComponent(theme.primary)}`} width="18" height="18" alt="" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ flex: 1, fontSize: theme.font.base, fontWeight: theme.font.bold, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: "10px", color: theme.textTertiary, flexShrink: 0 }}>{relTime(n.createdAt, t)}</span>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: theme.font.sm, color: theme.textSecondary, lineHeight: 1.5 }}>{n.body}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); del.mutate(n.id); }}
                  aria-label={t("delete")}
                  style={{ border: "none", background: "transparent", color: theme.textTertiary, cursor: "pointer", padding: "4px", flexShrink: 0, lineHeight: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
          <UButton size="sm" variant="subtle" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("prev") || "Oldingi"}
          </UButton>
          <span style={{ fontSize: theme.font.sm, color: theme.textSecondary, fontWeight: theme.font.semibold }}>
            {page} / {pages}
          </span>
          <UButton size="sm" variant="subtle" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            {t("next") || "Keyingi"}
          </UButton>
        </div>
      )}
    </div>
  );
};

export default NotificationsScreen;
