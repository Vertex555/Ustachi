import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareQuote } from "lucide-react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { StarRating, USkeleton, USectionHeader } from "./ui";

function timeAgo(iso, t) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t("justNow") || "Hozirgina";
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t("minAgo") || "daq"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("hourAgo") || "soat"}`;
  return d.toLocaleDateString();
}

// Bitta ustaning reyting + sharhlar bo'limi (Master profilida va boshqa joylarda).
export const ReviewsSection = ({ masterId, title, style }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["master-reviews", masterId],
    enabled: !!masterId,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/masters/${masterId}/reviews?limit=20`), {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) return { items: [], summary: { average: 0, count: 0 } };
      return { items: data.data || [], summary: data.summary || { average: 0, count: 0 } };
    },
  });

  const items = data?.items || [];
  const summary = data?.summary || { average: 0, count: 0 };

  return (
    <section style={{ ...style }}>
      <USectionHeader title={title || t("reviewsTitle") || "Sharhlar"} />

      {/* O'rtacha reyting kartasi */}
      <div
        className="ust-neumo"
        style={{ display: "flex", alignItems: "center", gap: "18px", padding: "18px", marginBottom: "14px" }}
      >
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "38px", fontWeight: 800, color: theme.text, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {Number(summary.average || 0).toFixed(1)}
          </div>
          <div style={{ marginTop: "6px" }}>
            <StarRating value={summary.average || 0} size={15} />
          </div>
          <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: "4px" }}>
            {summary.count || 0} {t("reviewsCountLabel") || "sharh"}
          </div>
        </div>
        <div style={{ width: "1px", height: "56px", background: theme.border, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const n = items.filter((r) => Math.round(r.rating) === star).length;
            const pct = items.length ? (n / items.length) * 100 : 0;
            return (
              <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: theme.font.xs, color: theme.textTertiary, width: "10px" }}>{star}</span>
                <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: theme.bgTertiary, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: theme.gradient || theme.primary, transition: "width .5s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sharhlar ro'yxati */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[0, 1, 2].map((i) => (
            <USkeleton key={i} height="72px" radius={theme.radius.md} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="ust-neumo"
          style={{ padding: "28px 18px", textAlign: "center", color: theme.textTertiary, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}
        >
          <MessageSquareQuote size={26} style={{ color: theme.textTertiary }} />
          <span style={{ fontSize: theme.font.sm }}>{t("noReviewsYet") || "Hozircha sharhlar yo'q"}</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((r) => (
            <div key={r.id} className="ust-neumo" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: theme.gradientSoft || theme.primaryLight, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", flexShrink: 0, overflow: "hidden" }}>
                  {r.userPhoto ? (
                    <img src={r.userPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    (r.userName || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.userName}
                  </div>
                  <div style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>{timeAgo(r.createdAt, t)}</div>
                </div>
                <StarRating value={r.rating} size={14} />
              </div>
              {r.text && (
                <p style={{ margin: 0, fontSize: theme.font.sm, color: theme.textSecondary, lineHeight: 1.55, wordBreak: "break-word" }}>
                  {r.text}
                </p>
              )}
              {r.masterResponse && (
                <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: theme.radius.sm, background: theme.bgSecondary, borderLeft: `3px solid ${theme.primary}` }}>
                  <div style={{ fontSize: theme.font.xs, fontWeight: theme.font.bold, color: theme.primary, marginBottom: "3px" }}>
                    {t("masterResponse") || "Ustaning javobi"}
                  </div>
                  <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, lineHeight: 1.5 }}>{r.masterResponse}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
