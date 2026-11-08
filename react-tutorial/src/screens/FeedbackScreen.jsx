import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl, authHeaders } from "../services/api";
import { UBackBtn, UButton, UChip, UTextarea, UInput, UCard, EmptyState } from "../components/ui";

const TYPES = ["suggestion", "complaint", "question", "praise"];

// Har bir tur uchun o'z ikonkasi (SVG — internetdan yuklanadi) va rang tizimi
const TYPE_META = (theme) => ({
  suggestion: {
    icon: "https://api.iconify.design/lucide:lightbulb.svg?color=%23059669",
    color: theme.primary,
    bg: theme.primaryLight,
  },
  complaint: {
    icon: "https://api.iconify.design/lucide:alert-triangle.svg?color=%23dc2626",
    color: theme.error,
    bg: theme.errorLight,
  },
  question: {
    icon: "https://api.iconify.design/lucide:help-circle.svg?color=%232563eb",
    color: theme.info,
    bg: theme.infoLight,
  },
  praise: {
    icon: "https://api.iconify.design/lucide:thumbs-up.svg?color=%2316a34a",
    color: theme.success,
    bg: theme.successLight,
  },
});

const STATUS_META = (theme) => ({
  answered: { color: theme.success, bg: theme.successLight },
  viewed: { color: theme.info, bg: theme.infoLight },
  new: { color: theme.warning, bg: theme.warningLight },
});

export function FeedbackScreen({ onBack, viewerRole }) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [type, setType] = useState(TYPES[0]);
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);
  const [histPage, setHistPage] = useState(1);
  const [histHasMore, setHistHasMore] = useState(false);

  const loadHistory = useCallback(async (p = 1, append = false) => {
    try {
      const res = await fetch(apiUrl(`/api/feedback/my?page=${p}&limit=50`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setHistory((prev) => (append ? [...(prev || []), ...data.data] : data.data));
        setHistPage(p);
        setHistHasMore(!!(data.pagination && data.pagination.page < data.pagination.pages));
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [sentMsg, loadHistory]);

  // Maqtov -> avtomatik tashakkur; shikoyat -> minnatdorlik + uzr; qolganlari admin panelga
  const autoMessage = (resType) => {
    if (resType === "praise") return t("fb_auto_praise");
    if (resType === "complaint") return t("fb_auto_complaint");
    if (resType === "question") return t("fb_auto_question");
    return t("fb_auto_suggestion");
  };

  const submit = async () => {
    if (!text.trim()) {
      setError(t("fb_empty"));
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type, text: text.trim(), contact: contact.trim() || undefined, lang }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSentMsg(autoMessage(type));
        setText("");
        setContact("");
        setTimeout(() => setSentMsg(""), 5000);
      } else {
        setError(data.message || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setSending(false);
    }
  };

  const typeColor = (tp) => TYPE_META(theme)[tp] || TYPE_META(theme).suggestion;

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "clamp(12px, 3vw, 20px)", backgroundColor: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <UBackBtn onClick={onBack} size={40} style={{ marginLeft: "-4px" }} />
        <h1 style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, margin: 0 }}>{t("feedback")}</h1>
      </div>

      <div style={{ padding: "clamp(12px, 3vw, 24px)", maxWidth: "600px", width: "100%", margin: "0 auto", paddingBottom: "40px", boxSizing: "border-box" }}>
        {/* Tur */}
        <div style={{
          backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg,
          padding: theme.spacing.md, marginBottom: "16px", boxShadow: theme.raiseMd.boxShadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <MessageSquare size={18} color={theme.primary} />
            <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold }}>{t("fb_type")}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: "8px" }}>
            {TYPES.map((tp) => {
              const meta = typeColor(tp);
              const active = type === tp;
              return (
                <UChip key={tp} active={active} activeColor={meta.color} activeBg={meta.bg} onClick={() => setType(tp)}>
                  <img src={meta.icon} alt="" width="15" height="15" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(`fb_type_${tp}`)}</span>
                </UChip>
              );
            })}
          </div>
        </div>

        {/* Avtomatik izoh: bu turga qanday javob bo'ladi */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "8px",
          backgroundColor: theme.bgSecondary, border: `1px dashed ${theme.border}`,
          borderRadius: theme.radius.md, padding: "10px 12px", marginBottom: "12px",
        }}>
          <img src={typeColor(type).icon} alt="" width="15" height="15" style={{ marginTop: "1px" }} />
          <span style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>{autoMessage(type)}</span>
        </div>

        {/* Matn */}
        <UTextarea
          name="feedbackText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("fb_placeholder")}
          rows={5}
        />

        <UInput
          name="feedbackContact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t("fb_contact")}
        />

        {error && <div style={{ fontSize: theme.font.sm, color: theme.error, marginBottom: "12px" }}>{error}</div>}
        {sentMsg && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "8px", flexWrap: "wrap",
            fontSize: theme.font.sm, color: theme.success, marginBottom: "12px",
            backgroundColor: theme.successLight, border: `1px solid ${theme.success}`,
            borderRadius: theme.radius.md, padding: "10px 12px", fontWeight: theme.font.semibold,
          }}>
            <img src="https://api.iconify.design/lucide:badge-check.svg?color=%2316a34a" alt="" width="16" height="16" style={{ marginTop: "1px" }} />
            <span>{sentMsg}</span>
          </div>
        )}

        <UButton onClick={submit} disabled={sending} loading={sending} full size="lg">
          <MessageSquare size={18} />
          {t("fb_send")}
        </UButton>

        {/* Tarix */}
        <div style={{ marginTop: "24px" }}>
          <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold, display: "block", marginBottom: "10px" }}>{t("fb_history")}</span>
          {history && history.length === 0 && (
            <EmptyState title={t("fb_emptyHistory")} />
          )}
          {history?.map((f) => {
            const meta = typeColor(f.type);
            const st = STATUS_META(theme)[f.status] || STATUS_META(theme).new;
            return (
              <UCard key={f.id} style={{ padding: "12px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", rowGap: "4px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <img src={meta.icon} alt="" width="16" height="16" />
                  <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.semibold }}>{t(`fb_type_${f.type}`)}</span>
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: theme.radius.full,
                    backgroundColor: st.bg, color: st.color, fontWeight: theme.font.bold,
                  }}>
                    {f.status === "answered" ? t("fb_answered") : f.status === "viewed" ? t("fb_viewed") : t("fb_new")}
                  </span>
                  <span style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginLeft: "auto" }}>{new Date(f.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: theme.font.base }}>{f.text}</div>
                {f.adminNote && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    fontSize: theme.font.sm, color: theme.textSecondary, marginTop: "8px",
                    padding: "9px 11px", backgroundColor: theme.bgSecondary,
                    borderRadius: theme.radius.sm, borderLeft: `3px solid ${theme.primary}`,
                  }}>
                    <img src={f.status === "answered" ? "https://api.iconify.design/lucide:shield-check.svg?color=%2316a34a" : "https://api.iconify.design/lucide:info.svg?color=%230284c7"} alt="" width="14" height="14" style={{ marginTop: "2px" }} />
                    <span>{f.adminNote}</span>
                  </div>
                )}
              </UCard>
            );
          })}
          {history && histHasMore && (
            <UButton onClick={() => loadHistory(histPage + 1, true)} variant="secondary" full size="sm" style={{ marginTop: "12px" }}>
              {t("loadMore")}
            </UButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeedbackScreen;