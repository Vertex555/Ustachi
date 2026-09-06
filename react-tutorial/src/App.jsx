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
import { apiUrl, authHeaders, setToken } from "./services/api";

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
};

function roleHome(user) {
  if (!user) return SCREEN.LOGIN;
  if (user.role === "master") return SCREEN.MASTER_HOME;
  if (user.role === "user") return SCREEN.USER_HOME;
  return SCREEN.ROLE;
}

export function App() {
  const [screen, setScreen] = useState(SCREEN.ONBOARDING_1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [orderParams, setOrderParams] = useState(null); // { master, userLocation, details }
  const [orderData, setOrderData] = useState(null);
  const [activeChat, setActiveChat] = useState(null); // { chatId, peerName }
  const [profileMaster, setProfileMaster] = useState(null); // \u0441aqlangan usta profili ko'rish uchun

  // Ortga qaytish tarixi va home tab holati
  const historyRef = useRef([]);
  const [userTab, setUserTab] = useState("home");
  const [masterTab, setMasterTab] = useState("anketa");

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
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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

  if (!isOnline) {
    return <NoInternet onRetry={() => setIsOnline(navigator.onLine)} />;
  }

  const goToRoleSelect = () => goTo(SCREEN.ROLE);
  const openSettings = () => goTo(SCREEN.SETTINGS);

  const handleLogout = () => {
    resetNav();
    setToken(null);
    setUser(null);
    setOrderData(null);
    setOrderParams(null);
    setPhone("");
    setDevCode(null);
    setScreen(SCREEN.ONBOARDING_1);
  };

  const handleVerified = (token, userData) => {
    resetNav();
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
      setUser({ ...user, role: "master" });
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

    default:
      return <Onboarding1 onNext={() => goTo(SCREEN.ONBOARDING_2)} />;
  }
}

export default App;