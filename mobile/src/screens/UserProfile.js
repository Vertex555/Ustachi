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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { ConfirmLogoutModal } from "../components/ConfirmLogoutModal";
import { apiUrl, absoluteUrl } from "../config";
import { authHeaders } from "../services/api";
import { getAuthUser, clearAuth, updateAuthUser } from "../services/authStore";
import { fetchSavedMasters } from "../services/savedMasters";
import { fetchOrders } from "../services/orders";
import { displayPhone, isGuestPhone } from "../utils/display";

export default function UserProfile() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const user = getAuthUser();
  const [stats, setStats] = useState({ totalOrders: 0, reviewsGiven: 0 });
  const [savedCount, setSavedCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(user?.photo || "");

  const [newPhone, setNewPhone] = useState(user?.phone && !isGuestPhone(user?.phone) ? user?.phone : "+998 ");
  const [phoneError, setPhoneError] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const displayPhoneValue = displayPhone(user?.phone, t("guestPhone"));

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

  const handlePhoneInput = (text) => {
    const inputVal = text || "";
    if (!inputVal || inputVal.trim() === "" || inputVal === "+998") {
      setNewPhone("+998 ");
      setPhoneError("");
      return;
    }
    setNewPhone(formatPhoneNumber(inputVal));
    setPhoneError("");
  };

  const openEdit = () => {
    setNewPhone(user?.phone && !isGuestPhone(user?.phone) ? user?.phone : "+998 ");
    setPhoneError("");
    setEditing(true);
  };

  const closeEdit = () => {
    setPhoneError("");
    setEditing(false);
  };

  const handleAvatarChange = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      if (dataUrl.length > 1500000) {
        setSavedMsg(t("photoTooLarge"));
        setTimeout(() => setSavedMsg(""), 3000);
        return;
      }
      setAvatar(dataUrl);
      try {
        const res = await fetch(apiUrl("/api/users/me/profile"), {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ photo: dataUrl }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSavedMsg(t("profileUpdated"));
          updateAuthUser({ name, email, photo: dataUrl, phone: user?.phone });
          setTimeout(() => setSavedMsg(""), 2000);
        }
      } catch {}
    } catch {}
  };

  const removeAvatar = async () => {
    setAvatar("");
    try {
      await fetch(apiUrl("/api/users/me/profile"), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ photo: null }),
      });
      updateAuthUser({ name, email, photo: null, phone: user?.phone });
    } catch {}
  };

  const initial = (name || user?.name || "U").charAt(0).toUpperCase();

  const loadStats = useCallback(async () => {
    try {
      const orders = await fetchOrders();
      const reviewsGiven = (orders || []).filter((o) => (o.rating || 0) > 0).length;
      setStats({ totalOrders: (orders || []).length, reviewsGiven });
    } catch {}
    const saved = await fetchSavedMasters();
    setSavedCount(saved.length);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSaveProfile = async () => {
    const cleanName = name.trim();
    const cleanPhone = newPhone.replace(/\D/g, "");
    const digitsBeyondPrefix = cleanPhone.replace(/^998/, "").length;
    const phoneValid = /^998\d{9}$/.test(cleanPhone);
    if (digitsBeyondPrefix > 0 && !phoneValid) {
      setPhoneError(t("invalidPhone"));
      return;
    }
    const normalizedPhone = phoneValid ? "+" + cleanPhone : "";
    const payload = { name: cleanName, email: email.trim() };
    if (normalizedPhone) payload.phone = normalizedPhone;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/users/me/profile"), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditing(false);
        setSavedMsg(t("profileUpdated"));
        updateAuthUser({ name: cleanName, email: email.trim(), photo: avatar, phone: normalizedPhone || user?.phone });
        setTimeout(() => setSavedMsg(""), 2000);
      } else {
        setPhoneError(data.message || t("error"));
      }
    } catch {}
    setSaving(false);
  };

  const handleLogout = () => {
    setConfirmLogout(false);
    clearAuth();
  };

  // Neumorphism: input har doim "bosingan" (inset) holatda
  const inputModalStyle = {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 14,
    backgroundColor: theme.neumorph.insetBg,
    color: theme.text,
    ...theme.neumorph.inset,
  };

  // Neumorphism: menyu qatori "ko'tarilgan" (raised)
  const menuRowStyle = ({ pressed }) => [
    {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      backgroundColor: theme.neumorph.surface,
      borderRadius: theme.neumorph.radius,
      ...theme.neumorph.raised,
    },
    pressed && { ...theme.neumorph.pressed, opacity: 0.92 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }}>{t("myProfile")}</Text>
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: theme.neumorph.surface,
                borderWidth: 0,
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 20,
                ...theme.neumorph.raisedSm,
              },
              pressed && { ...theme.neumorph.pressed },
            ]}
          >
            <Icon name="pencil" size={14} color={theme.primary} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.primary }}>{t("editProfile")}</Text>
          </Pressable>
        </View>

        {!!savedMsg && (
          <View
            style={{ backgroundColor: theme.successLight, borderRadius: theme.radius.md, padding: 10, marginBottom: 12, alignItems: "center" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.success }}>{savedMsg}</Text>
          </View>
        )}

        {/* Profil kartasi — ko'tarilgan (raised) */}
        <View
          style={{
            backgroundColor: theme.neumorph.surface,
            borderWidth: 0,
            borderRadius: theme.neumorph.radiusLg,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            ...theme.neumorph.raised,
          }}
        >
          <Pressable
            onPress={handleAvatarChange}
            style={({ pressed }) => [
              {
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              },
              pressed && { opacity: 0.85 },
            ]}          >
            {avatar ? (
              <Image
                source={{ uri: avatar.startsWith("data:") || avatar.startsWith("http") || avatar.startsWith("file:") ? avatar : absoluteUrl(avatar) }}
                style={{ width: "100%", height: "100%", borderRadius: 38 }}
              />
            ) : (
              <Text style={{ fontSize: 30, fontWeight: "800", color: theme.textInverse }}>{initial}</Text>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: theme.primary,
                borderWidth: 2,
                borderColor: theme.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="camera" size={13} color="#FFFFFF" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text, marginBottom: 4 }}>
              {name || user?.name || t("user")}
            </Text>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="phone" size={13} color={theme.textSecondary} />
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>{displayPhoneValue}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="mail" size={13} color={theme.textSecondary} />
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>{email || ""}</Text>
              </View>
            </View>
            {!!avatar && (
              <Pressable onPress={removeAvatar} style={({ pressed }) => [{ paddingTop: 4 }, pressed && { opacity: 0.85 }]}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.error }}>{t("removeAvatar")}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Statistika */}
        <View style={{ flexDirection: "row", gap: 10, marginVertical: 16 }}>
          {[
            { value: stats.totalOrders, label: t("totalOrders") },
            { value: savedCount, label: t("savedMasters") },
            { value: stats.reviewsGiven, label: t("reviewsGiven") },
          ].map((s, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: theme.neumorph.surface,
                borderWidth: 0,
                borderRadius: theme.neumorph.radius,
                padding: 12,
                alignItems: "center",
                ...theme.neumorph.raised,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "900", color: theme.primary }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: "600", marginTop: 2, textAlign: "center" }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menyu */}
        <View style={{ gap: 10 }}>
          <Pressable onPress={() => navigation.navigate("Settings")} style={menuRowStyle}>
            <Icon name="settings" size={20} color={theme.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("settings")}</Text>
            <Icon name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Help")} style={menuRowStyle}>
            <Icon name="life-buoy" size={20} color={theme.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("helpSupport")}</Text>
            <Icon name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Cards")} style={menuRowStyle}>
            <Icon name="credit-card" size={20} color={theme.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("myCards")}</Text>
            <Icon name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Feedback")} style={menuRowStyle}>
            <Icon name="message-square" size={20} color={theme.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>{t("feedback")}</Text>
            <Icon name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            onPress={() => setConfirmLogout(true)}
            style={({ pressed }) => [
              {
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                backgroundColor: theme.neumorph.surface,
                borderWidth: 0,
                borderRadius: theme.neumorph.radius,
                ...theme.neumorph.raised,
              },
              pressed && { ...theme.neumorph.pressed },
            ]}
          >
            <Icon name="log-out" size={20} color={theme.error} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: theme.error }}>{t("logout")}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmLogoutModal
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />

      {/* Edit Profile modal */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={closeEdit}
          />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={{
                  backgroundColor: theme.neumorph.surface,
                  borderRadius: theme.neumorph.radiusLg,
                  padding: 22,
                  width: "100%",
                  maxWidth: 380,
                  gap: 12,
                  flexShrink: 1,
                  ...theme.neumorph.raised,
                }}
              >
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.text }}>{t("editProfile")}</Text>

            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, margin: 0 }}>{t("fullName2")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="To'liq ism"
              placeholderTextColor={theme.textTertiary}
              style={inputModalStyle}
            />

            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, margin: 0 }}>{t("emailAddress")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@mail.com"
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={inputModalStyle}
            />

            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, margin: 0 }}>{t("phoneNumber")}</Text>
            <TextInput
              value={newPhone}
              onChangeText={handlePhoneInput}
              placeholder="+998 (90) 123-45-67"
              placeholderTextColor={theme.textTertiary}
              keyboardType="phone-pad"
              style={inputModalStyle}
            />
            {!!phoneError && (
              <Text style={{ fontSize: 11, color: theme.error, fontWeight: "700" }}>{phoneError}</Text>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Pressable
                onPress={closeEdit}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.neumorph.surface, borderRadius: 12, paddingVertical: 12, alignItems: "center", ...theme.neumorph.raised },
                  pressed && { ...theme.neumorph.pressed },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                disabled={saving}
                style={({ pressed }) => [
                  { flex: 1, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.textInverse} />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: "800", color: theme.textInverse }}>{t("save")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}