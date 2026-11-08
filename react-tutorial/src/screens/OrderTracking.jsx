import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { attachSocket } from "../services/socket";
import { YandexMap } from "../components/YandexMap";
import { displayName, isGuestPhone } from "../utils/display";

const STATUS_STEPS = [
  { key: "placed", i18n: "statusPlaced" },
  { key: "accepted", i18n: "statusAccepted" },
  { key: "in_progress", i18n: "statusInProgress" },
  { key: "ready", i18n: "statusReady" },
  { key: "completed", i18n: "statusCompleted" },
];

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export const OrderTracking = ({ orderData, orderId: orderIdProp, onBack, onOpenChat, viewerRole }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [live, setLive] = useState(null);
  const [status, setStatus] = useState(orderData?.status || "placed");
  const [liveLoc, setLiveLoc] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingMsg, setRatingMsg] = useState("");
  const [rated, setRated] = useState(false);
  const [payState, setPayState] = useState({ busy: false, msg: "" });

  const orderId = orderData?.id || orderIdProp;

  const { data: fetched, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await fetch(apiUrl(`/api/orders/${orderId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.data) return data.data;
      return null;
    },
    enabled: !!orderId,
  });

  useEffect(() => {
    if (fetched) {
      setLive(fetched);
      setStatus(fetched.status);
      setRated((fetched.rating || 0) > 0);
    }
  }, [fetched]);

  // Real-time: status + jonli lokatsiya
  useEffect(() => {
    const { detach } = attachSocket({
      onOrderUpdate: (p) => {
        if (p.order?.id === orderId) {
          setLive(p.order);
          setStatus(p.order.status);
          setRated((p.order.rating || 0) > 0);
        }
      },
      onLiveLocation: (p) => {
        if (p.orderId === orderId) setLiveLoc({ lat: p.lat, lng: p.lng, by: p.by });
      },
    });
    return detach;
  }, [orderId]);

  const current = live || orderData || {};
  const master = current.master || {};
  const peerUserPhone = current.user?.phone || "";
  const userOrdersUserId = current.user?.id || "";

  const isMasterViewer = viewerRole === "master";

  // Chat ochish — ro'li bo'yicha thread topib/yangi ochib
  const openChatWithMaster = async () => {
    if (isMasterViewer) {
      // Usta — buyurtma egasi (user) bilan gaplashadi
      const userId = current.user?.id || userOrdersUserId;
      if (!userId) return;
      try {
        const res = await fetch(apiUrl(`/api/chat/open/user/${userId}`), { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          onOpenChat({ chatId: data.data.id, peerName: displayName(current.user?.name, peerUserPhone) || t("user") });
        }
      } catch {}
      return;
    }
    const masterId = master.id || master._id;
    if (!masterId) return;
    try {
      const res = await fetch(apiUrl(`/api/chat/open/master/${masterId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        onOpenChat({ chatId: data.data.id, peerName: master?.name || t("master") });
      }
    } catch {}
  };

  const payNow = async () => {
    if (!orderId || payState.busy) return;
    setPayState({ busy: true, msg: "" });

    // Click / Payme — to'lov sahifasini ochamiz, chek chek daftari kutilmaydi
    const pm = current.paymentMethod;
    if (pm === "click" || pm === "payme") {
      try {
        const res = await fetch(apiUrl(`/api/payments/orders/${orderId}/${pm}/link`), {
          method: "POST",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data && data.data.url) {
          window.open(data.data.url, "_blank", "noopener,noreferrer");
          setPayState({ busy: false, msg: "" });
        } else {
          setPayState({ busy: false, msg: (data && data.message) || t("paymentFailed") });
        }
      } catch {
        setPayState({ busy: false, msg: t("unknownError") });
      }
      return;
    }

    const method = "card";
    let cardId = (current.payment && current.payment.cardId) || "";
    if (method === "card" && !cardId) {
      try {
        const cr = await fetch(apiUrl("/api/cards"), { headers: authHeaders() });
        const cd = await cr.json();
        const list = cd && cd.success && Array.isArray(cd.data) ? cd.data : [];
        const def = list.find((c) => c.isDefault) || list[0];
        cardId = def ? def.id : "";
      } catch {}
      if (!cardId) {
        setPayState({ busy: false, msg: t("chooseCardFirst") });
        return;
      }
    }
    try {
      const res = await fetch(apiUrl(`/api/payments/orders/${orderId}/pay`), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ method, cardId }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data && data.data.order) {
        setLive(data.data.order);
        setStatus(data.data.order.status);
        setPayState({ busy: false, msg: t("paid") });
        await refetch();
      } else {
        setPayState({ busy: false, msg: (data && data.message) || t("paymentFailed") });
      }
    } catch {
      setPayState({ busy: false, msg: t("unknownError") });
    }
  };

  const submitRating = async () => {
    if (!rating) { setRatingMsg(t("fieldRequired")); return; }
    setRatingMsg("");
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/rate`), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rating, review }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      setRated(true);
      setRatingMsg(t("success"));
      await refetch();
    } catch (err) {
      setRatingMsg(err.message || t("unknownError"));
    }
  };

  const orderStatus = status || "placed";
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === orderStatus);
  const isRejected = orderStatus === "rejected";

  const placedAt = current.createdAt ? formatDateTime(current.createdAt) : null;
  const updatedAt = current.updatedAt ? formatDateTime(current.updatedAt) : null;
  const orderNumber = current.orderNumber || orderData?.orderNumber || (orderData?.orderId ? `#${orderData.orderId}` : "");

  const masterLat = liveLoc ? liveLoc.lat : (current.masterLocation?.lat ?? (master?.lat || 41.311081));
  const masterLng = liveLoc ? liveLoc.lng : (current.masterLocation?.lng ?? (master?.lng || 69.240562));
  const userLat = current.location?.lat || 41.311081;
  const userLng = current.location?.lng || 69.240562;

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "100vh", backgroundColor: theme.bg }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", maxWidth: "100%", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box", padding: "24px 20px", position: "relative", boxShadow: "0 0 20px rgba(0,0,0,0.05)" }}>
        <style>{`.custom-btn:active { transform: scale(0.98); }`}</style>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <button onClick={onBack} className="custom-btn" aria-label={t("back")}
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: theme.text, fontSize: "18px", fontWeight: "bold", boxShadow: theme.shadowSm }}><img src={`https://api.iconify.design/lucide:chevron-left.svg?color=${encodeURIComponent(theme.text)}`} width="18" height="18" alt="" /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{t("orderTracking")} {orderNumber}</h1>
            <span style={{ fontSize: "12px", color: theme.textSecondary }}>{placedAt ? t("orderPlaced") + " " + placedAt : ""}</span>
          </div>
          {isRejected ? (
            <span style={{ backgroundColor: theme.errorLight, color: theme.error, fontWeight: "800", fontSize: "12px", padding: "6px 12px", borderRadius: "20px", whiteSpace: "nowrap" }}>{t("rejectOrder")}</span>
          ) : (
            <span style={{ backgroundColor: orderStatus === "completed" ? theme.successLight : theme.infoLight, color: orderStatus === "completed" ? theme.success : theme.info, fontWeight: "800", fontSize: "12px", padding: "6px 12px", borderRadius: "20px", whiteSpace: "nowrap" }}>
              {STATUS_STEPS.find((s) => s.key === orderStatus) ? t(STATUS_STEPS.find((s) => s.key === orderStatus).i18n) : t("statusPlaced")}
            </span>
          )}
        </div>

        {isRejected && (
          <div style={{ backgroundColor: theme.errorLight, border: `1px solid ${theme.error}`, color: theme.error, padding: "14px 16px", borderRadius: theme.radius.md, marginBottom: "16px", fontSize: "13px", fontWeight: "600" }}>
            {t("rejectionReason")}: {current.rejectionReason || "—"}
          </div>
        )}

        {/* Xarita: user (qizil) + usta (yashil) markerlari */}
        <div style={{ width: "100%", height: "220px", borderRadius: theme.radius.lg, overflow: "hidden", border: `1px solid ${theme.border}`, marginBottom: "16px", position: "relative" }}>
          <YandexMap
            center={{ lat: (masterLat + userLat) / 2, lng: (masterLng + userLng) / 2 }}
            zoom={14}
            height={220}
            markers={[
              { lat: userLat, lng: userLng, color: "rd" },
              { lat: masterLat, lng: masterLng, color: "gn" },
            ]}
          />
          <div style={{ position: "absolute", bottom: "8px", left: "8px", backgroundColor: theme.mode === "dark" ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.92)", borderRadius: "8px", padding: "6px 10px", fontSize: "10px", fontWeight: "700", color: theme.text, display: "flex", gap: "12px" }}>
            <span><span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#d32f2f", marginRight: "5px" }}></span>{t("yourLocation")}</span>
            <span><span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#2e7d32", marginRight: "5px" }}></span>{t("masterLocation")}</span>
          </div>
          {liveLoc && <div style={{ position: "absolute", top: "8px", right: "8px", backgroundColor: theme.mode === "dark" ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.92)", borderRadius: "8px", padding: "6px 10px", fontSize: "10px", fontWeight: "800", color: theme.text, display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:map-pin.svg?color=${encodeURIComponent(theme.text)}`} width="12" height="12" alt="" />{t("map")}</div>}
        </div>

        {(orderStatus === "accepted" || orderStatus === "in_progress" || orderStatus === "ready") && (
          <a
            href={`https://yandex.com/maps/?rtext=${userLat},${userLng}~${masterLat},${masterLng}&rtt=auto`}
            target="_blank"
            rel="noreferrer"
            className="custom-btn"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px", backgroundColor: theme.primary, color: theme.textInverse, textDecoration: "none", padding: "13px", borderRadius: "12px", fontSize: "13px", fontWeight: "800" }}
          >
            <img src="https://api.iconify.design/lucide:route.svg?color=%23ffffff" alt="" width="18" height="18" />
            {t("up_routeShow")} ➔
          </a>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", margin: "16px 0 24px 0" }}>
          {!isRejected && (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minHeight: "300px", paddingLeft: "8px", position: "relative", marginBottom: "28px" }}>
              <div style={{ position: "absolute", top: "14px", bottom: "14px", left: "21px", width: "2px", backgroundColor: theme.border, zIndex: 0 }}></div>
              {STATUS_STEPS.map((step, index) => {
                const isDone = currentIndex >= index;
                const isCurrent = currentIndex === index;
                const extraTime = index === 0 ? placedAt : index === currentIndex && currentIndex > 0 ? updatedAt : null;
                return (
                  <div key={step.key} style={{ display: "flex", gap: "16px", position: "relative", zIndex: 1, opacity: isDone ? 1 : 0.5, alignItems: "center" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: isDone ? theme.primary : theme.bgTertiary, border: isDone ? "none" : `2px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textInverse, flexShrink: 0, boxShadow: isDone ? theme.shadowSm : "none" }}>
                      {isDone ? <img src="https://api.iconify.design/lucide:check.svg?color=%23ffffff" alt="check" width="16" height="16" /> : <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.textTertiary }}></div>}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: isCurrent ? "800" : "600", color: theme.text }}>{t(step.i18n)}</div>
                      <div style={{ fontSize: "12px", color: theme.textSecondary, marginTop: "2px" }}>{extraTime || (isCurrent ? (live ? "..." : "") : "")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ backgroundColor: theme.surface, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm, display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", overflow: "hidden", border: `1px solid ${theme.border}`, flexShrink: 0 }}>
                  {master?.photo ? <img src={master.photo && (master.photo.startsWith("data:") || master.photo.startsWith("http")) ? master.photo : apiUrl(master.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (master?.name ? master.name.charAt(0) : "")}
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "800", margin: "0 0 4px 0", color: theme.text }}>{master?.name || ""}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                    <span style={{ color: theme.warning, fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="13" height="13" alt="" />{master?.rating || "0"}</span>
                    <span style={{ color: theme.textSecondary }}>({master?.reviewsCount || "0"})</span>
                  </div>
                </div>
              </div>
            </div>

            {isMasterViewer && current.user?.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", backgroundColor: theme.bgSecondary, borderRadius: "10px", border: `1px solid ${theme.border}` }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", overflow: "hidden", flexShrink: 0 }}>
                  {current.user.photo ? <img src={current.user.photo && (current.user.photo.startsWith("data:") || current.user.photo.startsWith("http")) ? current.user.photo : apiUrl(current.user.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (current.user.avatarCh || "?")}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: theme.textSecondary }}>{t("user")}</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(current.user.name, current.user.phone) || t("user")}</div>
                </div>
              </div>
            )}

            {(current.device || current.deviceModel || current.issue) && (
              <div style={{ backgroundColor: theme.bgSecondary, borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: theme.text, lineHeight: "1.5" }}>
                <strong>{t("device")}:</strong> {current.device} {current.deviceModel} · <strong>{t("issue")}:</strong> {current.issue}
                {current.total ? <div style={{ marginTop: "6px", color: theme.primary, fontWeight: "800" }}>{t("total")}: {Number(current.total).toLocaleString()} so'm</div> : null}
              </div>
            )}

            <div style={{ fontSize: "12px", color: theme.textSecondary, display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span>📦 {current.deliveryMethod === "self_dropoff" ? t("selfDropoff") : t("pickupByMaster")}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><img src="https://api.iconify.design/lucide:credit-card.svg?color=%2359656e" width="15" height="15" alt="" />{current.paymentMethod === "payme" ? t("payme") : current.paymentMethod === "click" ? t("click") : current.paymentMethod === "cash_on_delivery" ? t("cashOnDelivery") : t("onlinePayment")}</span>
              {current.paymentMethod !== "cash_on_delivery" && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: "800", color: current.paymentStatus === "paid" ? theme.success : theme.warning }}>
                  {current.paymentStatus === "paid" ? `✓ ${t("paid")}` : t("paymentPending")}
                </span>
              )}
            </div>

            {!isMasterViewer && current.paymentMethod !== "cash_on_delivery" && current.paymentStatus !== "paid" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px" }}>
                <span style={{ fontSize: "12px", color: theme.textSecondary }}>{t("cardSecureHint")}</span>
                {payState.msg && <span style={{ fontSize: "12px", fontWeight: "700", color: payState.msg === t("paid") ? theme.success : theme.error }}>{payState.msg}</span>}
                <button onClick={payNow} disabled={payState.busy} className="custom-btn"
                  style={{ backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px", fontWeight: "800", cursor: payState.busy ? "not-allowed" : "pointer", opacity: payState.busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  {payState.busy ? t("paymentProcessing") : `\u{1F4B3} ${t("payNow")}`}
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              {master?.phone && !isGuestPhone(master.phone) && (
              <a href={`tel:${master.phone}`} aria-label={t("callMaster")}
                style={{ flex: 1, backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none" }}>
                <img src="https://api.iconify.design/lucide:phone.svg?color=%23111111" alt="call" width="20" height="20" />
              </a>
            )}
              <button onClick={openChatWithMaster} className="custom-btn"
                style={{ flex: 1, backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <img src="https://api.iconify.design/lucide:message-circle.svg?color=%23111111" alt="chat" width="20" height="20" />
              </button>
            </div>
          </div>

          {!isRejected && current.status === "completed" && !rated && (
            <div style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "18px", border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm, marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "800", color: theme.text, margin: 0 }}>{t("success")} ✦</h3>
              <div style={{ display: "flex", gap: "6px" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="custom-btn" style={{ background: "none", border: "none", cursor: "pointer", filter: rating >= n ? "none" : "grayscale(1)", opacity: rating >= n ? 1 : 0.4 }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="26" height="26" alt="" /></button>
                ))}
              </div>
              <input name="reviewText" value={review} onChange={(e) => setReview(e.target.value)} placeholder={t("rejectionPlaceholder")}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${theme.border}`, fontSize: "13px", outline: "none", boxSizing: "border-box", backgroundColor: theme.bgSecondary, color: theme.text }} />
              {ratingMsg && <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: ratingMsg === t("success") ? theme.success : theme.error }}>{ratingMsg}</p>}
              <button onClick={submitRating} className="custom-btn" style={{ backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>{t("confirm")}</button>
            </div>
          )}
        </div>

        <div style={{ paddingBottom: "10px" }}>
          {!isRejected && (
            <button onClick={openChatWithMaster} className="custom-btn"
              style={{ width: "100%", backgroundColor: theme.primary, color: theme.textInverse, fontWeight: "bold", fontSize: "15px", padding: "16px", borderRadius: "14px", border: "none", cursor: "pointer", boxShadow: theme.shadowMd, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <img src="https://api.iconify.design/lucide:message-circle.svg?color=%23ffffff" alt="" width="18" height="18" />
              {t("chatWithMaster")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;


