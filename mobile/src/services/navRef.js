import { createNavigationContainerRef } from "@react-navigation/native";

// Komponent bo'lmagan joylardan (push/deep-link) navigatsiya qilish uchun global ref
export const navigationRef = createNavigationContainerRef();

const SCREEN_MAP = {
  chat: "ChatWindow",
  order: "OrderTracking",
  master: "MasterProfile",
};

export function navigateDeep(data, whenReady) {
  if (!data || typeof data !== "object") {
    if (whenReady) whenReady();
    return;
  }
  if (!navigationRef.isReady()) {
    if (whenReady) whenReady();
    return;
  }
  const { type } = data;
  try {
    if (type === "chat" && data.chatId) {
      navigationRef.navigate(SCREEN_MAP.chat, {
        chatId: data.chatId,
        peerName: data.peerName || "",
      });
    } else if (type === "order" && data.orderId) {
      navigationRef.navigate(SCREEN_MAP.order, { orderId: data.orderId });
    } else if (type === "master" && data.masterId) {
      navigationRef.navigate(SCREEN_MAP.master, { masterId: data.masterId });
    }
  } catch (err) {
    console.warn("[nav] deep navigatsiya xatosi:", err.message);
  }
}

// URL (ustachi://chat/:id va h.k.) dan ma'lumot olish
export function parseDeepUrl(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/^[a-z]+:\/\/([^/?]+)(?:[/?](.*))?$/i);
  if (!match) return null;
  const [ , host, restPath = "" ] = match;
  const path = (host + (restPath ? "/" + restPath : ""))
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  if (!path.length) return null;
  const [type, id] = path;
  if (type === "chat" && id) return { type: "chat", chatId: id };
  if (type === "order" && id) return { type: "order", orderId: id };
  if (type === "master" && id) return { type: "master", masterId: id };
  return null;
}