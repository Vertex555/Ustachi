import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, Image } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import { apiUrl, authHeaders } from "../services/api";
import { fetchOrders } from "../services/orders";

// Umumiy bosh sahifa: foydalanuvchi va usta uchun.
// variant="user"   -> xizmat kategoriyalari + ommabop xizmatlar
// variant="master" -> statistika + yangi buyurtmalar + yangiliklar
// Ikkalasida ham "yangiliklar" (news) bloki bor.

const CATEGORIES = [
  { key: "Smartfon", name: "Smartfon", icon: "smartphone" },
  { key: "Noutbuk", name: "Noutbuk", icon: "laptop" },
  { key: "Planshet", name: "Planshet", icon: "tablet" },
  { key: "Soat", name: "Smart-soat", icon: "watch" },
  { key: "TV", name: "Televizor", icon: "tv" },
  { key: "Dazmol", name: "Dazmol", icon: "zap" },
];

// Yangiliklar — backend endpoint'i yo'q, shuning uchun lokal ro'yxat.
// Keyin server'dan olishga tayyor.
const NEWS = [
  { id: "n1", icon: "sparkles", tone: "primary", titleKey: "newsAiTitle", bodyKey: "newsAiBody" },
  { id: "n2", icon: "percent", tone: "success", titleKey: "newsCashTitle", bodyKey: "newsCashBody" },
  { id: "n3", icon: "shield", tone: "info", titleKey: "newsWarrantyTitle", bodyKey: "newsWarrantyBody" },
];

export function HomeScreen({ variant = "user" }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isMaster = variant === "master";

  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [masterProfile, setMasterProfile] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchOrders(isMaster ? "master" : "user");
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    }

    // Guest usta profili hali katalogga chiqmagan bo'lishi mumkin
    if (isMaster) {
      try {
        const res = await fetch(apiUrl("/api/masters/me"), { headers: authHeaders() });
        const data = await res.json();
        setMasterProfile(res.ok && data.success ? data.data : null);
      } catch {
        setMasterProfile(null);
      }
    }
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

  const goOrders = () => navigation.navigate("Orders");
  const goChats = () => navigation.navigate("Chats");
  // Buyurtma yaratish oqimi (qurilma turi bilan)
  const goUpload = (device) => navigation.navigate("Upload", device ? { device } : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ===== HEADER: joylashuv (chap) + qo'ng'iroq/avatar (o'ng) ===== */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.neumorph.surface,
            borderRadius: theme.neumorph.radiusLg,
            padding: 12,
            marginBottom: 14,
            ...theme.neumorph.raisedLg,
          }}
        >
          <Pressable
            onPress={() => goOrders()}
            style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.7 }]}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.neumorph.surface,
                alignItems: "center",
                justifyContent: "center",
                ...theme.neumorph.itemRaised,
              }}
            >
              <Icon name="map-pin" size={16} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: theme.textTertiary, fontWeight: "600" }}>{t("homeYourLocation")}</Text>
              <Text style={{ fontSize: theme.font.sm, color: theme.text, fontWeight: "800" }} numberOfLines={1}>
                {t("homeLocationDefault")}
              </Text>
            </View>
            <Icon name="chevron-down" size={16} color={theme.textTertiary} />
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 10 }}>
            <Pressable
              onPress={goChats}
              accessibilityLabel={t("chats")}
              style={({ pressed }) => [
                {
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.neumorph.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  ...theme.neumorph.itemRaised,
                },
                pressed && { ...theme.neumorph.pressed },
              ]}
            >
              <Icon name="bell" size={16} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Profile")}
              accessibilityLabel={t("profile")}
              style={({ pressed }) => [
                {
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Icon name="user" size={17} color={theme.textInverse} />
            </Pressable>
          </View>
        </View>

        {/* ===== QIDIRUV PANELI ===== */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: theme.neumorph.insetBg,
            borderRadius: theme.neumorph.radius,
            paddingHorizontal: 14,
            paddingVertical: 11,
            marginBottom: 14,
            ...theme.neumorph.inset,
          }}
        >
          <Icon name="search" size={17} color={theme.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("homeSearchPlaceholder")}
            placeholderTextColor={theme.textTertiary}
            style={{ flex: 1, fontSize: theme.font.sm, color: theme.text, padding: 0 }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="refresh-cw" size={15} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {/* ===== BANNER ===== */}
        <Pressable
          onPress={isMaster ? goOrders : () => goUpload()}
          style={({ pressed }) => [
            {
              backgroundColor: theme.primary,
              borderRadius: theme.neumorph.radiusLg,
              padding: 18,
              marginBottom: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              ...theme.neumorph.raised,
            },
            pressed && { ...theme.neumorph.pressed },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: theme.font.extrabold, color: theme.textInverse, letterSpacing: -0.3 }}>
              {t(isMaster ? "homeBannerTitleMaster" : "homeBannerTitle")}
            </Text>
            <Text style={{ fontSize: 11.5, color: theme.textInverse, opacity: 0.85, marginTop: 4, lineHeight: 16 }}>
              {t(isMaster ? "homeBannerSubtitleMaster" : "homeBannerSubtitle")}
            </Text>
            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 12,
                backgroundColor: theme.textInverse,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: theme.radius.full,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: "800", color: theme.primary }}>{t("homeExplore")}</Text>
            </View>
          </View>
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="wrench" size={34} color={theme.textInverse} />
          </View>
        </Pressable>

        {/* ===== PROFILNI TO'LDIRISH TAYRI (guest / nashr qilinmagan usta) ===== */}
        {isMaster && masterProfile && masterProfile.isPublished === false ? (
          <Pressable
            onPress={() => navigation.navigate("Anketa")}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: theme.neumorph.surface,
                borderRadius: theme.neumorph.radius,
                padding: 14,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: theme.warning,
                ...theme.neumorph.raised,
              },
              pressed && { ...theme.neumorph.pressed },
            ]}
          >
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: theme.neumorph.surface,
                alignItems: "center", justifyContent: "center",
                ...theme.neumorph.itemRaised,
              }}
            >
              <Icon name="alert-circle" size={19} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }}>
                {t("masterCompleteProfileTitle")}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2, lineHeight: 15 }}>
                {t("masterCompleteProfileBody")}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>
        ) : null}

        {/* ===== STATISTIKA (faqat usta uchun) ===== */}
        {isMaster ? (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
            {[
              { icon: "package", value: orders.length, labelKey: "homeStatOrders" },
              {
                icon: "check-circle",
                value: orders.filter((o) => o.status === "completed" || o.status === "done").length,
                labelKey: "homeStatDone",
              },
              {
                icon: "star",
                value: (orders.reduce((a, o) => a + (Number(o.rating) || 0), 0) / (orders.length || 1)).toFixed(1),
                labelKey: "homeStatRating",
              },
            ].map((s) => (
              <View
                key={s.labelKey}
                style={{
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: theme.neumorph.surface,
                  borderRadius: theme.neumorph.radius,
                  paddingVertical: 14,
                  paddingHorizontal: 6,
                  ...theme.neumorph.raised,
                }}
              >
                <Icon name={s.icon} size={19} color={theme.primary} />
                <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text, marginTop: 6 }}>{s.value}</Text>
                <Text style={{ fontSize: 9.5, color: theme.textTertiary, fontWeight: "600", textAlign: "center" }} numberOfLines={1}>
                  {t(s.labelKey)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ===== XIZMAT KATEGORIYALARI (faqat foydalanuvchi uchun) ===== */}
        {!isMaster ? (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: theme.font.md, fontWeight: "800", color: theme.text }}>{t("homeCategories")}</Text>
            <Pressable onPress={goOrders} hitSlop={8}>
              <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.primary }}>{t("homeViewAll")}</Text>
            </Pressable>
          </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => goUpload(c.key)}
                  style={({ pressed }) => [
                    {
                      width: "31.5%",
                      backgroundColor: theme.neumorph.surface,
                      borderRadius: theme.neumorph.radius,
                      paddingVertical: 12,
                      alignItems: "center",
                      gap: 7,
                      ...theme.neumorph.raisedSm,
                    },
                    pressed && { ...theme.neumorph.pressed },
                  ]}
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
                    <Icon name={c.icon} size={17} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 9.5, fontWeight: "700", color: theme.text, textAlign: "center" }} numberOfLines={1}>
                    {t("upd_" + c.key, c.name)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* ===== YANGILIKLAR (ikkala rol uchun ham) ===== */}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: theme.font.md, fontWeight: "800", color: theme.text }}>{t("homeNews")}</Text>
            <Icon name="sparkles" size={15} color={theme.primary} />
          </View>

          <View style={{ gap: 10 }}>
            {NEWS.map((n) => {
              const tone = theme[n.tone] || theme.primary;
              return (
                <View
                  key={n.id}
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
                    <Icon name={n.icon} size={17} color={tone} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }}>{t(n.titleKey)}</Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2, lineHeight: 15 }}>{t(n.bodyKey)}</Text>
                  </View>
                  <Icon name="chevron-down" size={15} color={theme.textTertiary} style={{ transform: [{ rotate: "-90deg" }] }} />
                </View>
              );
            })}
          </View>
        </View>

        {/* ===== OMMABOP / YANGI BUYURTMALAR ===== */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: theme.font.md, fontWeight: "800", color: theme.text }}>
              {isMaster ? t("homeNewOrders") : t("homePopular")}
            </Text>
            <Pressable onPress={goOrders} hitSlop={8}>
              <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.primary }}>{t("homeViewAll")}</Text>
            </Pressable>
          </View>

          {orders.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.neumorph.surface,
                borderRadius: theme.neumorph.radius,
                ...theme.neumorph.raisedSm,
              }}
            >
              <EmptyState
                theme={theme}
                icon="package"
                title={isMaster ? t("homeNoNewOrders") : t("homeNoPopular")}
                subtitle={isMaster ? t("homeNoNewOrdersHint") : t("homeNoPopularHint")}
                action={isMaster ? t("emptyRefresh") : t("emptyFindMaster")}
                onAction={() => (isMaster ? onRefresh() : goUpload())}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {orders.slice(0, 4).map((o) => (
                <Pressable
                  key={o.id || o._id}
                  onPress={goOrders}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: theme.neumorph.surface,
                      borderRadius: theme.neumorph.radius,
                      padding: 12,
                      ...theme.neumorph.raisedSm,
                    },
                    pressed && { ...theme.neumorph.pressed },
                  ]}
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
                    <Icon name="wrench" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }} numberOfLines={1}>
                      {o.deviceModel || o.device || t("homeOrder")}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: theme.textTertiary, marginTop: 2 }} numberOfLines={1}>
                      {o.issue || o.description || t("homeOrder")}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={15} color={theme.textTertiary} style={{ transform: [{ rotate: "-90deg" }] }} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default HomeScreen;
