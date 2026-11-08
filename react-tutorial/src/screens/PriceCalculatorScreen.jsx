import React, { useState, useMemo } from "react";
import { Calculator, Tag, RotateCcw, ArrowRight } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UButton, UCard, USelect, UChip, UInput } from "../components/ui";
import { applyPromo } from "../services/promo";
import { useToast } from "../components/Toast";

const DEVICES = [
  { key: "phone", base: 250000, labelKey: "devPhone" },
  { key: "laptop", base: 400000, labelKey: "devLaptop" },
  { key: "tv", base: 350000, labelKey: "devTv" },
  { key: "washer", base: 450000, labelKey: "devWasher" },
  { key: "ac", base: 500000, labelKey: "devAc" },
  { key: "fridge", base: 550000, labelKey: "devFridge" },
  { key: "other", base: 300000, labelKey: "devOther" },
];

const COMPLEXITY = [
  { key: "easy", mult: 1, labelKey: "cplxEasy" },
  { key: "medium", mult: 1.6, labelKey: "cplxMedium" },
  { key: "hard", mult: 2.5, labelKey: "cplxHard" },
];

const URGENCY = [
  { key: "normal", mult: 1, labelKey: "urgNormal" },
  { key: "soon", mult: 1.2, labelKey: "urgSoon" },
  { key: "urgent", mult: 1.5, labelKey: "urgUrgent" },
];

const DIST_PER_KM = 5000;

function fmt(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

export const PriceCalculatorScreen = ({ onBack, onFindMasters }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const toast = useToast();

  const [device, setDevice] = useState("phone");
  const [complexity, setComplexity] = useState("medium");
  const [urgency, setUrgency] = useState("normal");
  const [distance, setDistance] = useState("5");
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState(null);

  const estimate = useMemo(() => {
    const dev = DEVICES.find((d) => d.key === device) || DEVICES[0];
    const cx = COMPLEXITY.find((c) => c.key === complexity) || COMPLEXITY[1];
    const ug = URGENCY.find((u) => u.key === urgency) || URGENCY[0];
    const km = Math.max(0, Number(distance) || 0);
    const base = dev.base * cx.mult * ug.mult + km * DIST_PER_KM;
    const low = base * 0.85;
    const high = base * 1.2;
    const mid = (low + high) / 2;
    return { low, high, mid };
  }, [device, complexity, urgency, distance]);

  const withPromo = useMemo(() => {
    if (!applied?.ok) return null;
    const p = applied.promo;
    // Chegirma joriy hisobga qayta ko'rsatiladi (qurilma/masofa o'zgarsa ham to'g'ri qoladi)
    const base = Math.max(0, estimate.mid);
    const disc = Math.min(
      Math.max(0, p.type === "percent" ? Math.round((base * p.value) / 100) : p.value),
      base
    );
    return {
      discount: disc,
      lowTotal: Math.max(0, estimate.low - disc),
      highTotal: Math.max(0, estimate.high - disc),
    };
  }, [applied, estimate]);

  const doApply = () => {
    const res = applyPromo(promo, estimate.mid);
    if (res.ok) {
      setApplied(res);
      toast.success(t("promoApplied") || "Promo kod qo'llanildi");
    } else {
      setApplied(null);
      toast.error(res.message);
    }
  };

  const reset = () => {
    setDevice("phone");
    setComplexity("medium");
    setUrgency("normal");
    setDistance("5");
    setPromo("");
    setApplied(null);
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px", width: "100%", boxSizing: "border-box", fontFamily: theme.font.family }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <UBackBtn onClick={onBack} />
        <h1 style={{ margin: 0, fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.02em" }}>
          {t("priceCalcTitle") || "Narx kalkulyatori"}
        </h1>
      </div>

      {/* Natija — hero gradient kartasi */}
      <div
        className="ust-grad"
        style={{ borderRadius: theme.radius.xl, padding: "22px", marginBottom: "16px", boxShadow: theme.raiseXl.boxShadow }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.9, fontSize: theme.font.sm, fontWeight: theme.font.semibold }}>
          <Calculator size={16} />
          {t("estimatedPrice") || "Taxminiy narx"}
        </div>
        <div style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "8px", lineHeight: 1.1 }}>
          {fmt(withPromo ? withPromo.lowTotal : estimate.low)} — {fmt(withPromo ? withPromo.highTotal : estimate.high)}
          <span style={{ fontSize: "16px", fontWeight: 700, marginLeft: "6px" }}>so'm</span>
        </div>
        {withPromo && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", fontSize: theme.font.sm, fontWeight: theme.font.semibold }}>
            <Tag size={14} />
            {t("youSave") || "Tejaysiz"}: {fmt(withPromo.discount)} so'm
          </div>
        )}
        <div style={{ marginTop: "6px", fontSize: theme.font.xs, opacity: 0.85 }}>
          {t("priceDisclaimer") || "Bu taxminiy hisob — haqiqiy narx usta bilan kelishiladi."}
        </div>
      </div>

      <UCard style={{ padding: "18px", marginBottom: "14px" }}>
        <div style={{ fontSize: theme.font.base, fontWeight: theme.font.bold, color: theme.text, marginBottom: "14px" }}>
          {t("deviceType") || "Qurilma turi"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          {DEVICES.map((d) => (
            <UChip key={d.key} active={device === d.key} onClick={() => setDevice(d.key)}>
              {t(d.labelKey) || d.key}
            </UChip>
          ))}
        </div>

        <USelect
          label={t("complexity") || "Murakkablik"}
          value={complexity}
          onChange={(e) => setComplexity(e.target.value)}
          options={COMPLEXITY.map((c) => ({ value: c.key, label: t(c.labelKey) || c.key }))}
        />
        <USelect
          label={t("urgency") || "Shoshilinchlik"}
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          options={URGENCY.map((u) => ({ value: u.key, label: t(u.labelKey) || u.key }))}
        />
        <UInput
          label={t("distanceKm") || "Masofa (km)"}
          type="number"
          min="0"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        />
      </UCard>

      {/* Promo kod */}
      <UCard style={{ padding: "18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.font.base, fontWeight: theme.font.bold, color: theme.text, marginBottom: "12px" }}>
          <Tag size={16} style={{ color: theme.primary }} />
          {t("promoCode") || "Promo kod"}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder={t("enterPromo") || "WELCOME10"}
            style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, background: theme.bgSecondary, color: theme.text, fontSize: theme.font.base, outline: "none", fontFamily: theme.font.family, letterSpacing: "0.04em", fontWeight: theme.font.bold }}
          />
          <UButton onClick={doApply} disabled={!promo.trim()}>
            {t("apply") || "Qo'llash"}
          </UButton>
        </div>
        {applied?.ok && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", padding: "10px 12px", borderRadius: theme.radius.sm, background: theme.successLight, color: theme.success, fontSize: theme.font.sm, fontWeight: theme.font.semibold }}>
            <span>{applied.promo.code} — {applied.promo.type === "percent" ? `${applied.promo.value}%` : `${fmt(applied.promo.value)} so'm`}</span>
            <button onClick={() => setApplied(null)} style={{ border: "none", background: "transparent", color: theme.success, cursor: "pointer", fontWeight: theme.font.bold, fontFamily: theme.font.family }}>
              {t("remove") || "Olib tashlash"}
            </button>
          </div>
        )}
      </UCard>

      <div style={{ display: "flex", gap: "10px" }}>
        <UButton variant="subtle" onClick={reset} icon={<RotateCcw size={16} />} style={{ flex: 1 }}>
          {t("reset") || "Tozalash"}
        </UButton>
        {onFindMasters && (
          <UButton onClick={() => onFindMasters({ device, complexity, urgency })} icon={<ArrowRight size={16} />} style={{ flex: 2 }}>
            {t("findMasters") || "Usta topish"}
          </UButton>
        )}
      </div>
    </div>
  );
};

export default PriceCalculatorScreen;
