import React, { useState, useMemo } from "react";
import { Gift, Copy, Share2, Ticket, Plus, Trash2, Users, Sparkles } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UButton, UCard, UInput, USelect, USeparator, UBadge } from "../components/ui";
import { useToast } from "../components/Toast";
import { getReferral, referralLink, listPromos, createPromo, deletePromo } from "../services/promo";

function fmt(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(Number(n) || 0));
}

export const PromoScreen = ({ onBack, user }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const toast = useToast();

  const ref = useMemo(() => getReferral(user), [user]);
  const link = referralLink(ref.code);
  const [promos, setPromos] = useState(() => listPromos());
  const [form, setForm] = useState({ code: "", type: "percent", value: "", maxUses: "100", note: "" });

  const copy = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg || t("copied") || "Nusxalandi");
    } catch {
      toast.info(text);
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ustachi", text: t("shareText") || "Ustachi'ga taklif qiling!", url: link });
      } else {
        copy(link, t("linkCopied") || "Havola nusxalandi");
      }
    } catch {}
  };

  const submit = () => {
    const res = createPromo({
      code: form.code,
      type: form.type,
      value: Number(form.value),
      maxUses: Number(form.maxUses),
      note: form.note,
    });
    if (res.ok) {
      setPromos(listPromos());
      setForm({ code: "", type: "percent", value: "", maxUses: "100", note: "" });
      toast.success(t("promoCreated") || "Promo kod yaratildi");
    } else {
      toast.error(res.message);
    }
  };

  const remove = (code) => {
    deletePromo(code);
    setPromos(listPromos());
    toast.info(t("promoRemoved") || "Kod o'chirildi");
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px", width: "100%", boxSizing: "border-box", fontFamily: theme.font.family }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <UBackBtn onClick={onBack} />
        <h1 style={{ margin: 0, fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.02em" }}>
          {t("promoTitle") || "Promo va taklif"}
        </h1>
      </div>

      {/* Referral hero */}
      <div className="ust-grad" style={{ borderRadius: theme.radius.xl, padding: "22px", marginBottom: "16px", boxShadow: theme.raiseXl.boxShadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.9, fontSize: theme.font.sm, fontWeight: theme.font.semibold }}>
          <Share2 size={16} />
          {t("referralTitle") || "Do'stlaringizni taklif qiling"}
        </div>
        <div style={{ fontSize: theme.font.xl, fontWeight: 800, marginTop: "6px", lineHeight: 1.3 }}>
          {t("referralDesc") || "Har bir taklif uchun 10 000 so'm bonus olasiz"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", background: "rgba(255,255,255,0.18)", borderRadius: theme.radius.md, padding: "10px 12px" }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, letterSpacing: "0.08em", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ref.code}
          </span>
          <button onClick={() => copy(ref.code)} style={{ border: "none", background: "rgba(255,255,255,0.25)", color: "#fff", borderRadius: "8px", padding: "7px", cursor: "pointer", display: "flex", lineHeight: 0 }}>
            <Copy size={16} />
          </button>
          <button onClick={share} style={{ border: "none", background: "#fff", color: theme.primary, borderRadius: "8px", padding: "7px", cursor: "pointer", display: "flex", lineHeight: 0 }}>
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Stat */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <UCard style={{ flex: 1, padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "38px", height: "38px", borderRadius: "11px", background: theme.gradientSoft || theme.primaryLight, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={18} />
          </span>
          <div>
            <div style={{ fontSize: theme.font.xxl, fontWeight: 800, color: theme.text, lineHeight: 1 }}>{ref.invited}</div>
            <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: "3px" }}>{t("invited") || "Taklif qilingan"}</div>
          </div>
        </UCard>
        <UCard style={{ flex: 1, padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "38px", height: "38px", borderRadius: "11px", background: theme.accentLight, color: theme.accentText || theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} />
          </span>
          <div>
            <div style={{ fontSize: theme.font.xxl, fontWeight: 800, color: theme.text, lineHeight: 1 }}>{fmt(ref.earned)}</div>
            <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: "3px" }}>{t("earnedBonus") || "Bonus (so'm)"}</div>
          </div>
        </UCard>
      </div>

      {/* Yangi promo yaratish */}
      <UCard style={{ padding: "18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.font.base, fontWeight: theme.font.bold, color: theme.text, marginBottom: "14px" }}>
          <Plus size={16} style={{ color: theme.primary }} />
          {t("createPromo") || "Promo kod yaratish"}
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px" }}>
            <UInput label={t("code") || "Kod"} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SALE15" />
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <USelect label={t("type") || "Turi"} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "percent", label: t("percent") || "Foiz (%)" }, { value: "fixed", label: t("fixed") || "Qat'iy (so'm)" }]} />
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <UInput label={form.type === "percent" ? (t("valuePercent") || "Qiymat (%)") : (t("valueSum") || "Qiymat (so'm)")} type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === "percent" ? "15" : "30000"} />
          </div>
          <div style={{ flex: "1 1 110px" }}>
            <UInput label={t("maxUses") || "Maks. foydalanish"} type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
          </div>
        </div>
        <UButton full onClick={submit} disabled={!form.code.trim() || !form.value} style={{ marginTop: "4px" }}>
          <Plus size={16} /> {t("create") || "Yaratish"}
        </UButton>
      </UCard>

      {/* Promo ro'yxati */}
      <div style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, color: theme.text, marginBottom: "12px" }}>
        <Ticket size={17} style={{ verticalAlign: "-3px", marginRight: "6px", color: theme.primary }} />
        {t("activePromos") || "Faol promo kodlar"}
      </div>
      <UCard style={{ padding: "6px 18px" }}>
        {promos.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: theme.textTertiary, fontSize: theme.font.sm }}>
            {t("noPromos") || "Promo kod yo'q"}
          </div>
        ) : (
          promos.map((p, i) => (
            <div key={p.code}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 0" }}>
                <span style={{ width: "40px", height: "40px", borderRadius: "11px", background: theme.gradientSoft || theme.primaryLight, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                  <Gift size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: theme.text, letterSpacing: "0.04em" }}>{p.code}</span>
                    <UBadge variant={p.type === "percent" ? "primary" : "accent"}>
                      {p.type === "percent" ? `${p.value}%` : `${fmt(p.value)} so'm`}
                    </UBadge>
                  </div>
                  <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: "3px" }}>
                    {t("usedLabel") || "Foydalanilgan"}: {p.uses}/{p.maxUses}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <button onClick={() => copy(p.code)} style={{ border: "none", background: "transparent", color: theme.textTertiary, cursor: "pointer", padding: "6px", lineHeight: 0, flexShrink: 0 }}>
                  <Copy size={16} />
                </button>
                {p.custom && (
                  <button onClick={() => remove(p.code)} style={{ border: "none", background: "transparent", color: theme.error, cursor: "pointer", padding: "6px", lineHeight: 0, flexShrink: 0 }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {i < promos.length - 1 && <USeparator />}
            </div>
          ))
        )}
      </UCard>
    </div>
  );
};

export default PromoScreen;
