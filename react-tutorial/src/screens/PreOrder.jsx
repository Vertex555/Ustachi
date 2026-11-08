import React, { useState, useEffect } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { YandexMap } from "../components/YandexMap";
import { isGuestPhone, formatPrice } from "../utils/display";

export const PreOrder = ({ master, userLocation, orderDetails, onBack, onOrderNow, onCardPay, onOpenCards }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("master_pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [cards, setCards] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    if (paymentMethod === "card") {
      fetch(apiUrl("/api/cards"), { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          const list = Array.isArray(d.data) ? d.data : [];
          setCards(list);
          setSelectedCard((prev) => prev || list.find((c) => c.isDefault)?.id || list[0]?.id || null);
        })
        .catch(() => setCards([]));
    }
  }, [paymentMethod]);

  const userLat = userLocation?.lat || 41.311081;
  const userLng = userLocation?.lng || 69.240562;
  const masterLat = master?.lat || 41.28;
  const masterLng = master?.lng || 69.22;

  const price = master?.price || 0;
  const commission = Math.round(price * 0.07);
  const deliveryFee = deliveryMethod === "master_pickup" ? 20000 : 0;
  const total = price + commission + deliveryFee;

  const formatPhoneNumber = (phoneStr) => {
    if (!phoneStr) return "";
    const cleaned = ("" + phoneStr).replace(/\D/g, "");
    const match = cleaned.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/);
    if (match) return `+998 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
    return phoneStr;
  };

  const masterPhone = formatPhoneNumber(isGuestPhone(master?.phone || master?.phoneNumber) ? "" : (master?.phone || master?.phoneNumber));

  // Click / Payme uchun to'lov sahifasini yangi tabda ochish
  const openGatewayLink = async (created, method) => {
    const oid = created?.id || created?._id;
    if (!oid) return;
    try {
      const res = await fetch(apiUrl(`/api/payments/orders/${oid}/${method}/link`), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data && data.data.url) {
        window.open(data.data.url, "_blank", "noopener,noreferrer");
      } else {
        setError((data && data.message) || t("paymentFailed"));
      }
    } catch {
      setError(t("paymentFailed"));
    }
  };

  const handleConfirmOrder = async () => {
    if (!onOrderNow || isCreating) return;
    if (paymentMethod === "card" && !selectedCard) {
      setError(t("chooseCardFirst"));
      return;
    }
    setIsCreating(true);
    setError("");

    try {
      const form = new FormData();
      form.append("masterId", master.id);
      form.append("device", orderDetails?.device || "");
      form.append("deviceModel", orderDetails?.deviceModel || "");
      form.append("issue", orderDetails?.issue || "");
      form.append("description", orderDetails?.description || "");
      form.append("comment", comment);
      form.append("deliveryMethod", deliveryMethod);
      form.append("paymentMethod", paymentMethod);
      if (userLocation?.lat) {
        form.append("userLocation", JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng }));
      }
      Object.keys(orderDetails?.images || {}).forEach((key) => {
        const item = orderDetails.images[key];
        if (item && item.file) form.append("photos", item.file);
      });

      const response = await fetch(apiUrl("/api/orders"), {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Buyurtma yaratishda xatolik yuz berdi");
      }
      const created = data.data || data;

      // Onlayn to'lov usuli tanlangan bo'lsa — to'lov darhol amalga oshiriladi
      if (paymentMethod === "card" && typeof onCardPay === "function") {
        onCardPay(created, "card", selectedCard);
        return;
      }
      if (paymentMethod === "click" || paymentMethod === "payme") {
        await openGatewayLink(created, paymentMethod);
      }
      onOrderNow(created);
    } catch (err) {
      setError(err.message || "Buyurtma yaratishda xatolik yuz berdi");
    } finally {
      setIsCreating(false);
    }
  };

  const optionCard = (selected, onClick, title, desc, iconUrl) => (
    <button
      onClick={onClick}
      className="custom-btn"
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: theme.radius.md,
        border: selected ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
        backgroundColor: selected ? theme.primaryLight : theme.surface,
        color: theme.text,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      {typeof iconUrl === "string" && iconUrl && <img src={iconUrl} width="20" height="20" alt="" style={{ flexShrink: 0 }} />}
      {typeof iconUrl !== "string" && iconUrl}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ fontSize: theme.font.sm, fontWeight: "800", color: selected ? theme.primaryDark : theme.text }}>{title}</span>
        <span style={{ fontSize: theme.font.xs, color: theme.textSecondary, marginTop: "2px" }}>{desc}</span>
      </div>
      {selected && (
        <img src="https://api.iconify.design/lucide:check-circle.svg?color=%2316a34a" width="18" height="18" alt="" />
      )}
    </button>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "100vh", backgroundColor: theme.bg }}>
      <div style={{
        display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", maxWidth: "100%",
        backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box",
        position: "relative", boxShadow: "0 0 20px rgba(0,0,0,0.1)"
      }}>
        <style>{`.custom-btn:active { transform: scale(0.98); }`}</style>

        {/* XARITA: yuqorida qattiq balandlikda — user (qizil) + usta (yashil) markerlar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px 16px 0 16px" }}>
          <button onClick={onBack} className="custom-btn" aria-label={t("back")}
            style={{ alignSelf: "flex-start", backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: theme.text, fontSize: "18px", fontWeight: "bold", boxShadow: theme.shadowMd }}>
            <img src={`https://api.iconify.design/lucide:chevron-left.svg?color=${encodeURIComponent(theme.text)}`} width="18" height="18" alt="" />
          </button>
          <div style={{ borderRadius: theme.radius.lg, overflow: "hidden", border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm }}>
            <YandexMap
              center={{ lat: (userLat + masterLat) / 2, lng: (userLng + masterLng) / 2 }}
              zoom={13}
              height={200}
              markers={[
                { lat: userLat, lng: userLng, color: "rd" },
                { lat: masterLat, lng: masterLng, color: "gn" },
              ]}
            />
          </div>
          <div style={{ display: "flex", gap: "16px", padding: "0 4px", fontSize: theme.font.xs, fontWeight: "700", color: theme.textSecondary }}>
            <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: theme.error, marginRight: "6px" }}></span>{t("yourLocation")}</span>
            <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: theme.success, marginRight: "6px" }}></span>{t("masterLocation")}</span>
          </div>
        </div>

        <div style={{ backgroundColor: theme.bg, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "20px 16px 24px 16px", display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
          <div style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "16px", boxShadow: theme.shadowSm, display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold" }}>
                  {master?.name ? master.name.charAt(0) : "A"}
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{master?.name || ""}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", flexWrap: "wrap" }}>
                    <span style={{ color: theme.warning, fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="13" height="13" alt="" />{master?.rating || "0"}</span>
                    <span style={{ color: theme.textSecondary }}>({master?.reviewsCount || "0"})</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: theme.textSecondary, display: "block" }}>{t("experience")}</span>
                <span style={{ fontSize: "13px", fontWeight: "800", color: theme.primary }}>{master?.experience || ""}</span>
              </div>
            </div>
            {masterPhone && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid ${theme.border}`, paddingTop: "10px", fontSize: "13px", color: theme.text }}>
                <img src="https://api.iconify.design/lucide:phone.svg?color=%232e7d32" alt="phone" width="16" height="16" />
                <span style={{ fontWeight: "600", color: theme.text }}>{masterPhone}</span>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: theme.shadowSm }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "12px", color: theme.textSecondary, display: "block", marginBottom: "2px" }}>{t("price")}</span>
                <span style={{ fontSize: "20px", fontWeight: "900", color: theme.text }}>{formatPrice(price, master?.currency)}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "12px", color: theme.primary, fontWeight: "700" }}>+{deliveryFee.toLocaleString()} so'm</span>
                <span style={{ fontSize: "10px", color: theme.textSecondary, display: "block" }}>{deliveryMethod === "master_pickup" ? t("deliveryFee") : ""}</span>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: "800", color: theme.text }}>{t("total")}</span>
              <span style={{ fontSize: "16px", fontWeight: "900", color: theme.primary }}>{total.toLocaleString()} so'm</span>
            </div>
          </div>

          <div style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "14px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: theme.shadowSm }}>
            <span style={{ fontSize: "13px", fontWeight: "800", color: theme.text }}>{t("deliveryOption")}</span>
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              {optionCard(deliveryMethod === "master_pickup", () => setDeliveryMethod("master_pickup"), t("pickupByMaster"), t("pickupByMasterDesc"), "https://api.iconify.design/lucide:truck.svg?color=%232e7d32")}
              {optionCard(deliveryMethod === "self_dropoff", () => setDeliveryMethod("self_dropoff"), t("selfDropoff"), t("selfDropoffDesc"), "https://api.iconify.design/lucide:store.svg?color=%232e7d32")}
            </div>

            <span style={{ fontSize: "13px", fontWeight: "800", color: theme.text, marginTop: "6px" }}>{t("paymentMethod")}</span>
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              {optionCard(paymentMethod === "cash_on_delivery", () => setPaymentMethod("cash_on_delivery"), t("cashOnDelivery"), t("cashOnDesc"), <img src="https://api.iconify.design/lucide:banknote.svg?color=%232e7d32" alt="" width="20" height="20" />)}
              {optionCard(paymentMethod === "payme", () => setPaymentMethod("payme"), t("payme"), t("paymeDesc"), <span style={{ fontSize: "14px", fontWeight: "900", color: "#3f96d8" }}>Payme</span>)}
              {optionCard(paymentMethod === "click", () => setPaymentMethod("click"), t("click"), t("clickDesc"), <span style={{ fontSize: "14px", fontWeight: "900", color: "#1f9e5e" }}>Click</span>)}
            </div>

            {paymentMethod === "card" && (
              <div style={{ backgroundColor: theme.primaryLight, border: `1.5px solid ${theme.success}`, borderRadius: theme.radius.md, padding: "14px", display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: theme.success, display: "flex", alignItems: "center", gap: "5px" }}>
                  <img src="https://api.iconify.design/lucide:credit-card.svg?color=%2316a34a" width="15" height="15" alt="" />{t("chooseCard")}
                </span>
                {cards === null && <span style={{ fontSize: "12px", color: theme.textSecondary }}>{t("loading")}...</span>}
                {cards && cards.length === 0 && (
                  <div style={{ fontSize: "12px", color: theme.textSecondary, lineHeight: "1.5" }}>
                    {t("noCardsHint")}
                    <button onClick={onOpenCards} style={{ display: "block", marginTop: "8px", padding: "9px 12px", borderRadius: theme.radius.md, border: `1px solid ${theme.primary}`, backgroundColor: theme.bgSecondary, color: theme.primary, fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
                      + {t("addCard")}
                    </button>
                  </div>
                )}
                {cards && cards.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {cards.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCard(c.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "10px 12px", borderRadius: theme.radius.md, cursor: "pointer", textAlign: "left",
                          border: selectedCard === c.id ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                          backgroundColor: theme.surface,
                          boxShadow: selectedCard === c.id ? theme.shadowSm : "none",
                        }}
                      >
                        <span style={{
                          width: "36px", height: "24px", borderRadius: "5px", flexShrink: 0,
                          backgroundColor: c.brand === "mastercard" ? "#EB001B" : c.brand === "visa" ? "#1A1F71" : "#5B21B6",
                        }}>
                          <span style={{ display: "block", width: "14px", height: "24px", borderRadius: "5px", backgroundColor: c.brand === "mastercard" ? "#F79E1B" : "transparent", marginLeft: "16px", opacity: 0.9 }} />
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "800", color: theme.text, textTransform: "uppercase" }}>{c.brand}</span>
                        <span style={{ fontSize: "13px", color: theme.textSecondary, fontVariantNumeric: "tabular-nums" }}>•••• {c.last4}</span>
                        <span style={{ fontSize: "11px", color: theme.textTertiary }}>{c.expMonth}/{c.expYear}</span>
                        {c.isDefault && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: theme.radius.full, backgroundColor: theme.primaryLight, color: theme.primary, fontWeight: "bold", marginLeft: "auto" }}>{t("default")}</span>}
                      </button>
                    ))}
                    <button onClick={onOpenCards} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "8px", borderRadius: theme.radius.md, border: `1px dashed ${theme.primary}`, backgroundColor: "transparent", color: theme.primary, fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
                      + {t("addCard")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <input name="orderComment" type="text" placeholder={t("fieldRequired")} value={comment} onChange={(e) => setComment(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, fontSize: "12px", outline: "none", boxSizing: "border-box", backgroundColor: theme.surface, color: theme.text }} />

          {error && <p style={{ color: theme.error, fontSize: "12px", fontWeight: "700", margin: 0, textAlign: "center" }}>{error}</p>}

          <button onClick={handleConfirmOrder} disabled={isCreating} className="custom-btn"
            style={{
              width: "100%", backgroundColor: theme.primary, color: theme.textInverse, fontWeight: "bold", fontSize: "15px", padding: "16px",
              borderRadius: "14px", border: "none", cursor: isCreating ? "wait" : "pointer", boxShadow: theme.shadowMd,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: isCreating ? 0.75 : 1,
            }}>
            <img src="https://api.iconify.design/lucide:shopping-cart.svg?color=%23ffffff" alt="cart" width="18" height="18" />
            {isCreating ? t("loading") : t("orderNow")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreOrder;


