import React, { useState, useEffect, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import FloatingTabBar from "../components/FloatingTabBar";
import { UploadScreen } from "./UploadScreen";
import { SavedMastersScreen } from "./SavedMastersScreen";
import { OrdersView } from "./OrdersView";
import { ChatsView } from "./ChatsView";
import { UserProfile } from "./UserProfile";
import { HomeScreen } from "./HomeScreen";
import { PaymentScreen } from "./PaymentScreen";
import { subscribeBadges, getBadges, ensureBadges, refreshBadges, focusTabBadge } from "../services/badgeStore";

const Tabs = createBottomTabNavigator();

const ICONS = {
  Home: "home",
  Saved: "bookmark",
  Orders: "package",
  Chats: "message-circle",
  Payment: "credit-card",
  Profile: "user",
};

function HomeTab(props) {
  return <HomeScreen {...props} variant="user" />;
}

function PaymentTab(props) {
  return <PaymentScreen {...props} variant="user" />;
}

function SavedTab(props) {
  useFocusEffect(useCallback(() => { refreshBadges(); }, []));
  return <SavedMastersScreen {...props} />;
}

function OrdersTab(props) {
  useFocusEffect(useCallback(() => { focusTabBadge("orders"); }, []));
  return <OrdersView {...props} variant="user" />;
}

function ChatsTab(props) {
  useFocusEffect(useCallback(() => { focusTabBadge("chats"); }, []));
  return <ChatsView {...props} />;
}

export const UserHome = () => {
  const { theme } = useTheme();
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
      <Tabs.Screen name="Saved" component={SavedTab} options={{ title: t("saved"), tabBarLabel: t("tabSaved"), tabBarBadge: badges.saved || undefined }} />
      <Tabs.Screen name="Orders" component={OrdersTab} options={{ title: t("orders"), tabBarLabel: t("tabOrders"), tabBarBadge: badges.orders || undefined }} />
      <Tabs.Screen name="Chats" component={ChatsTab} options={{ title: t("chats"), tabBarLabel: t("tabChats"), tabBarBadge: badges.chats || undefined }} />
      <Tabs.Screen name="Payment" component={PaymentTab} options={{ title: t("payment"), tabBarLabel: t("tabPayment") }} />
      <Tabs.Screen name="Profile" component={UserProfile} options={{ title: t("profile"), tabBarLabel: t("tabProfile") }} />
      {/* Yashirin route: Home dagi banner/kategoriyalar buyurtma oqimini ochadi */}
      <Tabs.Screen name="Upload" component={UploadScreen} options={{ title: t("home"), tabBarHidden: true }} />
    </Tabs.Navigator>
  );
};

export default UserHome;