import React, { useState, useRef, useEffect } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { YandexMap } from "../components/YandexMap";
import { fetchSavedMasters, saveMaster, unsaveMaster } from "../services/savedMasters";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { analyzeDeviceMedia, matchIssue, matchDevice } from "../services/aiAnalysis";

function probeVideoDuration(url) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => resolve(0);
    v.src = url;
  });
}

// Videodan berilgan soniyada kadr olib, File ko'rinishida qaytaradi (foto slotga qo'yish uchun)
function captureVideoFrame(url, seconds, slot) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    const fail = () => resolve(null);
    const timer = setTimeout(fail, 12000);
    v.onerror = () => { clearTimeout(timer); fail(); };
    v.onloadedmetadata = () => {
      const dur = v.duration;
      if (!Number.isFinite(dur) || dur <= 0) { clearTimeout(timer); fail(); return; }
      // Video oxiridagi qora/bo'sh kadrga tushmaslik uchun 0.9s gacha cheklaymiz
      const t = Math.min(Math.max(Number(seconds) || 0, 0.1), Math.max(0.1, dur - 0.9));
      v.currentTime = t;
    };
    v.onseeked = () => {
      clearTimeout(timer);
      try {
        const srcW = v.videoWidth || 1280;
        const srcH = v.videoHeight || 720;
        const scale = Math.min(1, 1280 / srcW);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(srcW * scale);
        canvas.height = Math.round(srcH * scale);
        canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return fail();
          const file = new File([blob], `frame_${slot}.jpg`, { type: "image/jpeg" });
          resolve({ slot, url: URL.createObjectURL(blob), file });
        }, "image/jpeg", 0.85);
      } catch {
        fail();
      }
    };
    v.src = url;
  });
}

export const UploadScreen = ({ onNext, onChangeRole, onOpenSettings, onOpenProfile }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  
  const [selectedDevice, setSelectedDevice] = useState("Smartfon");
  const [deviceModel, setDeviceModel] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("");
  const [customIssue, setCustomIssue] = useState("");
  
  const [errors, setErrors] = useState({ model: false, issue: false });

  const [images, setImages] = useState({
    front: null,
    back: null,
    side: null,
  });
  const [activeImageType, setActiveImageType] = useState(null);
  const [filterType, setFilterType] = useState("rating");

  const [userLocation, setUserLocation] = useState({ lat: 41.311081, lng: 69.240562 });
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    (async () => {
      const list = await fetchSavedMasters();
      setSavedIds(list.map((m) => String(m.id)));
    })();
  }, []);

  const toggleSave = async (master) => {
    if (savedIds.includes(String(master.id))) {
      await unsaveMaster(master.id);
      setSavedIds(savedIds.filter((id) => id !== String(master.id)));
    } else {
      await saveMaster({ id: master.id, name: master.name, price: master.price, specialty: master.devices ? (Array.isArray(master.devices) ? master.devices[0] : master.devices) : "" });
      setSavedIds([...savedIds, String(master.id)]);
    }
  };

  const [dbMasters, setDbMasters] = useState([
    {
      id: 1,
      name: "Usta Anvar",
      rating: 4.9,
      devices: ["Smartfon", "Planshet"],
      location: { lat: 41.315, lng: 69.250 }
    },
    {
      id: 2,
      name: "Sohib Service",
      rating: 4.7,
      devices: ["Noutbuk", "TV"],
      location: { lat: 41.300, lng: 69.230 }
    }
  ]);
  
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/masters"), { headers: authHeaders() })
      .then((res) => { if (!cancelled && !res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then((data) => {
        if (!cancelled && data) {
          const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
          setDbMasters(list);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("Ustalarni olishda xatolik:", err.message);
        }
      });
      
    return () => {
      cancelled = true;
    };
  }, []);

  const [isDeviceOpen, setIsDeviceOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [allowNoModel, setAllowNoModel] = useState(false);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const videoInputCameraRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const [video, setVideo] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");

  const devices = [
    { id: "Smartfon", name: "Smartfon", icon: "https://api.iconify.design/lucide:smartphone.svg?color=%2364748B" },
    { id: "Noutbuk", name: "Noutbuk", icon: "https://api.iconify.design/lucide:laptop.svg?color=%2364748B" },
    { id: "Planshet", name: "Planshet", icon: "https://api.iconify.design/lucide:tablet.svg?color=%2364748B" },
    { id: "Soat", name: "Smart-soat", icon: "https://api.iconify.design/lucide:watch.svg?color=%2364748B" },
    { id: "TV", name: "Televizor", icon: "https://api.iconify.design/lucide:tv.svg?color=%2364748B" },
    { id: "Dazmol", name: "Dazmol", icon: "https://api.iconify.design/lucide:shredder.svg?color=%2364748B" },
    { id: "Changyutgich", name: "Changyutgich", icon: "https://api.iconify.design/lucide:wind.svg?color=%2364748B" },
    { id: "Fen", name: "Soch feni", icon: "https://api.iconify.design/lucide:zap.svg?color=%2364748B" },
    { id: "Mikrotolqin", name: "Mikrotolqinli pech", icon: "https://api.iconify.design/lucide:box.svg?color=%2364748B" },
    { id: "Muzlatgich", name: "Muzlatgich", icon: "https://api.iconify.design/lucide:snowflake.svg?color=%2364748B" },
    { id: "Kir yuvish", name: "Kir mashina", icon: "https://api.iconify.design/lucide:waves.svg?color=%2364748B" },
    { id: "Konditsioner", name: "Konditsioner", icon: "https://api.iconify.design/lucide:thermometer.svg?color=%2364748B" },
  ];

  const issuesByDevice = {
    "Smartfon": ["Ekran / Shisha sinishi", "Zaryad olmasligi (Gneoz)", "Batareya tez tugashi", "Kamera ishlamasligi", "Dinamik yoki Mikrofonda ovoz yo'q"],
    "Noutbuk": ["Ekran matritsasi sinishi", "Klaviatura tugmalari ishlamasligi", "Qizib ketib o'chib qolishi", "Zaryadnik ulagichi buzilishi", "SSD / Qattiq disk ishlamayapti"],
    "Planshet": ["Sensor ishlamasligi", "Zaryad olmasligi", "Korpus egilishi", "Batareya shishishi"],
    "Soat": ["Batareya tez o'tirishi", "Suv kirishi", "Ekran sinishi", "Zaryadga o'tmasligi"],
    "TV": ["Ekran yorilib ketdi (Ko'rsatmayapti)", "Ovoz yo'q, rasm bor", "Yoqilmayapti (Quvvat bloki)", "Wi-Fi ulanmayapti"],
    "Dazmol": ["Isimayapti", "Suv oqizyapti", "Tok urvoti / Yoqilmayapti", "Par chiqarmayapti"],
    "Changyutgich": ["Kuchli ovoz chiqarishyapti / Shovqin", "Motor o'zi o'chib qolyapti", "So'rish kuchi pasaygan", "Tok kelmayapti"],
    "Fen": ["Issiq havo chiqarmayapti", "Motor aylanmayapti", "Kuygan hid kelayapti", "Simida uzilish bor"],
    "Mikrotolqin": ["Isitmayapti", "Tarelka aylanmayapti", "Tugmalari ishlamayapti", "Ichidan uchqun chiqayapti"],
    "Muzlatgich": ["Sovutmayapti", "Juda ko'p muzlayapti / Shovqin", "Motor o'zi o'chib qolyapti", "Freon sizib chiqishi"],
    "Kir yuvish": ["Suv chiqazib yuboryapti", "Baraban aylanmayapti", "Siqish (otjim) ishlamayapti", "Eshigi ochilmay qoldi"],
    "Konditsioner": ["Sovutmayapti / Issiq havo beryapti", "Pultga reaksiya yo'q", "Ichki blokdan suv oqayapti", "Nojo'ya tovush / Shovqin"]
  };

  const ISSUE_KEYS = {};
  Object.entries(issuesByDevice).forEach(([dev, arr]) => arr.forEach((iss, i) => {
    ISSUE_KEYS[dev + ':' + iss] = dev + '_' + i;
  }));

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const filteredByDevice = dbMasters.filter((master) => {
    if (!master.devices || master.devices.length === 0) return true;
    return master.devices.includes(selectedDevice);
  });

  const masters = filteredByDevice.map((master) => {
    const mLat = master.location?.lat || 41.28;
    const mLng = master.location?.lng || 69.22;
    const dist = parseFloat(calculateDistance(userLocation.lat, userLocation.lng, mLat, mLng));
    return {
      ...master,
      lat: mLat,
      lng: mLng,
      distanceNum: dist,
      distance: `${dist} km`,
      carTime: `${Math.round(dist * 3)} daq`,
      walkTime: `${Math.round(dist * 12)} daq`
    };
  });

  const sortedMasters = [...masters].sort((a, b) => {
    if (filterType === "rating") return b.rating - a.rating;
    if (filterType === "distance") return a.distanceNum - b.distanceNum;
    return 0;
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("GPSni aniqlashda xatolik:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && activeImageType) {
      const imageUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(imageUrl);
      setImages((prev) => {
        return { ...prev, [activeImageType]: { url: imageUrl, file } };
      });
    }
    e.target.value = "";
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const triggerUpload = (type) => {
    setActiveImageType(type);
    fileInputRef.current.click();
  };

  const triggerCamera = (type) => {
    setActiveImageType(type);
    cameraInputRef.current.click();
  };

  const triggerVideo = () => {
    videoInputRef.current.click();
  };

  const triggerVideoCamera = () => {
    videoInputCameraRef.current.click();
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      setVideo({ url, file });
      runAiAnalysis(file, url);
    }
    e.target.value = "";
  };

  const runAiAnalysis = async (explicitFile, explicitUrl) => {
    const hasPhoto = Object.values(images).some((im) => im && im.file);
    if (!explicitFile && !video?.file && !hasPhoto) {
      showNotification(t("up_aiNoVideo"), "error");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    const res = await analyzeDeviceMedia(images, explicitFile || video?.file);
    setAiLoading(false);
    if (res.error) {
      setAiError(res.error);
      if (res.error === "ai_noKey") showNotification(t("up_aiNoKey"), "error");
      else if (res.error === "ai_videoTooLarge") showNotification(t("up_aiVideoTooLarge"), "error");
      else if (res.error === "ai_noMedia") showNotification(t("up_aiNoVideo"), "error");
      else showNotification(t("up_aiError"), "error");
      return;
    }
    const devId = res.device ? (matchDevice(res.device, devices.map((d) => d.id)) || selectedDevice) : selectedDevice;
    const issueList = issuesByDevice[devId] || [];
    const matched = matchIssue(res.issue || res.description, issueList);
    const newIssue = matched.custom ? (matched.issue || res.description || "") : matched.issue;
    if (res.device && devId) setSelectedDevice(devId);
    if (res.model) setDeviceModel(res.model);
    if (newIssue) {
      if (matched.custom) {
        setCustomIssue(newIssue);
        setSelectedIssue("");
      } else {
        setSelectedIssue(newIssue);
        setCustomIssue("");
      }
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

    // Videodan skrinshotlarni ajratib, front/back/side joylariga avtomatik qo'yamiz
    const videoFile = explicitFile || video?.file;
    const isVideoFile = videoFile && String(videoFile.type || "").startsWith("video/");
    const videoUrl = video?.url || explicitUrl || (isVideoFile ? URL.createObjectURL(videoFile) : null);
    if (videoUrl) {
      if (!video?.url && !explicitUrl) objectUrlsRef.current.push(videoUrl);
      const dur = await probeVideoDuration(videoUrl);
      const usableDur = Number.isFinite(dur) && dur > 0.5 ? Math.max(0.3, dur - 0.2) : 0;
      const slotKeys = { front: "front", back: "back", defect: "side" };
      // Har bir joy uchun: AI soniyasi bor bo'lsa uni, aks holda teng oraliq fallback
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
          const fr = await captureVideoFrame(videoUrl, c.sec, c.slot);
          if (fr) frames.push(fr);
        }
        if (frames.length > 0) {
          setImages((prev) => {
            const next = { ...prev };
            frames.forEach((g) => {
              objectUrlsRef.current.push(g.url);
              next[g.slot] = { url: g.url, file: g.file };
            });
            return next;
          });
          setAiResult((prev) => ({ ...(prev || {}), frameSlots: frames.map((g) => g.slot) }));
          showNotification(t("up_aiFramesFilled"), "success");
        }
        setAiLoading(false);
      }
    }
  };

  const getTutorialVideos = () => {
    const issue = selectedIssue || customIssue || "ta'mirlash";
    const query = encodeURIComponent(`${deviceModel} ${issue} repair tutorial`);
    const generalQuery = encodeURIComponent(`${selectedDevice} ${issue} fixing guide`);
    
    return [
      {
        title: `${deviceModel ? deviceModel : selectedDevice} - ${issue} ${t("up_specificGuide")}`,
        channel: "Tech Repair Guide",
        url: `https://www.youtube.com/results?search_query=${query}`
      },
      {
        title: t("up_stepByStepGuide"),
        channel: "Master Workshop",
        url: `https://www.youtube.com/results?search_query=${generalQuery}`
      }
    ];
  };

  const currentDeviceObj = devices.find(d => d.id === selectedDevice);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: "100%",
      width: "100%",
      padding: "16px",
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font.family,
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        .accordion-content {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .custom-btn {
          transition: all 0.15s ease;
        }
        .custom-btn:active {
          transform: scale(0.98);
        }
        .devices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 10px;
        }
      `}</style>

      {notification && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          backgroundColor: notification.type === "error" ? theme.error : theme.success,
          color: theme.textInverse,
          padding: "12px 24px",
          borderRadius: theme.radius.md,
          boxShadow: theme.shadowMd,
          fontSize: theme.font.sm,
          fontWeight: theme.font.bold,
          animation: "slideDown 0.3s ease-out forwards",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          maxWidth: "90%",
          textAlign: "center"
        }}>
          <span>{notification.message}</span>
        </div>
      )}
      
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: "none" }} />
      <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" style={{ display: "none" }} />
      <input type="file" ref={videoInputRef} onChange={handleVideoSelect} accept="video/*" style={{ display: "none" }} />
      <input type="file" ref={videoInputCameraRef} onChange={handleVideoSelect} accept="video/*" capture="environment" style={{ display: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, width: "100%", maxWidth: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", backgroundColor: theme.neumorphSurface, padding: "12px 16px", borderRadius: theme.neumorph.radiusLg, boxShadow: theme.neumorph.lightLg }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ backgroundColor: theme.primary, width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.shadowMd, flexShrink: 0 }}>
              <img src="https://api.iconify.design/lucide:wrench.svg?color=%23ffffff" alt="logo" width="22" height="22" />
            </div>
            <h1 style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.primary, margin: 0 }}>Ustachi</h1>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: theme.neumorphInsetBg, padding: "6px 14px", borderRadius: theme.radius.full, fontSize: theme.font.xs, fontWeight: theme.font.bold, boxShadow: theme.neumorph.inset }}>
              <span style={{ color: step === 1 ? theme.primary : theme.textTertiary }}>{t("up_step1")}</span>
              <span>→</span>
              <span style={{ color: step === 2 ? theme.primary : theme.textTertiary }}>{t("up_step2")}</span>
            </div>

            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="custom-btn"
                aria-label={t("up_profile")}
                style={{
                  backgroundColor: theme.primary,
                  color: theme.textInverse,
                  fontWeight: theme.font.bold,
                  fontSize: theme.font.xs,
                  padding: "7px 12px",
                  borderRadius: theme.radius.full,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap"
                }}
              >
                <img src="https://api.iconify.design/lucide:user.svg?color=%23ffffff" width="14" height="14" alt="" /> {t("up_profile")}
              </button>
            )}

            {onChangeRole && (
              <button
                onClick={onChangeRole}
                className="custom-btn"
                style={{
                  backgroundColor: theme.successLight,
                  color: theme.success,
                  fontWeight: theme.font.semibold,
                  fontSize: theme.font.xs,
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: `1px solid ${theme.success}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap"
                }}
              >
                <img src={`https://api.iconify.design/lucide:repeat.svg?color=${encodeURIComponent(theme.success)}`} width="13" height="13" alt="" />
                <span>{t("up_changeRole")}</span>
              </button>
            )}
          </div>
        </div>

        {step === 1 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", boxSizing: "border-box" }}>
            
            {/* Qurilma turi */}
            <div style={{ backgroundColor: theme.neumorphSurface, borderRadius: theme.neumorph.radiusLg, boxShadow: theme.neumorph.light, overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
              <div 
                onClick={() => setIsDeviceOpen(!isDeviceOpen)}
                style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  <img src={currentDeviceObj?.icon} alt="device" width="22" height="22" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t("up_device")}: <span style={{ color: theme.primary }}>{t('upd_' + selectedDevice, currentDeviceObj?.name || selectedDevice)}</span>
                  </span>
                </div>
                <img src={`https://api.iconify.design/lucide:chevron-${isDeviceOpen ? "up" : "down"}.svg?color=%2364748B`} alt="arrow" width="18" height="18" style={{ flexShrink: 0 }} />
              </div>

              {isDeviceOpen && (
                <div className="accordion-content devices-grid" style={{ padding: "12px", borderTop: `1px solid ${theme.border}`, backgroundColor: theme.neumorphInsetBg, boxShadow: theme.neumorph.inset }}>
                  {devices.map((dev) => (
                    <button
                      key={dev.id}
                      onClick={() => {
                        setSelectedDevice(dev.id);
                        setSelectedIssue("");
                        setIsDeviceOpen(false);
                      }}
                      className="custom-btn"
                      style={{
                        padding: "10px 8px",
                        borderRadius: theme.neumorph.radiusSm,
                        border: selectedDevice === dev.id ? `1px solid ${theme.primary}` : "none",
                        backgroundColor: theme.neumorphSurface,
                        boxShadow: selectedDevice === dev.id ? theme.neumorph.inset : theme.neumorph.lightSm,
                        color: selectedDevice === dev.id ? theme.primary : theme.text,
                        fontWeight: theme.font.bold,
                        fontSize: theme.font.xs,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        boxSizing: "border-box"
                      }}
                    >
                      <img src={dev.icon} alt={t('upd_' + dev.id, dev.name)} width="22" height="22" style={{ flexShrink: 0 }} />
                      <span style={{ textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{t('upd_' + dev.id, dev.name)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Qurilma modeli */}
            <div style={{ backgroundColor: theme.neumorphSurface, padding: "14px 16px", borderRadius: theme.neumorph.radiusLg, border: errors.model ? `1px solid ${theme.error}` : "none", boxShadow: theme.neumorph.light, display: "flex", flexDirection: "column", gap: "10px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <p style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, margin: 0 }}>
                  {t("up_enterModel")}: <span style={{ color: theme.error }}>*</span>
                </p>
                <button 
                  onClick={() => setIsHelpOpen(!isHelpOpen)}
                  style={{ background: "none", border: "none", color: theme.info, fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <img src="https://api.iconify.design/lucide:help-circle.svg?color=%230284C7" width="14" height="14" alt="help" />
                  {t("up_modelDontKnow")}
                </button>
              </div>

              <input 
                name="deviceModel"
                type="text" 
                placeholder={t("up_modelPlaceholder")} 
                value={deviceModel}
                onChange={(e) => {
                  setDeviceModel(e.target.value);
                  if (e.target.value.trim()) setErrors(prev => ({ ...prev, model: false }));
                }}
                style={{ width: "100%", padding: "12px 14px", borderRadius: theme.radius.sm, border: errors.model ? `1px solid ${theme.error}` : "none", fontSize: theme.font.sm, outline: "none", boxSizing: "border-box", backgroundColor: theme.neumorphInsetBg, color: theme.text, boxShadow: theme.neumorph.inset }}
              />
              {errors.model && (
                <span style={{ fontSize: "11px", color: theme.error, fontWeight: theme.font.bold }}>
                  {t("up_modelRequired")}
                </span>
              )}

              {isHelpOpen && (
                <div className="accordion-content" style={{ backgroundColor: theme.neumorphInsetBg, border: "none", borderRadius: theme.neumorph.radiusSm, padding: "12px", display: "flex", flexDirection: "column", gap: "6px", boxShadow: theme.neumorph.inset }}>
                  <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, color: theme.primary }}>{t("up_modelHelpTitle")}</span>
                  <span style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp1")}</span>
                  <span style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp2")}</span>
                  <span style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp3")}</span>
                  <span style={{ fontSize: theme.font.xs, color: theme.text }}>{t("up_modelHelp4")}</span>
                  <button
                    onClick={() => {
                      setAllowNoModel(true);
                      setDeviceModel("");
                      setErrors((prev) => ({ ...prev, model: false }));
                      setIsHelpOpen(false);
                    }}
                    className="custom-btn"
                    style={{ alignSelf: "flex-start", marginTop: "4px", backgroundColor: theme.neumorphSurface, color: theme.primary, border: "none", borderRadius: theme.neumorph.radiusSm, padding: "8px 14px", fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", boxShadow: theme.neumorph.lightSm }}
                  >
                    {t("up_continueNoModel")}
                  </button>
                </div>
              )}
              {allowNoModel && (
                <div style={{ fontSize: "11px", color: theme.success, fontWeight: theme.font.bold }}>✓ {t("up_continueNoModel")}</div>
              )}
            </div>

            {/* Muammo */}
            <div style={{ backgroundColor: theme.neumorphSurface, border: errors.issue ? `1px solid ${theme.error}` : "none", borderRadius: theme.neumorph.radiusLg, boxShadow: theme.neumorph.light, overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
              <div 
                onClick={() => setIsIssueOpen(!isIssueOpen)}
                style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  <img src="https://api.iconify.design/lucide:alert-circle.svg?color=%2364748B" alt="issue" width="22" height="22" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t("up_issue")}: <span style={{ color: selectedIssue ? theme.primary : theme.textTertiary }}>{selectedIssue ? t('upi_' + ISSUE_KEYS[selectedDevice + ':' + selectedIssue], selectedIssue) : t("up_selectIssue")}</span>
                  </span>
                </div>
                <img src={`https://api.iconify.design/lucide:chevron-${isIssueOpen ? "up" : "down"}.svg?color=%2364748B`} alt="arrow" width="18" height="18" style={{ flexShrink: 0 }} />
              </div>

              {isIssueOpen && (
                <div className="accordion-content" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", borderTop: `1px solid ${theme.border}`, backgroundColor: theme.neumorphInsetBg, boxShadow: theme.neumorph.inset }}>
                  {issuesByDevice[selectedDevice]?.map((issue) => (
                    <button
                      key={issue}
                      onClick={() => {
                        setSelectedIssue(issue);
                        setCustomIssue("");
                        setIsIssueOpen(false);
                        setErrors(prev => ({ ...prev, issue: false }));
                      }}
                      className="custom-btn"
                      style={{
                        padding: "10px 14px",
                        borderRadius: theme.neumorph.radiusSm,
                        border: selectedIssue === issue ? `1px solid ${theme.primary}` : "none",
                        backgroundColor: theme.neumorphSurface,
                        boxShadow: selectedIssue === issue ? theme.neumorph.inset : theme.neumorph.lightSm,
                        color: selectedIssue === issue ? theme.primary : theme.text,
                        fontWeight: theme.font.semibold,
                        fontSize: theme.font.sm,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        boxSizing: "border-box",
                        width: "100%"
                      }}
                    >
                      <img src={`https://api.iconify.design/lucide:${selectedIssue === issue ? "check-circle-2" : "circle"}.svg?color=%2364748B`} alt="check" width="16" height="16" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t('upi_' + ISSUE_KEYS[selectedDevice + ':' + issue], issue)}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.issue && (
                <div style={{ padding: "0 16px 12px 16px", fontSize: "11px", color: theme.error, fontWeight: theme.font.bold }}>
                  {t("up_issueRequired")}
                </div>
              )}
            </div>

            {/* O'zi yozish */}
            <div style={{ backgroundColor: theme.neumorphSurface, padding: "14px 16px", borderRadius: theme.neumorph.radiusLg, boxShadow: theme.neumorph.light, width: "100%", boxSizing: "border-box" }}>
              <p style={{ fontSize: theme.font.xs, fontWeight: theme.font.bold, margin: "0 0 6px 0", color: theme.textSecondary }}>{t("up_writeYourself")}</p>
              <input 
                name="customIssue"
                type="text" 
                placeholder={t("up_describePlaceholder")} 
                value={customIssue}
                onChange={(e) => {
                  setCustomIssue(e.target.value);
                  setSelectedIssue("");
                  if (e.target.value.trim()) setErrors(prev => ({ ...prev, issue: false }));
                }}
                style={{ width: "100%", padding: "12px 14px", borderRadius: theme.radius.sm, border: "none", fontSize: theme.font.sm, outline: "none", boxSizing: "border-box", backgroundColor: theme.neumorphInsetBg, color: theme.text, boxShadow: theme.neumorph.inset }}
              />
            </div>

            {/* Rasmlar yuklash */}
            <div style={{ width: "100%", boxSizing: "border-box" }}>
              <p style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, margin: "0 0 10px 0" }}>{t("up_photos")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { key: "front", label: t("up_front") },
                  { key: "back", label: t("up_back") },
                  { key: "side", label: t("up_defect") }
                ].map((item) => (
                  <div key={item.key} style={{ backgroundColor: theme.neumorphSurface, borderRadius: theme.neumorph.radiusLg, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box", boxShadow: theme.neumorph.lightSm }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                      <div 
                        onClick={() => triggerUpload(item.key)}
                        style={{ width: "50px", height: "50px", backgroundColor: theme.neumorphInsetBg, borderRadius: theme.neumorph.radiusSm, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0, boxShadow: theme.neumorph.inset }}
                      >
                        {images[item.key] ? (
                          <img src={images[item.key].url} alt="uploaded" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <img src="https://api.iconify.design/lucide:image-plus.svg?color=%2364748B" alt="add" width="22" height="22" />
                        )}
                      </div>
                      <p style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <button onClick={() => triggerUpload(item.key)} style={{ background: "none", border: "none", color: theme.primary, fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", padding: "4px 8px" }}>{t("up_upload")}</button>
                      <span style={{ color: theme.border }}>|</span>
                      <button onClick={() => triggerCamera(item.key)} style={{ background: "none", border: "none", color: theme.info, fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", padding: "4px 8px" }}>{t("up_camera")}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI video/foto tahlil */}
            <div style={{ backgroundColor: theme.neumorphSurface, borderRadius: theme.neumorph.radiusLg, padding: "16px", boxShadow: theme.neumorph.light, display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "13px", backgroundColor: theme.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: theme.shadowSm }}>
                  <img src="https://api.iconify.design/lucide:sparkles.svg?color=%23059669" alt="ai" width="22" height="22" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, margin: 0, color: theme.text, lineHeight: "1.3" }}>{t("up_aiTitle")}</p>
                  <p style={{ fontSize: "11.5px", color: theme.textSecondary, margin: "2px 0 0 0", lineHeight: "1.4" }}>{t("up_aiSubtitle")}</p>
                </div>
                <span style={{ fontSize: "10.5px", color: theme.success, fontWeight: theme.font.extrabold, backgroundColor: theme.successLight, border: "1px solid #16a34a", borderRadius: "999px", padding: "4px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>{t("up_aiFree")}</span>
              </div>

              <div style={{ backgroundColor: theme.neumorphInsetBg, borderRadius: theme.neumorph.radiusSm, padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: "9px", width: "100%", boxSizing: "border-box", boxShadow: theme.neumorph.inset }}>
                {[t("up_aiStep1"), t("up_aiStep2"), t("up_aiStep3")].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: idx === 2 ? 4 : 0 }}>
                    <span style={{ width: "20px", height: "20px", minWidth: "20px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, fontSize: "11px", fontWeight: theme.font.extrabold, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</span>
                    <span style={{ fontSize: "12.5px", color: theme.text, fontWeight: theme.font.semibold, lineHeight: "1.4" }}>{step}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", width: "100%", boxSizing: "border-box" }}>
                <button className="custom-btn" onClick={triggerVideoCamera}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", flex: 1, backgroundColor: theme.neumorphInsetBg, color: theme.text, border: "none", borderRadius: theme.neumorph.radiusSm, padding: "11px 10px", fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", boxShadow: theme.neumorph.inset }}>
                  <img src="https://api.iconify.design/lucide:video.svg?color=%2364748B" alt="record" width="16" height="16" /> {t("up_aiRecordVideo")}
                </button>
                <button className="custom-btn" onClick={triggerVideo}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", flex: 1, backgroundColor: theme.neumorphInsetBg, color: theme.text, border: "none", borderRadius: theme.neumorph.radiusSm, padding: "11px 10px", fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", boxShadow: theme.neumorph.inset }}>
                  <img src="https://api.iconify.design/lucide:folder-open.svg?color=%2364748B" alt="upload" width="16" height="16" /> {t("up_aiUploadVideo")}
                </button>
              </div>

              <button className="custom-btn" onClick={() => runAiAnalysis()} disabled={aiLoading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", width: "100%", boxSizing: "border-box", backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: theme.radius.sm, padding: "12px 14px", fontSize: theme.font.sm, fontWeight: theme.font.extrabold, cursor: aiLoading ? "wait" : "pointer", opacity: aiLoading ? 0.7 : 1, boxShadow: theme.shadowMd }}>
                <img src={aiLoading ? "https://api.iconify.design/lucide:loader-2.svg?color=%23ffffff&class=spin" : "https://api.iconify.design/lucide:sparkles.svg?color=%23ffffff"} alt="ai" width="17" height="17" className={aiLoading ? "spin" : ""} /> {aiLoading ? t("up_aiAnalyzing") : t("up_aiAnalyzeBtn")}
              </button>

              {video && (
                <video src={video.url} controls playsInline style={{ width: "100%", maxHeight: "220px", borderRadius: theme.radius.sm, backgroundColor: "#000", outline: "none" }} />
              )}

              {aiLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.font.xs, fontWeight: theme.font.bold, color: theme.primary }}>
                  <img className="spin" src="https://api.iconify.design/lucide:loader-2.svg?color=%23059669" width="16" height="16" alt="" />
                  {t("up_aiAnalyzing")}
                </div>
              )}

              {aiError && !aiLoading && (
                <div style={{ fontSize: "11px", color: theme.error, fontWeight: theme.font.bold, display: "flex", alignItems: "center", gap: "6px" }}>
                  <img src="https://api.iconify.design/lucide:alert-circle.svg?color=%23ef4444" width="15" height="15" alt="" />
                  <span>{String(aiError).includes("GEMINI_API_KEY") || String(aiError).includes("o'chirilgan") ? t("up_aiNoKey") : t("up_aiError")}</span>
                </div>
              )}

              {aiResult && !aiLoading && (
                <div style={{ backgroundColor: theme.neumorphInsetBg, border: `1px solid ${theme.primary}`, borderRadius: theme.neumorph.radiusSm, padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", width: "100%", boxSizing: "border-box", boxShadow: theme.neumorph.inset }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: theme.success, fontWeight: theme.font.extrabold, display: "flex", alignItems: "center", gap: "6px" }}>
                      <img src="https://api.iconify.design/lucide:check-circle-2.svg?color=%2316a34a" width="15" height="15" alt="" /> {t("up_aiAutoFilled")}
                    </span>
                    <span style={{ fontSize: "10.5px", color: theme.textSecondary, fontWeight: theme.font.semibold, display: "flex", alignItems: "center", gap: "4px" }}>
                      <img src="https://api.iconify.design/lucide:pencil.svg?color=%2364748B" width="12" height="12" alt="" /> {t("up_aiEditHint")}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: `1px dashed ${theme.border}`, paddingTop: "10px" }}>
                    {[
                      { icon: "cpu", label: t("up_device"), value: aiResult.device },
                      { icon: "tag", label: t("up_aiResultModel"), value: aiResult.model },
                      { icon: "wrench", label: t("up_aiResultIssue"), value: aiResult.issue },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <img src={`https://api.iconify.design/lucide:${row.icon}.svg?color=%23059669`} width="14" height="14" alt="" style={{ flexShrink: 0, marginTop: "1px" }} />
                        <span style={{ fontSize: "11px", color: theme.textSecondary, fontWeight: theme.font.bold, flexShrink: 0, minWidth: "92px" }}>{row.label}</span>
                        <span style={{ fontSize: "12.5px", color: theme.text, fontWeight: row.value ? theme.font.extrabold : theme.font.semibold, lineHeight: "1.4", minWidth: 0 }}>{row.value || <span style={{ color: theme.textSecondary, opacity: 0.6 }}>—</span>}</span>
                      </div>
                    ))}
                  </div>

                  {aiResult.description && (
                    <div style={{ fontSize: "11.5px", color: theme.textSecondary, lineHeight: "1.5", backgroundColor: theme.neumorphSurface, padding: "8px 10px", borderRadius: theme.neumorph.radiusSm, boxShadow: theme.neumorph.lightSm }}>
                      <b style={{ color: theme.text }}>{t("up_aiResultDesc")}:</b> {aiResult.description}
                    </div>
                  )}

                  {(aiResult.frameSlots || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", borderTop: `1px dashed ${theme.border}`, paddingTop: "10px" }}>
                      {[{ key: "front", label: t("up_front") }, { key: "back", label: t("up_back") }, { key: "side", label: t("up_defect") }]
                        .filter((s) => (aiResult.frameSlots || []).includes(s.key))
                        .map((s) => (
                          <span key={s.key} style={{ fontSize: "10.5px", color: theme.success, fontWeight: theme.font.bold, backgroundColor: theme.successLight, border: "1px solid #16a34a", borderRadius: "999px", padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <img src="https://api.iconify.design/lucide:image.svg?color=%2316a34a" width="11" height="11" alt="" /> {t("up_aiFrame")}: {s.label}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* 2-BOSQICH */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, width: "100%", boxSizing: "border-box" }}>
            
            {selectedMaster && (
              <div style={{ backgroundColor: theme.primaryLight, border: `2px solid ${theme.primary}`, borderRadius: theme.radius.lg, padding: "14px", display: "flex", flexDirection: "column", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, color: theme.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("up_selectedMaster")}: {selectedMaster.name}</span>
                  <button onClick={() => setSelectedMaster(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: theme.font.bold, color: theme.textSecondary }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: theme.font.xs, color: theme.text, fontWeight: theme.font.semibold, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:map-pin.svg?color=%2359656e" width="13" height="13" alt="" />{t("up_distance")}: <b>{selectedMaster.distance}</b></span>
                  <span>🚗 {t("up_byCar")}: <b>{selectedMaster.carTime}</b></span>
                  <span>🚶 {t("up_onFoot")}: <b>{selectedMaster.walkTime}</b></span>
                </div>
                <a 
                  href={`https://yandex.com/maps/?rtext=${userLocation.lat},${userLocation.lng}~${selectedMaster.lat},${selectedMaster.lng}&rtt=auto`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ marginTop: "4px", backgroundColor: theme.warning, color: theme.textInverse, textAlign: "center", padding: "10px", borderRadius: theme.radius.sm, fontSize: theme.font.xs, fontWeight: theme.font.bold, textDecoration: "none" }}
                >
                  {t("up_routeShow")} ➔
                </a>
              </div>
            )}

            {/* Ustalar va Xarita */}
            <div style={{ backgroundColor: theme.neumorphSurface, borderRadius: theme.neumorph.radiusLg, padding: "14px", boxShadow: theme.neumorph.light, display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img src="https://api.iconify.design/lucide:wrench.svg?color=%2364748B" alt="wrench" width="18" height="18" />
                  <h3 style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, color: theme.primary, margin: 0 }}>{t("up_recommended")} ({t('upd_' + selectedDevice, currentDeviceObj?.name || selectedDevice)})</h3>
                </div>
                <div style={{ display: "flex", gap: "4px", backgroundColor: theme.neumorphInsetBg, padding: "4px", borderRadius: theme.neumorph.radiusSm, boxShadow: theme.neumorph.inset }}>
                  <button onClick={() => setFilterType("rating")} style={{ padding: "6px 12px", fontSize: "11px", borderRadius: theme.neumorph.radiusSm, border: "none", backgroundColor: theme.neumorphSurface, boxShadow: filterType === "rating" ? theme.neumorph.lightSm : "none", color: filterType === "rating" ? theme.primary : theme.text, cursor: "pointer", fontWeight: theme.font.bold }}>{t("up_rating")}</button>
                  <button onClick={() => setFilterType("distance")} style={{ padding: "6px 12px", fontSize: "11px", borderRadius: theme.neumorph.radiusSm, border: "none", backgroundColor: theme.neumorphSurface, boxShadow: filterType === "distance" ? theme.neumorph.lightSm : "none", color: filterType === "distance" ? theme.primary : theme.text, cursor: "pointer", fontWeight: theme.font.bold, display: "flex", alignItems: "center", gap: "4px" }}><img src={`https://api.iconify.design/lucide:map-pin.svg?color=${encodeURIComponent(filterType === "distance" ? theme.primary : theme.text)}`} width="13" height="13" alt="" />{t("up_mapRadar")}</button>
                </div>
              </div>

              {filterType === "distance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: theme.font.xs, color: theme.textSecondary, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ width: "10px", height: "10px", backgroundColor: theme.error, borderRadius: "50%", display: "inline-block" }}></span> {t("up_yourLocation")} &nbsp;&nbsp;
                    <span style={{ width: "10px", height: "10px", backgroundColor: theme.primary, borderRadius: "50%", display: "inline-block" }}></span> {t("up_masters")}
                  </div>
                  
                  <div style={{ width: "100%", height: "300px", borderRadius: theme.neumorph.radiusSm, overflow: "hidden", position: "relative", backgroundColor: theme.neumorphInsetBg, boxShadow: theme.neumorph.inset }}>
                    <YandexMap
                      center={userLocation}
                      zoom={12}
                      height={300}
                      markers={[
                        { lat: userLocation.lat, lng: userLocation.lng, color: "rd" },
                        ...sortedMasters.map((m) => ({ lat: m.lat, lng: m.lng, color: "gn" })),
                      ]}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sortedMasters.length === 0 ? (
                  <p style={{ fontSize: theme.font.sm, color: theme.textTertiary, textAlign: "center", padding: "16px" }}>{t("up_noMasters")}</p>
                ) : (
                  sortedMasters.map((master, i) => (
                    <div 
                      key={master.id} 
                      className="ust-screen-up"
                      style={{ 
                        backgroundColor: theme.neumorphSurface, 
                        border: selectedMaster?.id === master.id ? `1px solid ${theme.primary}` : "none", 
                        borderRadius: theme.neumorph.radius, 
                        boxShadow: selectedMaster?.id === master.id ? theme.neumorph.inset : theme.neumorph.raised, 
                        padding: "12px 14px", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        width: "100%",
                        boxSizing: "border-box",
                        gap: "10px",
                        animationDelay: `${Math.min(i, 8) * 40}ms`
                      }}
                    >
                      <div 
                        onClick={() => setSelectedMaster(master)}
                        style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", minWidth: 0, flex: 1, cursor: "pointer" }}
                      >
                        <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: theme.neumorphSurface, boxShadow: theme.neumorph.lightSm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <img src="https://api.iconify.design/lucide:user.svg?color=%2364748B" alt="master" width="20" height="20" />
                        </div>
                        <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, margin: "0 0 3px 0", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{master.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: theme.font.xs, color: theme.textSecondary, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: theme.font.bold, display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:star.svg?color=%23059669&fill=%23059669" width="13" height="13" alt="" />{master.rating}</span>
                            <span>•</span>
                            <span style={{ color: theme.primary, fontWeight: theme.font.bold }}>{master.distance}</span>
                            <span>•</span>
                            <span>🚗 {master.carTime}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleSave(master)}
                        aria-label={t("up_saveMaster")}
                        className="custom-btn"
                        style={{ backgroundColor: savedIds.includes(String(master.id)) ? theme.primary : theme.bgTertiary, color: savedIds.includes(String(master.id)) ? theme.textInverse : theme.textSecondary, border: "none", borderRadius: theme.radius.sm, padding: "8px", cursor: "pointer", flexShrink: "0" }}
                      >
                        <img src={savedIds.includes(String(master.id)) ? "https://api.iconify.design/lucide:bookmark-check.svg?color=%23ffffff" : "https://api.iconify.design/lucide:bookmark.svg?color=%2364748B"} alt="save" width="16" height="16" />
                      </button>

                      <button 
                        className="custom-btn" 
                        onClick={() => {
                          setSelectedMaster(master);
                          if (onNext) {
                            onNext(
                              master,
                              userLocation,
                              {
                                device: selectedDevice,
                                deviceModel,
                                issue: selectedIssue || customIssue,
                                description: customIssue,
                                images,
                              }
                            );
                          }
                        }} 
                        style={{ backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: theme.radius.sm, padding: "8px 14px", fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", flexShrink: "0" }}
                      >
                        {t("up_choose")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Video qo'llanmalar qismi */}
            <div style={{ backgroundColor: theme.neumorphSurface, borderRadius: theme.neumorph.radiusLg, padding: "14px", boxShadow: theme.neumorph.light, display: "flex", flexDirection: "column", gap: "10px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src="https://api.iconify.design/lucide:video.svg?color=%23DC2626" alt="video" width="18" height="18" />
                <h3 style={{ fontSize: theme.font.sm, fontWeight: theme.font.extrabold, color: theme.error, margin: 0 }}>{t("up_videoGuides")}</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {getTutorialVideos().map((video, idx) => (
                  <a
                    key={idx}
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="custom-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      backgroundColor: theme.neumorphSurface,
                      border: "none",
                      borderRadius: theme.neumorph.radiusSm,
                      textDecoration: "none",
                      color: theme.text,
                      gap: "10px",
                      boxSizing: "border-box",
                      boxShadow: theme.neumorph.lightSm,
                      width: "100%"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", minWidth: 0 }}>
                      <img src="https://api.iconify.design/lucide:play-circle.svg?color=%23DC2626" alt="play" width="22" height="22" style={{ flexShrink: 0 }} />
                      <div style={{ overflow: "hidden", minWidth: 0 }}>
                        <p style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, margin: "0 0 3px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</p>
                        <p style={{ fontSize: "11px", color: theme.textSecondary, margin: 0 }}>{video.channel}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: theme.font.xs, color: theme.error, fontWeight: theme.font.bold, whiteSpace: "nowrap", flexShrink: 0 }}>{t("up_watch")} ➔</span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Pastdagi tugma */}
      <div style={{ marginTop: "16px", width: "100%", maxWidth: "100%", marginInline: "auto", boxSizing: "border-box" }}>
        {step === 1 ? (
          <button
            onClick={() => {
              const isModelEmpty = !deviceModel.trim() && !allowNoModel;
              const isIssueEmpty = !selectedIssue && !customIssue.trim();

              setErrors({
                model: isModelEmpty,
                issue: isIssueEmpty
              });

              if (isModelEmpty || isIssueEmpty) {
                showNotification(t("up_fillRequired"), "error");
                return;
              }
              setStep(2);
            }}
            className="custom-btn"
            style={{
              width: "100%",
              backgroundColor: theme.primary,
              color: theme.textInverse,
              fontWeight: theme.font.bold,
              fontSize: theme.font.sm,
              padding: "14px",
              borderRadius: theme.radius.md,
              border: "none",
              cursor: "pointer",
              boxShadow: theme.shadowMd,
              boxSizing: "border-box"
            }}
          >
            {t("up_results")} →
          </button>
        ) : (
          <button
            onClick={() => setStep(1)}
            className="custom-btn"
            style={{
              width: "100%",
              backgroundColor: theme.neumorphSurface,
              color: theme.text,
              fontWeight: theme.font.bold,
              fontSize: theme.font.sm,
              padding: "14px",
              borderRadius: theme.neumorph.radius,
              border: "none",
              boxShadow: theme.neumorph.light,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxSizing: "border-box"
            }}
          >
            <img src="https://api.iconify.design/lucide:refresh-cw.svg?color=%23ffffff" alt="refresh" width="14" height="14" /> 
            {t("up_editAgain")}
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadScreen;


