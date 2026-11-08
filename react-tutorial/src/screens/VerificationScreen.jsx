import React, { useState, useEffect } from "react";
import { Delete, Loader2, CheckCircle2 } from "lucide-react";
import { apiUrl } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { useRaise } from "../theme/useRaise";
import { UBackBtn } from "../components/ui";

export const VerificationScreen = ({ phone, devCode, onBack, onVerify }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [code, setCode] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successIndex, setSuccessIndex] = useState(-1);
  const raiseBtn = useRaise(theme, "sm");

  // 4 ta raqam to'lganda avtomatik backendga tekshiruvga yuborish
  useEffect(() => {
    if (code.length === 4) {
      const verifyCodeWithBackend = async () => {
        setIsLoading(true);
        setError("");

        try {
          const response = await fetch(apiUrl("/api/auth/verify"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, code: code.join("") })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || t("codeError"));

          setIsLoading(false);
          setIsSuccess(true);

          let currentIndex = 0;
          const interval = setInterval(() => {
            if (currentIndex < 4) {
              setSuccessIndex(currentIndex);
              currentIndex++;
            } else {
              clearInterval(interval);
              setTimeout(() => {
                onVerify(data.token, data.user);
              }, 300);
            }
          }, 180);
        } catch (err) {
          setError(err.message || t("codeError"));
          setIsLoading(false);
          setCode([]);
        }
      };

      verifyCodeWithBackend();
    }
  }, [code, phone, onVerify, t]);

  const handleKeyPress = (num) => {
    if (code.length < 4 && !isLoading && !isSuccess) {
      setCode([...code, num]);
    }
  };

  const handleDelete = () => {
    if (!isLoading && !isSuccess) {
      setCode(code.slice(0, -1));
      setError("");
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/send-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("tryAgain"));

      if (data.devCode) alert(`${t("ver_devCode")} ${data.devCode}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: "100vh",
      padding: "24px",
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font.family,
      boxSizing: "border-box",
      textAlign: "center"
    }}>
      <div style={{ textAlign: "left" }}>
        <UBackBtn onClick={onBack} disabled={isLoading || isSuccess} />
      </div>

      <div style={{ margin: "10px 0" }}>
        <h2 style={{ fontSize: "26px", fontWeight: "800", margin: "0 0 8px 0", color: theme.text, letterSpacing: "-0.5px" }}>
          {isSuccess ? t("ver_success") : t("ver_title")}
        </h2>
        <p style={{ fontSize: "14px", color: theme.textSecondary, margin: 0, lineHeight: "1.4" }}>
          {isSuccess ? t("ver_successDesc") : t("ver_subtitle")}
          {!isSuccess && <><br /><strong style={{ color: theme.text }}>{phone}</strong></>}
        </p>

        {error && (
          <p style={{ color: theme.error, fontSize: "14px", fontWeight: "600", marginTop: "10px" }}>
            {error}
          </p>
        )}

        {devCode && !isSuccess && (
          <p style={{ color: theme.info, fontSize: "13px", fontWeight: "700", marginTop: "10px" }}>
            {t("ver_devCode")} <b>{devCode}</b>
          </p>
        )}

        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          margin: "28px 0 16px 0"
        }}>
          {[0, 1, 2, 3].map((index) => {
            const isActiveSuccess = successIndex >= index;
            return (
              <div
                key={index}
                style={{
                  width: "60px",
                  height: "64px",
                  backgroundColor: theme.surface,
                  border: `2px solid ${isActiveSuccess ? theme.primary : theme.border}`,
                  borderRadius: theme.radius.lg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: isActiveSuccess ? theme.primary : theme.text,
                  boxShadow: isActiveSuccess
                    ? `0 6px 16px rgba(46, 125, 50, 0.2)`
                    : theme.raiseSm.boxShadow,
                  transform: successIndex === index ? "scale(1.1)" : "scale(1)",
                  transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                }}
              >
                {isLoading && index === 3 ? (
                  <Loader2 size={24} className="ust-spin" style={{ color: theme.primary }} />
                ) : isSuccess && index === 3 ? (
                  <CheckCircle2 size={28} color={theme.primary} />
                ) : (
                  code[index] || ""
                )}
              </div>
            );
          })}
        </div>

        {!isSuccess && (
          <button
            onClick={handleResend}
            style={{
              background: "none",
              border: "none",
              color: theme.primary,
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            {t("resend")}
          </button>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        width: "100%",
        maxWidth: "340px",
        margin: "0 auto",
        paddingBottom: "10px",
        opacity: isLoading || isSuccess ? 0.5 : 1,
        pointerEvents: isLoading || isSuccess ? "none" : "auto",
        transition: "opacity 0.2s"
      }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            style={{
              backgroundColor: theme.bgSecondary,
              border: "none",
              borderRadius: theme.radius.md,
              padding: "16px 0",
              fontSize: "22px",
              fontWeight: "600",
              color: theme.text,
              cursor: "pointer",
              ...raiseBtn.style,
            }}
            {...raiseBtn.bind}
          >
            {num}
          </button>
        ))}

        <div></div>

        <button
          onClick={() => handleKeyPress("0")}
          style={{
            backgroundColor: theme.bgSecondary,
            border: "none",
            borderRadius: theme.radius.md,
            padding: "16px 0",
            fontSize: "22px",
            fontWeight: "600",
            color: theme.text,
            cursor: "pointer",
            ...raiseBtn.style,
          }}
          {...raiseBtn.bind}
        >
          0
        </button>

        <button
          onClick={handleDelete}
          style={{
            backgroundColor: theme.bgSecondary,
            border: "none",
            borderRadius: theme.radius.md,
            padding: "16px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            ...raiseBtn.style,
          }}
          {...raiseBtn.bind}
        >
          <Delete size={24} color={theme.text} />
        </button>
      </div>
    </div>
  );
};

export default VerificationScreen;
