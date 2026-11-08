import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { apiUrl, authHeaders } from "./api";
import { getItem, setItem, removeItem } from "./storage";
import { navigateDeep } from "./navRef";

let channelReady = false;

async function ensureChannel() {
  if (channelReady) return;
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Bildirishnomalar",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1E88E5",
      });
      channelReady = true;
    } catch {}
  } else {
    channelReady = true;
  }
}

// Forn (uyg'oni) bildirishnomalarni ko'rsatish qoidasi
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Ruxsat so'rab, Expo push token'ini serverga ro'yxatdan o'tkazish
export async function setupPush(user) {
  if (!user || !user.id) return;
  if (!Device.isDevice) return; // simulator'da push ishlamaydi

  try {
    await ensureChannel();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      perm = await Notifications.requestPermissionsAsync();
    }
    if (!perm.granted) return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!token) return;

    await setItem("pushToken", token);

    const res = await fetch(apiUrl("/api/push/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("[push] register xatosi:", body.message || res.status);
    }
  } catch (err) {
    console.warn("[push] sozlash xatosi:", err.message);
  }
}

// Token'ni o'chirish (foydalanuvchi chiqqanda yoki token eskirganda)
export async function unregisterPush(token) {
  if (!token) return;
  try {
    await fetch(apiUrl("/api/push/unregister"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ token }),
    });
  } catch {}
}

// Logout paytida token'ni serverdan ham, lokaldan ham tozalash
export async function logoutPush() {
  const token = await getItem("pushToken").catch(() => null);
  await removeItem("pushToken").catch(() => {});
  if (token) await unregisterPush(token);
}

// Bildirishnomani bosganda kerakli ekranga o'tish
export function registerPushListeners() {
  const responseSub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = resp?.notification?.request?.content?.data || {};
    navigateDeep(data);
  });

  // Ilova bildirishnoma bosish orqali ochilgan bo'lsa
  Notifications.getLastNotificationResponseAsync()
    .then((resp) => {
      if (resp) {
        const data = resp?.notification?.request?.content?.data || {};
        navigateDeep(data);
      }
    })
    .catch(() => {});

  return responseSub;
}