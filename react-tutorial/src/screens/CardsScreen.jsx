import React, { useEffect, useState } from "react";
import { Plus, Trash2, CreditCard, Star, ShieldCheck } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl, authHeaders } from "../services/api";
import { UBackBtn, UModal } from "../components/ui";

function sanitizeDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function formatCardNumberInput(v) {
  return sanitizeDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiryInput(v) {
  const d = sanitizeDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function detectCardBrand(n) {
  const d = sanitizeDigits(n);
  if (/^4/.test(d)) return "VISA";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "MASTERCARD";
  if (/^(5061|5062|6214)/.test(d)) return "HUMO";
  if (/^(8600|5614|8601)/.test(d)) return "UZCARD";
  return d ? "KARTA" : "";
}

function luhnOk(num) {
  const digits = sanitizeDigits(num);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// Muddati o'tgan karta (expMonth/expYear bugungi sanadan oldin)
function isCardExpired(c) {
  const y = Number(c && c.expYear);
  const m = Number(c && c.expMonth);
  if (!y || !m) return false;
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  return y < curY || (y === curY && m < curM);
}

// Ishlamaydigan / nazoratdan o'tmagan karta
function isCardInactive(c) {
  if (!c) return false;
  const s = String(c.status || "").toLowerCase();
  return s === "blocked" || s === "failed" || s === "inactive" || s === "declined" || c.active === false || c.isActive === false;
}

function cardStatus(c) {
  if (isCardExpired(c)) return "expired";
  if (isCardInactive(c)) return "blocked";
  return "active";
}

const BRAND_COLORS = {
  visa: ["#1A1F71", "#23278F"],
  mastercard: ["#EB001B", "#F79E1B"],
  amex: ["#0F766E", "#115E59"],
  humo: ["#0B5EA5", "#12304A"],
  uzcard: ["#BC8500", "#856200"],
  card: ["#3730A3", "#4C1D95"],
};

function Branch({ theme, c, cSelected }) {
  const colors = BRAND_COLORS[String(c.brand || "").toLowerCase()] || BRAND_COLORS.card;
  const status = cardStatus(c);
  const inactive = status !== "active";
  return (
    <div style={{
      width: "100%", aspectRatio: "1.586", borderRadius: "16px", overflow: "hidden",
      background: colors[0],
      color: theme.textInverse, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "space-between",
      boxShadow: theme.shadowLg, position: "relative", transition: theme.transition.normal,
      cursor: "pointer", border: cSelected ? `3px solid ${theme.primary}` : "none",
      boxSizing: "border-box",
      filter: inactive ? "grayscale(0.9)" : "none",
      opacity: inactive ? 0.72 : 1,
    }}>
      {inactive && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: "rgba(0,0,0,0.22)",
        }} />
      )}
      {inactive && (
        <div style={{
          position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", zIndex: 4,
          padding: "4px 12px", borderRadius: "999px",
          backgroundColor: status === "expired" ? "#DC2626" : "#64748B",
          color: theme.textInverse, fontSize: "10px", fontWeight: "800", letterSpacing: "0.5px",
          display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        }}>
          {status === "expired" ? "\u26A0 " + "Muddati o'tgan" : "\u26D4 " + "Nofaol"}
        </div>
      )}
      <div style={{ position: "absolute", top: "-60px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", opacity: 0.9 }}>USTACHI PAY</span>
        <span style={{ width: "26px", height: "26px", borderRadius: "13px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={14} />
        </span>
      </div>
      <div style={{ position: "relative", fontSize: "18px", fontVariantNumeric: "tabular-nums", letterSpacing: "2px", fontWeight: 700 }}>
        •••• •••• •••• {c.last4}
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "8px", opacity: 0.7, letterSpacing: "1px", marginBottom: "2px" }}>KARTA EGASI</div>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.holderName || "—"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "8px", opacity: 0.7, letterSpacing: "1px", marginBottom: "2px" }}>{c.expMonth}/{c.expYear}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>{c.brand}</span>
            {c.isDefault && <Star size={12} fill="#ffffff" color="#ffffff" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardsScreen({ onBack, onSelected }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [cards, setCards] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [num, setNum] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const load = async () => {
    try {
      const res = await fetch(apiUrl("/api/cards"), { headers: authHeaders() });
      const data = await res.json();
      setCards(Array.isArray(data.data) ? data.data : []);
    } catch {
      setCards([]);
    }
  };

  useEffect(() => { load(); }, []);

  const submitAdd = async () => {
    setError("");
    const digits = sanitizeDigits(num);
    if (!luhnOk(digits)) { setError(t("cardInvalid")); return; }
    const expRaw = sanitizeDigits(exp);
    const expM = Number(expRaw.slice(0, 2));
    const expY = Number(expRaw.slice(2, 4));
    if (!expM || expM < 1 || expM > 12 || !expY) { setError(t("cardExpInvalid")); return; }
    const cvvD = sanitizeDigits(cvv);
    if (cvvD.length < 3 || cvvD.length > 4) { setError(t("cardCvvInvalid")); return; }

    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/cards"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: cardName.trim() || undefined,
          holderName: holder.trim(),
          number: digits,
          expMonth: expM,
          expYear: expY,
          cvv: cvvD,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || t("error"));
        return;
      }
      setAddOpen(false);
      setNum(""); setHolder(""); setExp(""); setCvv(""); setCardName("");
      load();
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async (id) => {
    try {
      await fetch(apiUrl(`/api/cards/${id}`), { method: "DELETE", headers: authHeaders() });
      load();
    } catch {}
  };

  const setDefault = async (id) => {
    try {
      await fetch(apiUrl(`/api/cards/${id}/set-default`), { method: "POST", headers: authHeaders() });
      load();
    } catch {}
  };

  const inputStyle = (pos) => ({
    width: "100%", boxSizing: "border-box", padding: "12px 14px",
    borderRadius: theme.radius.md, border: `1px solid ${theme.border}`,
    backgroundColor: theme.bgSecondary, color: theme.text, outline: "none", fontSize: theme.font.base,
    ...pos,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <UBackBtn onClick={onBack} />
          <h1 style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, margin: 0 }}>{t("myCards")}</h1>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
            borderRadius: theme.radius.full, border: "none", backgroundColor: theme.primary, color: theme.textInverse,
            fontWeight: theme.font.bold, fontSize: theme.font.sm, cursor: "pointer",
          }}
        >
          <Plus size={16} /> {t("addCard")}
        </button>
      </div>

      <div style={{ padding: "20px", maxWidth: "100%", width: "100%", margin: "0 auto", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontSize: theme.font.xs, color: theme.textTertiary }}>
          <ShieldCheck size={14} color={theme.success} />
          <span>{t("cardSecureHint")}</span>
        </div>

        {cards === null && <div style={{ textAlign: "center", color: theme.textTertiary, padding: "40px 0" }}>{t("loading")}...</div>}

        {cards && cards.length === 0 && (
          <div style={{ textAlign: "center", color: theme.textTertiary, padding: "50px 0" }}>
            <CreditCard size={48} style={{ opacity: 0.5, marginBottom: "12px" }} />
            <div style={{ fontSize: theme.font.base, marginBottom: "6px" }}>{t("noCardsTitle")}</div>
            <div style={{ fontSize: theme.font.sm }}>{t("noCardsHint")}</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {cards?.map((c) => (
            <div key={c.id}>
              <Branch theme={theme} c={c} cSelected={false} />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
{!c.isDefault && (
                  <button onClick={() => setDefault(c.id)} style={{ padding: "7px 14px", borderRadius: theme.radius.full, border: "none", backgroundColor: theme.bgSecondary, color: theme.textSecondary, fontSize: theme.font.xs, fontWeight: theme.font.semibold, cursor: "pointer", boxShadow: theme.raiseSm.boxShadow }}>
                    {t("makeDefault")}
                  </button>
                )}
                <button onClick={() => removeCard(c.id)} style={{ padding: "7px 14px", borderRadius: theme.radius.full, border: "none", backgroundColor: theme.errorLight, color: theme.error, fontSize: theme.font.xs, fontWeight: theme.font.semibold, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Trash2 size={13} /> {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

{/* Qo'shish oynasi */}
      <UModal open={addOpen} onClose={() => { setAddOpen(false); setError(""); }} title={t("addCard")} maxWidth={440}>
        <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: theme.font.xs, color: theme.textSecondary, display: "block", marginBottom: "4px" }}>{t("cardNumber")}</label>
              <div style={{ position: "relative" }}>
                <input name="cardNumber" value={num} onChange={(e) => setNum(formatCardNumberInput(e.target.value))} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" style={{ ...inputStyle(), paddingRight: "92px", fontVariantNumeric: "tabular-nums", letterSpacing: "0.5px", textTransform: "uppercase" }} />
                {detectCardBrand(num) && (
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", fontWeight: "800", letterSpacing: "0.5px", padding: "3px 8px", borderRadius: "6px", backgroundColor: theme.primaryLight, color: theme.primary, pointerEvents: "none" }}>
                    {detectCardBrand(num)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: theme.font.xs, color: theme.textSecondary, display: "block", marginBottom: "4px" }}>{t("cardholderName")}</label>
              <input name="cardholder" value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, "").slice(0, 26))} placeholder="JON DOE" autoComplete="cc-name" style={inputStyle({ textTransform: "uppercase", letterSpacing: "0.5px" })} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: theme.font.xs, color: theme.textSecondary, display: "block", marginBottom: "4px" }}>{t("expiry")}</label>
                <input name="cardExpiry" value={exp} onChange={(e) => setExp(formatExpiryInput(e.target.value))} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" style={{ ...inputStyle(), fontVariantNumeric: "tabular-nums", letterSpacing: "0.5px" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: theme.font.xs, color: theme.textSecondary, display: "block", marginBottom: "4px" }}>{t("cvv")}</label>
                <input name="cardCvv" value={cvv} onChange={(e) => setCvv(sanitizeDigits(e.target.value).slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" type="password" style={{ ...inputStyle(), fontVariantNumeric: "tabular-nums", letterSpacing: "1px" }} />
              </div>
            </div>

<div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: theme.font.xs, color: theme.textSecondary, display: "block", marginBottom: "4px" }}>{t("cardName")}</label>
              <input name="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Visa Classic" style={inputStyle()} />
            </div>

            {error && <div style={{ fontSize: theme.font.sm, color: theme.error, marginBottom: "10px" }}>{error}</div>}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setAddOpen(false); setError(""); }} style={{ flex: 1, padding: "12px", borderRadius: theme.radius.full, border: "none", backgroundColor: theme.bgSecondary, color: theme.text, cursor: "pointer", fontWeight: theme.font.semibold, boxShadow: theme.raiseSm.boxShadow }}>
                {t("cancel")}
              </button>
              <button onClick={submitAdd} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: theme.radius.full, border: "none", backgroundColor: theme.primary, color: theme.textInverse, cursor: "pointer", fontWeight: theme.font.bold }}>
                {saving ? `${t("loading")}...` : t("save")}
              </button>
            </div>
      </UModal>
    </div>
  );
}

export default CardsScreen;
