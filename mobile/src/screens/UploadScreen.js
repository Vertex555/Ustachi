import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as Location from "expo-location";
import { useVideoPlayer, VideoView, VideoPlayer } from "expo-video";
import { apiUrl, authHeaders } from "../services/api";
import { MapCard, openYandexMaps } from "../components/MapCard";
import { fetchSavedMasters, saveMaster, unsaveMaster } from "../services/savedMasters";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { analyzeDeviceMedia, matchIssue, matchDevice } from "../services/aiAnalysis";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";

const FALLBACK_LOCATION = { lat: 41.311081, lng: 69.240562 };

function probeVideoDuration(uri) {
  return new Promise((resolve) => {
    let player;
    try {
      player = new VideoPlayer({ uri }, { play: false });
    } catch {
      resolve(0);
      return;
    }
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      try { player.release(); } catch {}
      resolve(v);
    };
    const timer = setTimeout(() => finish(0), 6000);
    try {
      const initial = Number(player.duration) || 0;
      if (initial > 0) { clearTimeout(timer); finish(initial); return; }
    } catch {}
    try {
      player.addListener("sourceLoad", ({ duration }) => {
        clearTimeout(timer);
        finish(Number(duration) || 0);
      });
    } catch {}
  });
}

async function captureFrame(uri, seconds, slot) {
  try {
    const ms = Math.round(Math.max(0.1, Number(seconds) || 0) * 1000);
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: ms, quality: 0.85 });
    return { slot, uri: thumbUri, name: `frame_${slot}.jpg`, type: "image/jpeg" };
  } catch {
    return null;
  }
}

function Toast({ toast }) {
  const { theme } = useTheme();
  if (!toast) return null;
  return (
    <View style={{ position: "absolute", top: 12, left: 16, right: 16, zIndex: 999, alignItems: "center" }}>
      <View style={{ backgroundColor: toast.type === "error" ? theme.error : theme.success, paddingVertical: 10, paddingHorizontal: 20, borderRadius: theme.radius.md, ...theme.shadowMd }}>
        <Text style={{ color: theme.textInverse, fontSize: theme.font.sm, fontWeight: theme.font.bold, textAlign: "center" }}>{toast.message}</Text>
      </View>
    </View>
  );
}

function VideoPreview({ uri }) {
  const { theme } = useTheme();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 200, borderRadius: theme.radius.sm, backgroundColor: "#000" }}
      contentFit="contain"
    />
  );
}

const DEVICES = [
  { id: "Smartfon", name: "Smartfon", icon: "smartphone" },
  { id: "Noutbuk", name: "Noutbuk", icon: "laptop" },
  { id: "Planshet", name: "Planshet", icon: "tablet" },
  { id: "Soat", name: "Smart-soat", icon: "watch" },
  { id: "TV", name: "Televizor", icon: "tv" },
  { id: "Dazmol", name: "Dazmol", icon: "iron" },
  { id: "Changyutgich", name: "Changyutgich", icon: "wind" },
  { id: "Fen", name: "Soch feni", icon: "zap" },
  { id: "Mikrotolqin", name: "Mikrotolqinli pech", icon: "box" },
  { id: "Muzlatgich", name: "Muzlatgich", icon: "snowflake" },
  { id: "Kir yuvish", name: "Kir mashina", icon: "waves" },
  { id: "Konditsioner", name: "Konditsioner", icon: "thermometer" },
];

const ISSUES_BY_DEVICE = {
  "Smartfon": ["Ekran / Shisha sinishi", "Zaryad olmasligi (Gneoz)", "Batareya tez tugashi", "Kamera ishlamasligi", "Dinamik yoki Mikrofonda ovoz yo'q"],
  "Noutbuk": ["Ekran matritsasi sinishi", "Klaviatura tugmalari ishlamasligi", "Qizib ketib o'chib qolishi", "Zaryadnik ulagichi buzilishi", "SSD / Qattiq disk ishlamayapti"],
  "Planshet": ["Sensor ishlamasligi", "Zaryad olmasligi", "Korpus egilishi", "Batareya shishishi"],
  "Soat": ["Batareya tez o'tirishi", "Suv kirishi", "Ekran sinishi", "Zaryadga o'tmasligi"],
  "TV": ["Ekran yorilib ketdi (Ko'rsatmayapti)", "Ovoz yo'q, rasm bor", "Yoqilmayapti (Blok питания)", "Wi-Fi ulanmayapti"],
  "Dazmol": ["Isimayapti", "Suv oqizyapti", "Tok urvoti / Yoqilmayapti", "Par chiqarmayapti"],
  "Changyutgich": ["Kuchli ovoz chiqarishyapti / Shovqin", "Motor o'zi o'chib qolyapti", "So'rish kuchi pasaygan", "Tok kelmayapti"],
  "Fen": ["Issiq havo chiqarmayapti", "Motor aylanmayapti", "Kuygan hid kelayapti", "Simida uzilish bor"],
  "Mikrotolqin": ["Isitmayapti", "Tarelka aylanmayapti", "Tugmalari ishlamayapti", "Ichidan uchqun chiqayapti"],
  "Muzlatgich": ["Sovutmayapti", "Juda ko'p muzlayapti / Shovqin", "Motor o'zi o'chib qolyapti", "Freon sizib chiqishi"],
  "Kir yuvish": ["Suv chiqazib yuboryapti", "Baraban aylanmayapti", "Siqish (otjim) ishlamayapti", "Eshigi ochilmay qoldi"],
  "Konditsioner": ["Sovutmayapti / Issiq havo beryapti", "Pultga reaksiya yo'q", "Ichki blokdan suv oqayapti", "Nojo'ya tovush / Shovqin"],
};

const ISSUE_KEYS = {};
Object.entries(ISSUES_BY_DEVICE).forEach(([dev, arr]) => arr.forEach((iss, i) => {
  ISSUE_KEYS[dev + ":" + iss] = dev + "_" + i;
}));

function calculateDistanceNum(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export const UploadScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Bosh sahifadan kategoriya tanlab kelganda qurilma turi oldindan to'ldiriladi
  const presetDevice = route?.params?.device || "";

  const [step, setStep] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState(presetDevice || "Smartfon");
  const [deviceModel, setDeviceModel] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("");
  const [customIssue, setCustomIssue] = useState("");
  const [errors, setErrors] = useState({ model: false, issue: false });

  const [images, setImages] = useState({ front: null, back: null, side: null });
  const [activeImageType, setActiveImageType] = useState(null);
  const [filterType, setFilterType] = useState("rating");

  const [userLocation, setUserLocation] = useState(FALLBACK_LOCATION);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [dbMasters, setDbMasters] = useState([]);

  const [notification, setNotification] = useState(null);
  const toastTimer = useRef(null);
  const showNotification = useCallback((message, type = "error") => {
    setNotification({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotification(null), 3500);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    (async () => {
      const list = await fetchSavedMasters();
      setSavedIds(list.map((m) => String(m.id)));
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/masters"), { headers: authHeaders() })
      .then((res) => {
        if (!cancelled && !res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((data) => { if (!cancelled && data) setDbMasters(data.data || data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (camStatus !== "granted") return;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: 3 });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {}
    })();
  }, []);

  const [isDeviceOpen, setIsDeviceOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [allowNoModel, setAllowNoModel] = useState(false);

  const [video, setVideo] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");

  const pickImage = async (slot, fromCamera) => {
    setActiveImageType(slot);
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") { showNotification(t("up_cameraDenied", "Kameraga ruxsat kerak")); return; }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
        if (res.canceled || !res.assets || !res.assets.length) return;
        const a = res.assets[0];
        setImages((prev) => ({ ...prev, [slot]: { uri: a.uri, name: `photo_${slot}.jpg`, type: "image/jpeg", fileSize: a.fileSize } }));
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
        if (res.canceled || !res.assets || !res.assets.length) return;
        const a = res.assets[0];
        setImages((prev) => ({ ...prev, [slot]: { uri: a.uri, name: a.fileName || `photo_${slot}.jpg`, type: a.mimeType || "image/jpeg", fileSize: a.fileSize } }));
      }
    } catch {
      showNotification(t("up_aiError", "Xatolik yuz berdi"));
    }
  };

  const pickVideo = async (fromCamera) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") { showNotification(t("up_cameraDenied", "Kameraga ruxsat kerak")); return; }
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: 60 });
        if (res.canceled || !res.assets || !res.assets.length) return;
        const a = res.assets[0];
        const v = { uri: a.uri, name: a.fileName || `video_${Date.now()}.mp4`, type: a.mimeType || "video/mp4", fileSize: a.fileSize };
        setVideo(v);
        runAiAnalysis(v, v.uri);
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
        if (res.canceled || !res.assets || !res.assets.length) return;
        const a = res.assets[0];
        const v = { uri: a.uri, name: a.fileName || `video_${Date.now()}.mp4`, type: a.mimeType || "video/mp4", fileSize: a.fileSize };
        setVideo(v);
        runAiAnalysis(v, v.uri);
      }
    } catch {
      showNotification(t("up_aiError", "Xatolik yuz berdi"));
    }
  };

  const toggleSave = async (master) => {
    if (savedIds.includes(String(master.id))) {
      await unsaveMaster(master.id);
      setSavedIds((prev) => prev.filter((id) => id !== String(master.id)));
    } else {
      await saveMaster({ id: master.id, name: master.name, price: master.price, specialty: Array.isArray(master.devices) ? master.devices[0] : master.devices });
      setSavedIds((prev) => [...prev, String(master.id)]);
    }
  };

  const runAiAnalysis = async (explicitFile, explicitUrl) => {
    const hasPhoto = Object.values(images).some((im) => im && im.uri);
    if (!explicitFile && !video?.uri && !hasPhoto) {
      showNotification(t("up_aiNoVideo"), "error");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    const res = await analyzeDeviceMedia(images, explicitFile || video);
    setAiLoading(false);
    if (res.error) {
      setAiError(res.error);
      if (res.error === "ai_noKey") showNotification(t("up_aiNoKey"), "error");
      else if (res.error === "ai_videoTooLarge") showNotification(t("up_aiVideoTooLarge"), "error");
      else if (res.error === "ai_noMedia") showNotification(t("up_aiNoVideo"), "error");
      else showNotification(t("up_aiError"), "error");
      return;
    }
    const devId = res.device ? (matchDevice(res.device, DEVICES.map((d) => d.id)) || selectedDevice) : selectedDevice;
    const issueList = ISSUES_BY_DEVICE[devId] || [];
    const matched = matchIssue(res.issue || res.description, issueList);
    const newIssue = matched.custom ? (matched.issue || res.description || "") : matched.issue;
    if (res.device && devId) setSelectedDevice(devId);
    if (res.model) setDeviceModel(res.model);
    if (newIssue) {
      if (matched.custom) { setCustomIssue(newIssue); setSelectedIssue(""); }
      else { setSelectedIssue(newIssue); setCustomIssue(""); }
    }
    setErrors({ model: false, issue: false });
    setAiResult({
      device: res.device || "",
      model: res.model || "",
      issue: newIssue || res.issue || res.description || "",
      description: res.description && res.description !== (newIssue || res.issue) ? res.description : "",
      frameSlots: [],
    });
    showNotification(t("up_aiAutoFilled"), "success");

    const videoFile = explicitFile || video;
    const isVideoFile = videoFile && String(videoFile.type || "").startsWith("video/");
    const videoUrl = video?.uri || explicitUrl;
    if (videoUrl && isVideoFile) {
      const dur = await probeVideoDuration(videoUrl);
      const usableDur = Number.isFinite(dur) && dur > 0.5 ? Math.max(0.3, dur - 0.2) : 0;
      const slotKeys = { front: "front", back: "back", defect: "side" };
      const fallbackPos = { front: 0.15, back: 0.5, side: 0.85 };
      const f = res.frames && typeof res.frames === "object" ? res.frames : {};
      const captures = [];
      for (const [key, slot] of Object.entries(slotKeys)) {
        const sec = Number(f[key]);
        if (Number.isFinite(sec) && sec > 0 && usableDur > 0) {
          captures.push({ slot, sec: Math.min(sec, usableDur) });
        } else if (usableDur > 0) {
          captures.push({ slot, sec: usableDur * fallbackPos[slot] });
        }
      }
      if (captures.length > 0) {
        setAiLoading(true);
        const frames = [];
        for (const c of captures) {
          const fr = await captureFrame(videoUrl, c.sec, c.slot);
          if (fr) frames.push(fr);
        }
        if (frames.length > 0) {
          setImages((prev) => {
            const next = { ...prev };
            frames.forEach((g) => { next[g.slot] = { uri: g.uri, name: g.name, type: g.type }; });
            return next;
          });
          setAiResult((prev) => ({ ...(prev || {}), frameSlots: frames.map((g) => g.slot) }));
          showNotification(t("up_aiFramesFilled"), "success");
        }
        setAiLoading(false);
      }
    }
  };

  const filteredByDevice = dbMasters.filter((master) => {
    if (!master.devices || master.devices.length === 0) return true;
    return master.devices.includes(selectedDevice);
  });

  const masters = filteredByDevice.map((master) => {
    const mLat = master.location?.lat || master.lat || FALLBACK_LOCATION.lat;
    const mLng = master.location?.lng || master.lng || FALLBACK_LOCATION.lng;
    const dist = calculateDistanceNum(userLocation.lat, userLocation.lng, mLat, mLng);
    return { ...master, lat: mLat, lng: mLng, distanceNum: dist, distance: `${dist} km`, carTime: `${Math.round(dist * 3)} daq`, walkTime: `${Math.round(dist * 12)} daq` };
  });

  const sortedMasters = [...masters].sort((a, b) => (filterType === "distance" ? a.distanceNum - b.distanceNum : b.rating - a.rating));

  const currentDeviceObj = DEVICES.find((d) => d.id === selectedDevice);

  const goToStep2 = () => {
    const isModelEmpty = !deviceModel.trim() && !allowNoModel;
    const isIssueEmpty = !selectedIssue && !customIssue.trim();
    setErrors({ model: isModelEmpty, issue: isIssueEmpty });
    if (isModelEmpty || isIssueEmpty) {
      showNotification(t("up_fillRequired"), "error");
      return;
    }
    setStep(2);
  };

  const goToTutorial = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} >
      <Toast toast={notification} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, backgroundColor: theme.neumorph.surface, paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedLg, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ backgroundColor: theme.primary, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", ...theme.shadowMd }}>
              <Icon name="wrench" size={22} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: theme.font.xxl, fontWeight: "800", color: theme.primary }}>Ustachi</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.neumorph.insetBg, paddingVertical: 6, paddingHorizontal: 14, borderRadius: theme.radius.full, ...theme.neumorph.inset }}>
              <Text style={{ color: step === 1 ? theme.primary : theme.textTertiary, fontSize: theme.font.xs, fontWeight: "700" }}>{t("up_step1")}</Text>
              <Text style={{ color: theme.textTertiary }}>→</Text>
              <Text style={{ color: step === 2 ? theme.primary : theme.textTertiary, fontSize: theme.font.xs, fontWeight: "700" }}>{t("up_step2")}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate("Settings")} style={({ pressed }) => [{ backgroundColor: theme.neumorph.surface, paddingVertical: 7, paddingHorizontal: 12, borderRadius: theme.radius.full, ...theme.neumorph.itemRaised }, pressed && { ...theme.neumorph.pressed }]}>
              <Icon name="settings" size={14} color={theme.textSecondary} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Profile")} style={{ backgroundColor: theme.primary, paddingVertical: 7, paddingHorizontal: 12, borderRadius: theme.radius.full, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="user" size={14} color="#FFFFFF" />
              <Text style={{ color: theme.textInverse, fontSize: theme.font.xs, fontWeight: "700" }}>{t("up_profile")}</Text>
            </Pressable>
          </View>
        </View>

        {step === 1 ? (
          <View style={{ gap: 16 }}>
            {/* Qurilma turi */}
            <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised, overflow: "hidden" }}>
              <Pressable onPress={() => setIsDeviceOpen((v) => !v)} style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <Icon name={currentDeviceObj?.icon || "smartphone"} size={22} color={theme.textSecondary} />
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text, flex: 1 }} numberOfLines={1}>
                    {t("up_device")}: <Text style={{ color: theme.primary }}>{t("upd_" + selectedDevice, currentDeviceObj?.name || selectedDevice)}</Text>
                  </Text>
                </View>
                <Icon name={isDeviceOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
              </Pressable>
              {isDeviceOpen && (
                <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>                  {DEVICES.map((dev) => (
                    <Pressable
                      key={dev.id}
                      onPress={() => { setSelectedDevice(dev.id); setSelectedIssue(""); setIsDeviceOpen(false); }}
                      style={({ pressed }) => [{
                        width: "30%", paddingVertical: 10, paddingHorizontal: 8, borderRadius: theme.neumorph.radiusSm, alignItems: "center", gap: 6,
                        backgroundColor: theme.neumorph.surface,
                        ...(selectedDevice === dev.id ? theme.neumorph.inset : theme.neumorph.itemRaised),
                        ...(selectedDevice === dev.id ? { borderWidth: 1, borderColor: theme.primary } : null),
                      }, pressed && { ...theme.neumorph.pressed }]}
                    >
                      <Icon name={dev.icon} size={22} color={selectedDevice === dev.id ? theme.primary : theme.textSecondary} />
                      <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: selectedDevice === dev.id ? theme.primary : theme.text, textAlign: "center" }} numberOfLines={1}>{t("upd_" + dev.id, dev.name)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Model */}
            <View style={{ backgroundColor: theme.neumorph.surface, padding: 14, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised, ...(errors.model ? { borderWidth: 1, borderColor: theme.error } : {}), gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }}>
                  {t("up_enterModel")}: <Text style={{ color: theme.error }}>*</Text>
                </Text>
                <Pressable onPress={() => setIsHelpOpen((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="help-circle" size={14} color={theme.info} />
                  <Text style={{ color: theme.info, fontSize: theme.font.xs, fontWeight: "700" }}>{t("up_modelDontKnow")}</Text>
                </Pressable>
              </View>
              <TextInput
                placeholder={t("up_modelPlaceholder")}
                placeholderTextColor={theme.textTertiary}
                value={deviceModel}
                onChangeText={(v) => { setDeviceModel(v); if (v.trim()) setErrors((e) => ({ ...e, model: false })); }}
                style={{ borderRadius: 12, padding: 12, fontSize: theme.font.sm, color: theme.text, backgroundColor: theme.neumorph.insetBg, ...theme.neumorph.inset, ...(errors.model ? { borderWidth: 1, borderColor: theme.error } : {}) }}
              />
              {errors.model && <Text style={{ fontSize: 11, color: theme.error, fontWeight: "700" }}>{t("up_modelRequired")}</Text>}
              {isHelpOpen && (
                <View style={{ backgroundColor: theme.neumorph.insetBg, borderRadius: 14, padding: 12, gap: 6, ...theme.neumorph.inset }}>
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.primary }}>{t("up_modelHelpTitle")}</Text>
                  <Text style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp1")}</Text>
                  <Text style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp2")}</Text>
                  <Text style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp3")}</Text>
                  <Text style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp4")}</Text>
                  <Pressable onPress={() => { setAllowNoModel(true); setDeviceModel(""); setErrors((e) => ({ ...e, model: false })); setIsHelpOpen(false); }}
                    style={({ pressed }) => [{ alignSelf: "flex-start", marginTop: 4, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusSm, paddingVertical: 8, paddingHorizontal: 14, ...theme.neumorph.itemRaised }, pressed && { ...theme.neumorph.pressed }]}>
                    <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.primary }}>{t("up_continueNoModel")}</Text>
                  </Pressable>
                </View>
              )}
              {allowNoModel && <Text style={{ fontSize: 11, color: theme.success, fontWeight: "700" }}>✓ {t("up_continueNoModel")}</Text>}
            </View>

            {/* Muammo */}
            <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised, ...(errors.issue ? { borderWidth: 1, borderColor: theme.error } : {}), overflow: "hidden" }}>
              <Pressable onPress={() => setIsIssueOpen((v) => !v)} style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <Icon name="alert-circle" size={22} color={theme.textSecondary} />
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text, flex: 1 }} numberOfLines={1}>
                    {t("up_issue")}: <Text style={{ color: selectedIssue ? theme.primary : theme.textTertiary }}>{selectedIssue ? t("upi_" + ISSUE_KEYS[selectedDevice + ":" + selectedIssue], selectedIssue) : t("up_selectIssue")}</Text>
                  </Text>
                </View>
                <Icon name={isIssueOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
              </Pressable>
              {isIssueOpen && (
                <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
                  {(ISSUES_BY_DEVICE[selectedDevice] || []).map((issue) => (
                    <Pressable
                      key={issue}
                      onPress={() => { setSelectedIssue(issue); setCustomIssue(""); setIsIssueOpen(false); setErrors((e) => ({ ...e, issue: false })); }}
                      style={({ pressed }) => [{
                        padding: 10, borderRadius: theme.neumorph.radiusSm, flexDirection: "row", alignItems: "center", gap: 10,
                        backgroundColor: theme.neumorph.surface,
                        ...(selectedIssue === issue ? theme.neumorph.inset : theme.neumorph.itemRaised),
                        ...(selectedIssue === issue ? { borderWidth: 1, borderColor: theme.primary } : null),
                      }, pressed && { ...theme.neumorph.pressed }]}
                    >
                      <Icon name={selectedIssue === issue ? "check-circle" : "circle"} size={16} color={theme.textSecondary} />
                      <Text style={{ fontSize: theme.font.sm, fontWeight: "600", color: selectedIssue === issue ? theme.primary : theme.text, flex: 1 }}>{t("upi_" + ISSUE_KEYS[selectedDevice + ":" + issue], issue)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {errors.issue && <Text style={{ paddingHorizontal: 16, paddingBottom: 12, fontSize: 11, color: theme.error, fontWeight: "700" }}>{t("up_issueRequired")}</Text>}
            </View>

            {/* O'zi yozish */}
            <View style={{ backgroundColor: theme.neumorph.surface, padding: 14, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised }}>
              <Text style={{ fontSize: theme.font.xs, fontWeight: "700", marginBottom: 6, color: theme.textSecondary }}>{t("up_writeYourself")}</Text>
              <TextInput
                placeholder={t("up_describePlaceholder")}
                placeholderTextColor={theme.textTertiary}
                value={customIssue}
                onChangeText={(v) => { setCustomIssue(v); setSelectedIssue(""); if (v.trim()) setErrors((e) => ({ ...e, issue: false })); }}
                style={{ borderRadius: 12, padding: 12, fontSize: theme.font.sm, color: theme.text, backgroundColor: theme.neumorph.insetBg, ...theme.neumorph.inset }}
              />
            </View>

            {/* Rasmlar */}
            <View>
              <Text style={{ fontSize: theme.font.sm, fontWeight: "800", marginBottom: 10, color: theme.text }}>{t("up_photos")}</Text>
              <View style={{ gap: 10 }}>
                {[{ key: "front", label: t("up_front") }, { key: "back", label: t("up_back") }, { key: "side", label: t("up_defect") }].map((item) => (
                  <View key={item.key} style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>                    <Pressable onPress={() => pickImage(item.key, false)} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <View style={{ width: 50, height: 50, backgroundColor: theme.neumorph.insetBg, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", ...theme.neumorph.inset }}>
                        {images[item.key] && images[item.key].uri ? (
                          <Image source={{ uri: images[item.key].uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        ) : (
                          <Icon name="image-plus" size={22} color={theme.textSecondary} />
                        )}
                      </View>
                      <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }} numberOfLines={1}>{item.label}</Text>
                    </Pressable>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable onPress={() => pickImage(item.key, false)}><Text style={{ color: theme.primary, fontSize: theme.font.xs, fontWeight: "700", padding: 4 }}>{t("up_upload")}</Text></Pressable>
                      <Text style={{ color: theme.border }}>|</Text>
                      <Pressable onPress={() => pickImage(item.key, true)}><Text style={{ color: theme.info, fontSize: theme.font.xs, fontWeight: "700", padding: 4 }}>{t("up_camera")}</Text></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* AI tahlil */}
            <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: theme.neumorph.surface, alignItems: "center", justifyContent: "center", ...theme.neumorph.itemRaised }}>
                  <Icon name="sparkles" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: theme.font.md, fontWeight: "800", color: theme.text }}>{t("up_aiTitle")}</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 2 }}>{t("up_aiSubtitle")}</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: theme.success, fontWeight: "800", backgroundColor: theme.successLight, borderWidth: 1, borderColor: "#16a34a", borderRadius: theme.radius.full, paddingVertical: 4, paddingHorizontal: 10 }}>{t("up_aiFree")}</Text>
              </View>

              <View style={{ backgroundColor: theme.neumorph.insetBg, borderRadius: theme.neumorph.radiusSm, padding: 12, gap: 9, ...theme.neumorph.inset }}>
                {[t("up_aiStep1"), t("up_aiStep2"), t("up_aiStep3")].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: theme.textInverse, fontSize: 11, fontWeight: "800" }}>{idx + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: theme.text, fontWeight: "600", flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable onPress={() => pickVideo(true)} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.neumorph.insetBg, borderRadius: theme.neumorph.radiusSm, padding: 11, ...theme.neumorph.inset }, pressed && { ...theme.neumorph.pressed }]}>
                  <Icon name="video" size={16} color={theme.textSecondary} />
                  <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.text }}>{t("up_aiRecordVideo")}</Text>
                </Pressable>
                <Pressable onPress={() => pickVideo(false)} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.neumorph.insetBg, borderRadius: theme.neumorph.radiusSm, padding: 11, ...theme.neumorph.inset }, pressed && { ...theme.neumorph.pressed }]}>
                  <Icon name="folder-open" size={16} color={theme.textSecondary} />
                  <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.text }}>{t("up_aiUploadVideo")}</Text>
                </Pressable>
              </View>

              <Pressable onPress={() => runAiAnalysis()} disabled={aiLoading} style={({ pressed }) => [{
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, width: "100%",
                backgroundColor: theme.primary, borderRadius: theme.neumorph.radius, paddingVertical: 12, paddingHorizontal: 14,
                opacity: aiLoading ? 0.7 : 1, ...theme.shadowMd,
              }, pressed && !aiLoading && { opacity: 0.85 }]}>
                {aiLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="sparkles" size={17} color="#FFFFFF" />}
                <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.textInverse }}>{aiLoading ? t("up_aiAnalyzing") : t("up_aiAnalyzeBtn")}</Text>
              </Pressable>

              {video && video.uri && <VideoPreview uri={video.uri} />}

              {aiLoading && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.primary }}>{t("up_aiAnalyzing")}</Text>
                </View>
              )}

              {aiError && !aiLoading && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="alert-circle" size={15} color={theme.error} />
                  <Text style={{ fontSize: 11, color: theme.error, fontWeight: "700", flex: 1 }}>{String(aiError).includes("GEMINI_API_KEY") || String(aiError).includes("o'chirilgan") ? t("up_aiNoKey") : t("up_aiError")}</Text>
                </View>
              )}

              {aiResult && !aiLoading && (
                <View style={{ backgroundColor: theme.neumorph.insetBg, borderWidth: 1, borderColor: theme.primary, borderRadius: theme.neumorph.radiusSm, padding: 12, gap: 10, ...theme.neumorph.inset }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon name="check-circle" size={15} color={theme.success} />
                      <Text style={{ fontSize: 12, color: theme.success, fontWeight: "800" }}>{t("up_aiAutoFilled")}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name="pencil" size={12} color={theme.textSecondary} />
                      <Text style={{ fontSize: 10.5, color: theme.textSecondary, fontWeight: "600" }}>{t("up_aiEditHint")}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 8, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: theme.border, paddingTop: 10 }}>
                    {[
                      { icon: "hardware-chip", label: t("up_device"), value: aiResult.device },
                      { icon: "tag", label: t("up_aiResultModel"), value: aiResult.model },
                      { icon: "wrench", label: t("up_aiResultIssue"), value: aiResult.issue },
                    ].map((row) => (
                      <View key={row.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                        <Icon name={row.icon} size={14} color={theme.primary} />
                        <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: "700", minWidth: 92 }}>{row.label}</Text>
                        <Text style={{ fontSize: 12.5, color: theme.text, fontWeight: row.value ? "800" : "600", flex: 1 }}>{row.value || <Text style={{ color: theme.textSecondary, opacity: 0.6 }}>—</Text>}</Text>
                      </View>
                    ))}
                  </View>

                  {aiResult.description && (
                    <View style={{ backgroundColor: theme.neumorph.surface, padding: 8, borderRadius: theme.radius.sm, ...theme.neumorph.itemRaised }}>
                      <Text style={{ fontSize: 11.5, color: theme.textSecondary, lineHeight: 18 }}><Text style={{ color: theme.text, fontWeight: "700" }}>{t("up_aiResultDesc")}:</Text> {aiResult.description}</Text>
                    </View>
                  )}

                  {(aiResult.frameSlots || []).length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: theme.border, paddingTop: 10 }}>
                      {[{ key: "front", label: t("up_front") }, { key: "back", label: t("up_back") }, { key: "side", label: t("up_defect") }]
                        .filter((s) => (aiResult.frameSlots || []).includes(s.key))
                        .map((s) => (
                          <View key={s.key} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.successLight, borderWidth: 1, borderColor: "#16a34a", borderRadius: theme.radius.full, paddingVertical: 3, paddingHorizontal: 9 }}>
                            <Icon name="image" size={11} color={theme.success} />
                            <Text style={{ fontSize: 10.5, color: theme.success, fontWeight: "700" }}>{t("up_aiFrame")}: {s.label}</Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {selectedMaster && (
              <View style={{ backgroundColor: theme.primaryLight, borderWidth: 2, borderColor: theme.primary, borderRadius: theme.radius.lg, padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.primary, flex: 1 }} numberOfLines={1}>{t("up_selectedMaster")}: {selectedMaster.name}</Text>
                  <Pressable onPress={() => setSelectedMaster(null)}><Icon name="x" size={18} color={theme.textSecondary} /></Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 12, fontSize: theme.font.xs, color: theme.text, flexWrap: "wrap" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Icon name="map-pin" size={13} color={theme.textSecondary} />
                    <Text style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_distance")}: <Text style={{ fontWeight: "700" }}>{selectedMaster.distance}</Text></Text>
                  </View>
                  <Text style={{ fontSize: theme.font.xs, color: theme.text }}>🚗 {t("up_byCar")}: <Text style={{ fontWeight: "700" }}>{selectedMaster.carTime}</Text></Text>
                  <Text style={{ fontSize: theme.font.xs, color: theme.text }}>🚶 {t("up_onFoot")}: <Text style={{ fontWeight: "700" }}>{selectedMaster.walkTime}</Text></Text>
                </View>
                <Pressable onPress={() => openYandexMaps({ lat: userLocation.lat, lng: userLocation.lng }, { lat: selectedMaster.lat, lng: selectedMaster.lng })}
                  style={({ pressed }) => [{ backgroundColor: theme.warning, paddingVertical: 10, borderRadius: theme.radius.sm, alignItems: "center" }, pressed && { opacity: 0.85 }]}>
                  <Text style={{ color: theme.textInverse, fontSize: theme.font.xs, fontWeight: "700" }}>{t("up_routeShow")} ➔</Text>
                </Pressable>
              </View>
            )}

            <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Icon name="wrench" size={18} color={theme.textSecondary} />
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.primary }} numberOfLines={1}>{t("up_recommended")} ({t("upd_" + selectedDevice, currentDeviceObj?.name || selectedDevice)})</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 4, backgroundColor: theme.neumorph.insetBg, padding: 4, borderRadius: theme.neumorph.radiusSm, ...theme.neumorph.inset }}>
                  <Pressable onPress={() => setFilterType("rating")} style={({ pressed }) => [{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.neumorph.surface, ...(filterType === "rating" ? theme.neumorph.itemRaised : null) }, pressed && { ...theme.neumorph.pressed }]}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: filterType === "rating" ? theme.primary : theme.text }}>{t("up_rating")}</Text>
                  </Pressable>
                  <Pressable onPress={() => setFilterType("distance")} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.neumorph.surface, ...(filterType === "distance" ? theme.neumorph.itemRaised : null) }, pressed && { ...theme.neumorph.pressed }]}>
                    <Icon name="map-pin" size={13} color={filterType === "distance" ? theme.primary : theme.text} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: filterType === "distance" ? theme.primary : theme.text }}>{t("up_mapRadar")}</Text>
                  </Pressable>
                </View>
              </View>

              {filterType === "distance" && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.error }} />
                    <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>{t("up_yourLocation")}</Text>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary, marginLeft: 8 }} />
                    <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>{t("up_masters")}</Text>
                  </View>
                  <MapCard
                    center={userLocation}
                    height={300}
                    markers={[{ lat: userLocation.lat, lng: userLocation.lng, color: "rd" }, ...sortedMasters.map((m) => ({ lat: m.lat, lng: m.lng, color: "gn" }))]}
                    from={{ lat: userLocation.lat, lng: userLocation.lng }}
                    to={sortedMasters.length ? { lat: sortedMasters[0].lat, lng: sortedMasters[0].lng } : undefined}
                  />
                </View>
              )}

              {sortedMasters.length === 0 ? (
                <EmptyState
                  theme={theme}
                  icon="wrench"
                  title={t("up_noMastersTitle")}
                  subtitle={t("up_noMasters")}
                />
              ) : (
                sortedMasters.map((master) => (
                  <View key={String(master.id)} style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, ...(selectedMaster?.id === master.id ? { ...theme.neumorph.inset, borderWidth: 1, borderColor: theme.primary } : theme.neumorph.raisedSm) }}>
                    <Pressable onPress={() => setSelectedMaster(master)} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center" }}>
                        <Icon name="user" size={20} color={theme.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }} numberOfLines={1}>{master.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Icon name="star" size={13} color="#f59e0b" />
                            <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, fontWeight: "700" }}>{master.rating}</Text>
                          </View>
                          <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>•</Text>
                          <Text style={{ fontSize: theme.font.xs, color: theme.primary, fontWeight: "700" }}>{master.distance}</Text>
                          <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>•</Text>
                          <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>🚗 {master.carTime}</Text>
                        </View>
                      </View>
                    </Pressable>
                    <Pressable onPress={() => toggleSave(master)} style={({ pressed }) => [{ backgroundColor: savedIds.includes(String(master.id)) ? theme.primary : theme.neumorph.surface, borderRadius: theme.neumorph.radiusSm, padding: 8, ...(savedIds.includes(String(master.id)) ? null : theme.neumorph.itemRaised) }, pressed && { ...theme.neumorph.pressed }]}>
                      <Icon name={savedIds.includes(String(master.id)) ? "bookmark-check" : "bookmark"} size={16} color={savedIds.includes(String(master.id)) ? "#FFFFFF" : theme.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSelectedMaster(master);
                        navigation.navigate("PreOrder", {
                          master,
                          userLocation,
                          details: { device: selectedDevice, deviceModel, issue: selectedIssue || customIssue, description: customIssue, images },
                        });
                      }}
                      style={({ pressed }) => [{ backgroundColor: theme.primary, borderRadius: theme.radius.sm, paddingVertical: 8, paddingHorizontal: 14 }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.textInverse }}>{t("up_choose")}</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Video qo'llanmalar */}
            <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="video" size={18} color={theme.error} />
                <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.error }}>{t("up_videoGuides")}</Text>
              </View>
              {(() => {
                const issue = selectedIssue || customIssue || "ta'mirlash";
                const query = encodeURIComponent(`${deviceModel} ${issue} repair tutorial`);
                const generalQuery = encodeURIComponent(`${selectedDevice} ${issue} fixing guide`);
                return [
                  { title: `${deviceModel ? deviceModel : selectedDevice} - ${issue} ${t("up_specificGuide")}`, channel: "Tech Repair Guide", url: `https://www.youtube.com/results?search_query=${query}` },
                  { title: t("up_stepByStepGuide"), channel: "Master Workshop", url: `https://www.youtube.com/results?search_query=${generalQuery}` },
                ];
              })().map((vitem, idx) => (
                <Pressable key={idx} onPress={() => goToTutorial(vitem.url)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusSm, gap: 10, ...theme.neumorph.raisedSm }, pressed && { ...theme.neumorph.pressed }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <Icon name="play-circle" size={22} color={theme.error} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.text }} numberOfLines={1}>{vitem.title}</Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{vitem.channel}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: theme.font.xs, color: theme.error, fontWeight: "700" }}>{t("up_watch")} ➔</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Pastdagi tugma */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bg }}>
        {step === 1 ? (
          <Pressable onPress={goToStep2} style={({ pressed }) => [{ backgroundColor: theme.primary, borderRadius: theme.radius.md, padding: 14, alignItems: "center", ...theme.shadowMd }, pressed && { opacity: 0.85 }]}>
            <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.textInverse }}>{t("up_results")} →</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setStep(1)} style={({ pressed }) => [{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, ...theme.neumorph.raised }, pressed && { ...theme.neumorph.pressed }]}>
            <Icon name="refresh-cw" size={14} color={theme.text} />
            <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.text }}>{t("up_editAgain")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default UploadScreen;