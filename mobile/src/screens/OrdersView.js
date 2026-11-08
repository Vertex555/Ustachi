import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import Card from "../components/Card";
import AppButton from "../components/AppButton";
import ScreenHeader from "../components/ScreenHeader";
import { fetchOrdersPage, markOrdersSeen, cancelOrder, updateOrderStatus, rateOrder } from "../services/orders";
import { attachSocket } from "../services/socket";
import { getAuthUser } from "../services/authStore";
import { apiUrl } from "../config";
import { authHeaders } from "../services/api";
import { formatPrice, displayName, isGuestPhone } from "../utils/display";

const STATUS_MAP = {
  placed: { key: "pending", colorKey: "warning", bgKey: "warningLight" },
  accepted: { key: "pending", colorKey: "warning", bgKey: "warningLight" },
  in_progress: { key: "pending", colorKey: "warning", bgKey: "warningLight" },
  ready: { key: "pending", colorKey: "warning", bgKey: "warningLight" },
  completed: { key: "completed", colorKey: "success", bgKey: "successLight" },
  rejected: { key: "rejected", colorKey: "error", bgKey: "errorLight" },
};

const NEXT_STATUS = {
  placed: "accepted",
  accepted: "in_progress",
  in_progress: "ready",
  ready: "completed",
};

function resolveMedia(uri) {
  if (!uri) return null;
  if (/^data:/i.test(uri) || /^https?:\/\//i.test(uri)) return uri;
  return apiUrl(uri);
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function OrdersView({ navigation, onOpenChat, variant }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  // Bo'lim rol qat'iy tarzda beradi (variant): Usta bo'limi HECH QACHON
  // mijoz oynalarini ko'rsatmasligi uchun authStore faqat zaxira bo'lib qoladi.
  const [role] = useState(() => variant || (getAuthUser() && getAuthUser().role) || "user");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [completeTarget, setCompleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const ORDER_PAGE_SIZE = 50;

  // Usta bilan chat ochish — mavjud chat topiladi yoki serverda yaratiladi
  const openMasterChat = useCallback(async (o) => {
    const master = o.master || {};
    const masterId = master.id || o.masterId;
    if (!masterId) {
      Alert.alert(t("error"), t("chatOpenError"));
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/chat/open/master/${masterId}`), { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        Alert.alert(t("error"), data.message || t("chatOpenError"));
        return;
      }
      const params = {
        chatId: data.data.id,
        peerName: master.name || data.data.peer?.name || t("master"),
        otherPhone: master.phone || data.data.peer?.phone,
        otherUserId: data.data.peer?.id,
      };
      if (onOpenChat) onOpenChat(params);
      else navigation.navigate("ChatWindow", params);
    } catch {
      Alert.alert(t("error"), t("chatOpenError"));
    }
  }, [onOpenChat, navigation, t]);

  const load = useCallback(async () => {
    const res = await fetchOrdersPage(role === "master" ? "master" : "user", 1, ORDER_PAGE_SIZE);
    setOrders(res.items);
    setPage(1);
    setHasMore(res.hasMore);
    setLoading(false);
  }, [role]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const res = await fetchOrdersPage(role === "master" ? "master" : "user", next, ORDER_PAGE_SIZE);
    setOrders((list) => [...list, ...res.items]);
    setPage(next);
    setHasMore(res.hasMore);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, role]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        markOrdersSeen();
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const applyUpdate = (updated) => {
    if (!updated || (!updated.id && !updated._id)) return;
    const id = updated.id || updated._id;
    setOrders((list) => {
      const has = list.some((o) => (o.id || o._id) === id);
      if (!has) return list;
      return list.map((o) => ((o.id || o._id) === id ? { ...o, ...updated } : o));
    });
    markOrdersSeen();
  };

  useFocusEffect(
    useCallback(() => {
      const active = true;
      const { detach } = attachSocket({ onOrderUpdate: (p) => { if (active) applyUpdate(p && p.order); } });
      return () => { active; detach(); };
    }, [])
  );

  const changeStatus = async (orderId, status, rejectionReason) => {
    setError("");
    const res = await updateOrderStatus(orderId, status, rejectionReason);
    if (!res.ok) {
      setError(res.message || t("error"));
      return;
    }
    applyUpdate(res.order);
  };

  const handleCancel = async (orderId) => {
    setError("");
    const res = await cancelOrder(orderId, t("cancelOrder"));
    if (!res.ok) {
      setError(res.message || t("error"));
      return;
    }
    applyUpdate(res.order);
  };

  const cancelWithConfirm = (orderId) => {
    setCancelTarget(orderId);
  };

  const confirmCancel = async () => {
    const id = cancelTarget;
    setCancelTarget(null);
    if (!id) return;
    await handleCancel(id);
  };

  const handleRate = async (orderId, stars) => {
    if (!stars) return;
    setError("");
    const res = await rateOrder(orderId, stars);
    if (!res.ok) {
      setError(res.message || t("error"));
      return;
    }
    applyUpdate(res.order);
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    await changeStatus(completeTarget, "completed");
    setCompleteTarget(null);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setError(t("rejectionReason") + "!");
      return;
    }
    await changeStatus(rejectTarget, "rejected", rejectReason.trim());
    setRejectTarget(null);
    setRejectReason("");
  };

  const renderMasterActions = (order) => {
    if (order.status === "rejected" || order.status === "completed") return null;
    const next = NEXT_STATUS[order.status];
    const isReady = order.status === "ready";
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {order.status === "placed" && (
          <View style={{ width: "46%", minWidth: 120 }}>
            <AppButton
              label={t("rejectOrder")}
              onPress={() => {
                setRejectTarget(order.id || order._id);
                setRejectReason("");
              }}
              icon="close"
              variant="ghost"
              size="sm"
              full
            />
          </View>
        )}
        {next && (
          <View style={{ width: "46%", minWidth: 120 }}>
            <AppButton
              label={next === "accepted" ? t("acceptOrder") : t("advance")}
              onPress={() => changeStatus(order.id || order._id, next)}
              icon="check"
              variant="primary"
              iconRight="chevron-right"
              size="sm"
              full
            />
          </View>
        )}
        {isReady && (
          <View style={{ width: "46%", minWidth: 130 }}>
            <AppButton
              label={t("confirmCompleted")}
              onPress={() => setCompleteTarget(order.id || order._id)}
              icon="check"
              variant="success"
              size="sm"
              full
            />
          </View>
        )}
      </View>
    );
  };

  const renderStars = (order) => {
    const isCompleted = order.status === "completed";
    const canRate = isCompleted && !order.rating;
    const current = order.rating || 0;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              if (canRate) handleRate(order.id || order._id, n);
            }}
            disabled={!canRate}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <Icon name="star" size={20} color={n <= current ? "#f59e0b" : theme.textTertiary} />
          </Pressable>
        ))}
        {order.rating > 0 && (
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#f59e0b", marginLeft: 6 }}>{order.rating}.0</Text>
        )}
        {!order.rating && isCompleted && (
          <Text style={{ fontSize: 10, color: theme.textTertiary, marginLeft: 6 }}>{t("rateMaster")}</Text>
        )}
        {!isCompleted && (
          <Text style={{ fontSize: 10, color: theme.textTertiary, marginLeft: 6 }}>{t("pending")}</Text>
        )}
      </View>
    );
  };

  const renderCard = (o) => {
    const st = STATUS_MAP[o.status] || { key: "pending", colorKey: "textSecondary", bgKey: "bgTertiary" };
    const stColor = theme[st.colorKey];
    const orderNum = String(o.orderNumber || "").replace(/^UST-/i, "") || String(o.id || o._id || "").slice(-6);
    return (
      <Card
        key={o.id || o._id}
        padding={14}
        accent={role === "master" ? theme.secondary : stColor}
      >
        <Pressable
          onPress={() => navigation.navigate("OrderTracking", { orderData: o, viewerRole: role })}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[theme.type.sub, { color: theme.text }]} numberOfLines={1}>
                {"#" + orderNum}
              </Text>
              {!!o.master && o.master.name && (
                <Text style={[theme.type.bodySm, { color: theme.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                  {o.master.name}
                </Text>
              )}
            </View>
            <Badge label={t(st.key)} tone={st.key === "completed" ? "success" : st.key === "rejected" ? "error" : "warning"} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="smartphone" size={13} color={theme.textTertiary} />
              <Text style={[theme.type.bodySm, { color: theme.textSecondary }]}>{o.device || o.deviceModel || "\u2014"}</Text>
            </View>
            {!!o.total && (
              <Text style={[theme.type.label, { color: theme.primary }]}>
                {formatPrice(o.total)}
              </Text>
            )}
            {!!o.createdAt && <Text style={[theme.type.caption, { color: theme.textTertiary }]}>{formatDate(o.createdAt)}</Text>}
          </View>
          {role === "master" && o.user && o.user.phone ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                {o.user.photo ? (
                  <Image source={{ uri: resolveMedia(o.user.photo) }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ fontSize: 9, fontWeight: "800", color: theme.textInverse }}>{o.user.avatarCh || "?"}</Text>
                )}
              </View>
              <Text style={[theme.type.bodySm, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                {displayName(o.user.name, o.user.phone) || t("user")}
              </Text>
              <Badge icon="user" label={t("user")} tone="secondary" size="sm" />
            </View>
          ) : null}
        </Pressable>

        {role === "user" ? (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={[theme.type.label, { color: theme.text, marginBottom: 8 }]}>{t("rateMaster")}</Text>
            {renderStars(o)}
            {o.status !== "completed" && o.status !== "rejected" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {!!(o.master || {}).phone && !isGuestPhone(o.master.phone) && (
                  <View style={{ width: "48%", minWidth: 130 }}>
                    <AppButton
                      label={t("callMaster")}
                      onPress={() => Linking.openURL(`tel:${o.master.phone}`).catch(() => {})}
                      icon="phone"
                      variant="secondary"
                      size="sm"
                      full
                    />
                  </View>
                )}
                {!!(o.master || {}).id && (
                  <View style={{ width: "48%", minWidth: 130 }}>
                    <AppButton
                      label={t("messageMaster")}
                      onPress={() => openMasterChat(o)}
                      icon="send"
                      variant="ghost"
                      size="sm"
                      full
                    />
                  </View>
                )}
                <View style={{ width: "48%", minWidth: 130 }}>
                  <AppButton
                    label={t("cancelOrder")}
                    onPress={() => cancelWithConfirm(o.id || o._id)}
                    icon="close"
                    variant="ghost"
                    size="sm"
                    full
                  />
                </View>
              </View>
            )}
          </View>
        ) : (
          renderMasterActions(o)
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader
        icon={role === "master" ? "wrench" : "package"}
        title={t("myOrders")}
        subtitle={t("tabOrders")}
        count={orders.length}
        tone={role === "master" ? "primary" : "primary"}
      />

      {!!error && (
        <View style={{ backgroundColor: theme.errorLight, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, marginHorizontal: 16, marginTop: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.error }}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              load();
            }}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading && orders.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              theme={theme}
              icon="package"
              title={role === "master" ? t("noOrdersForMaster") : t("noOrdersForUser")}
              subtitle={role === "master" ? t("noOrdersForMasterHint") : t("noOrdersForUserHint")}
              action={role === "master" ? t("emptyRefresh") : t("emptyFindMaster")}
              onAction={() => {
                if (role === "master") load();
                else navigation.navigate("Upload");
              }}
            />
          </View>
        ) : (
          orders.map((o) => renderCard(o))
        )}

        {hasMore && !loading && (
          <View style={{ marginTop: 8 }}>
            {loadingMore ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <AppButton
                label={t("loadMore", "Ko'proq yuklash")}
                onPress={loadMore}
                icon="plus"
                variant="ghost"
                size="sm"
              />
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.neumorph.surface, ...theme.neumorph.raised }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("cancelOrderTitle")}</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
              {t("cancelOrderConfirm")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setCancelTarget(null)}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, paddingVertical: 12, alignItems: "center", ...theme.neumorph.raisedSm },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{t("no")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.error, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>{t("yes")}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.neumorph.surface, ...theme.neumorph.raised }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("rejectOrder")}</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t("rejectionReason")}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              style={[styles.textArea, { backgroundColor: theme.neumorph.insetBg, color: theme.text, ...theme.neumorph.inset }]}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setRejectTarget(null)}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, paddingVertical: 12, alignItems: "center", ...theme.neumorph.raisedSm },
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

      <Modal visible={!!completeTarget} transparent animationType="fade" onRequestClose={() => setCompleteTarget(null)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalBox, { backgroundColor: theme.neumorph.surface, ...theme.neumorph.raised }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("confirmCompletedTitle")}</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
              {t("confirmCompletedDesc")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setCompleteTarget(null)}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, paddingVertical: 12, alignItems: "center", ...theme.neumorph.raisedSm },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmComplete}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    gap: 14,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
});

export default OrdersView;