import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, View, Linking } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { subscribeAuth, getAuthUser, initAuth, isAuthReady } from "./src/services/authStore";
import { navigationRef, navigateDeep, parseDeepUrl } from "./src/services/navRef";
import { configureNotifications, setupPush, registerPushListeners } from "./src/services/push";
import { OnboardingScreen1 } from "./src/screens/Onboarding1";
import { OnboardingScreen2 } from "./src/screens/Onboarding2";
import { LocationAccess } from "./src/screens/LocationAccess";
import { LoginScreen } from "./src/screens/Login";
import { VerificationScreen } from "./src/screens/Verification";
import { RoleSelectionScreen } from "./src/screens/RoleSelection";
import { UserHome } from "./src/screens/UserHome";
import { MasterHome } from "./src/screens/MasterHome";
import { MasterProfileScreen } from "./src/screens/MasterProfileScreen";
import { PreOrder } from "./src/screens/PreOrder";
import { MasterPickerScreen } from "./src/screens/MasterPickerScreen";
import { OrderTracking } from "./src/screens/OrderTracking";
import { ChatWindow } from "./src/screens/ChatWindow";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { HelpScreen } from "./src/screens/HelpScreen";
import { CardsScreen } from "./src/screens/CardsScreen";
import { FeedbackScreen } from "./src/screens/FeedbackScreen";
import { AdminHome } from "./src/screens/AdminHome";
import { AppearanceSettings } from "./src/screens/settings/AppearanceSettings";
import { NotificationSettings } from "./src/screens/settings/NotificationSettings";
import { AddressSettings } from "./src/screens/settings/AddressSettings";
import { PaymentSettings } from "./src/screens/settings/PaymentSettings";
import { SecuritySettings } from "./src/screens/settings/SecuritySettings";
import { MasterSettings } from "./src/screens/settings/MasterSettings";
import { HelpCenter } from "./src/screens/settings/HelpCenter";
import { AboutSettings } from "./src/screens/settings/AboutSettings";
import { hydratePrefs } from "./src/services/prefs";

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding1" component={OnboardingScreen1} />
      <AuthStack.Screen name="Onboarding2" component={OnboardingScreen2} />
      <AuthStack.Screen name="LocationAccess" component={LocationAccess} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Verification" component={VerificationScreen} />
    </AuthStack.Navigator>
  );
}

function mainInitial(user) {
  if (user && user.role === "admin") return "AdminHome";
  if (user && user.role === "master") return "MasterHome";
  if (user && user.role === "user") return "UserHome";
  return "RoleSelection";
}

function MainNavigator({ user }) {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={mainInitial(user)}>
      <MainStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <MainStack.Screen name="AdminHome" component={AdminHome} />
      <MainStack.Screen name="UserHome" component={UserHome} />
      <MainStack.Screen name="MasterHome" component={MasterHome} />
      <MainStack.Screen name="MasterProfile" component={MasterProfileScreen} />
      <MainStack.Screen name="PreOrder" component={PreOrder} />
      <MainStack.Screen name="MasterPicker" component={MasterPickerScreen} />
      <MainStack.Screen name="OrderTracking" component={OrderTracking} />
      <MainStack.Screen name="ChatWindow" component={ChatWindow} />
      <MainStack.Screen name="Settings" component={SettingsScreen} />
      <MainStack.Screen name="Help" component={HelpScreen} />
      <MainStack.Screen name="Cards" component={CardsScreen} />
      <MainStack.Screen name="Feedback" component={FeedbackScreen} />
      {/* Sozlamalar bo'limlari */}
      <MainStack.Screen name="AppearanceSettings" component={AppearanceSettings} />
      <MainStack.Screen name="NotificationSettings" component={NotificationSettings} />
      <MainStack.Screen name="AddressSettings" component={AddressSettings} />
      <MainStack.Screen name="PaymentSettings" component={PaymentSettings} />
      <MainStack.Screen name="SecuritySettings" component={SecuritySettings} />
      <MainStack.Screen name="MasterSettings" component={MasterSettings} />
      <MainStack.Screen name="HelpCenter" component={HelpCenter} />
      <MainStack.Screen name="AboutSettings" component={AboutSettings} />
    </MainStack.Navigator>
  );
}

function Root() {
  const { theme } = useTheme();
  const [user, setUser] = useState(getAuthUser());
  const [ready, setReady] = useState(isAuthReady());
  const pushSubRef = useRef(null);

  useEffect(() => {
    const un = subscribeAuth(setUser);
    initAuth().finally(() => setReady(true));
    return un;
  }, []);

  // Sozlamalarni lokal + serverdan yuklaymiz (kirish holatidan keyin ham
  // qayta chaqiriladi — yangi qurilmada server pref'lari qo'llaniladi)
  useEffect(() => {
    if (!ready) return;
    if (user) hydratePrefs({ fromUser: user });
  }, [ready, user]);

  useEffect(() => {
    configureNotifications();
    pushSubRef.current = registerPushListeners();
    return () => {
      if (pushSubRef.current) pushSubRef.current.remove();
    };
  }, []);

  // Push tokenni ro'yxatdan o'tkazish (foydalanuvchi tizimga kirsa)
  useEffect(() => {
    if (ready && user && user.id) {
      setupPush(user);
    }
  }, [ready, user]);

  // Deep link'lar: ustachi://chat/:id | ustachi://order/:id | ustachi://master/:id
  useEffect(() => {
    const onUrl = (event) => {
      const data = parseDeepUrl(event?.url);
      if (data) navigateDeep(data);
    };
    const sub = Linking.addEventListener("url", onUrl);
    Linking.getInitialURL().then((url) => {
      const data = parseDeepUrl(url);
      if (data) {
        // Navigatsiya tayyor bo'lguncha kuto'miz
        const t = setInterval(() => {
          if (navigationRef.isReady()) {
            clearInterval(t);
            navigateDeep(data);
          }
        }, 200);
        setTimeout(() => clearInterval(t), 10000);
      }
    }).catch(() => {});
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme : DefaultTheme).colors,
      primary: theme.primary,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {user ? <MainNavigator key={`${user.role}-${user.id || ""}`} user={user} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Root />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}