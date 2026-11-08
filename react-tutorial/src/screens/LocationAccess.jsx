import React from "react";
import { Navigation } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UButton } from "../components/ui";
import gpsSvg from "../animations/GPS Navigation.svg";

export const LocationAccess = ({ onNext }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleAllowLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          console.log("Kenglik (Latitude):", latitude);
          console.log("Uzunlik (Longitude):", longitude);

          onNext();
        },
        (error) => {
          console.warn("Lokatsiya olishda xatolik yoki rad etildi:", error.message);
          onNext();
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      alert("Sizning brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
      onNext();
    }
  };

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100vh",
    maxHeight: "100vh",
    padding: "2vh 5vw",
    backgroundColor: theme.bgSecondary,
    color: theme.text,
    fontFamily: theme.font.family,
    boxSizing: "border-box",
    textAlign: "center",
    overflow: "hidden"
  };

  const headerStyle = { width: "100%", maxWidth: "400px" };
  const indicatorWrapperStyle = { display: "flex", justifyContent: "flex-end", marginBottom: "1vh" };
  const titleStyle = { fontSize: "clamp(1.4rem, 3.2vw, 2.2rem)", fontWeight: theme.font.extrabold, lineHeight: "1.1", margin: "0 0 0.8vh 0", color: theme.text };
  const descriptionStyle = { fontSize: "clamp(0.85rem, 1.7vw, 1rem)", color: theme.textSecondary, margin: "0 auto", maxWidth: "90%", lineHeight: "1.3", fontWeight: theme.font.semibold };
  const animationContainerStyle = { width: "100%", maxWidth: "380px", height: "clamp(200px, 38vh, 340px)", display: "flex", alignItems: "center", justifyContent: "center" };
  const imageStyle = { width: "100%", height: "100%", objectFit: "contain" };
  const buttonsWrapperStyle = { width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1vh" };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={indicatorWrapperStyle}></div>
        <h2 style={titleStyle}>{t("allowLocation")}</h2>
        <p style={descriptionStyle}>
          {t("locationDesc")}
        </p>
      </div>

      <div style={animationContainerStyle}>
        <img src={gpsSvg} alt="GPS Navigation" style={imageStyle} />
      </div>

      <div style={buttonsWrapperStyle}>
        <UButton onClick={handleAllowLocation} full size="lg">
          <Navigation size={18} style={{ transform: "rotate(45deg)" }} />
          {t("allowLocation")}
        </UButton>

        <UButton onClick={onNext} variant="ghost" full>
          {t("notNow")}
        </UButton>
      </div>
    </div>
  );
};
