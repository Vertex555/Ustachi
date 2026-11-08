import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, Linking, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import { fetchMyPayments, fetchCards, fetchPayableOrders, createPaymentLink } from "../services/payments";

const METHOD_ICON = { card: "credit-card", click: "credit-card", payme: "wallet", cash_on_delivery: "package" };

// Holatga qarab rang
const STATUS_STYLE = {
  paid: { key: "success", labelKey: "payStatusPaid" },
  pending: { key: "warning", labelKey: "payStatusPending" },
  failed: { key: "error", labelKey: "payStatusFailed" },
  refunded: { key: "info", labelKey: "payStatusRefunded" },
};

const money = (v) => new Intl.NumberFormat("ru-RU").format(Math.round(Number(v) || 0));

export function PaymentScreen({ variant = "user" }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isMaster = variant === "master";

  const [payments, setPayments] = useState([]);
  const [cards, setCards] = useState([]);
  const [payable, setPayable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const [p, c, o] = await Promise.all([
      fetchMyPayments(),
      fetchCards(),
      isMaster ? fetchPayableOrders() : Promise.resolve([]),
    ]);
    setPayments(p);
    setCards(c);
    setPayable(o);
    setLoading(false);
  }, [isMaster]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // --- Balans hisobi ---
  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid");
    const paidSum = paid.reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const pendingSum = payments
      .filter((p) => p.status === "pending")
      .reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return { paidSum, pendingSum, paidCount: paid.length };
  }, [payments]);

  // Karta limiti: oy boshidan to'langan summa / limit
  const { limit, spent, pct } = useMemo(() => {
    const L = 5000000;
    const now = new Date();
    const monthPaid = payments
      .filter((p) => p.status === "paid" && new Date(p.createdAt).getMonth() === now.getMonth() && new Date(p.createdAt).getFullYear() === now.getFullYear())
      .reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const used = Math.min(monthPaid, L);
    return { limit: L, spent: used, pct: Math.round((used / L) * 100) };
  }, [payments]);

  const mainCard = cards[0];

  const pay = async (orderId) => {
    setBusyId(orderId);
    const r = await createPaymentLink(orderId, "click");
    setBusyId(null);
    if (r.ok) Linking.openURL(r.url).catch(() => {});
    else navigation.navigate("Orders");
  };

  const goProfile = () => navigation.navigate("Profile");

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ===== HEADER: avatar + support + bell ===== */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
          <Pressable
            onPress={goProfile}
            accessibilityLabel={t("profile")}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon name="user" size={18} color={theme.textInverse} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Chats")}
            accessibilityLabel={t("helpSupport")}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.neumorph.surface,
                alignItems: "center",
                justifyContent: "center",
                ...theme.neumorph.itemRaised,
              },
              pressed && { ...theme.neumorph.pressed },
            ]}
          >
            <Icon name="message-circle" size={17} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            onPress={goProfile}
            accessibilityLabel={t("homeNews")}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.neumorph.surface,
                alignItems: "center",
                justifyContent: "center",
                ...theme.neumorph.itemRaised,
              },
              pressed && { ...theme.neumorph.pressed },
            ]}
          >
            <Icon name="bell" size={17} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* ===== KARTA va BALANS (chap/ong) ===== */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
          {/* Qora bank kartasi */}
          <View
            style={{
              width: 150,
              height: 100,
              borderRadius: theme.neumorph.radiusLg,
              backgroundColor: "#16181D",
              padding: 12,
              justifyContent: "space-between",
              ...theme.neumorph.raisedLg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ width: 22, height: 16, borderRadius: 3, backgroundColor: "#E8A33D" }} />
              <Text style={{ color: "#F2F4F7", fontSize: 8.5, fontWeight: "800", letterSpacing: 0.4 }}>UZCARD</Text>
            </View>
            <Text style={{ color: "#F2F4F7", fontSize: 11, letterSpacing: 1.6, fontWeight: "600" }}>
              {mainCard && mainCard.last4 ? `•••• •••• •••• ${mainCard.last4}` : "•••• •••• •••• 0000"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#8A9099", fontSize: 8 }}>{t("payLimitCard")}</Text>
              <Text style={{ color: "#F2F4F7", fontSize: 10.5, fontWeight: "800" }}>{money(limit)}</Text>
            </View>
          </View>

          {/* Balans */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.neumorph.surface,
              borderRadius: theme.neumorph.radiusLg,
              padding: 12,
              ...theme.neumorph.raisedLg,
            }}
          >
            <Text style={{ fontSize: 9.5, color: theme.textTertiary, fontWeight: "600" }}>{t("payTotalBalance")}</Text>
            <Text style={{ fontSize: 20, fontWeight: theme.font.extrabold, color: theme.text, marginTop: 3, letterSpacing: -0.5 }}>
              {money(totals.paidSum)} <Text style={{ fontSize: 12, color: theme.textTertiary }}>so'm</Text>
            </Text>

            <View style={{ flexDirection: "row", gap: 6, marginTop: "auto" }}>
              <View style={{ flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: 10, padding: 8, ...theme.neumorph.inset }}>
                <Text style={{ fontSize: 8.5, color: theme.textTertiary, fontWeight: "600" }}>{t("payPending")}</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.warning, marginTop: 2 }}>{money(totals.pendingSum)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: 10, padding: 8, ...theme.neumorph.inset }}>
                <Text style={{ fontSize: 8.5, color: theme.textTertiary, fontWeight: "600" }}>{t("payPaidCount")}</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.success, marginTop: 2 }}>{totals.paidCount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== KARTA LIMITI (progress bar) ===== */}
        <View
          style={{
            backgroundColor: theme.neumorph.surface,
            borderRadius: theme.neumorph.radius,
            padding: 14,
            marginBottom: 18,
            ...theme.neumorph.raised,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }}>{t("payMonthlyLimit")}</Text>
            <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.primary }}>{pct}%</Text>
          </View>

          <View style={{ height: 10, borderRadius: 5, backgroundColor: theme.neumorph.surface, marginTop: 12, overflow: "hidden", ...theme.neumorph.inset }}>
            <View style={{ width: `${Math.max(pct, 2)}%`, height: "100%", borderRadius: 5, backgroundColor: theme.primary }} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: theme.textTertiary }}>
              {t("paySpent")}: <Text style={{ color: theme.text, fontWeight: "700" }}>{money(spent)}</Text>
            </Text>
            <Text style={{ fontSize: 10, color: theme.textTertiary }}>
              {t("payLimit")}: <Text style={{ color: theme.text, fontWeight: "700" }}>{money(limit)}</Text>
            </Text>
          </View>
        </View>

        {/* ===== TO'LOV QILISH (faqat usta, to'lanmagan buyurtmalar) ===== */}
        {isMaster && payable.length > 0 ? (
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: theme.font.md, fontWeight: "800", color: theme.text, marginBottom: 10 }}>{t("payPayable")}</Text>
            <View style={{ gap: 10 }}>
              {payable.slice(0, 3).map((o) => (
                <View
                  key={o.id || o._id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: theme.neumorph.surface,
                    borderRadius: theme.neumorph.radius,
                    padding: 12,
                    ...theme.neumorph.raisedSm,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.neumorph.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      ...theme.neumorph.itemRaised,
                    }}
                  >
                    <Icon name="package" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }} numberOfLines={1}>
                      {o.deviceModel || o.device || t("homeOrder")}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.warning, fontWeight: "700", marginTop: 2 }}>
                      {money(o.totalPrice || o.price)} so'm
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => pay(o.id || o._id)}
                    disabled={busyId === (o.id || o._id)}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: theme.radius.full,
                        backgroundColor: theme.primary,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {busyId === (o.id || o._id) ? (
                      <ActivityIndicator size="small" color={theme.textInverse} />
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.textInverse }}>{t("payPay")}</Text>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ===== TRanzaksiyalar tarixi ===== */}
        <View>
          <Text style={{ fontSize: theme.font.md, fontWeight: "800", color: theme.text, marginBottom: 10 }}>{t("payHistory")}</Text>

          {payments.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.neumorph.surface,
                borderRadius: theme.neumorph.radius,
                ...theme.neumorph.raisedSm,
              }}
            >
              <EmptyState
                theme={theme}
                icon="credit-card"
                title={t("payNoHistory")}
                subtitle={t("payNoHistoryHint")}
                action={t("emptyRefresh")}
                onAction={onRefresh}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {payments.map((p) => {
                const st = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
                const tone = theme[st.key] || theme.primary;
                // Faqat #RRGGBB formatida shaffoflik qo'shish mumkin
                const toneSoft = /^#[0-9a-fA-F]{6}$/.test(tone) ? tone + "22" : theme.neumorph.insetBg;
                return (
                  <View
                    key={p.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: theme.neumorph.surface,
                      borderRadius: theme.neumorph.radius,
                      padding: 12,
                      ...theme.neumorph.raisedSm,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: theme.neumorph.surface,
                        alignItems: "center",
                        justifyContent: "center",
                        ...theme.neumorph.itemRaised,
                      }}
                    >
                      <Icon name={METHOD_ICON[p.method] || "credit-card"} size={17} color={theme.primary} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }} numberOfLines={1}>
                        {p.method === "card" && p.cardLast4 ? `•••• ${p.cardLast4}` : t(`payMethod_${p.method}`, p.method)}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <Icon name="clock" size={10} color={theme.textTertiary} />
                        <Text style={{ fontSize: 10, color: theme.textTertiary }}>
                          {new Date(p.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }}>
                        {money(p.amount)} <Text style={{ fontSize: 9.5, color: theme.textTertiary }}>so'm</Text>
                      </Text>
                      <View
                        style={{
                          marginTop: 3,
                          paddingVertical: 2,
                          paddingHorizontal: 7,
                          borderRadius: theme.radius.full,
                          backgroundColor: toneSoft,
                        }}
                      >
                        <Text style={{ fontSize: 8.5, fontWeight: "800", color: tone }}>{t(st.labelKey)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default PaymentScreen;
