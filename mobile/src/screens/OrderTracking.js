import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { useRoute } from "@react-navigation/native";
import Icon from "../components/Icon";
import { MapCard } from "../components/MapCard";
import { updateOrderStatus, cancelOrder, rateOrder } from "../services/orders";
import { attachSocket } from "../services/socket";
import { getAuthUser } from "../services/authStore";
import { apiUrl, authHeaders } from "../services/api";
import { formatPrice, displayName, isGuestPhone } from "../utils/display";

const STATUS_STEPS = [
  { key: "placed", i18n: "statusPlaced" },
  { key: "accepted", i18n: "statusAccepted" },
  { key: "in_progress", i18n: "statusInProgress" },
  { key: "ready", i18n: "statusReady" },
  { key: "completed", i18n: "statusCompleted" },
];

const DEFAULT_LAT = 41.311081;
const DEFAULT_LNG = 69.240562;

function resolveMedia(uri) {
  if (!uri) return null;
  if (/^data:/i.test(uri) || /^https?:\/\//i.test(uri)) return uri;
  return apiUrl(uri);
}

function sep2(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}.${sep2(d.getMonth() + 1)}.${d.getFullYear()}, ${sep2(d.getHours())}:${sep2(d.getMinutes())}`;
}

export function OrderTracking({ navigation }) {
  const route = useRoute();
  const params = (route && route.params) || {};
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [viewerRole] = useState(() => params.viewerRole || (getAuthUser() && getAuthUser().role) || "user");
  const [live, setLive] = useState(params.orderData || null);
  const [status, setStatus] = useState((params.orderData && params.orderData.status) || "placed");
  const [liveLoc, setLiveLoc] = useState(null);
  const [loading, setLoading] = useState(!params.orderData);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingMsg, setRatingMsg] = useState("");
  const [rated, setRated] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  const orderId = (params.orderData && (params.orderData.id || params.orderData._id)) || params.orderId;

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setLive(data.data);
        setStatus(data.data.status);
        setRated((data.data.rating || 0) > 0);
      }
    } catch {}
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId, loadOrder]);

  useEffect(() => {
    const { detach } = attachSocket({
      onOrderUpdate: (p) => {
        if (p.order && (p.order.id || p.order._id) === orderId) {
          setLive(p.order);
          setStatus(p.order.status);
          setRated((p.order.rating || 0) > 0);
        }
      },
      onLiveLocation: (p) => {
        if (p && p.orderId === orderId) {
          setLiveLoc({ lat: p.lat, lng: p.lng, by: p.by });
        }
      },
    });
    return detach;
  }, [orderId]);

  const current = live || params.orderData || {};
  const master = current.master || {};
  const orderStatus = status || "placed";
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === orderStatus);
  const isRejected = orderStatus === "rejected";
  const isMasterViewer = viewerRole === "master";

  const payNow = async () => {
    if (!orderId || payBusy) return;
    setPayBusy(true);
    setPayMsg("");

    // Click / Payme — to'lov sahifasini tashqi brauzerda ochamiz
    const pm = current.paymentMethod;
    if (pm === "click" || pm === "payme") {
      try {
        const res = await fetch(apiUrl(`/api/payments/orders/${orderId}/${pm}/link`), {
          method: "POST",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data && data.data.url) {
          Linking.openURL(data.data.url).catch(() => {});
        } else {
          setPayMsg((data && data.message) || t("paymentFailed"));
        }
      } catch {
        setPayMsg(t("unknownError"));
      } finally {
        setPayBusy(false);
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
        setPayBusy(false);
        setPayMsg(t("chooseCardFirst"));
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
        setPayMsg(t("paid"));
        await loadOrder();
      } else {
        setPayMsg((data && data.message) || t("paymentFailed"));
      }
    } catch {
      setPayMsg(t("unknownError"));
    } finally {
      setPayBusy(false);
    }
  };

  const openChat = async () => {
    if (current.chatId) {
      openChatWindow({ chatId: current.chatId, peerName: isMasterViewer ? displayName(current.user && current.user.name, current.user && current.user.phone) || t("user") : master.name || t("master") });
      return;
    }
    try {
      let res;
      if (isMasterViewer) {
        const userId = current.user && current.user.id;
        if (!userId) return;
        res = await fetch(apiUrl(`/api/chat/open/user/${userId}`), { headers: authHeaders() });
      } else {
        const masterId = master.id || master._id;
        if (!masterId) return;
        res = await fetch(apiUrl(`/api/chat/open/master/${masterId}`), { headers: authHeaders() });
      }
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        openChatWindow({
          chatId: data.data.id || data.data._id,
          peerName: isMasterViewer ? displayName(current.user && current.user.name, current.user && current.user.phone) || t("user") : master.name || t("master"),
        });
      }
    } catch {}
  };

  const openChatWindow = (chatInfo) => {
    navigation.navigate("ChatWindow", {
      chatId: chatInfo.chatId,
      otherUserId: isMasterViewer ? (current.user && current.user.id) : (master.id || master._id),
      otherName: chatInfo.peerName,
      phone: isMasterViewer ? (current.user && current.user.phone) : master.phone,
    });
  };

  const callMaster = () => {
    const phone = master.phone;
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const doStatus = async (nextStatus, rejectionReason) => {
    setActionError("");
    const res = await updateOrderStatus(orderId, nextStatus, rejectionReason);
    if (!res.ok) {
      setActionError(res.message || t("error"));
      return;
    }
    if (res.order) {
      setLive(res.order);
      setStatus(res.order.status);
      setRated((res.order.rating || 0) > 0);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      setActionError(t("rejectionReason") + "!");
      return;
    }
    await doStatus("rejected", rejectReason.trim());
    setRejectOpen(false);
    setRejectReason("");
  };

  const confirmCancel = async () => {
    setActionError("");
    const res = await cancelOrder(orderId, cancelReason.trim() || t("cancelOrder"));
    if (!res.ok) {
      setActionError(res.message || t("error"));
      return;
    }
    if (res.order) {
      setLive(res.order);
      setStatus(res.order.status);
    }
    setCancelOpen(false);
    setCancelReason("");
  };

  const submitRating = async () => {
    if (!rating) {
      setRatingMsg(t("fieldRequired"));
      return;
    }
    setRatingMsg("");
    const res = await rateOrder(orderId, rating, review);
    if (!res.ok) {
      setRatingMsg(res.message || t("unknownError"));
      return;
    }
    setRated(true);
    setRatingMsg(t("success"));
    if (res.order) {
      setLive(res.order);
      setStatus(res.order.status);
    }
    setTimeout(() => setRatingOpen(false), 600);
  };

  const openRating = () => {
    setRating(0);
    setReview("");
    setRatingMsg("");
    setRatingOpen(true);
  };

  const placedAt = current.createdAt ? formatDateTime(current.createdAt) : null;
  const updatedAt = current.updatedAt ? formatDateTime(current.updatedAt) : null;
  const orderNumber = current.orderNumber || params.orderData && params.orderData.orderNumber || (((current.id || current._id) || "").length > 4 ? `#${String(current.id || current._id).slice(-6)}` : "");

  const masterLat = liveLoc ? liveLoc.lat : (current.masterLocation && current.masterLocation.lat != null ? current.masterLocation.lat : (master.lat != null ? master.lat : DEFAULT_LAT));
  const masterLng = liveLoc ? liveLoc.lng : (current.masterLocation && current.masterLocation.lng != null ? current.masterLocation.lng : (master.lng != null ? master.lng : DEFAULT_LNG));
  const userLoc = current.location || {};
  const userLat = userLoc.lat != null ? userLoc.lat : DEFAULT_LAT;
  const userLng = userLoc.lng != null ? userLoc.lng : DEFAULT_LNG;

  const statusLabel = STATUS_STEPS.find((s) => s.key === orderStatus);
  const showRoute = orderStatus === "accepted" || orderStatus === "in_progress" || orderStatus === "ready";

  const renderMasterActions = () => {
    if (isRejected || orderStatus === "completed") return null;
    const next =
      orderStatus === "placed" ? "accepted" : orderStatus === "accepted" ? "in_progress" : orderStatus === "in_progress" ? "ready" : null;
    const isReady = orderStatus === "ready";
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        {orderStatus === "placed" && (
          <Pressable
            onPress={() => {
              setRejectReason("");
              setActionError("");
              setRejectOpen(true);
            }}
            style={({ pressed }) => [
              { flex: 1, minWidth: 120, backgroundColor: theme.errorLight, borderRadius: theme.radius.md, paddingVertical: 13, alignItems: "center" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.error }}>{t("rejectOrder")}</Text>
          </Pressable>
        )}
        {next && (
          <Pressable
            onPress={() => doStatus(next)}
            style={({ pressed }) => [
              { flex: 1, minWidth: 120, backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 13, alignItems: "center" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>
              {next === "accepted" ? t("acceptOrder") : t("advance")}
            </Text>
          </Pressable>
        )}
        {isReady && (
          <Pressable
            onPress={() => {
              setActionError("");
              setCompleteOpen(true);
            }}
            style={({ pressed }) => [
              { flex: 1, minWidth: 160, backgroundColor: theme.success, borderRadius: theme.radius.md, paddingVertical: 13, alignItems: "center" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>
              &#10003; {t("confirmCompleted")}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderTimeline = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 4 }}>
        {STATUS_STEPS.map((step, index) => {
          const isDone = currentIndex >= index;
          const isCurrent = currentIndex === index;
          const extraTime = index === 0 ? placedAt : index === currentIndex && currentIndex > 0 ? updatedAt : null;
          return (
            <View key={step.key} style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ alignItems: "center", width: 76 }}>
                <View
                  style={[
                    {
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: isDone ? theme.primary : theme.bgTertiary,
                      borderWidth: isDone ? 0 : 2,
                      borderColor: theme.border,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    isDone && theme.shadowSm,
                  ]}
                >
                  {isDone ? (
                    <Icon name="check" size={16} color={theme.textInverse} />
                  ) : (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textTertiary }} />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isCurrent ? "800" : "600",
                    color: theme.text,
                    textAlign: "center",
                    marginTop: 6,
                    opacity: isDone ? 1 : 0.5,
                  }}
                >
                  {t(step.i18n)}
                </Text>
                {(extraTime || (isCurrent && orderStatus !== "completed")) && (
                  <Text style={{ fontSize: 9, color: theme.textSecondary, textAlign: "center", marginTop: 2 }} numberOfLines={2}>
                    {extraTime || (live ? "\u2026" : "")}
                  </Text>
                )}
              </View>
              {index < STATUS_STEPS.length - 1 && (
                <View
                  style={{
                    width: 26,
                    height: 3,
                    marginTop: 13,
                    borderRadius: 2,
                    backgroundColor: currentIndex > index ? theme.primary : theme.border,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
              theme.shadowSm,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="chevron-left" size={18} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }} numberOfLines={1}>
              {t("orderTracking")} {orderNumber}
            </Text>
            {!!placedAt && <Text style={{ fontSize: 12, color: theme.textSecondary }}>{t("orderPlaced")} {placedAt}</Text>}
          </View>
          {isRejected ? (
            <View style={{ backgroundColor: theme.errorLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.error }}>{t("rejectOrder")}</Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: orderStatus === "completed" ? theme.successLight : theme.infoLight,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: orderStatus === "completed" ? theme.success : theme.info,
                }}
              >
                {statusLabel ? t(statusLabel.i18n) : t("statusPlaced")}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : !orderId ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <Icon name="alert-triangle" size={40} color={theme.textTertiary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textTertiary }}>{t("noData")}</Text>
          </View>
        ) : (
          <>
            {!!actionError && (
              <View style={{ backgroundColor: theme.errorLight, paddingVertical: 10, paddingHorizontal: 14, borderRadius: theme.radius.md, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.error }}>{actionError}</Text>
              </View>
            )}

            {isRejected && (
              <View style={{ backgroundColor: theme.errorLight, borderWidth: 1, borderColor: theme.error, borderRadius: theme.radius.md, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.error }}>
                  {t("rejectionReason")}: {current.rejectionReason || "\u2014"}
                </Text>
              </View>
            )}

            <MapCard
              center={{ lat: (masterLat + userLat) / 2, lng: (masterLng + userLng) / 2 }}
              markers={[
                { lat: userLat, lng: userLng, color: "rd" },
                { lat: masterLat, lng: masterLng, color: "gn" },
              ]}
              height={220}
              showLegend
              from={userLoc.lat != null ? { lat: userLat, lng: userLng } : null}
              to={{ lat: masterLat, lng: masterLng }}
            />

            {showRoute && !isRejected && (
              <Pressable
                onPress={() => Linking.openURL(`https://yandex.com/maps/?rtext=${userLat},${userLng}~${masterLat},${masterLng}&rtt=auto`).catch(() => {})}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 10,
                    backgroundColor: theme.primary,
                    borderRadius: theme.radius.md,
                    paddingVertical: 13,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Icon name="navigation" size={18} color={theme.textInverse} />
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>
                  {t("up_routeShow")} &#10132;
                </Text>
              </Pressable>
            )}

            {!isRejected && (
              <View style={{ marginTop: 20, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text, marginBottom: 10 }}>{t("orderTracking")}</Text>
                {renderTimeline()}
              </View>
            )}

            <View style={[styles.summary, theme.shadowSm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.masterAvatar, theme.shadowSm, { backgroundColor: theme.primary, borderColor: theme.border }]}>
                  {master.photo ? (
                    <Image source={{ uri: resolveMedia(master.photo) }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={{ fontSize: 18, fontWeight: "800", color: theme.textInverse }}>{master.name ? master.name.charAt(0) : ""}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }} numberOfLines={1}>
                    {master.name || ""}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="star" size={13} color="#f59e0b" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: theme.warning }}>{master.rating || "0"}</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>({master.reviewsCount || "0"})</Text>
                  </View>
                </View>
              </View>

              {isMasterViewer && current.user && current.user.phone ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusSm, ...theme.neumorph.raisedSm }}>
                  <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
                    {current.user.photo ? (
                      <Image source={{ uri: resolveMedia(current.user.photo) }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>{current.user.avatarCh || "?"}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>{t("user")}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }} numberOfLines={1}>
                      {displayName(current.user.name, current.user.phone) || t("user")}
                    </Text>
                  </View>
                </View>
              ) : null}

              {(current.device || current.deviceModel || current.issue) ? (
                <View style={{ backgroundColor: theme.bgSecondary, borderRadius: 10, padding: 10, gap: 4 }}>
                  <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "700" }}>{t("device")}:</Text> {current.device || ""} {current.deviceModel || ""}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "700" }}>{t("issue")}:</Text> {current.issue || "\u2014"}
                  </Text>
                  {!!current.total && (
                    <Text style={{ fontSize: 12, color: theme.primary, fontWeight: "800", lineHeight: 18 }}>
                      {t("total")}: {formatPrice(current.total)}
                    </Text>
                  )}
                </View>
              ) : null}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  {current.deliveryMethod === "self_dropoff" ? t("selfDropoff") : t("pickupByMaster")}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="credit-card" size={15} color={theme.textSecondary} />
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {current.paymentMethod === "payme" ? t("payme") : current.paymentMethod === "click" ? t("click") : current.paymentMethod === "cash_on_delivery" ? t("cashOnDelivery") : t("onlinePayment")}
                  </Text>
                </View>
                {current.paymentMethod !== "cash_on_delivery" ? (
                  <Text style={{ fontSize: 12, fontWeight: "800", color: current.paymentStatus === "paid" ? theme.success : theme.warning }}>
                    {current.paymentStatus === "paid" ? `\u2713 ${t("paid")}` : t("paymentPending")}
                  </Text>
                ) : null}
              </View>

              {!isMasterViewer && current.paymentMethod !== "cash_on_delivery" && current.paymentStatus !== "paid" ? (
                <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusSm, padding: 12, gap: 8, ...theme.neumorph.raisedSm }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {t("cardSecureHint")}
                  </Text>
                  {!!payMsg && (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: payMsg === t("paid") ? theme.success : theme.error }}>{payMsg}</Text>
                  )}
                  <Pressable
                    onPress={payNow}
                    disabled={payBusy}
                    style={({ pressed }) => [
                      { backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 13, alignItems: "center", opacity: payBusy ? 0.7 : 1, flexDirection: "row", justifyContent: "center", gap: 8 },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {payBusy ? (
                      <ActivityIndicator color={theme.textInverse} size="small" />
                    ) : (
                      <Icon name="credit-card" size={16} color={theme.textInverse} />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: "800", color: theme.textInverse }}>
                      {payBusy ? t("paymentProcessing") : t("payNow")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 12 }}>
                {master.phone && !isGuestPhone(master.phone) ? (
                  <Pressable
                    onPress={callMaster}
                    style={({ pressed }) => [
                      { flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm, paddingVertical: 12, alignItems: "center" },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Icon name="phone" size={20} color={theme.text} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={openChat}
                  style={({ pressed }) => [
                    { flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm, paddingVertical: 12, alignItems: "center" },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Icon name="message-circle" size={20} color={theme.text} />
                </Pressable>
              </View>
            </View>

            {isMasterViewer && renderMasterActions()}

            {!isMasterViewer && orderStatus !== "completed" && orderStatus !== "rejected" ? (
              <Pressable
                onPress={() => {
                  setCancelReason("");
                  setActionError("");
                  setCancelOpen(true);
                }}
                style={({ pressed }) => [
                  {
                    marginTop: 16,
                    backgroundColor: theme.bgTertiary,
                    borderWidth: 1,
                    borderColor: theme.errorLight,
                    borderRadius: theme.radius.md,
                    paddingVertical: 13,
                    alignItems: "center",
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.error }}>{t("cancelOrder")}</Text>
              </Pressable>
            ) : null}

            {!isRejected && orderStatus === "completed" && !rated && (
              <Pressable
                onPress={openRating}
                style={({ pressed }) => [
                  {
                    marginTop: 16,
                    backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm,
                    padding: 18,
                    alignItems: "center",
                    gap: 6,
                  },
                  theme.shadowSm,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 15, fontWeight: "800", color: theme.text }}>{t("success")} &#10022;</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>{t("rateMaster")}</Text>
              </Pressable>
            )}

            {!isRejected && (
              <Pressable
                onPress={openChat}
                style={({ pressed }) => [
                  {
                    marginTop: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: theme.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                  },
                  theme.shadowMd,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Icon name="message-circle" size={18} color={theme.textInverse} />
                <Text style={{ fontSize: 15, fontWeight: "800", color: theme.textInverse }}>{t("chatWithMaster")}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={rejectOpen} transparent animationType="fade" onRequestClose={() => setRejectOpen(false)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("rejectOrder")}</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t("rejectionReason")}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              style={[styles.textArea, { backgroundColor: theme.bgSecondary, borderColor: theme.border, color: theme.text }]}
            />
            {!!actionError && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.error }}>{actionError}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setRejectOpen(false)}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.bgTertiary, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmReject}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.error, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>{t("confirm")}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("cancelOrder")}</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t("cancelReason")}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={2}
              style={[styles.textArea, { backgroundColor: theme.bgSecondary, borderColor: theme.border, color: theme.text }]}
            />
            {!!actionError && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.error }}>{actionError}</Text>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setCancelOpen(false)}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.bgTertiary, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.errorLight, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.error }}>{t("confirm")}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={completeOpen} transparent animationType="fade" onRequestClose={() => setCompleteOpen(false)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("confirmCompletedTitle")}</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>{t("confirmCompletedDesc")}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setCompleteOpen(false)}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.bgTertiary, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await doStatus("completed");
                  setCompleteOpen(false);
                }}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.success, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>{t("confirmAction")}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={ratingOpen} transparent animationType="fade" onRequestClose={() => setRatingOpen(false)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("rateMaster")} &#10022;</Text>
            <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", paddingVertical: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
                  <Icon name="star" size={28} color={rating >= n ? "#f59e0b" : theme.textTertiary} />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder={t("rejectionPlaceholder")}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={2}
              style={[styles.textArea, { backgroundColor: theme.bgSecondary, borderColor: theme.border, color: theme.text }]}
            />
            {!!ratingMsg && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: ratingMsg === t("success") ? theme.success : theme.error }}>
                {ratingMsg}
              </Text>
            )}
            <Pressable
              onPress={submitRating}
              style={({ pressed }) => [
                { backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 13, alignItems: "center" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.textInverse }}>{t("confirm")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = {
  summary: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    marginTop: 16,
  },
  masterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalOverlay: {
    flexGrow: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    gap: 14,
  },
  textArea: {
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
};

export default OrderTracking;