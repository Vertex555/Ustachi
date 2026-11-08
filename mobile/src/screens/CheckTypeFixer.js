import React, { useState, useEffect, useRef, useCallback } from "react";
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
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { MapCard } from "../components/MapCard";
import { apiUrl, absoluteUrl } from "../config";
import { authHeaders } from "../services/api";
import { getAuthUser, setRole } from "../services/authStore";
import { isGuestPhone } from "../utils/display";

// Daqiqa <-> "HH:MM"
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};
const fromMinutes = (min) => {
  if (min == null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Chiroyli soat: minimal — label + native vaqt tanlash (RN)
function TimeWheel({ label, icon, value, onChange, theme, t }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={14} color={theme.primary} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.textSecondary }}>{label}</Text>
      </View>
      <Pressable
        onPress={() => {
          if (value == null) onChange(9 * 60);
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.bgSecondary,
            color: theme.text,
            fontSize: 15,
            fontWeight: "700",
            ...theme.neumorph.raisedSm,
          }}
          value={value == null ? "" : fromMinutes(value)}
          onChangeText={(v) => {
            const m = toMinutes(v);
            onChange(m == null ? null : m);
          }}
          placeholder="00:00"
          placeholderTextColor={theme.textTertiary}
          keyboardType="numbers-and-punctuation"
        />
      </Pressable>
    </View>
  );
}

const CURRENCIES = [
  { code: "uzs", label: "so'm" },
  { code: "rub", label: "RUB" },
  { code: "usd", label: "$" },
  { code: "eur", label: "EUR" },
];

export default function CheckTypeFixer() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [photo, setPhoto] = useState("");
  const [masterName, setMasterName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+998 ");
  const [experience, setExperience] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("uzs");
  const [workStartMin, setWorkStartMin] = useState(null);
  const [workEndMin, setWorkEndMin] = useState(null);
  const [location, setLocation] = useState({ lat: 41.311081, lng: 69.240562, address: "Toshkent shahar" });
  const [isLocating, setIsLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const prefilledLocationRef = useRef(false);

  const initial = route.params?.initial;

  const availableDevices = [
    { id: "Smartfon", name: "Smartfon", icon: "smartphone" },
    { id: "Noutbuk", name: "Noutbuk", icon: "laptop" },
    { id: "Planshet", name: "Planshet", icon: "tablet" },
    { id: "Soat", name: "Smart-soat", icon: "watch" },
    { id: "TV", name: "Televizor", icon: "tv" },
    { id: "Dazmol", name: "Dazmol", icon: "iron" },
    { id: "Changyutgich", name: "Changyutgich", icon: "wind" },
    { id: "Fen", name: "Soch feni", icon: "zap" },
    { id: "Mikrotolqin", name: "Mikrotolqinli pech", icon: "box" },
    { id: "Muzlatgich", name: "Muzlatgich", icon: "archive" },
    { id: "Kir yuvish", name: "Kir mashina", icon: "refresh-cw" },
    { id: "Konditsioner", name: "Konditsioner", icon: "snowflake" },
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

  const handlePhoneChange = (text) => {
    const inputVal = text || "";
    if (inputVal.length <= 4) {
      setPhoneNumber("+998 ");
      return;
    }
    const formatted = formatPhoneNumber(inputVal);
    setPhoneNumber(formatted);
    if (errors.phone) setErrors({ ...errors, phone: false });
  };

  const handlePriceChange = (text) => {
    let v = (text || "").replace(/\D/g, "");
    if (v === "") {
      setPrice("");
      return;
    }
    let n = parseInt(v, 10);
    if (Number.isNaN(n)) n = 0;
    if (n > 1000000000) n = 1000000000;
    setPrice(String(n));
  };

  useEffect(() => {
    const m = initial;
    if (!m) return;
    setMasterName(m.name || "");
    setPhoneNumber(m.phone && !isGuestPhone(m.phone) ? formatPhoneNumber(m.phone) : "+998 ");
    setExperience(m.experience || "");
    setSelectedDevices(Array.isArray(m.devices) ? m.devices : []);
    setPrice(m.price ? String(m.price) : "");
    setCurrency(m.currency || "uzs");
    if (m.workingHours) {
      const parts = String(m.workingHours)
        .split("-")
        .map((p) => p.trim());
      const s = toMinutes(parts[0]);
      const e = toMinutes(parts[1]);
      if (s != null) setWorkStartMin(s);
      if (e != null) setWorkEndMin(e);
    }
    if (m.location) {
      setLocation({
        lat: m.location.lat || 41.311081,
        lng: m.location.lng || 69.240562,
        address: m.location.address || m.location.label || "Toshkent shahar",
      });
      prefilledLocationRef.current = true;
    }
    if (m.photo) setPhoto(m.photo);
  }, [initial]);

  const detectLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setServerError("Lokatsiyani aniqlab bo'lmadi. GPS yoqilganligini tekshiring.");
        setIsLocating(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const addressName = place
          ? [place.name, place.street, place.city, place.region, place.country].filter(Boolean).join(", ")
          : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setLocation({ lat, lng, address: addressName });
      } catch (error) {
        setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    } catch (error) {
      console.error("Lokatsiyani olishda xatolik:", error);
      setServerError("Lokatsiyani aniqlab bo'lmadi. GPS yoqilganligini tekshiring.");
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    if (prefilledLocationRef.current) return;
    detectLocation();
  }, [detectLocation]);

  const pickPhoto = async (fromCamera) => {
    let result;
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setServerError("Kamera ruxsati berilmagan");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      }
    } catch (error) {
      console.error("Rasm tanlashda xatolik:", error);
      return;
    }
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    const value = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    setPhoto(value);
    if (errors.photo) setErrors({ ...errors, photo: false });
  };

  const toggleDeviceSelection = (deviceId) => {
    let updated;
    if (selectedDevices.includes(deviceId)) {
      updated = selectedDevices.filter((id) => id !== deviceId);
    } else {
      updated = [...selectedDevices, deviceId];
    }
    setSelectedDevices(updated);
    if (updated.length > 0 && errors.devices) {
      setErrors({ ...errors, devices: false });
    }
  };

  const handleSubmit = async () => {
    setServerError("");

    let newErrors = {};
    if (!masterName.trim()) newErrors.name = true;
    if (phoneNumber.length < 19) newErrors.phone = true;
    if (!experience.trim()) newErrors.experience = true;
    if (selectedDevices.length === 0) newErrors.devices = true;
    const bothTimes = workStartMin != null && workEndMin != null;
    if (bothTimes && workStartMin >= workEndMin) newErrors.hours = true;
    if (
      (workStartMin != null && workEndMin == null) ||
      (workStartMin == null && workEndMin != null)
    ) newErrors.hours = true;
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
      currency,
      workingHours:
        workStartMin == null && workEndMin == null
          ? ""
          : bothTimes
            ? `${fromMinutes(workStartMin)} - ${fromMinutes(workEndMin)}`
            : fromMinutes(workStartMin != null ? workStartMin : workEndMin),
      location: {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
      },
    };
    if (photo && (photo.startsWith("data:") || photo.startsWith("http"))) masterData.photo = photo;

    setSaving(true);
    try {
      const response = await fetch(apiUrl("/api/masters"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(masterData),
      });

      const data = await response.json();
      if (response.ok) {
        setServerError("");
        setIsSuccessModalOpen(true);
      } else {
        setServerError(data.error || data.message || "Ma'lumotni saqlashda xatolik yuz berdi.");
      }
    } catch (error) {
      console.error("Server bilan ulanishda xatolik:", error);
      setServerError("Server bilan ulanib bo'lmadi. Backend ishlayotganini tekshiring.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessModalOk = async () => {
    setIsSuccessModalOpen(false);
    const user = getAuthUser();
    // Anketa to'ldirilgach rol SERVERDA ham "master" qilib saqlanadi.
    // Aks holda usta bo'limi mijoz oynalari bilan ochilib qolardi (rol lokal
    // o'zgarib, server "user" bo'lib qolishi — buyurtmani qabul qilish yo'qolardi).
    if (user && user.role !== "master") {
      try {
        const updated = await setRole("master");
        if (updated && updated.role === "master") {
          // MainNavigator key orqali qayta o'rnatilib, MasterHome ochiladi
          if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
          return;
        }
      } catch {}
    }
    if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
  };

  const cardStyle = {
    backgroundColor: theme.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  };

  const labelStyle = (labelColor) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    color: labelColor || theme.textSecondary,
  });

  const inputStyle = (err) => ({
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: err ? theme.error : theme.border,
    fontSize: theme.font.sm,
    fontWeight: "500",
    color: theme.text,
    backgroundColor: theme.surface,
  });

  const sectionLabel = (iconName, labelText, iconColor, textColor, asterisk) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <Icon name={iconName} size={15} color={iconColor} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: textColor }}>
        {labelText}
        {asterisk ? <Text style={{ color: theme.error }}> *</Text> : null}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bgSecondary }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
              ...theme.shadowSm,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="chevron-left" size={20} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: theme.text, letterSpacing: -0.3 }}>
            {t("cf_title")}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textTertiary, fontWeight: "400" }}>{t("cf_headerDesc")}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("RoleSelection")}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: theme.successLight,
              borderWidth: 1,
              borderColor: theme.success,
              color: theme.success,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 20,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="repeat" size={13} color={theme.success} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.success }}>{t("cf_changeRole")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {!!serverError && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: theme.errorLight,
              borderWidth: 1,
              borderColor: theme.error,
              color: theme.error,
              padding: 10,
              borderRadius: 10,
            }}
          >
            <Icon name="alert-triangle" size={16} color={theme.error} />
            <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: theme.error }}>{serverError}</Text>
          </View>
        )}

        {/* Foto */}
        <View style={{ ...cardStyle }}>
          {sectionLabel("camera", t("cf_photo"), theme.primary, theme.textSecondary, false)}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => pickPhoto(false)}
              style={({ pressed }) => [
                {
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: theme.bgSecondary,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              {photo ? (
                <Image
                  source={{ uri: photo.startsWith("data:") || photo.startsWith("http") || photo.startsWith("file:") ? photo : absoluteUrl(photo) }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Icon name="user" size={30} color={theme.textTertiary} />
              )}
            </Pressable>
            <Pressable
              onPress={() => pickPhoto(false)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  backgroundColor: theme.bgSecondary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name="image" size={15} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>{t("up_upload")}</Text>
            </Pressable>
            <Pressable
              onPress={() => pickPhoto(true)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  backgroundColor: theme.bgSecondary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name="camera" size={15} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>{t("up_camera")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Ism */}
        <View style={{ ...cardStyle, borderColor: errors.name ? theme.error : theme.border }}>
          {sectionLabel("user", t("cf_fullName"), errors.name ? theme.error : theme.primary, errors.name ? theme.error : theme.textSecondary, true)}
          <TextInput
            placeholder={t("cf_namePlaceholder")}
            placeholderTextColor={theme.textTertiary}
            value={masterName}
            onChangeText={(text) => {
              setMasterName(text);
              if (errors.name) setErrors({ ...errors, name: false });
            }}
            style={inputStyle(errors.name)}
          />
        </View>

        {/* Telefon */}
        <View style={{ ...cardStyle, borderColor: errors.phone ? theme.error : theme.border }}>
          {sectionLabel("phone", t("cf_phone"), errors.phone ? theme.error : theme.primary, errors.phone ? theme.error : theme.textSecondary, true)}
          <TextInput
            placeholder="+998 (90) 123-45-67"
            placeholderTextColor={theme.textTertiary}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            style={{ ...inputStyle(errors.phone), letterSpacing: 0.5, fontWeight: "600" }}
          />
        </View>

        {/* Tajriba */}
        <View style={{ ...cardStyle, borderColor: errors.experience ? theme.error : theme.border }}>
          {sectionLabel("briefcase", t("cf_experience"), errors.experience ? theme.error : theme.primary, errors.experience ? theme.error : theme.textSecondary, true)}
          <TextInput
            placeholder={t("cf_expPlaceholder")}
            placeholderTextColor={theme.textTertiary}
            value={experience}
            onChangeText={(text) => {
              setExperience(text);
              if (errors.experience) setErrors({ ...errors, experience: false });
            }}
            style={inputStyle(errors.experience)}
          />
        </View>

        {/* Narx */}
        <View style={{ ...cardStyle, borderColor: errors.priceRange ? theme.error : theme.border }}>
          {sectionLabel("banknote", t("cf_price"), theme.primary, theme.textSecondary, false)}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {CURRENCIES.map((c) => {
              const active = currency === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primaryLight : theme.bgSecondary,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      ...theme.neumorph.raisedSm,
                    },
                    pressed && { ...theme.neumorph.pressed },
                  ]}
                >
                  <Text style={{ fontSize: 15, fontWeight: "800", color: active ? theme.primary : theme.textSecondary }}>{c.label}</Text>
                  {active && <Icon name="check" size={12} color={theme.primary} />}
                </Pressable>
              );
            })}
          </View>
          <View style={{ position: "relative" }}>
            <TextInput
              placeholder={t("cf_pricePlaceholder")}
              placeholderTextColor={theme.textTertiary}
              value={price}
              onChangeText={handlePriceChange}
              keyboardType="number-pad"
              style={{ ...inputStyle(false), paddingRight: 52 }}
            />
            <Text
              style={{
                position: "absolute",
                right: 14,
                top: 0,
                bottom: 0,
                textAlignVertical: "center",
                color: theme.textSecondary,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {(CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]).label}
            </Text>
          </View>
          {errors.priceRange && (
            <Text style={{ fontSize: 11, color: theme.error, fontWeight: "bold", marginTop: 6 }}>
              {t("cf_priceError")}
            </Text>
          )}
        </View>

        {/* Ish vaqti (soat tanlagich) */}
        <View style={{ ...cardStyle, borderColor: errors.hours ? theme.error : theme.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Icon name="clock" size={15} color={errors.hours ? theme.error : theme.primary} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: errors.hours ? theme.error : theme.textSecondary }}>
              {t("cf_workingHours")}
            </Text>
            <Text style={{ fontSize: 10, color: theme.textTertiary }}>{t("cf_hoursHint")}</Text>
          </View>
          <View style={{ gap: 12 }}>
            <TimeWheel
              label={t("cf_hoursStart")}
              icon="sun"
              value={workStartMin}
              onChange={(v) => { setWorkStartMin(v); if (errors.hours) setErrors({ ...errors, hours: false }); }}
              theme={theme}
              t={t}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: theme.neumorph.insetBg, ...theme.neumorph.inset }}>
              <Icon name="repeat" size={14} color={theme.textTertiary} />
              <Text style={{ fontSize: 12, color: theme.textTertiary, fontWeight: "600" }}>{t("cf_hoursUntil")}</Text>
            </View>
            <TimeWheel
              label={t("cf_hoursEnd")}
              icon="moon"
              value={workEndMin}
              onChange={(v) => { setWorkEndMin(v); if (errors.hours) setErrors({ ...errors, hours: false }); }}
              theme={theme}
              t={t}
            />
          </View>
          {errors.hours && (
            <Text style={{ fontSize: 11, color: theme.error, fontWeight: "bold", marginTop: 6 }}>
              {t("cf_hoursError")}
            </Text>
          )}
        </View>

        {/* Qurilmalar */}
        <View style={{ ...cardStyle, borderColor: errors.devices ? theme.error : theme.border }}>
          {sectionLabel("wrench", t("cf_deviceSelect"), errors.devices ? theme.error : theme.primary, errors.devices ? theme.error : theme.textSecondary, true)}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {availableDevices.map((dev) => {
              const isSelected = selectedDevices.includes(dev.id);
              return (
                <Pressable
                  key={dev.id}
                  onPress={() => toggleDeviceSelection(dev.id)}
                  style={({ pressed }) => [
                    {
                      width: "48%",
                      paddingVertical: 9,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? theme.primary : errors.devices ? theme.error : theme.border,
                      backgroundColor: isSelected ? theme.successLight : errors.devices ? theme.errorLight : theme.bgSecondary,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Icon name={dev.icon} size={14} color={isSelected ? theme.success : theme.textSecondary} />
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, overflow: "hidden", fontSize: 11, fontWeight: "600", color: isSelected ? theme.success : theme.textSecondary }}
                    >
                      {t(`upd_${dev.id}`, dev.name)}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Icon name="check-circle" size={14} color={theme.success} />
                  ) : (
                    <Icon name="plus-circle" size={14} color={theme.textTertiary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Joylashuv */}
        <View style={{ ...cardStyle, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {sectionLabel("map-pin", t("cf_location"), theme.primary, theme.textSecondary, false)}
            <Pressable
              onPress={detectLocation}
              disabled={isLocating}
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name="rotate-cw" size={13} color={theme.secondary} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.secondary }}>
                {isLocating ? t("cf_locating") : t("cf_refresh")}
              </Text>
            </Pressable>
          </View>

          <MapCard
            center={location}
            markers={[{ lat: location.lat, lng: location.lng, color: "rd" }]}
            height={160}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: theme.bgSecondary,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Icon name="map-pin" size={14} color={theme.secondary} />
            <Text style={{ flex: 1, fontSize: 12, color: theme.textSecondary, fontWeight: "500" }}>
              {location.address}
            </Text>
          </View>
        </View>

        {/* Saqlash */}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={({ pressed }) => [
            {
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingVertical: 14,
              marginTop: 6,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              ...theme.shadowMd,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.textInverse} />
          ) : (
            <>
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.textInverse }}>
                {t("cf_saveAndStart")}
              </Text>
              <Icon name="arrow-right" size={16} color={theme.textInverse} />
            </>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={isSuccessModalOpen} transparent animationType="fade" onRequestClose={() => setIsSuccessModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <View
            style={{
              backgroundColor: theme.surface,
              padding: 24,
              borderRadius: 16,
              width: "100%",
              maxWidth: 340,
              alignItems: "center",
              gap: 14,
              ...theme.shadowLg,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.successLight,
                borderWidth: 2,
                borderColor: theme.success,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="check" size={28} color={theme.success} />
            </View>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>{t("cf_savedTitle")}</Text>
              <Text style={{ fontSize: 13, color: theme.textTertiary, fontWeight: "400", textAlign: "center" }}>
                {t("cf_savedDesc")}
              </Text>
            </View>
            <Pressable
              onPress={handleSuccessModalOk}
              style={({ pressed }) => [
                {
                  width: "100%",
                  backgroundColor: theme.primary,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 6,
                  ...theme.shadowMd,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.textInverse }}>{t("ok")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}