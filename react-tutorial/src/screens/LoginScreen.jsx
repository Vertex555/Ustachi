import React, { useState, useRef } from "react";
import { User, ChevronLeft, Loader2, Send } from "lucide-react";
import { apiUrl } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

export const LoginScreen = ({ onBack, onSendCode, onGuest }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [linkState, setLinkState] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const stopLinkingRef = useRef(false);

  const requestCode = async (phone) => {
    const response = await fetch(apiUrl("/api/auth/send-code"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || t("error"));
    return data;
  };

  const waitForTelegramLink = (phone) => {
    return new Promise((resolve) => {
      let tries = 0;
      const timer = setInterval(async () => {
        if (stopLinkingRef.current) { clearInterval(timer); resolve(false); return; }
        tries += 1;
        try {
          const res = await fetch(apiUrl(`/api/auth/telegram-status?phone=${encodeURIComponent(phone)}`));
          const data = await res.json();
          if (data.success && data.linked) { clearInterval(timer); resolve(true); return; }
        } catch {}
        if (tries >= 150) { clearInterval(timer); resolve(false); }
      }, 2000);
    });
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setError("");
    setInfoMessage("");
    stopLinkingRef.current = false;

    const cleanNumber = phoneNumber.replace(/\s/g, "");
    if (cleanNumber.length !== 9) {
      setError(t("phoneError"));
      setIsLoading(false);
      return;
    }
    const fullPhoneNumber = `+998${cleanNumber}`;

    try {
      const data = await requestCode(fullPhoneNumber);
      if (data.needTelegram) {
        setLinkState({
          phone: fullPhoneNumber,
          deepLink: data.deepLink || `https://t.me/${data.botUsername}?start=${data.linkToken}`,
        });
        setInfoMessage(t("telegramNeedStart"));
        setIsLinking(true);
        const linked = await waitForTelegramLink(fullPhoneNumber);
        setIsLinking(false);
        if (linked) {
          stopLinkingRef.current = false;
          const data2 = await requestCode(fullPhoneNumber);
          if (typeof onSendCode === "function") onSendCode(fullPhoneNumber, data2.devCode || null);
        } else if (!stopLinkingRef.current) {
          setError(t("error"));
          setLinkState(null);
        }
      } else {
        if (typeof onSendCode === "function") onSendCode(fullPhoneNumber, data.devCode || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelLinking = () => {
    stopLinkingRef.current = true;
    setIsLinking(false);
    setLinkState(null);
    setInfoMessage("");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: "100vh",
      padding: "32px 24px",
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font.family,
      boxSizing: "border-box"
    }}>
      <style>{`
        @keyframes wave { 0%{transform:rotate(0deg)} 20%{transform:rotate(14deg)} 40%{transform:rotate(-8deg)} 60%{transform:rotate(14deg)} 80%{transform:rotate(-4deg)} 100%{transform:rotate(0deg)} }
        .waving-hand { display:inline-block; animation:wave 1.8s infinite ease-in-out; transform-origin:70% 70%; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .animate-spin { animation:spin 1s linear infinite; }
      `}</style>

      {/* Orqaga qaytish */}
      <div>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginBottom: "16px", color: theme.text }}>
          <ChevronLeft size={28} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, maxWidth: "360px", width: "100%", margin: "0 auto", textAlign: "left" }}>
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: theme.font.xxxl, fontWeight: theme.font.extrabold, margin: "0 0 8px 0", color: theme.text, letterSpacing: "-0.5px" }}>
            {t("welcomeBack")} <span className="waving-hand">👋</span>
          </h2>
          <p style={{ fontSize: theme.font.base, color: theme.textSecondary, margin: 0, lineHeight: "1.4" }}>
            {t("loginDesc")}
          </p>
        </div>

        {/* Xatolik */}
        {error && (
          <div style={{ backgroundColor: theme.errorLight, padding: "10px", borderRadius: theme.radius.sm, marginBottom: "15px", border: `1px solid ${theme.error}` }}>
            <p style={{ color: theme.error, fontSize: theme.font.sm, fontWeight: theme.font.semibold, margin: 0, textAlign: "center" }}>{error}</p>
          </div>
        )}

        {/* Info */}
        {!error && infoMessage && (
          <div style={{ backgroundColor: theme.infoLight, padding: "10px", borderRadius: theme.radius.sm, marginBottom: "15px", border: `1px solid ${theme.info}` }}>
            <p style={{ color: theme.info, fontSize: theme.font.sm, fontWeight: theme.font.semibold, margin: 0, textAlign: "center" }}>{infoMessage}</p>
          </div>
        )}

        {/* Telegram bog'lash */}
        {linkState && (
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            marginBottom: "16px",
            boxShadow: theme.shadowMd
          }}>
            <p style={{ fontSize: theme.font.base, fontWeight: theme.font.extrabold, color: theme.text, margin: "0 0 10px 0" }}>
              🔐 {t("telegramLink")}
            </p>
            <ol style={{ margin: "0 0 14px 0", paddingLeft: "20px", color: theme.textSecondary, fontSize: theme.font.sm, lineHeight: "1.6" }}>
              <li>{t("telegramStep1")}</li>
              <li>{t("telegramStep2")}</li>
            </ol>
            <a
              href={linkState.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                width: "100%", padding: "14px", borderRadius: theme.radius.md,
                backgroundColor: "#229ED9", color: "#fff", textDecoration: "none",
                fontWeight: theme.font.bold, fontSize: theme.font.base
              }}
            >
              <Send size={18} /> {t("telegramOpenInTelegram")}
            </a>
            <p style={{ fontSize: theme.font.xs, color: theme.textTertiary, margin: "12px 0 0 0", textAlign: "center" }}>
              {isLinking ? t("telegramWaiting") : t("telegramNeedStart")}
            </p>
            <button onClick={cancelLinking} disabled={!isLinking}
              style={{ background: "none", border: "none", color: theme.textTertiary, fontSize: theme.font.sm, fontWeight: theme.font.bold, cursor: isLinking ? "pointer" : "default", textDecoration: "underline", marginTop: "6px", opacity: isLinking ? 1 : 0.4, display: "block", marginLeft: "auto", marginRight: "auto" }}>
              {t("cancel")}
            </button>
          </div>
        )}

        {/* Telefon maydoni */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <label htmlFor="phoneNumber" style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>{t("phoneNumber")}</label>
          <div style={{ display: "flex", alignItems: "center", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.xl, padding: "14px 18px", boxShadow: theme.shadowSm }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", borderRight: `1px solid ${theme.border}`, paddingRight: "14px", marginRight: "14px" }}>
              <div style={{ width: "28px", height: "18px", borderRadius: "3px", overflow: "hidden", display: "flex", flexDirection: "column", border: `1px solid ${theme.border}` }}>
                <div style={{ height: "33%", backgroundColor: "#0099ff" }}></div>
                <div style={{ height: "34%", backgroundColor: "#fff" }}></div>
                <div style={{ height: "33%", backgroundColor: "#33cc33" }}></div>
              </div>
              <span style={{ fontSize: theme.font.md, fontWeight: theme.font.bold, color: theme.text }}>+998</span>
            </div>
            <input
              id="phoneNumber" name="phone" type="tel" maxLength="9"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="90 123 45 67"
              style={{ border: "none", outline: "none", fontSize: theme.font.lg, fontWeight: theme.font.semibold, color: theme.text, width: "100%", background: "transparent", fontFamily: theme.font.family }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Kod yuborish */}
        <button onClick={handleSendCode} disabled={isLoading}
          style={{
            width: "100%",
            backgroundColor: isLoading ? theme.primaryHover : theme.primary,
            color: theme.textInverse,
            fontWeight: theme.font.bold,
            fontSize: theme.font.lg,
            padding: "18px",
            borderRadius: theme.radius.xl,
            border: "none",
            cursor: isLoading ? "wait" : "pointer",
            boxShadow: `0 8px 20px ${theme.mode === "dark" ? "rgba(16,185,129,0.3)" : "rgba(46,125,50,0.3)"}`,
            display: "flex", justifyContent: "center", alignItems: "center", gap: "10px",
            transition: theme.transition.normal,
          }}>
          {isLoading ? (
            <><Loader2 size={20} className="animate-spin" /> {isLinking ? t("telegramWaiting") : t("loading")}</>
          ) : t("sendCode")}
        </button>

        {/* Ajratuvchi */}
        <div style={{ display: "flex", alignItems: "center", margin: "24px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: theme.border }}></div>
          <span style={{ padding: "0 14px", fontSize: theme.font.base, color: theme.textTertiary, fontWeight: theme.font.semibold }}>{t("or")}</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: theme.border }}></div>
        </div>

        {/* Mehmon */}
        <button onClick={onGuest}
          style={{
            width: "100%",
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontWeight: theme.font.bold,
            fontSize: theme.font.md,
            padding: "18px",
            borderRadius: theme.radius.xl,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            boxShadow: theme.shadowSm,
            transition: theme.transition.normal,
          }}>
          <User size={22} color={theme.textSecondary} /> {t("continueAsGuest")}
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", paddingTop: "16px" }}>
        <p style={{ fontSize: theme.font.xs, color: theme.textTertiary, margin: 0, lineHeight: "1.5" }}>
          {t("byContinuing")}<br />
          <span style={{ color: theme.primary, fontWeight: theme.font.bold, cursor: "pointer" }}>{t("terms")}</span> {t("and")} <span style={{ color: theme.primary, fontWeight: theme.font.bold, cursor: "pointer" }}>{t("privacy")}</span>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;