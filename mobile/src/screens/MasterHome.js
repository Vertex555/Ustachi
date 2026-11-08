import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { ConfirmLogoutModal } from "../components/ConfirmLogoutModal";
import FloatingTabBar from "../components/FloatingTabBar";
import { apiUrl, authHeaders } from "../services/api";
import { clearAuth } from "../services/authStore";
import { CheckTypeFixer } from "./CheckTypeFixer";
import { OrdersView } from "./OrdersView";
import { ChatsView } from "./ChatsView";
import { HomeScreen } from "./HomeScreen";
import { PaymentScreen } from "./PaymentScreen";
import { subscribeBadges, getBadges, ensureBadges, focusTabBadge } from "../services/badgeStore";
import { formatPrice, formatWorkingHours, displayPhone } from "../utils/display";

const Tabs = createBottomTabNavigator();

const ICONS = {
  Home: "home",
  Anketa: "clipboard-list",
  Orders: "package",
  Chats: "message-circle",
  Payment: "credit-card",
  Profile: "user",
};

function OrdersTab(props) {
  useFocusEffect(useCallback(() => { focusTabBadge("orders"); }, []));
  return <OrdersView {...props} variant="master" />;
}

function ChatsTab(props) {
  useFocusEffect(useCallback(() => { focusTabBadge("chats"); }, []));
  return <ChatsView {...props} />;
}

function HomeTab(props) {
  return <HomeScreen {...props} variant="master" />;
}

function PaymentTab(props) {
  return <PaymentScreen {...props} variant="master" />;
}

const MasterAccount = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [details, setDetails] = useState(null);
  const [photo, setPhoto] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/masters/me"), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setDetails(data.data);
        if (data.data && data.data.photo) setPhoto(data.data.photo);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (text, isError = false) => {
    setMsgIsError(isError);
    setStatusMsg(text);
    setTimeout(() => setStatusMsg(""), 2500);
  };

  const savePhoto = async (dataUrl) => {
    try {
      const base = details || {};
      // Faqat rasm/nom yangilanadi — telefon va boshqa majburiy maydonlar
      // o'zgarmaydi (guest profili ham shu yo'l bilan ishlaydi)
      const res = await fetch(apiUrl("/api/masters/me"), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: base.name || "",
          photo: dataUrl || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhoto(data.data?.photo || dataUrl);
        if (data.data) setDetails(data.data);
        showMsg(t("profileUpdated"));
      } else {
        showMsg(data.message || t("error"), true);
      }
    } catch {
      showMsg(t("error"), true);
    }
  };

  const handlePhotoPick = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
      if (res.canceled || !res.assets || !res.assets.length) return;
      const a = res.assets[0];
      if (!a.base64) return;
      const dataUrl = `data:image/jpeg;base64,${a.base64}`;
      if (dataUrl.length > 1500000) {
        showMsg(t("photoTooLarge"), true);
        return;
      }
      setPhoto(dataUrl);
      await savePhoto(dataUrl);
    } catch {
      showMsg(t("error"), true);
    }
  };

  const d = details || {};
  const name = d.name || t("master");
  const phone = displayPhone(d.phone, t("guestPhone"));
  const devices = d.devices || [];
  const experience = d.experience;
  const price = d.price;
  const hours = d.workingHours;
  const location = (typeof d.location === "string" ? d.location : d.location?.address) || "";

  const row = (label, value, money) => (
    value ? (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
          {money ? <Icon name="banknote" size={15} color={theme.success} /> : null}
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text, textAlign: "right" }}>{value}</Text>
        </View>
      </View>
    ) : null
  );

  const photoSource = photo && (photo.startsWith("data:") || photo.startsWith("http")) ? { uri: photo } : photo ? { uri: apiUrl(photo) } : null;

  return (
    <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 800, alignSelf: "center", padding: 16 }} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 16, color: theme.text }}>{t("masterProfile")}</Text>
      <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Pressable onPress={handlePhotoPick} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
          {photoSource ? <Image source={photoSource} style={{ width: "100%", height: "100%", borderRadius: 38 }} resizeMode="cover" /> : <Text style={{ color: theme.textInverse, fontSize: 30, fontWeight: "800" }}>{(name || "M").charAt(0).toUpperCase()}</Text>}
          <View style={{ position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.surface }}>
            <Icon name="camera" size={13} color="#FFFFFF" />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 4, color: theme.text }}>{name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="phone" size={14} color={theme.textSecondary} />
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>{phone || t("guestPhone")}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="star" size={14} color="#f59e0b" />
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>{d.rating ?? d.rating ?? 0}</Text>
          </View>
        </View>
      </View>

      {statusMsg ? (
        <View style={{ padding: 12, borderRadius: theme.radius.md, marginTop: 12, backgroundColor: msgIsError ? theme.errorLight : theme.successLight }}>
          <Text style={{ fontSize: 13, fontWeight: "700", textAlign: "center", color: msgIsError ? theme.error : theme.success }}>{statusMsg}</Text>
        </View>
      ) : null}

      {(devices.length > 0 || experience || price || hours || location) && (
        <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text, marginBottom: 4 }}>{t("anketaData")}</Text>
          {row(t("masterExperience"), experience ? `${experience}+ ${t("masterYears")}` : null)}
          {row(t("masterDevices"), devices.length ? devices.join(", ") : null)}
          {row(t("masterPrice"), price ? formatPrice(price, d.currency) : null, true)}
          {row(t("masterHours"), hours ? formatWorkingHours(hours) : null)}
          {row(t("masterLocationLabel"), location)}
        </View>
      )}

      <View style={{ gap: 10, marginTop: 16 }}>
        <Pressable onPress={() => navigation.navigate("Settings")} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm }, pressed && { opacity: 0.85 }]}>
          <Icon name="settings" size={20} color={theme.textSecondary} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("settings")}</Text>
          <Icon name="chevron-right" size={18} color={theme.textTertiary} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Help")} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm }, pressed && { opacity: 0.85 }]}>
          <Icon name="life-buoy" size={20} color={theme.textSecondary} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("helpSupport")}</Text>
          <Icon name="chevron-right" size={18} color={theme.textTertiary} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Feedback")} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm }, pressed && { opacity: 0.85 }]}>
          <Icon name="message-square" size={20} color={theme.textSecondary} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("feedback")}</Text>
          <Icon name="chevron-right" size={18} color={theme.textTertiary} />
        </Pressable>
        <Pressable onPress={() => setConfirmLogout(true)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.errorLight, borderRadius: theme.radius.md }, pressed && { opacity: 0.85 }]}>
          <Icon name="log-out" size={20} color={theme.error} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: theme.error }}>{t("logout")}</Text>
        </Pressable>
      </View>

      <ConfirmLogoutModal
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); clearAuth(); }}
      />
    </ScrollView>
  );
};

export const MasterHome = () => {
  const { t } = useTranslation();
  const [badges, setBadges] = useState(getBadges());

  useEffect(() => {
    ensureBadges();
    const un = subscribeBadges(setBadges);
    return un;
  }, []);

  return (
    <Tabs.Navigator
      tabBar={(props) => <FloatingTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Home" component={HomeTab} options={{ title: t("home"), tabBarLabel: t("tabHome") }} />
      <Tabs.Screen name="Anketa" component={CheckTypeFixer} options={{ title: t("anketa"), tabBarLabel: t("tabAnketa") }} />
      <Tabs.Screen name="Orders" component={OrdersTab} options={{ title: t("orders"), tabBarLabel: t("tabOrders"), tabBarBadge: badges.orders || undefined }} />
      <Tabs.Screen name="Chats" component={ChatsTab} options={{ title: t("chats"), tabBarLabel: t("tabChats"), tabBarBadge: badges.chats || undefined }} />
      <Tabs.Screen name="Payment" component={PaymentTab} options={{ title: t("payment"), tabBarLabel: t("tabPayment") }} />
      <Tabs.Screen name="Profile" component={MasterAccount} options={{ title: t("profile"), tabBarLabel: t("tabProfile") }} />
    </Tabs.Navigator>
  );
};

export default MasterHome;