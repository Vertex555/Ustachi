import React, { useState, useEffect } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

export const CheckTypeFixer = ({ onSaveProfile, onChangeRole }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [masterName, setMasterName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+998 ");
  const [experience, setExperience] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [price, setPrice] = useState("");
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");
  const [bankCard, setBankCard] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [location, setLocation] = useState({ lat: 41.311081, lng: 69.240562, address: "Toshkent shahar" });
  const [isLocating, setIsLocating] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [savedData, setSavedData] = useState(null);

  const availableDevices = [
    { id: "Smartfon", name: "Smartfon", icon: "https://api.iconify.design/lucide:smartphone.svg?color=%232e7d32" },
    { id: "Noutbuk", name: "Noutbuk", icon: "https://api.iconify.design/lucide:laptop.svg?color=%232e7d32" },
    { id: "Planshet", name: "Planshet", icon: "https://api.iconify.design/lucide:tablet.svg?color=%232e7d32" },
    { id: "Soat", name: "Smart-soat", icon: "https://api.iconify.design/lucide:watch.svg?color=%232e7d32" },
    { id: "TV", name: "Televizor", icon: "https://api.iconify.design/lucide:tv.svg?color=%232e7d32" },
    { id: "Dazmol", name: "Dazmol", icon: "https://api.iconify.design/lucide:shirt.svg?color=%232e7d32" },
    { id: "Changyutgich", name: "Changyutgich", icon: "https://api.iconify.design/lucide:wind.svg?color=%232e7d32" },
    { id: "Fen", name: "Soch feni", icon: "https://api.iconify.design/lucide:zap.svg?color=%232e7d32" },
    { id: "Mikrotolqin", name: "Mikrotolqinli pech", icon: "https://api.iconify.design/lucide:box.svg?color=%232e7d32" },
    { id: "Muzlatgich", name: "Muzlatgich", icon: "https://api.iconify.design/lucide:archive.svg?color=%232e7d32" },
    { id: "Kir yuvish", name: "Kir mashina", icon: "https://api.iconify.design/lucide:refresh-cw.svg?color=%232e7d32" },
    { id: "Konditsioner", name: "Konditsioner", icon: "https://api.iconify.design/lucide:snowflake.svg?color=%232e7d32" },
  ];

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, "");
    let rawNumber = numbers.startsWith("998") ? numbers.slice(3) : numbers;
    rawNumber = rawNumber.slice(0, 9);

    let formatted = "+998";
    if (rawNumber.length > 0) formatted += " (" + rawNumber.slice(0, 2);
    if (rawNumber.length >= 2) formatted += ") ";
    if (rawNumber.length > 2) formatted += rawNumber.slice(2, 5);
    if (rawNumber.length > 5) formatted += "-" + rawNumber.slice(5, 7);
    if (rawNumber.length > 7) formatted += "-" + rawNumber.slice(7, 9);

    return formatted;
  };

  const handlePhoneChange = (e) => {
    const inputVal = e.target.value;
    if (inputVal.length <= 4) {
      setPhoneNumber("+998 ");
      return;
    }
    const formatted = formatPhoneNumber(inputVal);
    setPhoneNumber(formatted);
    if (errors.phone) setErrors({ ...errors, phone: false });
  };

  const formatCard = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleCardChange = (e) => {
    setBankCard(formatCard(e.target.value));
  };

  const formatTime = (value) => {
    let d = value.replace(/\D/g, "").slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + ":" + d.slice(2);
    return d;
  };

  const handleWorkStartChange = (e) => {
    setWorkStart(formatTime(e.target.value));
    if (errors.hours) setErrors({ ...errors, hours: false });
  };

  const handleWorkEndChange = (e) => {
    setWorkEnd(formatTime(e.target.value));
    if (errors.hours) setErrors({ ...errors, hours: false });
  };

  const handlePriceChange = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v === "") { setPrice(""); return; }
    let n = parseInt(v, 10);
    if (Number.isNaN(n)) n = 0;
    if (n > 1000000000) n = 1000000000;
    setPrice(String(n));
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/masters/me"), { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const m = data.data;
          setMasterName(m.name || "");
          setPhoneNumber(m.phone ? formatPhoneNumber(m.phone) : "+998 ");
          setExperience(m.experience || "");
          setSelectedDevices(m.devices || []);
          setPrice(m.price ? String(m.price) : "");
          if (m.workingHours) {
            const parts = String(m.workingHours).split("-").map((p) => p.trim());
            if (parts.length > 0) setWorkStart(parts[0] || "");
            if (parts.length > 1) setWorkEnd(parts[1] || "");
          }
          setBankCard(m.bankCard || "");
          setCardholderName(m.cardholderName || "");
          if (m.location) setLocation(m.location);
        }
      } catch {}
    })();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setServerError("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addressName = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocation({ lat, lng, address: addressName });
        } catch (error) {
          setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Lokatsiyani olishda xatolik:", error);
        setServerError("Lokatsiyani aniqlab bo'lmadi. GPS yoqilganligini tekshiring.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const toggleDeviceSelection = (deviceId) => {
    let updated;
    if (selectedDevices.includes(deviceId)) {
      updated = selectedDevices.filter(id => id !== deviceId);
    } else {
      updated = [...selectedDevices, deviceId];
    }
    setSelectedDevices(updated);
    if (updated.length > 0 && errors.devices) {
      setErrors({ ...errors, devices: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    let newErrors = {};
    if (!masterName.trim()) newErrors.name = true;
    if (phoneNumber.length < 19) newErrors.phone = true;
    if (!experience.trim()) newErrors.experience = true;
    if (selectedDevices.length === 0) newErrors.devices = true;
    if (bankCard && bankCard.replace(/\s/g, "").length !== 16) newErrors.card = true;
    if ((workStart || workEnd) && !(/^([01]\d|2[0-3]):[0-5]\d$/.test(workStart) && /^([01]\d|2[0-3]):[0-5]\d$/.test(workEnd))) newErrors.hours = true;
    if (price && (Number(price) < 0 || Number(price) > 1000000000)) newErrors.priceRange = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setServerError("Iltimos, barcha majburiy maydonlarni to'g'ri va to'liq to'ldiring!");
      return;
    }

    const masterData = {
      name: masterName.trim(),
      phone: phoneNumber,
      experience: experience.trim(),
      devices: selectedDevices,
      price: price ? Number(price) : 0,
      workingHours: (workStart || workEnd) ? `${workStart} - ${workEnd}` : "",
      bankCard: bankCard.replace(/\s/g, ""),
      cardholderName: cardholderName.trim(),
      location: { 
        lat: location.lat, 
        lng: location.lng, 
        address: location.address 
      },
    };

    try {
      const response = await fetch(apiUrl("/api/masters"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(masterData),
      });

      const data = await response.json();
      if (response.ok) {
        setServerError("");
        setSavedData(data);
        setIsSuccessModalOpen(true);
      } else {
        setServerError(data.error || data.message || "Ma'lumotni saqlashda xatolik yuz berdi.");
      }
    } catch (error) {
      console.error("Server bilan ulanishda xatolik:", error);
      setServerError("Server bilan ulanib bo'lmadi. Backend ishlayotganini tekshiring.");
    }
  };

  const handleSuccessModalOk = () => {
    setIsSuccessModalOpen(false);
    setMasterName("");
    setPhoneNumber("+998 ");
    setExperience("");
    setSelectedDevices([]);
    setErrors({});
    
    if (onSaveProfile && savedData) {
      onSaveProfile(savedData);
    }
  };

  const cardStyle = {
    backgroundColor: theme.surface,
    padding: "14px",
    borderRadius: "14px",
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "700",
    color: theme.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
      width: "100%",
      padding: "16px",
      backgroundColor: theme.bgSecondary,
      color: theme.text,
      fontFamily: theme.font.family,
      boxSizing: "border-box",
      position: "relative"
    }}>
      <style>{`
        .custom-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid ${theme.border};
          font-size: 13px;
          font-weight: 500;
          color: ${theme.text};
          outline: none;
          background-color: ${theme.surface};
          transition: all ${theme.transition.normal};
          box-sizing: border-box;
        }
        .custom-input:focus {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 3px ${theme.primaryLight};
        }
        .input-error {
          border-color: ${theme.error} !important;
          background-color: ${theme.surface} !important;
        }
        .input-error:focus {
          box-shadow: 0 0 0 3px ${theme.errorLight} !important;
        }
        .custom-btn {
          transition: all 0.2s ease;
        }
        .custom-btn:active {
          transform: scale(0.98);
        }
        .devices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
          gap: 8px;
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "14px" }}>

        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "6px", 
          backgroundColor: theme.surface,
          padding: "16px",
          borderRadius: "14px",
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadowSm,
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ 
                backgroundColor: theme.primary, 
                width: "40px", 
                height: "40px", 
                borderRadius: "12px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                flexShrink: 0,
                boxShadow: `0 4px 12px ${theme.primaryLight}` 
              }}>
                <img src="https://api.iconify.design/lucide:hard-hat.svg?color=%23ffffff" alt="logo" width="22" height="22" />
              </div>
              <div>
                <h1 style={{ fontSize: "17px", fontWeight: "700", color: theme.text, letterSpacing: "-0.3px", margin: 0 }}>{t("cf_title")}</h1>
              </div>
            </div>

            {onChangeRole && (
              <button
                type="button"
                onClick={onChangeRole}
                className="custom-btn"
                style={{
                  backgroundColor: theme.successLight,
                  border: `1px solid ${theme.success}`,
                  color: theme.success,
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap"
                }}
              >
                <img src="https://api.iconify.design/lucide:repeat.svg?color=%2316a34a" width="13" height="13" alt="" />
                <span>{t("cf_changeRole")}</span>
              </button>
            )}
          </div>
          <p style={{ fontSize: "12px", color: theme.textTertiary, margin: 0, fontWeight: "400" }}>{t("cf_headerDesc")}</p>
        </div>

        {serverError && (
          <div style={{
            backgroundColor: theme.errorLight,
            border: `1px solid ${theme.error}`,
            color: theme.error,
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxSizing: "border-box"
          }}>
            <img src="https://api.iconify.design/lucide:alert-triangle.svg?color=%23dc2626" width="16" height="16" alt="" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "30px", width: "100%", boxSizing: "border-box" }}>

          <div style={{ ...cardStyle, border: errors.name ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.name ? theme.error : theme.textSecondary }}>
              <img src={errors.name ? "https://api.iconify.design/lucide:user.svg?color=%23ef4444" : "https://api.iconify.design/lucide:user.svg?color=%232e7d32"} width="15" height="15" alt="" />
              {t("cf_fullName")} <span style={{ color: theme.error }}>*</span>
            </label>
            <input 
              type="text" 
              placeholder={t("cf_namePlaceholder")} 
              value={masterName}
              onChange={(e) => {
                setMasterName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: false });
              }}
              className={`custom-input ${errors.name ? "input-error" : ""}`}
            />
          </div>

          <div style={{ ...cardStyle, border: errors.phone ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.phone ? theme.error : theme.textSecondary }}>
              <img src={errors.phone ? "https://api.iconify.design/lucide:phone.svg?color=%23ef4444" : "https://api.iconify.design/lucide:phone.svg?color=%232e7d32"} width="15" height="15" alt="" />
              {t("cf_phone")} <span style={{ color: theme.error }}>*</span>
            </label>
            <input 
              type="tel" 
              placeholder="+998 (90) 123-45-67" 
              value={phoneNumber}
              onChange={handlePhoneChange}
              className={`custom-input ${errors.phone ? "input-error" : ""}`}
              style={{ letterSpacing: "0.5px", fontWeight: "600" }}
            />
          </div>

          <div style={{ ...cardStyle, border: errors.experience ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.experience ? theme.error : theme.textSecondary }}>
              <img src={errors.experience ? "https://api.iconify.design/lucide:briefcase.svg?color=%23ef4444" : "https://api.iconify.design/lucide:briefcase.svg?color=%232e7d32"} width="15" height="15" alt="" />
              {t("cf_experience")} <span style={{ color: theme.error }}>*</span>
            </label>
            <input 
              type="text" 
              placeholder={t("cf_expPlaceholder")} 
              value={experience}
              onChange={(e) => {
                setExperience(e.target.value);
                if (errors.experience) setErrors({ ...errors, experience: false });
              }}
              className={`custom-input ${errors.experience ? "input-error" : ""}`}
            />
          </div>

          <div style={{ ...cardStyle, border: errors.priceRange ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.priceRange ? theme.error : theme.textSecondary }}>
              <img src="https://api.iconify.design/lucide:banknote.svg?color=%232e7d32" width="15" height="15" alt="" />
              {t("cf_price")} <span style={{ fontWeight: "700", color: "#059669", fontSize: "12px" }}>so'm</span>
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input type="number" inputMode="numeric" placeholder={t("cf_pricePlaceholder")} min="0" max="1000000000" value={price} onChange={handlePriceChange} className="custom-input" style={{ paddingRight: "52px" }} />
              <span style={{ position: "absolute", right: "14px", color: theme.textSecondary, fontSize: "13px", fontWeight: "700", pointerEvents: "none" }}>so'm</span>
            </div>
            {errors.priceRange && <span style={{ fontSize: "11px", color: theme.error, fontWeight: "bold" }}>{t("cf_priceError")}</span>}
          </div>

          <div style={{ ...cardStyle, border: errors.hours ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.hours ? theme.error : theme.textSecondary }}>
              <img src="https://api.iconify.design/lucide:clock.svg?color=%232e7d32" width="15" height="15" alt="" />
              {t("cf_workingHours")}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="text" inputMode="numeric" placeholder={t("cf_hoursStart")} value={workStart} onChange={handleWorkStartChange} className="custom-input" style={{ textAlign: "center" }} />
              <span style={{ color: theme.textSecondary, fontWeight: "800" }}>-</span>
              <input type="text" inputMode="numeric" placeholder={t("cf_hoursEnd")} value={workEnd} onChange={handleWorkEndChange} className="custom-input" style={{ textAlign: "center" }} />
            </div>
            {errors.hours && <span style={{ fontSize: "11px", color: theme.error, fontWeight: "bold" }}>{t("cf_hoursError")}</span>}
          </div>

          <div style={{ ...cardStyle, border: errors.card ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.card ? theme.error : theme.textSecondary }}>
              <img src="https://api.iconify.design/lucide:credit-card.svg?color=%232e7d32" width="15" height="15" alt="" />
              {t("cf_bankCard")}
            </label>
            <input type="text" inputMode="numeric" maxLength={19} placeholder={t("cf_cardPlaceholder")} value={bankCard} onChange={handleCardChange} className="custom-input" />
            {errors.card && <span style={{ fontSize: "11px", color: theme.error, fontWeight: "bold" }}>{t("cf_cardError")}</span>}
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>
              <img src="https://api.iconify.design/lucide:user.svg?color=%232e7d32" width="15" height="15" alt="" />
              {t("cf_cardholder")}
            </label>
            <input type="text" placeholder={t("cf_cardholderPlaceholder")} value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} className="custom-input" />
          </div>

          <div style={{ ...cardStyle, border: errors.devices ? `1.5px solid ${theme.error}` : `1px solid ${theme.border}` }}>
            <label style={{ ...labelStyle, color: errors.devices ? theme.error : theme.textSecondary, marginBottom: "10px" }}>
              <img src={errors.devices ? "https://api.iconify.design/lucide:wrench.svg?color=%23ef4444" : "https://api.iconify.design/lucide:wrench.svg?color=%232e7d32"} width="15" height="15" alt="" />
              {t("cf_deviceSelect")} <span style={{ color: theme.error }}>*</span>
            </label>
            <div className="devices-grid">
              {availableDevices.map((dev) => {
                const isSelected = selectedDevices.includes(dev.id);
                return (
                  <button
                    type="button"
                    key={dev.id}
                    onClick={() => toggleDeviceSelection(dev.id)}
                    style={{
                      padding: "9px 10px",
                      borderRadius: "10px",
                      border: isSelected ? `2px solid ${theme.primary}` : errors.devices ? `1px solid ${theme.error}` : `1px solid ${theme.border}`,
                      backgroundColor: isSelected ? theme.successLight : errors.devices ? theme.errorLight : theme.bgSecondary,
                      color: isSelected ? theme.success : theme.textSecondary,
                      fontWeight: "600",
                      fontSize: "11px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxSizing: "border-box",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <img src={dev.icon} width="14" height="14" alt="" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dev.name}</span>
                    </div>
                    {isSelected ? (
                      <img src="https://api.iconify.design/lucide:check-circle.svg?color=%2316a34a" width="14" height="14" alt="selected" style={{ flexShrink: 0 }} />
                    ) : (
                      <img src="https://api.iconify.design/lucide:plus-circle.svg?color=%2394a3b8" width="14" height="14" alt="unselected" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={labelStyle}>
                <img src="https://api.iconify.design/lucide:map-pin.svg?color=%232e7d32" width="15" height="15" alt="" />
                {t("cf_location")}
              </label>
              
              <button 
                type="button"
                onClick={detectLocation}
                disabled={isLocating}
                style={{ background: "none", border: "none", color: theme.secondary, fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <img src="https://api.iconify.design/lucide:rotate-cw.svg?color=%232563eb" width="13" height="13" alt="" />
                {isLocating ? t("cf_locating") : t("cf_refresh")}
              </button>
            </div>

            <div style={{ width: "100%", height: "160px", borderRadius: "10px", overflow: "hidden", border: `1px solid ${theme.border}`, boxSizing: "border-box" }}>
              <iframe 
                title="Yandex Map"
                src={`https://yandex.uz/map-widget/v1/?ll=${location.lng}%2C${location.lat}&z=15&pt=${location.lng}%2C${location.lat},pm2rdm`}
                width="100%" 
                height="100%" 
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>

            <div style={{ padding: "10px 12px", backgroundColor: theme.bgSecondary, borderRadius: "10px", border: `1px solid ${theme.border}`, fontSize: "12px", color: theme.textSecondary, display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box" }}>
              <img src="https://api.iconify.design/lucide:map-pin.svg?color=%232563eb" width="14" height="14" alt="" />
              <span style={{ wordBreak: "break-all", fontWeight: "500" }}>{location.address}</span>
            </div>
          </div>

          <button
            type="submit"
            className="custom-btn"
            style={{
              width: "100%",
              backgroundColor: theme.primary,
              color: theme.textInverse,
              fontWeight: "700",
              fontSize: "14px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 14px ${theme.primaryLight}`,
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxSizing: "border-box"
            }}
          >
            <span>{t("cf_saveAndStart")}</span>
            <img src="https://api.iconify.design/lucide:arrow-right.svg?color=%23ffffff" width="16" height="16" alt="" />
          </button>

        </form>
      </div>

      {isSuccessModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px",
          boxSizing: "border-box"
        }}>
          <div style={{
            backgroundColor: theme.surface,
            padding: "24px",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "340px",
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            boxSizing: "border-box"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: theme.successLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${theme.success}`
            }}>
              <img src="https://api.iconify.design/lucide:check.svg?color=%2316a34a" width="28" height="28" alt="" />
            </div>

            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: theme.text, margin: "0 0 6px 0" }}>{t("cf_savedTitle")}</h3>
              <p style={{ fontSize: "13px", color: theme.textTertiary, margin: 0, fontWeight: "400" }}>{t("cf_savedDesc")}</p>
            </div>

            <button
              type="button"
              onClick={handleSuccessModalOk}
              className="custom-btn"
              style={{
                width: "100%",
                backgroundColor: theme.primary,
                color: theme.textInverse,
                fontWeight: "700",
                fontSize: "14px",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                marginTop: "6px",
                boxShadow: `0 4px 12px ${theme.primaryLight}`
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
