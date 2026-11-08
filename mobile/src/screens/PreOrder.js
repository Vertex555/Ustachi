import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { MapCard, openYandexMaps } from "../components/MapCard";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { createOrder } from "../services/orders";
import { apiUrl, authHeaders } from "../services/api";
import { formatPrice, isGuestPhone } from "../utils/display";
import Icon from "../components/Icon";

const FALLBACK_USER = { lat: 41.311081, lng: 69.240562 };

const formatPhoneNumber = (phoneStr) => {
  if (!phoneStr) return "";
  const cleaned = ("" + phoneStr).replace(/\D/g, "");
  const match = cleaned.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (match) return `+998 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
  return phoneStr;
};

export const PreOrder = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const params = route.params || {};
  const master = params.master || {};
  const userLocation = params.userLocation || FALLBACK_USER;
  const orderDetails = params.details || {};

  // Usta tanlanmagan bo'lsa — buyurtma YUBORILMAYDI, avval usta tanlash ekrani ochiladi.
  // (eski FALLBACK_MASTER butunlay olib tashlandi: noto'g'ri ustaga buyurtma ketmasin)
  useEffect(() => {
    if (!master.id && !master._id) {
      navigation.replace("MasterPicker", {
        device: orderDetails.device || "",
        userLocation,
        details: orderDetails,
      });
    }
  }, [master.id, master._id, orderDetails, userLocation, navigation]);

  const [comment, setComment] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("master_pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [cards, setCards] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  const userLat = userLocation?.lat || FALLBACK_USER.lat;
  const userLng = userLocation?.lng || FALLBACK_USER.lng;
  const masterLat = (master.location?.lat ?? master.lat) ?? null;
  const masterLng = (master.location?.lng ?? master.lng) ?? null;

  const price = master?.price || 0;
  const commission = Math.round(price * 0.07);
  const deliveryFee = deliveryMethod === "master_pickup" ? 20000 : 0;
  const total = price + commission + deliveryFee;

  const masterPhone = formatPhoneNumber(isGuestPhone(master?.phone || master?.phoneNumber) ? "" : (master?.phone || master?.phoneNumber));

  const loadCards = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/cards"), { headers: authHeaders() });
      const data = await res.json();
      setCards((data.data || []).map((c) => ({ ...c, id: c.id || c._id })));
      setSelectedCard((prev) => prev || (data.data || []).find((c) => c.isDefault) || (data.data || [])[0] || null);
    } catch {
      setCards([]);
    }
  }, []);

  useEffect(() => {
    if (paymentMethod === "card") loadCards();
  }, [paymentMethod, loadCards]);

  const handleConfirmOrder = async () => {
    if (isCreating) return;
    if (paymentMethod === "card" && !selectedCard) {
      setError(t("chooseCardFirst"));
      return;
    }
    setIsCreating(true);
    setError("");

    const photos = Object.values(orderDetails.images || {}).filter((p) => p && p.uri);

    const result = await createOrder({
      masterId: master.id || master._id,
      device: orderDetails?.device || "",
      deviceModel: orderDetails?.deviceModel || "",
      issue: orderDetails?.issue || "",
      description: orderDetails?.description || "",
      comment,
      deliveryMethod,
      paymentMethod,
      userLocation: { lat: userLocation.lat, lng: userLocation.lng },
      photos,
    });

    if (!result.ok) {
      setError(result.message || t("error"));
      setIsCreating(false);
      return;
    }

    let finalOrder = result.order;
    if (paymentMethod === "card") {
      try {
        const res = await fetch(apiUrl(`/api/payments/orders/${result.order.id || result.order._id}/pay`), {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            method: "card",
            cardId: selectedCard.id,
          }),
        });
        const data = await res.json();
        if (data.success && data.data && data.data.order) finalOrder = data.data.order;
      } catch {}
    } else if (paymentMethod === "click" || paymentMethod === "payme") {
      try {
        const oid = result.order.id || result.order._id;
        const res = await fetch(apiUrl(`/api/payments/orders/${oid}/${paymentMethod}/link`), {
          method: "POST",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data && data.data.url) {
          Linking.openURL(data.data.url).catch(() => {});
        } else {
          setError((data && data.message) || t("paymentFailed"));
        }
      } catch {}
    }

    navigation.replace("OrderTracking", { orderData: finalOrder, viewerRole: "user" });
    setIsCreating(false);
  };

  const optionCard = (selected, onSelect, title, desc, iconName) => (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [{
        padding: 12, borderRadius: theme.radius.md,
        borderWidth: selected ? 2 : 1, borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.primaryLight : theme.surface,
        flexDirection: "row", alignItems: "center", gap: 10,
      }, pressed && { opacity: 0.85 }]}
    >
      {iconName ? <Icon name={iconName} size={20} color={theme.success} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: selected ? theme.primaryDark : theme.text }}>{title}</Text>
        <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, marginTop: 2 }}>{desc}</Text>
      </View>
      {selected && <Icon name="check-circle" size={18} color={theme.success} />}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ alignSelf: "flex-start", backgroundColor: theme.neumorph.surface, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center", ...theme.neumorph.raisedSm }, pressed && { ...theme.neumorph.pressed }]}>
            <Icon name="chevron-left" size={18} color={theme.text} />
          </Pressable>
        </View>

        {/* Xarita */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <View style={{ borderRadius: theme.neumorph.radiusLg, overflow: "hidden", ...theme.neumorph.raisedSm }}>
            <MapCard
              center={{ lat: (userLat + masterLat) / 2, lng: (userLng + masterLng) / 2 }}
              height={200}
              markers={[{ lat: userLat, lng: userLng, color: "rd" }, { lat: masterLat, lng: masterLng, color: "gn" }]}
              from={{ lat: userLat, lng: userLng }}
              to={{ lat: masterLat, lng: masterLng }}
            />
          </View>
        </View>

        <View style={{ backgroundColor: theme.bg, padding: 16, gap: 16 }}>
          {/* Usta */}
          <View style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 16, gap: 12, ...theme.shadowSm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: theme.textInverse, fontSize: 18, fontWeight: "700" }}>{master?.name ? master.name.charAt(0) : "A"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }} numberOfLines={1}>{master?.name || ""}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name="star" size={13} color="#f59e0b" />
                      <Text style={{ color: theme.warning, fontWeight: "700", fontSize: 12 }}>{master?.rating || "0"}</Text>
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>({master?.reviewsCount || "0"})</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{t("experience")}</Text>
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.primary }}>{master?.experience || ""}</Text>
              </View>
            </View>
            {masterPhone ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
                <Icon name="phone" size={16} color={theme.success} />
                <Text style={{ fontWeight: "600", color: theme.text, fontSize: 13 }}>{masterPhone}</Text>
              </View>
            ) : null}
          </View>

          {/* Narx */}
          <View style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 16, gap: 12, ...theme.shadowSm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 2 }}>{t("price")}</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text }}>{formatPrice(price, master?.currency)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: "700" }}>+{formatPrice(deliveryFee)}</Text>
                <Text style={{ fontSize: 10, color: theme.textSecondary }}>{deliveryMethod === "master_pickup" ? t("deliveryFee") : ""}</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{t("total")}</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: theme.primary }}>{formatPrice(total)}</Text>
            </View>
          </View>

          {/* Variantlar */}
          <View style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 14, gap: 10, ...theme.shadowSm }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{t("deliveryOption")}</Text>
            <View style={{ gap: 10 }}>
              {optionCard(deliveryMethod === "master_pickup", () => setDeliveryMethod("master_pickup"), t("pickupByMaster"), t("pickupByMasterDesc"), "truck")}
              {optionCard(deliveryMethod === "self_dropoff", () => setDeliveryMethod("self_dropoff"), t("selfDropoff"), t("selfDropoffDesc"), "store")}
            </View>

            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text, marginTop: 6 }}>{t("paymentMethod")}</Text>
            <View style={{ gap: 10 }}>
              {optionCard(paymentMethod === "cash_on_delivery", () => setPaymentMethod("cash_on_delivery"), t("cashOnDelivery"), t("cashOnDesc"), "banknote")}
              {optionCard(paymentMethod === "payme", () => setPaymentMethod("payme"), t("payme"), t("paymeDesc"), "credit-card")}
              {optionCard(paymentMethod === "click", () => setPaymentMethod("click"), t("click"), t("clickDesc"), "credit-card")}
              {optionCard(paymentMethod === "card", () => setPaymentMethod("card"), t("onlinePayment"), t("onlineDesc"), "credit-card")}
            </View>

            {paymentMethod === "card" && (
              <View style={{ backgroundColor: theme.primaryLight, borderWidth: 1.5, borderColor: theme.success, borderRadius: theme.radius.md, padding: 14, gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="credit-card" size={15} color={theme.success} />
                  <Text style={{ fontSize: 12, fontWeight: "800", color: theme.success }}>{t("chooseCard")}</Text>
                </View>
                {cards === null ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : cards.length === 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>{t("noCardsHint")}</Text>
                    <Pressable
                      onPress={() => navigation.navigate("Cards")}
                      style={({ pressed }) => [
                        { alignSelf: "flex-start", paddingVertical: 9, paddingHorizontal: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", gap: 6 },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Icon name="plus" size={14} color={theme.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.primary }}>{t("addCard")}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {cards.map((c) => {
                      const active = selectedCard && selectedCard.id === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedCard(c)}
                          style={({ pressed }) => [
                            { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: theme.radius.md, borderWidth: active ? 2 : 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.surface : theme.bgSecondary },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Icon name="credit-card" size={18} color={active ? theme.primary : theme.textSecondary} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "800", color: active ? theme.primary : theme.text }}>
                              {"\u2022\u2022\u2022\u2022"} {c.last4}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textTertiary, textTransform: "uppercase" }}>
                              {c.brand} {c.isDefault ? `\u2022 ${t("default")}` : ""}
                            </Text>
                          </View>
                          {active && <Icon name="check-circle" size={18} color={theme.success} />}
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => navigation.navigate("Cards")}
                      style={({ pressed }) => [
                        { alignSelf: "flex-start", paddingVertical: 9, paddingHorizontal: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", gap: 6 },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Icon name="plus" size={14} color={theme.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.primary }}>{t("addCard")}</Text>
                    </Pressable>
                  </View>
                )}
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{t("cardSecureHint")}</Text>
              </View>
            )}
          </View>

          <TextInput
            placeholder={t("fieldRequired")}
            placeholderTextColor={theme.textTertiary}
            value={comment}
            onChangeText={setComment}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, color: theme.text, backgroundColor: theme.neumorph.insetBg, ...theme.neumorph.inset }}
          />

          {error ? <Text style={{ color: theme.error, fontSize: 12, fontWeight: "700", textAlign: "center" }}>{error}</Text> : null}

          <Pressable onPress={handleConfirmOrder} disabled={isCreating} style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16,
            opacity: isCreating ? 0.75 : 1, ...theme.shadowMd,
          }, pressed && { opacity: 0.85 }]}>
            {isCreating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="shopping-cart" size={18} color="#FFFFFF" />}
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textInverse }}>{isCreating ? t("loading") : t("orderNow")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default PreOrder;