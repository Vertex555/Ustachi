import React, { useState, useEffect, useCallback, useRef } from "react";
import { RoleSelectionScreen } from "./screens/RoleSelectionScreen";
import { Onboarding1 } from "./screens/Onboarding1";
import { Onboarding2 } from "./screens/Onboarding2";
import { LocationAccess } from "./screens/LocationAccess";
import { LoginScreen } from "./screens/LoginScreen";
import { VerificationScreen } from "./screens/VerificationScreen";
import { NoInternet } from "./screens/NoInternet";
import { PreOrder } from "./screens/PreOrder";
import { OrderTracking } from "./screens/OrderTracking";
import { SettingsScreen } from "./screens/SettingsScreen";
import { UserHome } from "./screens/UserHome";
import { MasterHome } from "./screens/MasterHome";
import { ChatWindow } from "./screens/ChatWindow";
import { HelpScreen } from "./screens/HelpScreen";
import { MasterProfileScreen } from "./screens/MasterProfileScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { CardsScreen } from "./screens/CardsScreen";
import { FeedbackScreen } from "./screens/FeedbackScreen";
import { AdminHome } from "./screens/AdminHome";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { PriceCalculatorScreen } from "./screens/PriceCalculatorScreen";
import { MasterAnalyticsScreen } from "./screens/MasterAnalyticsScreen";
import { PromoScreen } from "./screens/PromoScreen";
import { MasterSearchScreen } from "./screens/MasterSearchScreen";
import { apiUrl, authHeaders, setToken } from "./services/api";
import { AuthShell } from "./components/AuthShell";
import { AppQuickActions } from "./components/AppQuickActions";
import { trackReferral } from "./services/promo";
import { LanguageModal } from "./components/LanguageModal";
import { useTranslation } from "./i18n/LanguageContext";

const SCREEN = {
  ONBOARDING_1: "onboarding1",
  ONBOARDING_2: "onboarding2",
  LOCATION: "location",
  LOGIN: "login",
  VERIFY: "verify",
  ROLE: "role",
  USER_HOME: "userHome",
  MASTER_HOME: "masterHome",
  PRE_ORDER: "preOrder",
  ORDER_TRACKING: "orderTracking",
  SETTINGS: "settings",
  CHAT: "chat",
  HELP: "help",
  MASTER_PROFILE: "masterProfile",
  RESULTS: "results",
  CARDS: "cards",
  FEEDBACK: "feedback",
  ADMIN_HOME: "adminHome",
  // Yangi funksiyalar
  NOTIFICATIONS: "notifications",
  PRICE_CALC: "priceCalc",
  ANALYTICS: "analytics",
  PROMO: "promo",
  SEARCH: "masterSearch",
};

// Chap menyu har doim ko'rinadigan auth ekranlar (barcha bosh sahifalar + chat/settings)
const AUTH_SCREENS = new Set([
  SCREEN.USER_HOME,
  SCREEN.MASTER_HOME,
  SCREEN.PRE_ORDER,
  SCREEN.RESULTS,
  SCREEN.ORDER_TRACKING,
  SCREEN.CHAT,
  SCREEN.MASTER_PROFILE,
  SCREEN.SETTINGS,
  SCREEN.HELP,
  SCREEN.CARDS,
  SCREEN.FEEDBACK,
  SCREEN.ADMIN_HOME,
  SCREEN.NOTIFICATIONS,
  SCREEN.PRICE_CALC,
  SCREEN.ANALYTICS,
  SCREEN.PROMO,
  SCREEN.SEARCH,
]);

// Home ekranlari ichidagi tab kalitlari (sidebar shu tablarni almashtiradi)
const TAB_KEYS = new Set(["home", "saved", "orders", "chats", "profile", "anketa"]);

// Telefonda pastki tab-bar siqib qolmasligi uchun yashiriladigan menyu elementlari
// (foydalanuvchi/usta ularni bosh ekrandagi AppQuickActions klasteridan oladi;
//  admin ekranda FAB yo'q — bildirishnomalar tab-barida qoladi)
const MOBILE_HIDE = {
  admin: new Set(),
  master: new Set([SCREEN.NOTIFICATIONS, SCREEN.PROMO]),
  user: new Set([SCREEN.NOTIFICATIONS, SCREEN.PROMO]),
};

// Role bo'yicha chap menyu elementlari; key = tab yoki ekran kaliti
// short = mobil pastki tab-bar uchun bir so'zlik qisqa nom
const roleNav = (user, opts) => {
  const mobile = !!(opts && opts.mobile);
  const help = mobile ? [] : [{ key: SCREEN.HELP, label: "helpSupport", icon: "life-buoy" }];
  let items = [];
  if (user?.role === "admin") {
    items = [
      { key: "dashboard", label: "Admin", icon: "layout-dashboard", short: "homeShort" },
      { key: "users", label: "up_users", icon: "users", short: "usersShort" },
      { key: "masters", label: "up_masters", icon: "wrench", short: "mastersShort" },
      { key: "feedback", label: "feedback", icon: "message-square", short: "feedbackShort" },
      { key: "support", label: "up_support", icon: "messages-square", short: "supportShort" },
      { key: SCREEN.NOTIFICATIONS, label: "notifications", icon: "bell", short: "notifShort" },
      { key: SCREEN.SETTINGS, label: "settings", icon: "settings", short: "settingsShort" },
    ];
  } else if (user?.role === "master") {
    items = [
      { key: "anketa", label: "anketa", icon: "clipboard-list", short: "anketaShort" },
      { key: "orders", label: "myOrders", icon: "package", short: "ordersShort" },
      { key: "chats", label: "chats", icon: "message-circle", short: "chatShort" },
      { key: SCREEN.ANALYTICS, label: "navAnalytics", icon: "trending-up", short: "analyticsShort" },
      { key: SCREEN.NOTIFICATIONS, label: "notifications", icon: "bell", short: "notifShort" },
      { key: "profile", label: "masterProfile", icon: "user", short: "profileShort" },
      { key: SCREEN.PROMO, label: "navPromo", icon: "gift", short: "promoShort" },
      ...help,
      { key: SCREEN.SETTINGS, label: "settings", icon: "settings", short: "settingsShort" },
    ];
  } else {
    items = [
      { key: "home", label: "home", icon: "home", short: "homeShort" },
      { key: SCREEN.SEARCH, label: "navSearch", icon: "search", short: "searchShort" },
      { key: "saved", label: "savedMasters", icon: "bookmark", short: "savedShort" },
      { key: "orders", label: "myOrders", icon: "package", short: "ordersShort" },
      { key: "chats", label: "chats", icon: "message-circle", short: "chatShort" },
      { key: SCREEN.NOTIFICATIONS, label: "notifications", icon: "bell", short: "notifShort" },
      { key: "profile", label: "profile", icon: "user", short: "profileShort" },
      { key: SCREEN.PROMO, label: "navPromo", icon: "gift", short: "promoShort" },
      ...help,
      { key: SCREEN.SETTINGS, label: "settings", icon: "settings", short: "settingsShort" },
    ];
  }
  // Telefonda Sozlamalar tagi faqat Profildan ochiladi, menyuda ko'rsatilmaydi
  const hide = MOBILE_HIDE[user?.role] || MOBILE_HIDE.user;
  if (mobile) items = items.filter((i) => i.key !== SCREEN.SETTINGS && !hide.has(i.key));
  // Telefonda foydalanuvchida "Saqlanganlar" Profil orqali ochiladi (joy cheklangan)
  if (mobile && user?.role === "user") items = items.filter((i) => i.key !== "saved");
  // Mobil pastki tab'da faqat qisqa nom
  if (mobile) items = items.map((i) => ({ ...i, label: i.short || i.label }));
  return items;
};

function roleHome(user) {
  if (!user) return SCREEN.LOGIN;
  if (user.role === "admin") return SCREEN.ADMIN_HOME;
  if (user.role === "master") return SCREEN.MASTER_HOME;
  if (user.role === "user") return SCREEN.USER_HOME;
  return SCREEN.ROLE;
}

// Foydalanuvchi bir marta ro'yxatdan o'tgan bo'lsa, keyingi safarlarda
// tanishuv/lokatsiya ekranlari o'tkazib yuboriladi va to'g'ridan-to'g'ri o'z bo'limidan boshlanadi.
function hadOnboarded() {
  try { return !!localStorage.getItem("ustachi_onboarded"); } catch { return false; }
}

function markOnboarded() {
  try { localStorage.setItem("ustachi_onboarded", "1"); } catch {}
}

function entryScreen() {
  return hadOnboarded() ? SCREEN.LOGIN : SCREEN.ONBOARDING_1;
}

export function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState(() => entryScreen());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [orderParams, setOrderParams] = useState(null); // { master, userLocation, details }
  const [langOpen, setLangOpen] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [activeChat, setActiveChat] = useState(null); // { chatId, peerName }
  const [profileMaster, setProfileMaster] = useState(null); // saqlangan usta profili ko'rish uchun
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
  const [searchInitialDevice, setSearchInitialDevice] = useState(""); // kalkulyatordan qidiruvga filtr

  // Ortga qaytish tarixi va home tab holati
  const historyRef = useRef([]);
  const [userTab, setUserTab] = useState("home");
  const [masterTab, setMasterTab] = useState("anketa");
  const [adminTab, setAdminTab] = useState("dashboard");

  const resetNav = useCallback(() => {
    historyRef.current = [];
  }, []);

  const goTo = useCallback(
    (s) => {
      historyRef.current.push(screen);
      setScreen(s);
    },
    [screen]
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) setScreen(prev);
    else setScreen(roleHome(user));
  }, [user]);

  // Internet holatini kuzatish
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Sessiyani tiklash: localStorage da token bo'lsa foydalanuvchini qayta yuklash
  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        resetNav();
        markOnboarded();
        setUser(data.user);
        if (data.user?.id) localStorage.setItem("ustachi_user_id", data.user.id);
        setScreen(roleHome(data.user));
      } else {
        setToken(null);
      }
    } catch {
      // Server mavjud emas – sessiyani ochiq holda qoldirmaymiz
      setToken(null);
    }
  }, [resetNav]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Referral havolasi orqali kelganlarni hisoblash (?ref=KOD)
  useEffect(() => {
    trackReferral();
  }, []);

  if (!isOnline) {
    return <NoInternet onRetry={() => setIsOnline(navigator.onLine)} />;
  }

  if (langOpen) {
    return <LanguageModal onDone={() => setLangOpen(false)} />;
  }

  const goToRoleSelect = () => goTo(SCREEN.ROLE);
  const openSettings = () => goTo(SCREEN.SETTINGS);

  // Yuqori o'ng burchakdagi tez harakatlar klasteri
  const handleQuickOpen = (key) => {
    if (key === "calculator") goTo(SCREEN.PRICE_CALC);
    else if (key === "promo") goTo(SCREEN.PROMO);
    else if (key === "notifications") goTo(SCREEN.NOTIFICATIONS);
  };

  // Sidebar elementlarini tanlash: tab bo'lsa home ekranda almashtiramiz, aks holda ekranga o'tamiz
  const handleNavSelect = (key) => {
    if (user?.role === "admin") {
      // Admin tab kalitlari AdminHome ichida almashadi, qolganlari alohida ekran
      if (["dashboard", "users", "masters", "feedback", "support"].includes(key)) {
        setAdminTab(key);
        setScreen(SCREEN.ADMIN_HOME);
      } else {
        setScreen(key);
      }
      return;
    }
    if (TAB_KEYS.has(key)) {
      if (user?.role === "master") {
        setMasterTab(key);
        setScreen(SCREEN.MASTER_HOME);
      } else {
        setUserTab(key);
        setScreen(SCREEN.USER_HOME);
      }
      return;
    }
    goTo(key);
  };

  const handleLogout = () => {
    resetNav();
    setToken(null);
    setUser(null);
    setOrderData(null);
    setOrderParams(null);
    setPhone("");
    setDevCode(null);
    setScreen(entryScreen());
  };

  const handleVerified = (token, userData) => {
    resetNav();
    markOnboarded();
    setToken(token);
    setUser(userData);
    if (userData?.phone) localStorage.setItem("ustachi_phone", userData.phone);
    if (userData?.id) localStorage.setItem("ustachi_user_id", userData.id);
    setScreen(userData.role ? roleHome(userData) : SCREEN.ROLE);
  };

  const handleGuest = async () => {
    try {
      const response = await fetch(apiUrl("/api/auth/guest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Xatolik yuz berdi");
      resetNav();
      markOnboarded();
      setToken(data.token);
      setUser(data.user);
      if (data.user?.phone) localStorage.setItem("ustachi_phone", data.user.phone);
      if (data.user?.id) localStorage.setItem("ustachi_user_id", data.user.id);
      setScreen(SCREEN.ROLE);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleSelected = (updatedUser) => {
    resetNav();
    markOnboarded();
    setUser(updatedUser);
    setScreen(
      updatedUser.role === "master" ? SCREEN.MASTER_HOME : SCREEN.USER_HOME
    );
  };

  const handleOpenPreOrder = (master, userLocation, details) => {
    setOrderParams({ master, userLocation, details });
    goTo(SCREEN.PRE_ORDER);
  };

  const handleOrderCreated = (order) => {
    setOrderData(order);
    goTo(SCREEN.ORDER_TRACKING);
  };

  const handleMasterSaved = (savedData) => {
    resetNav();
    if (user) {
      setUser({ ...user, role: "master", isMaster: true });
    }
    setScreen(SCREEN.MASTER_HOME);
  };

  const handleUserProfileSaved = (savedData) => {
    if (user && savedData) {
      setUser({
        ...user,
        name: savedData.name !== undefined ? savedData.name : user.name,
        email: savedData.email !== undefined ? savedData.email : user.email,
        photo: savedData.photo !== undefined ? savedData.photo : user.photo,
        phone: savedData.phone !== undefined ? savedData.phone : user.phone,
      });
    }
  };

  const handleOpenChat = (chat) => {
    setActiveChat(chat);
    goTo(SCREEN.CHAT);
  };

  const handleViewProfile = (m) => {
    setProfileMaster(m);
    goTo(SCREEN.MASTER_PROFILE);
  };

  const handleProfileChat = async (masterObj) => {
    const masterId = masterObj?.id || masterObj?._id;
    if (!masterId) return;
    try {
      const res = await fetch(apiUrl(`/api/chat/open/master/${masterId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        handleOpenChat({ chatId: data.data.id, peerName: masterObj?.name || "Usta" });
      }
    } catch {}
  };

  const handleLogoutFromHome = handleLogout;

  const content = (() => {
    switch (screen) {
    case SCREEN.ONBOARDING_1:
      return <Onboarding1 onNext={() => goTo(SCREEN.ONBOARDING_2)} />;

    case SCREEN.ONBOARDING_2:
      return <Onboarding2 onNext={() => goTo(SCREEN.LOCATION)} />;

    case SCREEN.LOCATION:
      return <LocationAccess onNext={() => goTo(SCREEN.LOGIN)} />;

    case SCREEN.LOGIN:
      return (
        <LoginScreen
          onBack={goBack}
          onSendCode={(p, dev) => {
            setPhone(p);
            setDevCode(dev);
            goTo(SCREEN.VERIFY);
          }}
          onGuest={handleGuest}
        />
      );

    case SCREEN.VERIFY:
      return (
        <VerificationScreen
          phone={phone}
          devCode={devCode}
          onBack={goBack}
          onVerify={handleVerified}
        />
      );

    case SCREEN.ROLE:
      return (
        <RoleSelectionScreen
          onSelectRole={handleRoleSelected}
          onBackToHome={goBack}
        />
      );

    case SCREEN.USER_HOME:
      return (
        <UserHome
          user={user}
          tab={userTab}
          setTab={setUserTab}
          onNext={handleOpenPreOrder}
          onOpenOrder={(order) => {
            setOrderData({ ...order });
            goTo(SCREEN.ORDER_TRACKING);
          }}
          onChangeRole={goToRoleSelect}
          onOpenSettings={openSettings}
          onOpenChat={handleOpenChat}
          onLogout={handleLogoutFromHome}
          onSaveProfile={handleUserProfileSaved}
          onViewProfile={handleViewProfile}
          onSupport={() => goTo(SCREEN.HELP)}
          onOpenFeedback={() => goTo(SCREEN.FEEDBACK)}
          onOpenCards={() => goTo(SCREEN.CARDS)}
        />
      );

    case SCREEN.MASTER_HOME:
      return (
        <MasterHome
          user={user}
          tab={masterTab}
          setTab={setMasterTab}
          onSaveProfile={handleMasterSaved}
          onChangeRole={goToRoleSelect}
          onOpenSettings={openSettings}
          onOpenOrder={(order) => {
            setOrderData({ ...order });
            goTo(SCREEN.ORDER_TRACKING);
          }}
          onOpenChat={handleOpenChat}
          onLogout={handleLogoutFromHome}
          onSupport={() => goTo(SCREEN.HELP)}
          onOpenFeedback={() => goTo(SCREEN.FEEDBACK)}
          onOpenCards={() => goTo(SCREEN.CARDS)}
        />
      );

    case SCREEN.PRE_ORDER:
      return (
        <PreOrder
          master={orderParams?.master}
          userLocation={orderParams?.userLocation}
          orderDetails={orderParams?.details}
          onBack={goBack}
          onOrderNow={handleOrderCreated}
        />
      );

    case SCREEN.RESULTS:
      return (
        <ResultsScreen
          orderParams={orderParams}
          onBack={goBack}
          onOrder={handleOpenPreOrder}
        />
      );

    case SCREEN.ORDER_TRACKING:
      return (
        <OrderTracking
          orderData={orderData}
          onBack={goBack}
          onOpenChat={handleOpenChat}
          viewerRole={user?.role}
        />
      );

    case SCREEN.CHAT:
      return (
        <ChatWindow
          user={user}
          chatId={activeChat?.chatId}
          peerName={activeChat?.peerName}
          onBack={goBack}
        />
      );

    case SCREEN.HELP:
      return (
        <HelpScreen onBack={goBack} viewerRole={user?.role} />
      );

    case SCREEN.MASTER_PROFILE:
      return (
        <MasterProfileScreen
          master={profileMaster}
          onBack={goBack}
          onOrder={handleOpenPreOrder}
          onChat={handleProfileChat}
        />
      );

    case SCREEN.SETTINGS:
      return (
        <SettingsScreen
          onBack={goBack}
          onLogout={handleLogout}
        />
      );

    case SCREEN.CARDS:
      return <CardsScreen onBack={goBack} />;

    case SCREEN.FEEDBACK:
      return <FeedbackScreen onBack={goBack} viewerRole={user?.role} />;

    case SCREEN.ADMIN_HOME:
      return (
        <AdminHome
          user={user}
          tab={adminTab}
          setTab={setAdminTab}
          onOpenSettings={openSettings}
          onSupport={() => goTo(SCREEN.HELP)}
          onLogout={handleLogout}
        />
      );

    case SCREEN.NOTIFICATIONS:
      return <NotificationsScreen onBack={goBack} />;

    case SCREEN.PRICE_CALC:
      return (
        <PriceCalculatorScreen
          onBack={goBack}
          onFindMasters={(filters) => {
            setSearchInitialDevice((filters && filters.device) || "");
            goTo(SCREEN.SEARCH);
          }}
        />
      );

    case SCREEN.SEARCH:
      return (
        <MasterSearchScreen
          initialDevice={searchInitialDevice}
          onBack={goBack}
          onOrder={handleOpenPreOrder}
          onViewProfile={handleViewProfile}
        />
      );

    case SCREEN.ANALYTICS:
      return <MasterAnalyticsScreen onBack={goBack} />;

    case SCREEN.PROMO:
      return <PromoScreen onBack={goBack} user={user} />;

    default:
      return <Onboarding1 onNext={() => goTo(SCREEN.ONBOARDING_2)} />;
        }
      })();

  if (!user || !AUTH_SCREENS.has(screen)) return content;

  const nav = roleNav(user, { mobile: isMobile });
  const activeKey =
    screen === SCREEN.USER_HOME
      ? userTab
      : screen === SCREEN.MASTER_HOME
      ? masterTab
      : screen === SCREEN.ADMIN_HOME
      ? adminTab
      : screen;
  // Telefonda logout yordam menyusi pastki panelda ko'rinmaydi (Sozlamalarda bor)
  const footer = isMobile
    ? []
    : [
        {
          key: "logout",
          icon: "log-out",
          label: t("logout"),
          color: "#ef4444",
          onClick: handleLogout,
        },
      ];

  // AdminHome'da o'ng yuqori burchakda "Chiqish" tugmasi bor — klaster uni yopmasligi uchun
  // faqat foydalanuvchi/usta bosh sahifalarida ko'rinadi (admin uchun tab-bar'da).
  const showQuickActions =
    (screen === SCREEN.USER_HOME || screen === SCREEN.MASTER_HOME) && !!user;

  return (
    <>
      {showQuickActions && <AppQuickActions onOpen={handleQuickOpen} />}
      <AuthShell
        user={user}
        items={nav}
        activeKey={activeKey}
        onSelect={handleNavSelect}
        footer={footer}
      >
        {content}
      </AuthShell>
    </>
  );
}

export default App;